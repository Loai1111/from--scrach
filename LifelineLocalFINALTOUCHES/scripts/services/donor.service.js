import { db } from '../firebase-config.js';
import { collection, getDocs, addDoc, doc, setDoc, updateDoc, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

/**
 * Fetches all documents from the 'donors' collection.
 * @returns {Promise<Array>} A promise that resolves to an array of donor objects.
 */
export async function getDonors() {
    try {
        const donorsCollection = collection(db, 'donors');
        const querySnapshot = await getDocs(donorsCollection);
        const donors = [];
        querySnapshot.forEach((doc) => {
            donors.push({ id: doc.id, ...doc.data() });
        });
        return donors;
    } catch (error) {
        console.error("Error fetching donors: ", error);
        return [];
    }
}
/**
 * Fetches a single donor by their document ID.
 * @param {string} donorId - The ID of the donor to fetch.
 * @returns {Promise<object|null>} A promise that resolves to the donor object or null if not found.
 */
export async function getDonor(donorId) {
    try {
        const donorRef = doc(db, 'donors', donorId);
        const docSnap = await getDoc(donorRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.warn(`No donor found with ID: ${donorId}`);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching donor with ID ${donorId}:`, error);
        return null;
    }
}


/**
 * Adds a new donor document to the 'donors' collection.
 * @param {object} donorData - The data for the new donor.
 * @returns {Promise<object>} A promise that resolves to the new document reference.
 */
export async function addDonor(donorData) {
    if (!donorData.fullName || !donorData.dob || !donorData.sex || !donorData.bloodType || (!donorData.email && !donorData.phone)) {
        throw new Error("Missing required donor fields. Full Name, DOB, Sex, Blood Type, and either Email or Phone are required.");
    }
    const newDonorData = {
        fullName: donorData.fullName,
        dob: donorData.dob,
        sex: donorData.sex,
        bloodType: donorData.bloodType.toUpperCase(),
        email: donorData.email || null,
        phone: donorData.phone || null,
        source: donorData.source || 'Blood Bank', // Default to 'Blood Bank'
        disqualificationStatus: 'None', // All new donors start as eligible
        donationRecord: 0, // Initialize donation record
        createdAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, 'donors'), newDonorData);
    console.log(`Successfully added donor with auto-generated ID: ${docRef.id}`);
    return docRef;
}

/**
 * Updates an existing donor's data.
 * @param {string} donorId - The ID of the donor to update.
 * @param {object} updatedData - The new data to merge into the document.
 */
export async function updateDonor(donorId, updatedData) {
    const donorRef = doc(db, 'donors', donorId);
    // Use setDoc with merge:true to update, which prevents overwriting fields not included in updatedData
    await setDoc(donorRef, updatedData, { merge: true });
    console.log(`Successfully updated donor: ${donorId}`);
}

/**
 * Updates the disqualification status of a specific donor to 'Permanent'. 
 * This is a terminal action based on test results.
 * @param {string} donorId - The ID of the donor to update.
 * @param {string} status - The new disqualification status. Must be 'Permanent' or 'None'.
 */
export async function updateDonorDisqualificationStatus(donorId, status) {
    if (!donorId || (status !== 'Permanent' && status !== 'None')) {
        console.error("Invalid parameters for updating disqualification status.");
        return;
    };
    const donorRef = doc(db, 'donors', donorId);
    await updateDoc(donorRef, {
        disqualificationStatus: status
    });
    console.log(`Updated donor ${donorId} disqualification status to ${status}`);
}

/**
 * Increments the donation record of a specific donor.
 * @param {string} donorId - The ID of the donor to update.
 */
export async function incrementDonationRecord(donorId) {
    if (!donorId) {
        console.error("Invalid donorId provided for incrementing donation record.");
        return;
    }
    const donorRef = doc(db, 'donors', donorId);
    await updateDoc(donorRef, {
        donationRecord: increment(1)
    });
    console.log(`Incremented donation record for donor ${donorId}.`);
}
