
// scripts/services/request.service.js

import { db } from '../firebase-config.js';
import { collection, getDocs, getDoc, query, where, doc, updateDoc, addDoc, serverTimestamp, writeBatch, deleteField } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getCrossmatchTestsForRequest } from './crossmatch.service.js';
import { getAvailableBloodBags, updateMultipleBagStatuses } from './inventory.service.js';
import { createNotification } from './notification.service.js';
import { getRequestById } from './request.queries.js';
import { getPatientById } from './patient.service.js';
import { runGlobalMatching } from './blood-match.service.js';
import { getCurrentUser } from './auth.service.js';

/**
 * Recalculates and updates the status of a request based on its crossmatched bags.
 * @param {string} requestId The ID of the request to recalculate.
 */
export async function recalculateRequestStatus(requestId) {
    const request = await getRequestById(requestId);
    if (!request) return;

    const tests = await getCrossmatchTestsForRequest(requestId);
    const compatibleTests = tests.filter(t => t.result === 'Pass' || t.result === 'Success');
    const compatibleBagIds = compatibleTests.map(t => t.bloodBagId);

    const allocatedCount = compatibleBagIds.length;
    const requiredQuantity = request.quantity;
    let newStatus = request.status;

    if (allocatedCount >= requiredQuantity) {
        newStatus = 'allocated';
    } else if (allocatedCount > 0) {
        newStatus = 'partially_allocated';
    } else {
        newStatus = 'pending';
    }

    if (request.status === 'crossmatching' && allocatedCount === 0) {
        newStatus = 'pending';
    }

    const requestRef = doc(db, 'requests', requestId);
    await updateDoc(requestRef, {
        status: newStatus,
        allocatedCount: allocatedCount,
        allocatedBags: compatibleBagIds
    });

    console.log(`Request ${requestId} status recalculated to ${newStatus}.`);
}


/**
 * Fetches all documents from the 'requests' collection in Firestore.
 * @returns {Promise<Array>} A promise that resolves to an array of request objects.
 */
export async function getRequests() {
    try {
        const requestsCollection = collection(db, 'requests');
        const q = query(requestsCollection);
        const querySnapshot = await getDocs(q);
        const requests = [];
        querySnapshot.forEach((doc) => {
            requests.push({ id: doc.id, ...doc.data() });
        });

        const priorityMap = {
            'EMERGENCY': 1,
            'URGENT': 2,
            'ROUTINE': 3
        };

        requests.sort((a, b) => {
            const priorityA = priorityMap[a.urgency] || 4;
            const priorityB = priorityMap[b.urgency] || 4;
            return priorityA - priorityB;
        });

        return requests;
    } catch (error) {
        console.error("Error fetching requests: ", error);
        return [];
    }
}



/**
 * Cancels a request by setting its status to 'cancelled'.
 * @param {string} requestId - The ID of the request to cancel.
 */
export async function cancelRequest(requestId) {
    const requestRef = doc(db, 'requests', requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
        console.error(`Request with ID ${requestId} not found.`);
        return;
    }

    const requestData = requestSnap.data();
    const allocatedBags = requestData.allocatedBags || [];

    const batch = writeBatch(db);

    // 1. Update the request status to 'CANCELLED_BY_HOSPITAL'
    batch.update(requestRef, { status: 'cancelled' });

    // 2. For each allocated bag, update its status back to "available" and remove the requestId.
    if (allocatedBags.length > 0) {
        allocatedBags.forEach(bagId => {
            const bagRef = doc(db, 'bloodbags', bagId);
            batch.update(bagRef, {
                status: 'Available',
                requestId: deleteField()
            });
        });
    }

    await batch.commit();
    console.log(`Request ${requestId} has been cancelled and ${allocatedBags.length} bags have been made available.`);

    try {
        const user = await getCurrentUser();
        const cancellerName = user ? user.fullName : 'A hospital staff member';
        
        const messageToBloodBank = `Request #${requestId} has been cancelled.`;
        await createNotification(messageToBloodBank, 'bloodbank');

        const messageToHospital = `Request #${requestId} was cancelled by ${cancellerName}.`;
        await createNotification(messageToHospital, 'hospital');

    } catch (error) {
        console.error("Error creating cancellation notifications:", error);
    }

    // 3. After all allocated bags have been updated, call runGlobalMatching()
    console.log("Calling runGlobalMatching from cancelRequest");
    await runGlobalMatching();
}



/**
 * Creates a new blood request in Firestore.
 * @param {object} requestData - The data for the new request, matching the new schema.
 * @returns {Promise<string>} The ID of the newly created request.
 */
export async function createRequest(requestData) {
    try {
        if ((!requestData.patientId && requestData.bloodType !== 'Any') || !requestData.quantity || !requestData.urgency) {
            throw new Error("Missing required fields for creating a request.");
        }

        const newRequestData = {
            patientId: requestData.patientId,
            bloodType: requestData.bloodType,
            quantity: requestData.quantity,
            urgency: requestData.urgency,
            condition: requestData.condition || '',
            scheduledAt: requestData.scheduledAt || null,
            specialRequirements: requestData.specialRequirements || [],
            status: 'pending',
            allocatedCount: 0,
            matchedCount: 0,
            pendingCount: 0,
            allocatedBags: [],
            createdAt: serverTimestamp()
        };

        const requestsCollection = collection(db, 'requests');
        const docRef = await addDoc(requestsCollection, newRequestData);

        if (requestData.urgency === 'EMERGENCY' || requestData.urgency === 'URGENT') {
            const patient = requestData.patientId ? await getPatientById(requestData.patientId) : null;
            const patientName = patient ? patient.fullName : 'Emergency Request';
            const message = `${requestData.urgency} REQUEST for Patient ${patientName} (${requestData.bloodType || 'N/A'})`;
            try {
                await createNotification(message, 'bloodbank');
            } catch (error) {
                console.error("Error creating request notification:", error);
            }
        }

        // The request object to pass to the matching function
        const createdRequest = { id: docRef.id, ...newRequestData };

        // Trigger the matching algorithm asynchronously
        console.log("Calling runGlobalMatching from createRequest");
        runGlobalMatching().catch(console.error);

        return docRef.id;
    } catch (error) {
        console.error("Error creating request: ", error);
        throw error;
    }
}

/**
 * Updates a request's matched count, allocated bags, and status after a matching run.
 * @param {string} requestId - The ID of the request to update.
 * @param {Array} matchedBags - An array of bag objects that were matched.
 * @param {string} status - The new status for the request.
 */
export async function updateRequestAfterMatching(requestId, matchedBags, status) {
    const requestRef = doc(db, 'requests', requestId);
    const matchedBagIds = matchedBags.map(bag => bag.id);

    const updateData = {
        status: status,
        matchedCount: matchedBags.length,
        allocatedBags: matchedBagIds,
    };

    await updateDoc(requestRef, updateData);
    console.log(`Request ${requestId} updated after matching: status=${status}, matchedCount=${matchedBags.length}`);
}
