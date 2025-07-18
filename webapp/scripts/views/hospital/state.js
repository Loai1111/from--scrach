/**
 * state.js (hospital)
 * Manages the shared state for the hospital portal application.
 */

// --- Core App State ---
export let currentView = 'requests';
export let allPageData = [];
export let filteredPageData = [];
export let selectedItemId = null;
export let isEditMode = false;

// --- Data Caches ---
export let allPatientsCache = [];
export let crossmatchReportsCache = [];

// --- Modal State ---
export let selectedPatientForRequest = null;


/**
 * Updates the value of a state variable.
 * @param {string} key - The name of the state variable to update.
 * @param {*} value - The new value for the state variable.
 */
export function setState(key, value) {
    switch (key) {
        // Core
        case 'currentView': currentView = value; break;
        case 'allPageData': allPageData = value; break;
        case 'filteredPageData': filteredPageData = value; break;
        case 'selectedItemId': selectedItemId = value; break;
        case 'isEditMode': isEditMode = value; break;
        
        // Caches
        case 'allPatientsCache': allPatientsCache = value; break;
        case 'crossmatchReportsCache': crossmatchReportsCache = value; break;

        // Modal
        case 'selectedPatientForRequest': selectedPatientForRequest = value; break;

        default:
            console.error(`Unknown state key: ${key}`);
    }
}
