import { db } from '../firebase-config.js';
import { collection, getDocs, addDoc, serverTimestamp, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { addBloodBag } from './inventory.service.js';
import { incrementDonationRecord } from './donor.service.js';
import { runGlobalMatching } from './blood-match.service.js';
import { getLabTestById } from './labTest.service.js';

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

    // Step 1: Fetch the complete and up-to-date labTest document from Firestore.
    const labTestRef = doc(db, 'labTests', labTestId);
    const labTestSnap = await getDoc(labTestRef);

    if (!labTestSnap.exists()) {
        throw new Error(`Lab test with ID ${labTestId} not found.`);
    }
    const labTest = labTestSnap.data();

    // Step 2: Create a new, clean bloodBagData object with explicitly mapped fields.
    const bloodBagData = {
        donorId: donor.id,
        bloodType: donor.bloodType,
        donatedAt: new Date(), // Use current date for donation
        antigen_profile: labTest.antigenProfile || [], // Ensure correct field name
        cmvStatus: labTest.cmvStatus || 'Unknown',
        sickleCellStatus: labTest.sickleCellStatus || 'Unknown',
    };

    // Step 3: Call inventory.addBloodBag with the new data.
    const newBagRef = await addBloodBag(bloodBagData);

    // Step 4: Create the donation record.
    const newDonationData = {
        donorId: donor.id,
        labTestId: labTestId,
        bloodBagId: newBagRef.id,
        donatedAt: serverTimestamp(),
        status: 'Completed'
    };

    const donationDocRef = await addDoc(collection(db, 'donations'), newDonationData);
    console.log(`Successfully recorded donation ${donationDocRef.id} for donor ${donor.id}.`);

    // Step 5: Increment the donor's donation record.
    await incrementDonationRecord(donor.id);

    // Step 6: Trigger the global matching algorithm asynchronously.
    runGlobalMatching().catch(console.error);

    return donationDocRef;
}
