import { db } from '../firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

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