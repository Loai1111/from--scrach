
// scripts/services/request.service.js

import { db } from '../firebase-config.js';
import { collection, getDocs, getDoc, query, where, doc, updateDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getCrossmatchTestsForRequest } from './crossmatch.service.js';
import { getAvailableBloodBags } from './inventory.service.js';
import { createNotification } from './notification.service.js';
import { bloodCompatibility } from '../utils.js';

/**
 * Creates notifications for request status changes.
 * @param {string} oldStatus - The previous status.
 * @param {string} newStatus - The new status.
 * @param {string} requestId - The ID of the request.
 */
async function createStatusChangeNotification(oldStatus, newStatus, requestId) {
    if (oldStatus === newStatus) return;

    if (newStatus.startsWith('ESCALATED') && !oldStatus.startsWith('ESCALATED')) {
        const reason = newStatus.includes('(') ? newStatus.split('(')[1].replace(')', '') : 'manual escalation';
        const message = `Request #${requestId} has been escalated. Reason: ${reason}.`;
        await createNotification(message, 'hospital');
        await createNotification(message, 'bloodbank');
    } else if (newStatus === 'CANCELLED_BY_HOSPITAL' && oldStatus !== 'CANCELLED_BY_HOSPITAL') {
        const message = `Request #${requestId} has been cancelled.`;
        await createNotification(message, 'bloodbank');
    }
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
        return requests;
    } catch (error) {
        console.error("Error fetching requests: ", error);
        return [];
    }
}

/**
 * Fetches a single request document by its ID.
 * @param {string} requestId - The ID of the request to fetch.
 * @returns {Promise<object|null>} The request data or null if not found.
 */
export async function getRequestById(requestId) {
    try {
        const requestRef = doc(db, 'requests', requestId);
        const docSnap = await getDoc(requestRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.log("No such request document!");
            return null;
        }
    } catch (error) {
        console.error("Error fetching request by ID:", error);
        return null;
    }
}


/**
 * Updates the status of a specific request.
 * @param {string} requestId - The ID of the request to update.
 * @param {string} newStatus - The new status to set.
 */
export async function updateRequestStatus(requestId, newStatus) {
    const requestRef = doc(db, 'requests', requestId);
    const requestSnap = await getDoc(requestRef);
    const oldStatus = requestSnap.exists() ? requestSnap.data().status : null;

    await updateDoc(requestRef, {
        status: newStatus
    });

    await createStatusChangeNotification(oldStatus, newStatus, requestId);

    console.log(`Updated request ${requestId} status to ${newStatus}`);
}

/**
 * Cancels a request by setting its status to 'CANCELLED_BY_HOSPITAL'.
 * @param {string} requestId - The ID of the request to cancel.
 */
export async function cancelRequest(requestId) {
    // We can reuse updateRequestStatus for this specific action
    await updateRequestStatus(requestId, 'CANCELLED_BY_HOSPITAL');
    console.log(`Request ${requestId} has been cancelled by the hospital.`);
}

/**
 * Recalculates the status of a request based on crossmatch tests and inventory.
 * @param {string} requestId - The ID of the request to recalculate.
 * @param {object} [options] - Optional parameters.
 * @param {boolean} [options.checkInventory=false] - Flag to check inventory for escalation.
 */
export async function recalculateRequestStatus(requestId, options = {}) {
    try {
        const request = await getRequestById(requestId);
        if (!request) throw new Error(`Request ${requestId} not found.`);

        const terminalStatuses = ['FULFILLED', 'CANCELLED_BY_HOSPITAL', 'REJECTED_BY_BLOODBANK'];
        if (terminalStatuses.includes(request.status)) {
            console.log(`Request ${requestId} is in a terminal state (${request.status}). No status change.`);
            return;
        }

        const allTests = await getCrossmatchTestsForRequest(requestId);
        const compatibleTests = allTests.filter(t => t.result === 'Compatible');
        const pendingTests = allTests.filter(t => t.result === 'Pending');
        const incompatibleTests = allTests.filter(t => t.result === 'Incompatible');
        const allocatedBagIds = compatibleTests.map(t => t.bloodBagId);

        const requiredQuantity = request.quantity;
        let newStatus = request.status;

        if (compatibleTests.length >= requiredQuantity) {
            newStatus = 'FULFILLED';
        } else if (compatibleTests.length > 0) {
            newStatus = 'ALLOCATED';
        } else if (pendingTests.length > 0) {
            newStatus = 'PENDING_CROSSMATCH';
        } else if (incompatibleTests.length > 0 && pendingTests.length === 0 && compatibleTests.length === 0) {
            newStatus = 'ESCALATED_TO_DONORS (crossmatch_negative)';
        } else {
            const availableBags = await getAvailableBloodBags();
            const suitableBags = availableBags.filter(bag =>
                (bloodCompatibility[request.bloodType] || []).includes(bag.bloodType)
            );

            if (suitableBags.length === 0 && allTests.length === 0) {
                newStatus = 'ESCALATED_TO_DONORS (no stock)';
            } else if (request.status === 'PENDING_ALLOCATION' && suitableBags.length === 0) {
                newStatus = 'ESCALATED_TO_DONORS (no stock)';
            } else if (request.status.startsWith('ESCALATED') && compatibleTests.length < requiredQuantity) {
                newStatus = request.status;
            } else {
                newStatus = 'PENDING_ALLOCATION';
            }
        }

        const oldStatus = request.status;

        if (oldStatus !== newStatus) {
            const requestRef = doc(db, 'requests', requestId);
            await updateDoc(requestRef, {
                status: newStatus,
                allocatedCount: compatibleTests.length,
                pendingCount: pendingTests.length,
                allocatedBags: allocatedBagIds,
            });

            await createStatusChangeNotification(oldStatus, newStatus, requestId);

            console.log(`Recalculated request ${requestId}: Status set to '${newStatus}'.`);
        } else {
            console.log(`Request ${requestId} status remains '${request.status}'.`);
        }

    } catch (error) {
        console.error(`Error recalculating status for request ${requestId}:`, error);
    }
}


/**
 * Creates a new blood request in Firestore.
 * @param {object} requestData - The data for the new request, matching the new schema.
 * @returns {Promise<string>} The ID of the newly created request.
 */
export async function createRequest(requestData) {
    try {
        if (!requestData.patientId || !requestData.bloodType || !requestData.quantity || !requestData.urgency) {
            throw new Error("Missing required fields for creating a request.");
        }

        const newRequest = {
            patientId: requestData.patientId,
            bloodType: requestData.bloodType,
            quantity: requestData.quantity,
            urgency: requestData.urgency,
            condition: requestData.condition || '',
            scheduledAt: requestData.scheduledAt || null,
            status: 'PENDING_ALLOCATION',
            allocatedCount: 0,
            pendingCount: 0,
            allocatedBags: [],
            createdAt: serverTimestamp()
        };

        const requestsCollection = collection(db, 'requests');
        const docRef = await addDoc(requestsCollection, newRequest);
        return docRef.id;
    } catch (error) {
        console.error("Error creating request: ", error);
        throw error;
    }
}

