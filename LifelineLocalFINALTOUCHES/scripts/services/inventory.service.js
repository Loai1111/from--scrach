import { db } from '../firebase-config.js';
import { collection, getDocs, getDoc, query, where, doc, addDoc, setDoc, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { createNotification } from './notification.service.js';
import { runGlobalMatching } from './blood-match.service.js';

/**
 * Fetches ALL blood bags from the database.
 * @returns {Promise<Array>} A promise that resolves to an array of all blood bag objects.
 */
export async function getAllBloodBags() {
    try {
        const bagsCollection = collection(db, 'bloodbags');
        const querySnapshot = await getDocs(bagsCollection);
        const bloodBags = [];
        querySnapshot.forEach((doc) => {
            bloodBags.push({ id: doc.id, ...doc.data() });
        });
        return bloodBags;
    } catch (error) {
        console.error("Error fetching all blood bags: ", error);
        return [];
    }
}

/**
 * Fetches multiple blood bags by their IDs.
 * @param {Array<string>} bagIds - An array of blood bag IDs.
 * @returns {Promise<Array>} A promise that resolves to an array of blood bag objects.
 */
export async function getBagsByIds(bagIds) {
    if (!bagIds || bagIds.length === 0) {
        return [];
    }
    try {
        const bagsCollection = collection(db, 'bloodbags');
        const q = query(bagsCollection, where("__name__", "in", bagIds));
        const querySnapshot = await getDocs(q);
        const bloodBags = [];
        querySnapshot.forEach((doc) => {
            bloodBags.push({ id: doc.id, ...doc.data() });
        });
        return bloodBags;
    } catch (error) {
        console.error("Error fetching bags by IDs: ", error);
        return [];
    }
}

/**
 * Fetches all blood bags with an 'Available' status.
 * @returns {Promise<Array>} A promise that resolves to an array of blood bag objects.
 */
export async function getAvailableBloodBags() {
    try {
        const bagsCollection = collection(db, 'bloodbags');
        const q = query(bagsCollection, where("status", "==", "Available"));
        const querySnapshot = await getDocs(q);
        const bloodBags = [];
        querySnapshot.forEach((doc) => {
            bloodBags.push({ id: doc.id, ...doc.data() });
        });
        return bloodBags;
    } catch (error) {
        console.error("Error fetching available blood bags: ", error);
        return [];
    }
}

/**
 * Adds a new blood bag document. This function is intended to be called internally
 * by the donation service to ensure atomicity.
 * @param {object} bagData - Must contain donorId and bloodType.
 * @returns {Promise<object>} A promise that resolves to the new document reference.
 */
export async function addBloodBag(bagData) {
    if (!bagData.donorId || !bagData.bloodType) {
        throw new Error("donorId and bloodType are required to create a blood bag.");
    }
    const donationDate = new Date();
    const expiryDate = new Date(donationDate);
    expiryDate.setDate(donationDate.getDate() + 42);

    const newBagData = {
        donorId: bagData.donorId,
        bloodType: bagData.bloodType,
        status: 'Available', // Bags are immediately available upon donation
        donatedAt: serverTimestamp(),
        expiryDate: expiryDate, // Storing as a JS Date, Firestore will convert it
        antigen_profile: bagData.antigen_profile || [],
        special_attributes: bagData.special_attributes || [],
        cmvStatus: bagData.cmvStatus || 'Unknown', // CMV status: Positive, Negative, or Unknown
        sickleCellStatus: bagData.sickleCellStatus || 'Unknown' // Sickle Cell status: Positive, Negative, or Unknown
    };
    const docRef = await addDoc(collection(db, 'bloodbags'), newBagData);
    console.log(`Successfully added blood bag with auto-generated ID: ${docRef.id}`);
    return docRef;
}

/**
 * Updates an existing blood bag's data.
 * @param {string} bagId - The ID of the blood bag to update.
 * @param {object} updatedData - The new data to merge into the document.
 */
export async function updateBloodBag(bagId, updatedData) {
    const bagRef = doc(db, 'bloodbags', bagId);
    await setDoc(bagRef, updatedData, { merge: true });
    console.log(`Successfully updated blood bag: ${bagId}`);
}

/**
 * Updates the status of a single blood bag.
 * @param {string} bagId - The ID of the blood bag to update.
 * @param {string} newStatus - The new status to set.
 */
export async function updateBagStatus(bagId, newStatus) {
    const bagRef = doc(db, 'bloodbags', bagId);
    await updateDoc(bagRef, { status: newStatus });
    console.log(`Updated bag ${bagId} status to ${newStatus}`);
}

/**
 * Updates the status of multiple blood bags at once.
 * @param {Array<string>} bloodBagIds - The IDs of the blood bags to update.
 * @param {string} newStatus - The new status to set.
 */
export async function updateMultipleBagStatuses(bloodBagIds, newStatus) {
    if (!bloodBagIds || bloodBagIds.length === 0) return;
    const batch = writeBatch(db);
    bloodBagIds.forEach(bagId => {
        const bagRef = doc(db, 'bloodbags', bagId);
        batch.update(bagRef, { status: newStatus });
    });
    await batch.commit();
    console.log(`Updated status for ${bloodBagIds.length} bags to '${newStatus}'.`);
}


/**
 * Checks for available blood bags that have passed their expiry date and updates their status to 'Expired'.
 * This is intended to be run from the client-side as a cleanup task.
 */
export async function checkAndExpireBloodBags() {
    console.log("Checking for expired blood bags...");
    const now = new Date(); // Use a standard JS Date for comparison
    
    try {
        const bagsCollection = collection(db, 'bloodbags');
        const q = query(bagsCollection, 
            where("status", "==", "Available"),
            where("expiryDate", "<=", now)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("No expired blood bags found to update.");
            return;
        }

        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => {
            console.log(`Marking bag ${doc.id} as Expired.`);
            batch.update(doc.ref, { status: "Expired" });
        });

        await batch.commit();
        console.log(`Successfully updated ${querySnapshot.size} blood bags to 'Expired'.`);

    } catch (error) {
        console.error("Error checking and updating expired blood bags: ", error);
    }
}
