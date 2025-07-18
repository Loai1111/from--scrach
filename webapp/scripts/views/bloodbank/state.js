/**
 * state.js
 * Manages the shared state for the blood bank portal application.
 */

// --- Core App State ---
export let currentView = 'requests';
export let allPageData = [];
export let filteredPageData = [];
export let selectedItemId = null;
export let isEditMode = false;

// --- Data Caches ---
// General
export let allDonorsCache = [];
export let patientsCache = []; // For request details
export let allRequestsCache = [];
export let allDonationsCache = [];
export let allInventoryCache = [];

// Test-specific caches
export let allQuestionnairesCache = [];
export let allScreeningsCache = [];
export let allLabTestsCache = [];
export let allCrossmatchesCache = []; // NEW: Cache for crossmatch tests
export let availableLabTestsCache = []; // FIX: Add cache for available tests for donation

// --- Testing Module State ---
export let currentTestTab = 'questionnaire'; // NEW: Tracks the active tab in the 'Tests' view

// --- Modal & Search State ---
export let selectedLabTestForDonation = null; // FIX: Add state for selected lab test
export let selectedDonorForQuestionnaire = null;
export let selectedQuestionnaireForScreening = null;
export let selectedScreeningForLabTest = null;
export let selectedTestItemId = null;

export function getSelectedTestItem() {
    if (!selectedTestItemId) return null;
    switch (currentTestTab) {
        case 'questionnaire':
            return allQuestionnairesCache.find(item => item.id === selectedTestItemId);
        case 'screening':
            return allScreeningsCache.find(item => item.id === selectedTestItemId);
        case 'lab':
            return allLabTestsCache.find(item => item.id === selectedTestItemId);
        case 'crossmatching':
            return allCrossmatchesCache.find(item => item.id === selectedTestItemId);
        default:
            return null;
    }
}
export function getCurrentTestTabData() {
    switch (currentTestTab) {
        case 'questionnaire':
            return allQuestionnairesCache;
        case 'screening':
            return allScreeningsCache;
        case 'lab':
            return allLabTestsCache;
        case 'crossmatching':
            return allCrossmatchesCache;
        default:
            return [];
    }
}

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
        case 'allDonorsCache': allDonorsCache = value; break;
        case 'patientsCache': patientsCache = value; break;
        case 'allRequestsCache': allRequestsCache = value; break;
        case 'allDonationsCache': allDonationsCache = value; break;
        case 'allInventoryCache': allInventoryCache = value; break;
        case 'allQuestionnairesCache': allQuestionnairesCache = value; break;
        case 'allScreeningsCache': allScreeningsCache = value; break;
        case 'allLabTestsCache': allLabTestsCache = value; break;
        case 'allCrossmatchesCache': allCrossmatchesCache = value; break; // NEW
        case 'availableLabTestsCache': availableLabTestsCache = value; break; // FIX

        // Testing Page
        case 'currentTestTab': currentTestTab = value; break; // NEW

        // Modal & Search Selections
        case 'selectedLabTestForDonation': selectedLabTestForDonation = value; break; // FIX
        case 'selectedDonorForQuestionnaire': selectedDonorForQuestionnaire = value; break;
        case 'selectedQuestionnaireForScreening': selectedQuestionnaireForScreening = value; break;
        case 'selectedScreeningForLabTest': selectedScreeningForLabTest = value; break;
        case 'selectedTestItemId': selectedTestItemId = value; break;

        default:
            console.error(`Unknown state key: ${key}`);
    }
}
