import { db } from '../firebase-config.js';
import { collection, getDocs, addDoc, doc, updateDoc, query, where, serverTimestamp, writeBatch, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { updateMultipleBagStatuses, getAvailableBloodBags, updateBloodBag } from './inventory.service.js';
import { recalculateRequestStatus } from './request.service.js';
import { getRequestById } from './request.queries.js';
import { getPatientById } from './patient.service.js';
import { bloodCompatibility } from '../utils.js';
import { rankingService } from './ranking.service.js';
import { runGlobalMatching } from './blood-match.service.js';

/**
 * Creates new crossmatch test records and updates the status of the selected blood bags.
 * @param {string} requestId - The ID of the request.
 * @param {Array<string>} bloodBagIds - An array of selected blood bag IDs.
 */
export async function createCrossmatchTests(requestId, bloodBagIds) {
    if (!requestId || !bloodBagIds || bloodBagIds.length === 0) {
        throw new Error("Request ID and at least one Blood Bag ID are required.");
    }

    const request = await getRequestById(requestId);
    if (!request) {
        throw new Error(`Request with ID ${requestId} not found.`);
    }
    if (request.status === 'cancelled') {
        throw new Error("Cannot create crossmatch tests for a cancelled request.");
    }

    const crossmatchCollection = collection(db, 'crossmatchTests');
    const creationPromises = bloodBagIds.map(bagId => {
        return addDoc(crossmatchCollection, {
            requestId: requestId,
            bloodBagId: bagId,
            status: 'Matched', // Initial status
            result: 'Pending', // Keep result for now, might deprecate
            createdAt: serverTimestamp()
        });
    });
    await Promise.all(creationPromises);
    
    await updateMultipleBagStatuses(bloodBagIds, 'Crossmatching');

    console.log(`Successfully created ${bloodBagIds.length} crossmatch tests and updated bag statuses.`);
}

/**
 * Fetches all crossmatch tests from the database.
 * @returns {Promise<Array>} A promise that resolves to an array of all test objects.
 */
export async function getAllCrossmatches() {
    try {
        const testsCollection = collection(db, 'crossmatchTests');
        const querySnapshot = await getDocs(testsCollection);
        const tests = [];
        querySnapshot.forEach((doc) => {
            tests.push({ id: doc.id, ...doc.data() });
        });
        return tests;
    } catch (error) {
        console.error("Error fetching all crossmatches: ", error);
        return [];
    }
}

/**
 * Adds a record of a failed crossmatch.
 * @param {string} patientId - The ID of the patient.
 * @param {string} unitId - The ID of the blood unit.
 */
export async function addFailedCrossmatch(patientId, unitId) {
    try {
        const failedCrossmatchesCollection = collection(db, 'failed_crossmatches');
        await addDoc(failedCrossmatchesCollection, {
            patientId,
            unitId,
            failedAt: serverTimestamp()
        });
        console.log(`Added failed crossmatch record for patient ${patientId} and unit ${unitId}.`);
    } catch (error) {
        console.error("Error adding failed crossmatch record: ", error);
    }
}

/**
 * Fetches all failed crossmatch records.
 * @returns {Promise<Array>} A promise that resolves to an array of failed crossmatch objects.
 */
export async function getFailedCrossmatches() {
    try {
        const q = query(collection(db, 'failed_crossmatches'));
        const querySnapshot = await getDocs(q);
        const failed = [];
        querySnapshot.forEach((doc) => {
            failed.push({ id: doc.id, ...doc.data() });
        });
        return failed;
    } catch (error) {
        console.error("Error fetching failed crossmatches: ", error);
        return [];
    }
}

/**
 * Updates the status of a specific crossmatch test.
 * @param {string} testId - The ID of the crossmatch test document.
 * @param {string} newStatus - The new status ('Success', 'Fail', 'Skipped').
 * @param {string} bloodBagId - The ID of the associated blood bag.
 * @param {string} [reportUrl] - Optional URL for the crossmatch report.
 */
export async function updateCrossmatchStatus(testId, newStatus, bloodBagId, reportUrl = null) {
    const testRef = doc(db, 'crossmatchTests', testId);
    const testSnap = await getDoc(testRef);

    if (!testSnap.exists()) {
        throw new Error(`Crossmatch test ${testId} not found.`);
    }

    const { requestId } = testSnap.data();
    const request = await getRequestById(requestId);
    if (!request) {
        throw new Error(`Associated request ${requestId} not found.`);
    }
    const patientId = request.patientId;

    const updateData = {
        status: newStatus,
        completedAt: serverTimestamp(),
        result: newStatus, // Or map to a more detailed result if needed
    };

    if (reportUrl) {
        updateData.reportUrl = reportUrl;
    }

    await updateDoc(testRef, updateData);

    switch (newStatus) {
        case 'Success':
        case 'Pass':
            await updateMultipleBagStatuses([bloodBagId], 'Allocated');
            await recalculateRequestStatus(requestId);
            console.log(`Crossmatch Success for test ${testId}. Bag ${bloodBagId} is allocated.`);
            break;
        case 'Fail':
            await addFailedCrossmatch(patientId, bloodBagId);
            await updateMultipleBagStatuses([bloodBagId], 'Available'); // Free the bag

            // Deduct the failed bag from the request and update status
            const requestRef = doc(db, 'requests', requestId);
            const currentRequest = await getRequestById(requestId);
            
            if (currentRequest) {
                const updatedBags = (currentRequest.allocatedBags || []).filter(id => id !== bloodBagId);
                const matchedCount = updatedBags.length;
                
                let newStatus = 'pending';
                if (matchedCount > 0) {
                    newStatus = 'partially_allocated';
                }

                await updateDoc(requestRef, {
                    allocatedBags: updatedBags,
                    matchedCount: matchedCount,
                    status: newStatus
                });
            }

            console.log(`Crossmatch Fail for test ${testId}. Bag ${bloodBagId} is available again. Rerunning matching for request ${requestId}.`);
            await runGlobalMatching(); // Re-run matching for all pending requests
            break;
        case 'Skipped':
            // This case is for urgent requests where crossmatching is bypassed.
            await updateMultipleBagStatuses([bloodBagId], 'Allocated');
            await recalculateRequestStatus(requestId);
            console.log(`Crossmatch Skipped for test ${testId}. Bag ${bloodBagId} allocated for urgent request.`);
            break;
        default:
             if (newStatus === 'issued') {
                const { bloodBagId } = testSnap.data();
                await updateMultipleBagStatuses([bloodBagId], 'Issued');
                await recalculateRequestStatus(requestId);
                console.log(`Crossmatch status updated to 'issued' for test ${testId}. Bag ${bloodBagId} is now issued.`);
            } else {
                console.warn(`Unhandled crossmatch status: ${newStatus}`);
            }
    }
}

/**
 * Fetches all crossmatch tests for a specific request, regardless of result.
 * @param {string} requestId - The ID of the request.
 * @returns {Promise<Array>} A promise that resolves to an array of all test objects for that request.
 */
export async function getCrossmatchTestsForRequest(requestId) {
    try {
        const testsCollection = collection(db, 'crossmatchTests');
        const q = query(testsCollection, where("requestId", "==", requestId));
        const querySnapshot = await getDocs(q);
        const tests = [];
        querySnapshot.forEach((doc) => {
            tests.push({ id: doc.id, ...doc.data() });
        });
        return tests;
    } catch (error) {
        console.error("Error fetching all tests for request: ", error);
        return [];
    }
}

/**
 * Confirms the receipt of a blood bag for a specific crossmatch test.
 * @param {string} testId - The ID of the crossmatch test document.
 */
export async function confirmReceipt(testId) {
    if (!testId) {
        throw new Error("Crossmatch test ID is required.");
    }
    const testRef = doc(db, 'crossmatchTests', testId);
    await updateDoc(testRef, {
        receiptConfirmed: true,
        receiptConfirmedAt: serverTimestamp()
    });
    console.log(`Receipt confirmed for crossmatch test ${testId}.`);
}
