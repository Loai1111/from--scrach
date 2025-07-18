import { db } from '../firebase-config.js';
import { collection, getDocs, addDoc, doc, updateDoc, query, where, serverTimestamp, writeBatch, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { updateMultipleBagStatuses } from './inventory.service.js';
import { getRequestById, recalculateRequestStatus } from './request.service.js';

/**
 * Creates new crossmatch test records and updates the status of the selected blood bags.
 * @param {string} requestId - The ID of the request.
 * @param {Array<string>} bloodBagIds - An array of selected blood bag IDs.
 */
export async function createCrossmatchTests(requestId, bloodBagIds) {
    if (!requestId || !bloodBagIds || bloodBagIds.length === 0) {
        throw new Error("Request ID and at least one Blood Bag ID are required.");
    }

    // NEW: Check if the request is cancelled before proceeding
    const request = await getRequestById(requestId);
    if (!request) {
        throw new Error(`Request with ID ${requestId} not found.`);
    }
    if (request.status === 'CANCELLED_BY_HOSPITAL') {
        throw new Error("Cannot create crossmatch tests for a cancelled request.");
    }

    // Step 1: Create all the crossmatch test documents
    const crossmatchCollection = collection(db, 'crossmatchTests');
    const creationPromises = bloodBagIds.map(bagId => {
        return addDoc(crossmatchCollection, {
            requestId: requestId,
            bloodBagId: bagId,
            result: 'Pending',
            createdAt: serverTimestamp()
        });
    });
    await Promise.all(creationPromises);
    
    // Step 2: Update the status of all selected bags to 'Crossmatching'
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
 * Updates the result of a specific crossmatch test and the associated bag's status.
 * @param {string} testId - The ID of the crossmatch test document.
 * @param {string} newResult - The new result ('Compatible' or 'Incompatible').
 * @param {string} bloodBagId - The ID of the associated blood bag.
 */
export async function updateCrossmatchResult(testId, newResult, bloodBagId, reportUrl = null) {
    const testRef = doc(db, 'crossmatchTests', testId);

    // Get request ID from the test document for status recalculation later
    const testSnap = await getDoc(testRef);
    if (!testSnap.exists()) {
        console.error(`Crossmatch test ${testId} not found.`);
        throw new Error(`Crossmatch test ${testId} not found.`);
    }
    const requestId = testSnap.data().requestId;

    // Prepare the update payload
    const updateData = {
        result: newResult,
        completedAt: serverTimestamp()
    };

    // Add the report URL to the payload if it was provided
    if (reportUrl) {
        updateData.reportUrl = reportUrl;
    }
    
    // Update the test result and potentially the report URL
    await updateDoc(testRef, updateData);

    // Update the corresponding blood bag's status
    const newBagStatus = newResult === 'Compatible' ? 'Allocated' : 'Available';
    await updateMultipleBagStatuses([bloodBagId], newBagStatus);

    console.log(`Updated crossmatch test ${testId} to ${newResult} and bag ${bloodBagId} to ${newBagStatus}.`);

    // After updating, recalculate the status of the associated request
    if (requestId) {
        await recalculateRequestStatus(requestId);
        console.log(`Triggered status recalculation for request ${requestId}.`);
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

