/**
 * patient.service.js
 * Manages all Firestore database operations for the patients collection.
 *
 */

import { db } from '../firebase-config.js';
import { collection, getDocs, addDoc, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

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
    const { fullName, dob, sex, bloodType, rhFactor, unexpectedAntibodies } = patientData;

    if (!fullName || !dob || !sex || !bloodType) {
        throw new Error("Missing required patient fields.");
    }

    const newPatientData = {
        fullName,
        dob,
        sex,
        antigenProfile: {
            abo: bloodType === 'Unknown' ? 'Unknown' : bloodType,
            rh: rhFactor,
        },
        antibodyHistory: {
            expectedAntibodies: [], // This can be populated based on blood type if needed
            unexpectedAntibodies: unexpectedAntibodies || [],
        },
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
    await setDoc(patientRef, updatedData, { merge: true });
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
