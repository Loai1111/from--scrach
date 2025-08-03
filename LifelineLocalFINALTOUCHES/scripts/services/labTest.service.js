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
    if (testData.testType === 'ANTIBODY_SCREENING') {
        return addAntibodyScreeningTest(testData);
    }

    if (!testData.healthScreeningId || !testData.donorId || !testData.result || !testData.bloodLevels || !testData.viralMarkers) {
        throw new Error("Health Screening ID, Donor ID, result, blood levels, and viral markers are required to create a standard lab test.");
    }

    const newTest = {
        ...testData,
        antigen_profile: testData.antigen_profile || [],
        cmvStatus: testData.cmvStatus || 'Unknown',
        sickleCellStatus: testData.sickleCellStatus || 'Unknown',
        createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'labTests'), newTest);
    console.log(`Successfully added lab test with ID: ${docRef.id}`);
    return docRef.id;
}

/**
 * Adds a new antibody screening test document to the 'labTests' collection for a patient.
 * @param {object} testData - The data for the new antibody screening test.
 * @returns {Promise<string>} The ID of the newly created document.
 */
export async function addAntibodyScreeningTest(testData) {
    if (!testData.patientId || !testData.hospitalId) {
        throw new Error("Patient ID and Hospital ID are required for an antibody screening test.");
    }

    const newTest = {
        testType: 'ANTIBODY_SCREENING',
        patientId: testData.patientId,
        hospitalId: testData.hospitalId,
        status: 'Pending',
        result: {
            bloodGroup: testData.result?.bloodGroup || null,
            rhFactor: testData.result?.rhFactor || null,
            antibodiesDetected: testData.result?.antibodiesDetected || []
        },
        createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'labTests'), newTest);
    console.log(`Successfully added antibody screening test with ID: ${docRef.id}`);
    return docRef.id;
}

/**
 * Fetches a lab test by donor ID.
 * @param {string} donorId - The ID of the donor.
 * @returns {Promise<object|null>} The lab test data or null if not found.
 */
export async function getLabTestByDonorId(donorId) {
    try {
        const testsCollection = collection(db, 'labTests');
        const q = query(testsCollection, where("donorId", "==", donorId));
        const querySnapshot = await getDocs(q);
        const tests = [];
        querySnapshot.forEach((doc) => {
            tests.push({ id: doc.id, ...doc.data() });
        });
        
        // Return the most recent lab test for the donor
        if (tests.length > 0) {
            return tests.sort((a, b) => b.createdAt - a.createdAt)[0];
        }
        return null;
    } catch (error) {
        console.error("Error fetching lab test by donor ID:", error);
        return null;
    }
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

/**
 * Fetches a lab test by its ID.
 * @param {string} labTestId - The ID of the lab test.
 * @returns {Promise<object|null>} The lab test data or null if not found.
 */
export async function getLabTestById(labTestId) {
    try {
        const labTestRef = doc(db, 'labTests', labTestId);
        const docSnap = await getDoc(labTestRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.log("No such lab test document!");
            return null;
        }
    } catch (error) {
        console.error("Error fetching lab test by ID:", error);
        return null;
    }
}

/**
 * Fetches all antibody screening tests for a specific patient.
 * @param {string} patientId - The ID of the patient.
 * @returns {Promise<Array>} A promise that resolves to an array of antibody screening test objects.
 */
export async function getAntibodyScreeningTestsByPatientId(patientId) {
    try {
        const testsCollection = collection(db, 'labTests');
        const q = query(
            testsCollection,
            where("patientId", "==", patientId),
            where("testType", "==", "ANTIBODY_SCREENING")
        );
        const querySnapshot = await getDocs(q);
        const tests = [];
        querySnapshot.forEach((doc) => {
            tests.push({ id: doc.id, ...doc.data() });
        });
        return tests;
    } catch (error) {
        console.error("Error fetching antibody screening tests by patient ID:", error);
        return [];
    }
}
