/**
 * questionnaire.service.js
 * Manages all Firestore database operations for the eligibilityQuestionnaires collection.
 */

import { db } from '../firebase-config.js';
import { collection, getDocs, addDoc, serverTimestamp, query, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

/**
 * Fetches all documents from the 'eligibilityQuestionnaires' collection.
 * @returns {Promise<Array>} A promise that resolves to an array of questionnaire objects.
 */
export async function getQuestionnaires() {
    try {
        const questionnairesCollection = collection(db, 'eligibilityQuestionnaires');
        const querySnapshot = await getDocs(questionnairesCollection);
        const questionnaires = [];
        querySnapshot.forEach((doc) => {
            questionnaires.push({ id: doc.id, ...doc.data() });
        });
        return questionnaires;
    } catch (error) {
        console.error("Error fetching questionnaires: ", error);
        return [];
    }
}

/**
 * Adds a new questionnaire document to the 'eligibilityQuestionnaires' collection.
 * @param {object} questionnaireData - The data for the new questionnaire.
 * @returns {Promise<string>} The ID of the newly created document.
 */
export async function addQuestionnaire(questionnaireData) {
    if (!questionnaireData.donorId || !questionnaireData.answers || !questionnaireData.result) {
        throw new Error("Donor ID, answers, and a result are required to create a questionnaire.");
    }

    const newQuestionnaire = {
        donorId: questionnaireData.donorId,
        nationalId: questionnaireData.nationalId || null,
        address: questionnaireData.address || null,
        phone: questionnaireData.phone || null,
        lastDonationDate: questionnaireData.lastDonationDate || null,
        answers: questionnaireData.answers, // Object containing all question responses
        result: questionnaireData.result, // 'Pass', 'Temporary Disqualification', 'Permanent Disqualification'
        createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'eligibilityQuestionnaires'), newQuestionnaire);
    console.log(`Successfully added questionnaire with ID: ${docRef.id}`);
    return docRef.id;
}
