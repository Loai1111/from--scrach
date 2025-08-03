/**
 * patient.service.js
 * Manages all Firestore database operations for the patients collection.
 *
 */

import { db } from '../firebase-config.js';
import {
    collection,
    getDocs,
    addDoc,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {
    getAntibodyScreeningTestsByPatientId
} from './labTest.service.js';

/**
 * Fetches all documents from the 'patients' collection.
 * @returns {Promise<Array>} A promise that resolves to an array of patient objects.
 */
export async function getPatients() {
    try {
        const patientsCollection = collection(db, 'patients');
        const querySnapshot = await getDocs(patientsCollection);
        const patients = [];
        querySnapshot.forEach((doc) => {
            patients.push({ id: doc.id, ...doc.data() });
        });
        return patients;
    } catch (error) {
        console.error("Error fetching patients: ", error);
        return [];
    }
}

/**
 * Adds a new patient document to the 'patients' collection.
 * @param {object} patientData - The data for the new patient.
 * @returns {Promise<object>} A promise that resolves to the new document reference.
 */
export async function addPatient(patientData) {
    const { fullName, dob, sex, bloodGroup, rhFactor } = patientData;

    if (!fullName || !dob || !sex || !bloodGroup) {
        throw new Error("Missing required patient fields.");
    }

    const newPatientData = {
        fullName,
        dob,
        sex,
        bloodGroup,
        rhFactor,
        bloodType: `${bloodGroup}${rhFactor}`,
        bloodTypeConfirmed: false, // Default to false
        currentAntibodies: [], // New field for active antibodies
        antibodyHistory: [], // New field for historical antibody data
        lastBloodTest: null,
        createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'patients'), newPatientData);
    console.log(`Successfully added patient with ID: ${docRef.id}`);
    return docRef;
}

/**
 * Updates an existing patient's data.
 * @param {string} patientId - The ID of the patient to update.
 * @param {object} updatedData - The new data to merge into the document.
 */
export async function updatePatient(patientId, updatedData) {
    const patientRef = doc(db, 'patients', patientId);

    // a. Fetch the complete, current patient document from Firestore.
    const patientSnap = await getDoc(patientRef);
    if (!patientSnap.exists()) {
        console.error("No such patient document!");
        return;
    }
    const currentPatientData = patientSnap.data();

    // b. From the fetched document, get the existing antibodyHistory array.
    const antibodyHistory = currentPatientData.antibodyHistory || [];

    // c. Check if the incoming updatedData contains a currentAntibodies array.
    if (updatedData.currentAntibodies && Array.isArray(updatedData.currentAntibodies)) {
        // d. Iterate through each antibody in updatedData.currentAntibodies.
        updatedData.currentAntibodies.forEach(antibodyName => {
            // e. For each antibody, check if an object with that same antibody value already exists.
            const alreadyExists = antibodyHistory.some(
                (historyItem) => historyItem.antibody === antibodyName
            );

            // f. If it does not exist, add a new object.
            if (!alreadyExists) {
                antibodyHistory.push({
                    antibody: antibodyName,
                    dateDetected: new Date(),
                });
            }
        });
    }

    // g. After the loop is complete, create the object for the update call.
    const finalUpdateData = {
        ...updatedData,
        antibodyHistory: antibodyHistory,
    };

    // h. Proceed with the updateDoc call using the modified data.
    await updateDoc(patientRef, finalUpdateData);
    console.log(`Successfully updated patient: ${patientId}`);
}

/**
 * Fetches a single patient document by its ID.
 * @param {string} patientId - The ID of the patient to fetch.
 * @returns {Promise<object|null>} The patient data or null if not found.
 */
export async function getPatientById(patientId) {
    try {
        const patientRef = doc(db, 'patients', patientId);
        const docSnap = await getDoc(patientRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.log("No such patient document!");
            return null;
        }
    } catch (error) {
        console.error("Error fetching patient by ID:", error);
        return null;
    }
}
