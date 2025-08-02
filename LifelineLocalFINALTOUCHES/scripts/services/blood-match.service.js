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
import { updateRequestAfterMatching } from './request.service.js';

/**
 * Checks if a donor's blood is compatible with a recipient's blood based on ABO/Rh, alloantibodies, CMV status, and Sickle Cell status.
 *
 * @param {object} recipient - The recipient's blood profile.
 * @param {string} recipient.abo - The recipient's ABO blood type.
 * @param {string} recipient.rh - The recipient's Rh factor.
 * @param {string[]} [recipient.unexpectedAntibodies] - A list of the recipient's unexpected antibodies.
 * @param {boolean} [recipient.requiresCmvNegative] - Whether the recipient requires CMV negative blood.
 * @param {boolean} [recipient.requiresSickleCellNegative] - Whether the recipient requires Sickle Cell negative blood.
 * @param {object} donor - The donor's blood profile.
 * @param {string} donor.abo - The donor's ABO blood type.
 * @param {string} donor.rh - The donor's Rh factor.
 * @param {string[]} [donor.minorAntigens] - A list of the donor's minor antigens.
 * @param {string} [donor.cmvStatus] - The donor's CMV status ("Positive", "Negative", or "Unknown").
 * @param {string} [donor.sickleCellStatus] - The donor's Sickle Cell status ("Positive", "Negative", or "Unknown").
 * @returns {boolean} - True if the blood is compatible, false otherwise.
 */
export function isCompatible(recipient, donor) {
    // If recipient is 'Unknown', they can only receive from O- donors.
    if (recipient.abo === 'Unknown') {
        return donor.abo === 'O' && donor.rh === '-';
    }

    // Rh compatibility: Rh- recipient cannot receive Rh+ blood
    if (recipient.rh === '-' && donor.rh === '+') {
        return false;
    }

    // ABO compatibility
    const aboCompatibility = {
        'A': ['A', 'O'],
        'B': ['B', 'O'],
        'AB': ['A', 'B', 'AB', 'O'],
        'O': ['O'],
    };

    if (!aboCompatibility[recipient.abo].includes(donor.abo)) {
        return false;
    }

    // Alloantibody compatibility
    if (recipient.unexpectedAntibodies && recipient.unexpectedAntibodies.length > 0) {
        if (!donor.minorAntigens || donor.minorAntigens.length === 0) {
            return false; // Cannot confirm compatibility if donor antigens are unknown
        }
        const hasIncompatibleAntigen = recipient.unexpectedAntibodies.some(antibody => {
            const antigenSymbol = antibody.replace('Anti-', '').toUpperCase();
            return donor.minorAntigens.some(minorAntigen => minorAntigen.toUpperCase() === antigenSymbol);
        });
        if (hasIncompatibleAntigen) {
            return false;
        }
    }

    // CMV compatibility
    if (recipient.requiresCmvNegative) {
        if (!donor.cmvStatus) {
            console.warn('CMV status is missing for donor - assuming incompatible for CMV negative requirement');
            return false;
        }
        
        // Normalize CMV status to handle case variations
        const normalizedCmvStatus = donor.cmvStatus.toLowerCase().trim();
        
        if (normalizedCmvStatus === 'negative') {
            // Compatible - donor is CMV negative
            console.log('CMV compatibility check passed: Donor is CMV negative');
        } else if (normalizedCmvStatus === 'positive' || normalizedCmvStatus === 'unknown') {
            // Incompatible - donor is either CMV positive or status is unknown
            console.log(`CMV compatibility check failed: Donor is ${donor.cmvStatus}, but recipient requires CMV negative`);
            return false;
        } else {
            // Handle unexpected CMV status values
            console.warn(`Unexpected CMV status value: ${donor.cmvStatus} - assuming incompatible for CMV negative requirement`);
            return false;
        }
    }

    // Sickle Cell compatibility
    if (recipient.requiresSickleCellNegative) {
        if (!donor.sickleCellStatus) {
            console.warn('Sickle Cell status is missing for donor - assuming incompatible for Sickle Cell negative requirement');
            return false;
        }
        
        // Normalize Sickle Cell status to handle case variations
        const normalizedSickleCellStatus = donor.sickleCellStatus.toLowerCase().trim();
        
        if (normalizedSickleCellStatus === 'negative') {
            // Compatible - donor is Sickle Cell negative
            console.log('Sickle Cell compatibility check passed: Donor is Sickle Cell negative');
        } else if (normalizedSickleCellStatus === 'positive' || normalizedSickleCellStatus === 'unknown') {
            // Incompatible - donor is either Sickle Cell positive or status is unknown
            console.log(`Sickle Cell compatibility check failed: Donor is ${donor.sickleCellStatus}, but recipient requires Sickle Cell negative`);
            return false;
        } else {
            // Handle unexpected Sickle Cell status values
            console.warn(`Unexpected Sickle Cell status value: ${donor.sickleCellStatus} - assuming incompatible for Sickle Cell negative requirement`);
            return false;
        }
    }

    return true;
}

/**
 * Finds compatible blood bags for a given patient based on ABO/Rh and alloantibody compatibility.
 *
 * The matching process involves two main steps:
 * 1.  **Primary Check (ABO/Rh):** Filters out blood bags that are incompatible with the patient's
 *     ABO blood group and Rh factor. This is determined by the patient's expected antibodies.
 *     For instance, a patient with Anti-B antibodies cannot receive blood with the B antigen.
 *     Additionally, an Rh-negative patient should not receive Rh-positive blood.
 *
 * 2.  **Secondary Check (Alloantibodies):** After the primary check, this step filters the remaining
 *     bags for compatibility with the patient's known unexpected antibodies (alloantibodies).
 *     If a patient has an antibody (e.g., Anti-Kell), any blood bag from a donor with the corresponding
 *     minor antigen (e.g., K) is considered incompatible.
 *
 * @param {object} patient - The patient object, containing their antigen profile and antibody history.
 * @param {object} patient.antigenProfile - The patient's blood antigens.
 * @param {string} patient.antigenProfile.abo - The patient's ABO blood type (e.g., "A", "B", "AB", "O").
 * @param {string} patient.antigenProfile.rh - The patient's Rh factor ("+" or "-").
 * @param {object} patient.antibodyHistory - The patient's antibody history.
 * @param {string[]} patient.antibodyHistory.expectedAntibodies - Antibodies expected based on ABO type (e.g., ["Anti-B"]).
 * @param {string[]} [patient.antibodyHistory.unexpectedAntibodies] - Any known alloantibodies (e.g., ["Anti-Kell"]).
 * @param {Array<object>} bloodBags - An array of blood bag objects to be checked for compatibility.
 * @param {object} bloodBags[].donor - The donor who donated the blood.
 * @param {object} bloodBags[].donor.antigenProfile - The donor's antigen profile.
 * @param {string} bloodBags[].donor.antigenProfile.abo - The donor's ABO blood type.
 * @param {string} bloodBags[].donor.antigenProfile.rh - The donor's Rh factor.
 * @param {string[]} [bloodBags[].donor.antigenProfile.minorAntigens] - Minor antigens present on the red cells of the donor (e.g., ["K"]).
 * @returns {Array<object>} An array of blood bags that are compatible with the patient.
 */
export function findCompatibleBloodBags(patient, bloodBags, specialRequirements = []) {
    const recipientProfile = {
        abo: patient.bloodGroup,
        rh: patient.rhFactor,
        unexpectedAntibodies: patient.antibody_history || [],
        requiresCmvNegative: specialRequirements.includes('CMV Negative'),
        requiresSickleCellNegative: specialRequirements.includes('Sickle Cell Negative'),
    };

    return bloodBags.filter(bag => {
        if (!bag.donorId) {
            return false;
        }

        const donorProfile = {
            abo: bag.bloodType ? bag.bloodType.slice(0, -1) : 'Unknown',
            rh: bag.bloodType ? bag.bloodType.slice(-1) : '-',
            minorAntigens: bag.antigen_profile || [],
            cmvStatus: bag.cmvStatus || 'Unknown',
            sickleCellStatus: bag.sickleCellStatus || 'Unknown',
        };

        return isCompatible(recipientProfile, donorProfile);
    });
}

/**
 * The main algorithm for the Global Matching Run.
 */
export async function runGlobalMatching() {
    console.log("Starting Global Matching Run...");
    const batch = writeBatch(db);

    // 1. Cleanup: Delete all pending crossmatch tests and old match ranks
    const pendingTestsQuery = query(collection(db, 'crossmatchTests'), where('status', '==', 'Matched'));
    const pendingTestsSnapshot = await getDocs(pendingTestsQuery);
    const bagsToReset = new Set();
    pendingTestsSnapshot.forEach(doc => {
        const testData = doc.data();
        if (testData.bloodBagId) {
            bagsToReset.add(testData.bloodBagId);
        }
        batch.delete(doc.ref);
    });

    if (bagsToReset.size > 0) {
        bagsToReset.forEach(bagId => {
            const bagRef = doc(db, 'bloodbags', bagId);
            batch.update(bagRef, { status: 'Available' });
        });
    }

    const oldRanksQuery = query(collection(db, 'matchRanks'));
    const oldRanksSnapshot = await getDocs(oldRanksQuery);
    oldRanksSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    // 2. Data Collection
    const requestsQuery = query(collection(db, 'requests'), where('status', 'in', ['pending', 'escalated', 'partially_allocated']));
    const requestsSnapshot = await getDocs(requestsQuery);
    let allRequests = [];
    requestsSnapshot.forEach(doc => allRequests.push({ id: doc.id, ...doc.data() }));

    const priorityMap = { 'EMERGENCY': 1, 'URGENT': 2, 'Scheduled': 3 };
    allRequests.sort((a, b) => (priorityMap[a.urgency] || 4) - (priorityMap[b.urgency] || 4));

    const bagsQuery = query(collection(db, 'bloodbags'), where('status', 'in', ['Available', 'Allocated', 'Crossmatching']));
    const bagsSnapshot = await getDocs(bagsQuery);
    let availableUnits = [];
    bagsSnapshot.forEach(doc => availableUnits.push({ id: doc.id, ...doc.data() }));

    const patientPromises = allRequests.map(req => getPatientById(req.patientId));
    const patients = (await Promise.all(patientPromises)).reduce((acc, p) => {
        if (p) acc[p.id] = p;
        return acc;
    }, {});

    // 3. Compatibility Matrix Generation & Rank Storage
    const compatibilityMatrix = new Map();
    for (const request of allRequests) {
        const patient = patients[request.patientId];
        if (!patient && request.bloodType !== 'Any') {
            console.log(`Skipping request ${request.id} because patient data is missing.`);
            continue;
        }

        console.log(`Processing request ${request.id} for patient ${patient?.fullName || 'N/A'}`);
        let compatibleUnits;
        if (request.bloodType === 'Any' || request.bloodType === 'Unknown') {
            compatibleUnits = availableUnits.filter(unit => unit.bloodType === 'O-');
        } else {
            // Use the findCompatibleBloodBags function which now includes CMV compatibility checking
            compatibleUnits = findCompatibleBloodBags(patient, availableUnits, request.specialRequirements || []);
            
            // Additional filtering for failed units and other special requirements
            compatibleUnits = compatibleUnits.filter((unit, index) => {
                if (index === 0) { // Log only for the first unit to avoid spamming
                    console.log(`--- Checking additional compatibility for Request ${request.id} ---`);
                    console.log("Patient Data:", JSON.stringify(patient, null, 2));
                    console.log("Unit Data:", JSON.stringify(unit, null, 2));
                }
                
                if (patient.failedUnits?.includes(unit.id)) {
                    if (index === 0) console.log(`Compatibility Fail: Unit ${unit.id} is in patient's failed units list.`);
                    return false;
                }

                const meetsSpecialRequirements = request.specialRequirements?.every(req =>
                    req === 'CMV Negative' || req === 'Sickle Cell Negative' || unit.special_attributes?.includes(req)
                ) ?? true;
                if (!meetsSpecialRequirements && index === 0) {
                    console.log(`Compatibility Fail: Unit does not meet special requirements.`);
                }
                return meetsSpecialRequirements;
            });
        }

        console.log(`Found ${compatibleUnits.length} compatible units for request ${request.id}.`);
        const rankedUnits = rankingService.rankCompatibleBags(patient, compatibleUnits, request);
        console.log(`Found ${rankedUnits.length} ranked units for request ${request.id}.`);
        compatibilityMatrix.set(request.id, rankedUnits);

        // Store the ranking result in Firestore
        const rankDocRef = doc(collection(db, 'matchRanks'));
        batch.set(rankDocRef, {
            requestId: request.id,
            createdAt: serverTimestamp(),
            rankedUnits: rankedUnits.map(u => ({ id: u.id, bloodType: u.bloodType, score: u.totalScore, expiryDate: u.expiryDate }))
        });
    }

    // 4. Intelligent Allocation
    const assignedUnits = new Set();
    const requestUpdates = [];

    for (const request of allRequests) {
        const previouslyAllocatedBags = request.allocatedBags || [];
        const requiredQty = request.quantity - previouslyAllocatedBags.length;

        if (requiredQty <= 0) {
            continue;
        }

        const compatibleUnits = compatibilityMatrix.get(request.id) || [];
        console.log(`Allocating for request ${request.id}. Required: ${requiredQty}, Compatible: ${compatibleUnits.length}`);

        const newlyAssignedUnits = [];
        for (const unit of compatibleUnits) {
            if (newlyAssignedUnits.length >= requiredQty) break;
            if (assignedUnits.has(unit.id)) continue;
            if (previouslyAllocatedBags.includes(unit.id)) continue;

            let isLastResortForOther = false;
            for (const otherRequest of allRequests) {
                if (otherRequest.id === request.id) continue;
                if ((priorityMap[otherRequest.urgency] || 4) < (priorityMap[request.urgency] || 4)) continue;
                
                const otherCompatibleUnits = compatibilityMatrix.get(otherRequest.id) || [];
                if (otherCompatibleUnits.length === 1 && otherCompatibleUnits.id === unit.id) {
                    isLastResortForOther = true;
                    break;
                }
            }

            if (!isLastResortForOther) {
                newlyAssignedUnits.push(unit);
                assignedUnits.add(unit.id);
            }
        }

        if (newlyAssignedUnits.length > 0) {
            console.log(`Assigning ${newlyAssignedUnits.length} new units to request ${request.id}`);
            
            newlyAssignedUnits.forEach(unit => {
                const testRef = doc(collection(db, 'crossmatchTests'));
                batch.set(testRef, {
                    requestId: request.id,
                    bloodBagId: unit.id,
                    patientId: request.patientId,
                    hospitalId: request.hospitalId,
                    status: 'Matched',
                    result: 'Pending',
                    createdAt: serverTimestamp()
                });
                const bagRef = doc(db, 'bloodbags', unit.id);
                batch.update(bagRef, { status: 'Crossmatching' });
            });

            requestUpdates.push({
                requestId: request.id,
                matchedBags: newlyAssignedUnits,
                status: 'crossmatching'
            });

        } else if (previouslyAllocatedBags.length === 0) {
            requestUpdates.push({
                requestId: request.id,
                matchedBags: [],
                status: 'pending'
            });
        }
    }

    // Perform all request updates after the main loop
    for (const update of requestUpdates) {
        await updateRequestAfterMatching(update.requestId, update.matchedBags, update.status);
    }

    await batch.commit();
    console.log("Global Matching Run finished.");
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
