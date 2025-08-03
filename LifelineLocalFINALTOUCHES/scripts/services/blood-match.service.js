/**
 * @file This file contains the blood matching service, which is responsible for finding compatible blood bags for a patient.
 */

import { doc, updateDoc, collection, query, where, getDocs, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { db } from "../firebase-config.js";
import { getAvailableBloodBags, updateMultipleBagStatuses } from "./inventory.service.js";
import { getPatientById } from "./patient.service.js";
import { getLabTestByDonorId } from "./labTest.service.js";
import { bloodCompatibility } from '../utils.js';
import { rankingService } from './ranking.service.js';
import { createNotification } from './notification.service.js';

/**
 * Checks if a donor's blood is compatible with a recipient's blood based on ABO/Rh, alloantibodies, CMV status, and Sickle Cell status.
 *
 * IMPORTANT: CMV and Sickle Cell status must match EXACTLY between donor and recipient.
 *
 * @param {object} recipient - The recipient's blood profile.
 * @param {string} recipient.abo - The recipient's ABO blood type.
 * @param {string} recipient.rh - The recipient's Rh factor.
 * @param {string[]} [recipient.currentAntibodies] - A list of the recipient's current antibodies.
 * @param {string} recipient.cmvStatus - The recipient's CMV status ("Positive" or "Negative").
 * @param {string} recipient.sickleCellStatus - The recipient's Sickle Cell status ("Positive" or "Negative").
 * @param {object} donor - The donor's blood profile.
 * @param {string} donor.abo - The donor's ABO blood type.
 * @param {string} donor.rh - The donor's Rh factor.
 * @param {string[]} [donor.minorAntigens] - A list of the donor's minor antigens.
 * @param {string} donor.cmvStatus - The donor's CMV status ("Positive" or "Negative").
 * @param {string} donor.sickleCellStatus - The donor's Sickle Cell status ("Positive" or "Negative").
 * @returns {boolean} - True if the blood is compatible, false otherwise.
 */
export function isCompatible(recipient, donor) {
    const recipientBloodType = `${recipient.abo}${recipient.rh}`;
    const donorBloodType = `${donor.abo}${donor.rh}`;

    // Use the centralized bloodCompatibility rules
    const compatibleDonors = bloodCompatibility[recipientBloodType];
    if (!compatibleDonors || !compatibleDonors.includes(donorBloodType)) {
        return false;
    }

    // Alloantibody compatibility
    if (recipient.currentAntibodies && recipient.currentAntibodies.length > 0) {
        if (!donor.minorAntigens || donor.minorAntigens.length === 0) {
            return false; // Cannot confirm compatibility if donor antigens are unknown
        }
        const hasIncompatibleAntigen = recipient.currentAntibodies.some(antibody => {
            const antigenSymbol = antibody.replace('Anti-', '').toUpperCase();
            return donor.minorAntigens.some(minorAntigen => minorAntigen.toUpperCase() === antigenSymbol);
        });
        if (hasIncompatibleAntigen) {
            return false;
        }
    }

    // MANDATORY CMV Status Matching - must be EXACTLY the same
    if (!recipient.cmvStatus || !donor.cmvStatus) {
        console.warn('CMV status missing - incompatible');
        return false;
    }
    
    // Normalize CMV status for comparison
    const recipientCmv = recipient.cmvStatus.toLowerCase().trim();
    const donorCmv = donor.cmvStatus.toLowerCase().trim();
    
    if (recipientCmv !== donorCmv) {
        console.log(`CMV status mismatch: Recipient is ${recipient.cmvStatus}, Donor is ${donor.cmvStatus}`);
        return false;
    }

    // MANDATORY Sickle Cell Status Matching - must be EXACTLY the same
    if (!recipient.sickleCellStatus || !donor.sickleCellStatus) {
        console.warn('Sickle Cell status missing - incompatible');
        return false;
    }
    
    // Normalize Sickle Cell status for comparison
    const recipientSickleCell = recipient.sickleCellStatus.toLowerCase().trim();
    const donorSickleCell = donor.sickleCellStatus.toLowerCase().trim();
    
    if (recipientSickleCell !== donorSickleCell) {
        console.log(`Sickle Cell status mismatch: Recipient is ${recipient.sickleCellStatus}, Donor is ${donor.sickleCellStatus}`);
        return false;
    }

    return true;
}

/**
 * Finds compatible blood bags for a given patient based on ABO/Rh, alloantibody compatibility,
 * and MANDATORY matching of CMV and Sickle Cell status.
 *
 * The matching process involves:
 * 1.  **Blood Type Compatibility:** ABO/Rh compatibility check
 * 2.  **Alloantibody Check:** Ensures no conflicting antigens
 * 3.  **Mandatory Special Requirements:** CMV and Sickle Cell status MUST match exactly
 *
 * @param {object} patient - The patient object
 * @param {string} patient.bloodGroup - The patient's ABO blood type (e.g., "A", "B", "AB", "O")
 * @param {string} patient.rhFactor - The patient's Rh factor ("+" or "-")
 * @param {string[]} [patient.currentAntibodies] - Any known alloantibodies
 * @param {string} patient.cmvStatus - The patient's CMV status ("Positive" or "Negative")
 * @param {string} patient.sickleCellStatus - The patient's Sickle Cell status ("Positive" or "Negative")
 * @param {Array<object>} bloodBags - An array of blood bag objects to be checked for compatibility
 * @returns {Array<object>} An array of blood bags that are compatible with the patient
 */
export function findCompatibleBloodBags(patient, bloodBags) {
    const recipientProfile = {
        abo: patient.bloodGroup,
        rh: patient.rhFactor,
        currentAntibodies: patient.currentAntibodies || [],
        cmvStatus: patient.cmvStatus,
        sickleCellStatus: patient.sickleCellStatus,
    };

    return bloodBags.filter(bag => {
        if (!bag.donorId) {
            return false;
        }

        const donorProfile = {
            abo: bag.bloodType ? bag.bloodType.slice(0, -1) : 'Unknown',
            rh: bag.bloodType ? bag.bloodType.slice(-1) : '-',
            minorAntigens: bag.antigen_profile || [],
            cmvStatus: bag.cmvStatus,
            sickleCellStatus: bag.sickleCellStatus,
        };

        return isCompatible(recipientProfile, donorProfile);
    });
}

/**
 * The Global Matching Algorithm (GMA) - Core matching logic for blood bag allocation
 *
 * This algorithm runs whenever:
 * 1. A new request is created
 * 2. An existing request is cancelled
 * 3. A new blood bag is added to inventory
 *
 * The algorithm ensures optimal distribution of blood bags based on priority and compatibility.
 */
export async function runGlobalMatching() {
    console.log("=== Starting Global Matching Algorithm ===");
    
    try {
        const batch = writeBatch(db);

        // Step 1: Cleanup - Delete all existing crossmatches with status "pending"
        console.log("Step 1: Cleaning up pending crossmatches...");
        const pendingCrossmatchQuery = query(
            collection(db, 'crossmatchtests'),
            where('status', '==', 'pending')
        );
        const pendingCrossmatchSnapshot = await getDocs(pendingCrossmatchQuery);
        
        let deletedCount = 0;
        pendingCrossmatchSnapshot.forEach(doc => {
            batch.delete(doc.ref);
            deletedCount++;
        });
        console.log(`Deleted ${deletedCount} pending crossmatches`);

        // Step 2: Data Fetching
        console.log("Step 2: Fetching data...");
        
        // Fetch all active requests (status: "pending")
        const activeRequestsQuery = query(
            collection(db, 'requests'),
            where('status', '==', 'pending')
        );
        const requestsSnapshot = await getDocs(activeRequestsQuery);
        let activeRequests = [];
        requestsSnapshot.forEach(doc => {
            // Use adapter to handle both old and new data models
            const requestData = adaptRequestData({ id: doc.id, ...doc.data() });
            activeRequests.push(requestData);
        });
        console.log(`Found ${activeRequests.length} active requests`);

        // Fetch all eligible blood bags (any status except "issued")
        // Note: Using 'bloodbags' collection name as per current implementation
        const eligibleBagsQuery = query(
            collection(db, 'bloodbags'),
            where('status', '!=', 'issued')
        );
        const bagsSnapshot = await getDocs(eligibleBagsQuery);
        let eligibleBags = [];
        bagsSnapshot.forEach(doc => {
            // Use adapter to ensure consistent bag data structure
            const bagData = adaptBagData({ id: doc.id, ...doc.data() });
            eligibleBags.push(bagData);
        });
        console.log(`Found ${eligibleBags.length} eligible blood bags`);

        const patients = {};

        // Step 3: Compatibility Mapping
        console.log("Step 3: Building compatibility matrix...");
        const compatibilityMap = new Map();
        
        for (const request of activeRequests) {
            if (!request.patientId) {
                console.warn(`Request ${request.id} has no patientId`);
                continue;
            }
            let patient = patients[request.patientId];
            if (!patient) {
                patient = await getPatientById(request.patientId);
                if (patient) {
                    patients[request.patientId] = patient;
                } else {
                    console.warn(`Patient not found for request ${request.id}`);
                    continue;
                }
            }

            // Find compatible bags
            const compatibleBags = findCompatibleBloodBags(patient, eligibleBags);
            
            // Sort by expiry date (soonest first)
            compatibleBags.sort((a, b) => {
                const dateA = a.expiryDate?.toDate ? a.expiryDate.toDate() : new Date(a.expiryDate);
                const dateB = b.expiryDate?.toDate ? b.expiryDate.toDate() : new Date(b.expiryDate);
                return dateA - dateB;
            });

            compatibilityMap.set(request.id, compatibleBags);
            console.log(`Request ${request.id}: ${compatibleBags.length} compatible bags found`);
        }

        // Step 4: Prioritized Allocation Loop
        console.log("Step 4: Starting prioritized allocation...");
        
        // Sort requests by priority: EMERGENCY -> URGENT -> ROUTINE
        const priorityOrder = { 'EMERGENCY': 1, 'URGENT': 2, 'ROUTINE': 3 };
        activeRequests.sort((a, b) => {
            const priorityA = priorityOrder[a.priority] || 4;
            const priorityB = priorityOrder[b.priority] || 4;
            return priorityA - priorityB;
        });

        const assignedBags = new Set();
        const requestAllocations = new Map();

        for (const request of activeRequests) {
            const compatibleBags = compatibilityMap.get(request.id) || [];
            const allocatedBags = [];
            const requiredBags = request.requiredBags || 0;

            console.log(`\nProcessing ${request.priority} request ${request.id} (needs ${requiredBags} bags)`);

            for (const bag of compatibleBags) {
                if (allocatedBags.length >= requiredBags) break;
                if (assignedBags.has(bag.id)) continue;

                // Step 5: The Critical Check
                console.log(`  Checking bag ${bag.id} (${bag.bloodType})...`);
                let isCriticalForOther = false;

                for (const otherRequest of activeRequests) {
                    if (otherRequest.id === request.id) continue;

                    // Check if other request has same or higher priority
                    const otherPriority = priorityOrder[otherRequest.priority] || 4;
                    const currentPriority = priorityOrder[request.priority] || 4;
                    
                    if (otherPriority <= currentPriority) {
                        const otherCompatibleBags = compatibilityMap.get(otherRequest.id) || [];
                        // Filter out already assigned bags from other's compatible list
                        const otherAvailableBags = otherCompatibleBags.filter(b => !assignedBags.has(b.id));
                        
                        // Check if this bag is the ONLY available option for the other request
                        if (otherAvailableBags.length === 1 && otherAvailableBags[0].id === bag.id) {
                            console.log(`    Critical: Bag ${bag.id} is the only option for ${otherRequest.priority} request ${otherRequest.id}`);
                            isCriticalForOther = true;
                            break;
                        }
                    }
                }

                if (!isCriticalForOther) {
                    // Assign the bag
                    allocatedBags.push(bag);
                    assignedBags.add(bag.id);
                    console.log(`    Assigned bag ${bag.id} to request ${request.id}`);
                }
            }

            requestAllocations.set(request.id, allocatedBags);
            console.log(`  Total allocated: ${allocatedBags.length}/${requiredBags}`);
        }

        // Step 6: Create crossmatches and update statuses
        console.log("\nStep 5 & 6: Creating crossmatches and updating statuses...");

        for (const [requestId, allocatedBags] of requestAllocations) {
            const request = activeRequests.find(r => r.id === requestId);
            
            // Create crossmatch records
            for (const bag of allocatedBags) {
                const crossmatchRef = doc(collection(db, 'crossmatchtests'));
                batch.set(crossmatchRef, {
                    requestId: requestId,
                    bagId: bag.id,
                    status: 'pending',
                    createdAt: serverTimestamp()
                });

                // Update bag status based on request priority
                // Note: Using 'bloodbags' collection name as per current implementation
                const bagRef = doc(db, 'bloodbags', bag.id);
                const newBagStatus = (request.priority === 'EMERGENCY' || request.priority === 'URGENT')
                    ? 'allocated'
                    : 'pending crossmatching';
                
                batch.update(bagRef, { status: newBagStatus });
            }

            // Update request status and matchedBags count
            const requestRef = doc(db, 'requests', requestId);
            const matchedCount = allocatedBags.length;
            const requiredCount = request.requiredBags || 0;
            
            const newRequestStatus = matchedCount >= requiredCount ? 'matched' : 'escalated';
            
            batch.update(requestRef, {
                matchedBags: matchedCount,
                status: newRequestStatus
            });

            console.log(`Request ${requestId}: ${matchedCount}/${requiredCount} bags matched, status: ${newRequestStatus}`);
        }

        // Commit all changes atomically
        await batch.commit();
        console.log("\n=== Global Matching Algorithm completed successfully ===");

    } catch (error) {
        console.error("Error in Global Matching Algorithm:", error);
        throw error;
    }
}

/**
 * Tests the CMV Negative filter implementation with various scenarios.
 * This function can be called to verify that the CMV compatibility logic works correctly.
 *
 * @returns {object} Test results with pass/fail status for each test case
 */
export function testCmvNegativeFilter() {
    console.log("Testing CMV Negative filter implementation...");
    
    const testCases = [
        {
            name: "Recipient requires CMV negative, donor is CMV negative",
            recipient: { abo: 'A', rh: '+', requiresCmvNegative: true },
            donor: { abo: 'A', rh: '+', cmvStatus: 'Negative' },
            expected: true
        },
        {
            name: "Recipient requires CMV negative, donor is CMV positive",
            recipient: { abo: 'A', rh: '+', requiresCmvNegative: true },
            donor: { abo: 'A', rh: '+', cmvStatus: 'Positive' },
            expected: false
        },
        {
            name: "Recipient requires CMV negative, donor has unknown CMV status",
            recipient: { abo: 'A', rh: '+', requiresCmvNegative: true },
            donor: { abo: 'A', rh: '+', cmvStatus: 'Unknown' },
            expected: false
        },
        {
            name: "Recipient requires CMV negative, donor has missing CMV status",
            recipient: { abo: 'A', rh: '+', requiresCmvNegative: true },
            donor: { abo: 'A', rh: '+', cmvStatus: undefined },
            expected: false
        },
        {
            name: "Recipient does not require CMV negative, donor is CMV positive",
            recipient: { abo: 'A', rh: '+', requiresCmvNegative: false },
            donor: { abo: 'A', rh: '+', cmvStatus: 'Positive' },
            expected: true
        },
        {
            name: "Recipient does not require CMV negative, donor has unknown CMV status",
            recipient: { abo: 'A', rh: '+', requiresCmvNegative: false },
            donor: { abo: 'A', rh: '+', cmvStatus: 'Unknown' },
            expected: true
        },
        {
            name: "CMV status case sensitivity test (lowercase)",
            recipient: { abo: 'A', rh: '+', requiresCmvNegative: true },
            donor: { abo: 'A', rh: '+', cmvStatus: 'negative' },
            expected: true
        },
        {
            name: "CMV status case sensitivity test (uppercase)",
            recipient: { abo: 'A', rh: '+', requiresCmvNegative: true },
            donor: { abo: 'A', rh: '+', cmvStatus: 'NEGATIVE' },
            expected: true
        },
        {
            name: "Unexpected CMV status value",
            recipient: { abo: 'A', rh: '+', requiresCmvNegative: true },
            donor: { abo: 'A', rh: '+', cmvStatus: 'InvalidValue' },
            expected: false
        }
    ];
    
    const results = {
        passed: 0,
        failed: 0,
        details: []
    };
    
    testCases.forEach(testCase => {
        try {
            const actual = isCompatible(testCase.recipient, testCase.donor);
            const passed = actual === testCase.expected;
            
            if (passed) {
                results.passed++;
                console.log(`✓ PASS: ${testCase.name}`);
            } else {
                results.failed++;
                console.error(`✗ FAIL: ${testCase.name} - Expected ${testCase.expected}, got ${actual}`);
            }
            
            results.details.push({
                name: testCase.name,
                passed: passed,
                expected: testCase.expected,
                actual: actual
            });
        } catch (error) {
            results.failed++;
            console.error(`✗ ERROR: ${testCase.name} - ${error.message}`);
            results.details.push({
                name: testCase.name,
                passed: false,
                error: error.message
            });
        }
    });
    
    console.log(`\nCMV Negative Filter Test Results:`);
    console.log(`Passed: ${results.passed}/${testCases.length}`);
    console.log(`Failed: ${results.failed}/${testCases.length}`);
    
    return results;
}

/**
 * Tests the Sickle Cell Negative filter implementation with various scenarios.
 * This function can be called to verify that the Sickle Cell compatibility logic works correctly.
 *
 * @returns {object} Test results with pass/fail status for each test case
 */
/**
 * Adapter function to handle the transition between old and new data models
 * Maps old field names to new field names for requests
 */
function adaptRequestData(request) {
    return {
        ...request,
        // Map urgency to priority if priority doesn't exist
        priority: request.priority || request.urgency,
        // Map quantity to requiredBags if requiredBags doesn't exist
        requiredBags: request.requiredBags || request.quantity,
        // Map matchedCount to matchedBags if matchedBags doesn't exist
        matchedBags: request.matchedBags !== undefined ? request.matchedBags : request.matchedCount
    };
}

/**
 * Adapter function for blood bags to ensure consistent data structure
 */
function adaptBagData(bag) {
    // Ensure the bag has the correct structure for the new GMA
    return {
        ...bag,
        // Ensure status is lowercase for consistency
        status: bag.status ? bag.status.toLowerCase() : 'available',
        // Ensure CMV and Sickle Cell status are present
        cmvStatus: bag.cmvStatus || 'Unknown',
        sickleCellStatus: bag.sickleCellStatus || 'Unknown'
    };
}


export function testSickleCellNegativeFilter() {
    console.log("Testing Sickle Cell Negative filter implementation...");
    
    const testCases = [
        {
            name: "Recipient requires Sickle Cell negative, donor is Sickle Cell negative",
            recipient: { abo: 'A', rh: '+', requiresSickleCellNegative: true },
            donor: { abo: 'A', rh: '+', sickleCellStatus: 'Negative' },
            expected: true
        },
        {
            name: "Recipient requires Sickle Cell negative, donor is Sickle Cell positive",
            recipient: { abo: 'A', rh: '+', requiresSickleCellNegative: true },
            donor: { abo: 'A', rh: '+', sickleCellStatus: 'Positive' },
            expected: false
        },
        {
            name: "Recipient requires Sickle Cell negative, donor has unknown Sickle Cell status",
            recipient: { abo: 'A', rh: '+', requiresSickleCellNegative: true },
            donor: { abo: 'A', rh: '+', sickleCellStatus: 'Unknown' },
            expected: false
        },
        {
            name: "Recipient requires Sickle Cell negative, donor has missing Sickle Cell status",
            recipient: { abo: 'A', rh: '+', requiresSickleCellNegative: true },
            donor: { abo: 'A', rh: '+', sickleCellStatus: undefined },
            expected: false
        },
        {
            name: "Recipient does not require Sickle Cell negative, donor is Sickle Cell positive",
            recipient: { abo: 'A', rh: '+', requiresSickleCellNegative: false },
            donor: { abo: 'A', rh: '+', sickleCellStatus: 'Positive' },
            expected: true
        },
        {
            name: "Recipient does not require Sickle Cell negative, donor has unknown Sickle Cell status",
            recipient: { abo: 'A', rh: '+', requiresSickleCellNegative: false },
            donor: { abo: 'A', rh: '+', sickleCellStatus: 'Unknown' },
            expected: true
        },
        {
            name: "Sickle Cell status case sensitivity test (lowercase)",
            recipient: { abo: 'A', rh: '+', requiresSickleCellNegative: true },
            donor: { abo: 'A', rh: '+', sickleCellStatus: 'negative' },
            expected: true
        },
        {
            name: "Sickle Cell status case sensitivity test (uppercase)",
            recipient: { abo: 'A', rh: '+', requiresSickleCellNegative: true },
            donor: { abo: 'A', rh: '+', sickleCellStatus: 'NEGATIVE' },
            expected: true
        },
        {
            name: "Unexpected Sickle Cell status value",
            recipient: { abo: 'A', rh: '+', requiresSickleCellNegative: true },
            donor: { abo: 'A', rh: '+', sickleCellStatus: 'InvalidValue' },
            expected: false
        },
        {
            name: "Combined CMV and Sickle Cell requirements - both negative",
            recipient: { abo: 'A', rh: '+', requiresCmvNegative: true, requiresSickleCellNegative: true },
            donor: { abo: 'A', rh: '+', cmvStatus: 'Negative', sickleCellStatus: 'Negative' },
            expected: true
        },
        {
            name: "Combined CMV and Sickle Cell requirements - CMV positive, Sickle Cell negative",
            recipient: { abo: 'A', rh: '+', requiresCmvNegative: true, requiresSickleCellNegative: true },
            donor: { abo: 'A', rh: '+', cmvStatus: 'Positive', sickleCellStatus: 'Negative' },
            expected: false
        },
        {
            name: "Combined CMV and Sickle Cell requirements - CMV negative, Sickle Cell positive",
            recipient: { abo: 'A', rh: '+', requiresCmvNegative: true, requiresSickleCellNegative: true },
            donor: { abo: 'A', rh: '+', cmvStatus: 'Negative', sickleCellStatus: 'Positive' },
            expected: false
        }
    ];
    
    const results = {
        passed: 0,
        failed: 0,
        details: []
    };
    
    testCases.forEach(testCase => {
        try {
            const actual = isCompatible(testCase.recipient, testCase.donor);
            const passed = actual === testCase.expected;
            
            if (passed) {
                results.passed++;
                console.log(`✓ PASS: ${testCase.name}`);
            } else {
                results.failed++;
                console.error(`✗ FAIL: ${testCase.name} - Expected ${testCase.expected}, got ${actual}`);
            }
            
            results.details.push({
                name: testCase.name,
                passed: passed,
                expected: testCase.expected,
                actual: actual
            });
        } catch (error) {
            results.failed++;
            console.error(`✗ ERROR: ${testCase.name} - ${error.message}`);
            results.details.push({
                name: testCase.name,
                passed: false,
                error: error.message
            });
        }
    });
    
    console.log(`\nSickle Cell Negative Filter Test Results:`);
    console.log(`Passed: ${results.passed}/${testCases.length}`);
    console.log(`Failed: ${results.failed}/${testCases.length}`);
    
    return results;
}
