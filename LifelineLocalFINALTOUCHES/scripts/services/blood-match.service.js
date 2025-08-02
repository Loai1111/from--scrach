/**
 * @file This file contains the blood matching service, which is responsible for finding compatible blood bags for a patient.
 */

import { doc, updateDoc, collection, query, where, getDocs, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { db } from "../firebase-config.js";
import { getAvailableBloodBags, updateMultipleBagStatuses } from "./inventory.service.js";
import { getPatientById } from "./patient.service.js";
import { bloodCompatibility } from '../utils.js';
import { rankingService } from './ranking.service.js';
import { createNotification } from './notification.service.js';
import { updateRequestAfterMatching } from './request.service.js';

/**
 * Checks if a donor's blood is compatible with a recipient's blood based on ABO/Rh and alloantibodies.
 *
 * @param {object} recipient - The recipient's blood profile.
 * @param {string} recipient.abo - The recipient's ABO blood type.
 * @param {string} recipient.rh - The recipient's Rh factor.
 * @param {string[]} [recipient.unexpectedAntibodies] - A list of the recipient's unexpected antibodies.
 * @param {object} donor - The donor's blood profile.
 * @param {string} donor.abo - The donor's ABO blood type.
 * @param {string} donor.rh - The donor's Rh factor.
 * @param {string[]} [donor.minorAntigens] - A list of the donor's minor antigens.
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
export function findCompatibleBloodBags(patient, bloodBags) {
    const recipientProfile = {
        abo: patient.antigenProfile.abo,
        rh: patient.antigenProfile.rh,
        unexpectedAntibodies: patient.antibodyHistory.unexpectedAntibodies || [],
    };

    return bloodBags.filter(bag => {
        if (!bag.donor || !bag.donor.antigenProfile) {
            return false;
        }

        const donorProfile = {
            abo: bag.donor.antigenProfile.abo,
            rh: bag.donor.antigenProfile.rh,
            minorAntigens: bag.donor.antigenProfile.minorAntigens || [],
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
            compatibleUnits = availableUnits.filter((unit, index) => {
                if (index === 0) { // Log only for the first unit to avoid spamming
                    console.log(`--- Checking compatibility for Request ${request.id} ---`);
                    console.log("Patient Data:", JSON.stringify(patient, null, 2));
                    console.log("Unit Data:", JSON.stringify(unit, null, 2));
                }

                const patientBloodType = patient?.bloodType;
                const patientAntibodies = patient?.unexpectedAntibodies || [];

                if (!patientBloodType) {
                    console.error(`Could not determine blood type for patient ${patient.id}`);
                    return false;
                }

                const isCompatibleType = (bloodCompatibility[patientBloodType] || []).includes(unit.bloodType);
                if (!isCompatibleType) {
                    if (index === 0) console.log(`Compatibility Fail: ABO/Rh incompatibility. Patient ${patientBloodType} cannot receive ${unit.bloodType}.`);
                    return false;
                }
                if (patient.failedUnits?.includes(unit.id)) {
                    if (index === 0) console.log(`Compatibility Fail: Unit ${unit.id} is in patient's failed units list.`);
                    return false;
                }

                if (patientAntibodies.length > 0) {
                    const hasIncompatibleAntigen = patientAntibodies.some(antibody => {
                        const antigen = antibody.replace('Anti-', '');
                        const isIncompatible = unit.antigen_profile?.includes(antigen);
                        if (isIncompatible && index === 0) {
                            console.log(`Compatibility Fail: Patient has ${antibody}, and unit has antigen ${antigen}.`);
                        }
                        return isIncompatible;
                    });
                    if (hasIncompatibleAntigen) return false;
                }

                const meetsSpecialRequirements = request.specialRequirements?.every(req => unit.special_attributes?.includes(req)) ?? true;
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
