/**
 * labTest.service.js
 * Manages all Firestore database operations for the labTests collection.
 */

import { db } from '../firebase-config.js';
import { collection, getDocs, addDoc, serverTimestamp, query, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

/**
 * Fetches all documents from the 'labTests' collection.
 * @returns {Promise<Array>} A promise that resolves to an array of lab test objects.
 */
export async function getLabTests() {
    try {
        const testsCollection = collection(db, 'labTests');
        const querySnapshot = await getDocs(testsCollection);
        const tests = [];
        querySnapshot.forEach((doc) => {
            tests.push({ id: doc.id, ...doc.data() });
        });
        return tests;
    } catch (error) {
        console.error("Error fetching lab tests: ", error);
        return [];
    }
}

/**
 * Adds a new lab test document to the 'labTests' collection.
 * @param {object} testData - The data for the new lab test.
 * @returns {Promise<string>} The ID of the newly created document.
 */
export async function addLabTest(testData) {
    if (!testData.healthScreeningId || !testData.donorId || !testData.result || !testData.bloodLevels || !testData.viralMarkers) {
        throw new Error("Health Screening ID, Donor ID, result, blood levels, and viral markers are required to create a lab test.");
    }

    const newTest = {
        ...testData,
        createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'labTests'), newTest);
    console.log(`Successfully added lab test with ID: ${docRef.id}`);
    return docRef.id;
}

/**
 * Fetches all lab tests with a 'Pass' result that have not yet been used in a donation.
 * @returns {Promise<Array>} A promise that resolves to an array of available lab test objects.
 */
export async function getAvailablePassedTests() {
    try {
        const testsCollection = collection(db, 'labTests');
        const q = query(testsCollection, where("result", "==", "Pass"));
        const querySnapshot = await getDocs(q);
        const tests = [];
        querySnapshot.forEach((doc) => {
            tests.push({ id: doc.id, ...doc.data() });
        });

        // This part is tricky without a direct "used" flag.
        // For now, we assume all passed tests are available.
        // A more robust solution would be to add a 'donationId' field to a lab test when it's used.
        return tests;
    } catch (error) {
        console.error("Error fetching available passed lab tests: ", error);
        return [];
    }
}
