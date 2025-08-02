// healthScreening.service.js

import { db } from '../firebase-config.js';
import { collection, getDocs, addDoc, serverTimestamp, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

/**
 * Fetches all documents from the 'healthScreenings' collection.
 * @returns {Promise<Array>} A promise that resolves to an array of health screening objects.
 */
export async function getHealthScreenings() {
    try {
        const screeningsCollection = collection(db, 'healthScreenings');
        const querySnapshot = await getDocs(screeningsCollection);
        const screenings = [];
        querySnapshot.forEach((doc) => {
            screenings.push({ id: doc.id, ...doc.data() });
        });
        return screenings;
    } catch (error) {
        console.error("Error fetching health screenings: ", error);
        return [];
    }
}

/**
 * Fetches a single health screening document by its ID.
 * @param {string} id - The ID of the health screening document to fetch.
 * @returns {Promise<object|null>} A promise that resolves to the health screening object or null if not found.
 */
export async function getHealthScreening(id) {
    try {
        const docRef = doc(db, 'healthScreenings', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.log("No such document!");
            return null;
        }
    } catch (error) {
        console.error("Error fetching health screening:", error);
        return null;
    }
}

/**
 * Adds a new health screening document to the 'healthScreenings' collection.
 * @param {object} screeningData - The data for the new health screening.
 * @returns {Promise<string>} The ID of the newly created document.
 */
export async function addHealthScreening(screeningData) {
    if (!screeningData.questionnaireId || !screeningData.donorId || !screeningData.result || !screeningData.vitals) {
        throw new Error("Questionnaire ID, Donor ID, vitals, and a result are required to create a health screening.");
    }

    const newScreening = {
        questionnaireId: screeningData.questionnaireId,
        donorId: screeningData.donorId,
        vitals: screeningData.vitals,
        comments: screeningData.comments || '',
        result: screeningData.result,
        createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'healthScreenings'), newScreening);
    console.log(`Successfully added health screening with ID: ${docRef.id}`);
    return docRef.id;
}