import { db } from '../firebase-config.js';
import { collection, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { addBloodBag } from './inventory.service.js';
import { incrementDonationRecord } from './donor.service.js';

/**
 * Fetches all documents from the 'donations' collection.
 * @returns {Promise<Array>} A promise that resolves to an array of donation objects.
 */
export async function getDonations() {
    try {
        const donationsCollection = collection(db, 'donations');
        const querySnapshot = await getDocs(donationsCollection);
        const donations = [];
        querySnapshot.forEach((doc) => {
            donations.push({ id: doc.id, ...doc.data() });
        });
        return donations;
    } catch (error) {
        console.error("Error fetching donations: ", error);
        return [];
    }
}

/**
 * Records a new donation, which involves creating a new blood bag and then
 * a donation record that links to it.
 * @param {object} donor - The full donor object, containing id and bloodType.
 * @param {string} labTestId - The ID of the passed lab test.
 * @returns {Promise<object>} A promise that resolves to the new donation document reference.
 */
export async function addDonation(donor, labTestId) {
    if (!donor || !donor.id || !donor.bloodType) {
        throw new Error("A complete donor object with id and bloodType is required.");
    }
    if (!labTestId) {
        throw new Error("A labTestId is required to record a donation.");
    }
    
    // Step 1: Create the new blood bag.
    // The `addBloodBag` function will set the donatedAt timestamp.
    const newBagRef = await addBloodBag({
        donorId: donor.id,
        bloodType: donor.bloodType
    });

    // Step 2: Create the donation record linking to the new blood bag and the lab test.
    const newDonationData = {
        donorId: donor.id,
        labTestId: labTestId,
        bloodBagId: newBagRef.id,
        donatedAt: serverTimestamp(), // Record the donation time.
        status: 'Completed'
    };
    
    const donationDocRef = await addDoc(collection(db, 'donations'), newDonationData);
    console.log(`Successfully recorded donation ${donationDocRef.id} for donor ${donor.id}.`);
    
    // Step 3: Increment the donor's donation record.
    await incrementDonationRecord(donor.id);

    // Step 4: (Optional but recommended) Update the lab test to mark it as used.
    // This prevents a single passed test from being used for multiple donations.

    return donationDocRef;
}
