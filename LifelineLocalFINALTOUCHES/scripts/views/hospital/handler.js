/**
 * handler.js (hospital)
 * Contains all logic for the hospital portal application.
 */

import { findCompatibleBloodBags } from '../../services/blood-match.service.js';
import * as services from '../../services/index.js';
import * as ui from './ui.js';
import * as state from './state.js';
import * as utils from '../../utils.js';
import {
    createAntigenAntibodyUI,
    initAntigenAntibodyUI,
    setSelectedButtons,
    getSelectedValues,
    createAntibodyButtonsUI,
    initAntibodyButtonsUI,
    setSelectedAntibodies,
    getSelectedAntibodies
} from '../shared/antigenAntibody.js';

// =================================================================
// --- DATA HANDLING ---
// =================================================================

async function fetchAndDisplayData() {
    ui.showLoadingState();
    try {
        const [requests, patients, crossmatches, notifications] = await Promise.all([
            services.request.getRequests(),
            services.patient.getPatients(),
            services.crossmatch.getAllCrossmatches(),
            services.notification.getNotifications('hospital')
        ]);

        state.setState('allPatientsCache', patients);
        state.setState('crossmatchReportsCache', crossmatches);
        state.setState('allNotifications', notifications);

        let data = [];
        switch (state.currentView) {
            case 'requests':
                data = requests;
                break;
            case 'patients':
                data = patients;
                break;
            case 'notifications':
                data = notifications;
                break;
        }

        state.setState('allPageData', data);
        applyFilters();
        if (state.selectedItemId) {
            ui.renderDetailsPanel();
        }
    } catch (error) {
        console.error(`[Hospital] Error fetching and displaying data for view ${state.currentView}:`, error);
        const tableBody = document.getElementById('data-table-body');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-red-500">An error occurred while loading data. Please check the console for details.</td></tr>`;
        }
    }
}

function applyFilters() {
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const status = statusFilter ? statusFilter.value : 'All';

    const filtered = state.allPageData.filter(item => {
        let matchesSearch = searchTerm === '';
        if (!matchesSearch) {
            if (state.currentView === 'requests') {
                const patient = state.allPatientsCache.find(p => p.id === item.patientId);
                const patientName = patient ? patient.fullName.toLowerCase() : '';
                matchesSearch = patientName.includes(searchTerm) || item.id.toLowerCase().includes(searchTerm);
            } else { // patients
                matchesSearch = item.fullName?.toLowerCase().includes(searchTerm) || item.id.toLowerCase().includes(searchTerm);
            }
        }
        
        let matchesStatus = status === 'All' || item.status.toLowerCase() === status.toLowerCase();
        
        return matchesSearch && (state.currentView === 'patients' || matchesStatus);
    });

    state.setState('filteredPageData', filtered);
    ui.renderPage();
}

// =================================================================
// --- NAVIGATION & VIEW SWITCHING ---
// =================================================================

function handleNavClick(e) {
    e.preventDefault();
    const link = e.target.closest('.nav-link');
    if (!link) return;

    const view = link.id.replace('nav-', '');
    if (state.currentView === view) return;

    state.setState('currentView', view);
    state.setState('selectedItemId', null); 
    
    ui.switchViewUI(view);
    const isNotificationsView = view === 'notifications';
    document.getElementById('main-content').classList.toggle('hidden', isNotificationsView);
    document.getElementById('notifications-page-content').classList.toggle('hidden', !isNotificationsView);
    ui.updatePageActionsUI(getAddHandlerForCurrentView());
    ui.updateTableControlsUI(applyFilters);
    fetchAndDisplayData();
}

async function handleTableClick(e) {
    const row = e.target.closest('tr');
    if (row && row.dataset.id) {
        const patientId = row.dataset.id;
        state.setState('selectedItemId', patientId);
        ui.renderPage();

        if (state.currentView === 'patients') {
            const fullPatientData = await services.patient.getPatientById(patientId);
            if (fullPatientData) {
                const patientIndex = state.allPageData.findIndex(p => p.id === patientId);
                if (patientIndex !== -1) {
                    state.allPageData[patientIndex] = fullPatientData;
                }
                const filteredIndex = state.filteredPageData.findIndex(p => p.id === patientId);
                if (filteredIndex !== -1) {
                    state.filteredPageData[filteredIndex] = fullPatientData;
                }
            }
        }
        
        ui.renderDetailsPanel();
    }
}

// =================================================================
// --- ACTIONS & MODALS ---
// =================================================================

async function handleConfirmReceipt(reportId) {
    if (!reportId) return;

    ui.hideConfirmReceiptModal();

    // Find the original report to revert on failure
    const originalReport = JSON.parse(JSON.stringify(state.crossmatchReportsCache.find(r => r.id === reportId)));

    // Optimistic UI update
    const reportInState = state.crossmatchReportsCache.find(r => r.id === reportId);
    if (reportInState) {
        reportInState.status = 'issued';
        ui.renderDetailsPanel();
    }

    try {
        await services.crossmatch.updateCrossmatchStatus(reportId, 'issued');
        console.log(`[Hospital] Status updated to 'issued' for report: ${reportId}`);
        
        // Refresh data to get the most up-to-date state
        const updatedReports = await services.crossmatch.getAllCrossmatches();
        state.setState('crossmatchReportsCache', updatedReports);
        ui.renderDetailsPanel(); // Re-render with confirmed data
    } catch (error) {
        console.error('Error confirming receipt:', error);
        alert(`Failed to confirm receipt: ${error.message}`);
        
        // Revert optimistic update on error
        const reportToRevert = state.crossmatchReportsCache.find(r => r.id === reportId);
        if (reportToRevert) {
            Object.assign(reportToRevert, originalReport);
            ui.renderDetailsPanel();
        }
    }
}

function handleDetailsActionClick(e) {
    const button = e.target.closest('button');
    if (!button || button.disabled) return;

    // This is now handled by the modal's specific event listener
    // if (button.classList.contains('confirm-receipt-btn')) {
    //     const reportId = button.dataset.reportId;
    //     handleConfirmReceipt(reportId);
    // }
    if (button.id === 'edit-patient-btn') {
        openPatientModal(true);
    } else if (button.id === 'blood-test-btn') {
        openPatientBloodTestModal();
    } else if (button.id === 'cancel-request-btn') {
        handleCancelRequest();
    } else if (button.id === 'find-match-btn') {
        handleFindMatch();
    }
}

function getAddHandlerForCurrentView() {
    return state.currentView === 'requests' ? openRequestModal : () => openPatientModal(false);
}

// --- Patient Modal ---
function openPatientModal(isEdit) {
    state.setState('isEditMode', isEdit);
    const form = document.getElementById('patient-form');
    form.reset();
    
    document.getElementById('patient-modal-title').textContent = isEdit ? 'Edit Patient' : 'Add New Patient';
    document.getElementById('patient-id-display').classList.toggle('hidden', !isEdit);

    if (isEdit) {
        const patient = state.allPageData.find(p => p.id === state.selectedItemId);
        if (!patient) return;
        document.getElementById('patient-id-text').textContent = patient.id;
        document.getElementById('patient-fullName').value = patient.fullName;
        document.getElementById('patient-dob').value = patient.dob;
        document.getElementById('patient-sex').value = patient.sex;
        document.getElementById('patient-blood-type').value = `${patient.bloodGroup}${patient.rhFactor}` || '';

    } else {
       // Clear and initialize for a new patient
       document.getElementById('patient-blood-type').value = '';
    }
    
    document.getElementById('patient-modal').classList.remove('opacity-0', 'pointer-events-none');
}

async function handlePatientFormSubmit(e) {
    e.preventDefault();
    
    const dob = document.getElementById('patient-dob').value;
    
    // NEW: Validate that the date of birth is in the past.
    if (!dob || new Date(dob) >= new Date(utils.getTodayString())) {
        alert('Invalid Date of Birth. It must be in the past.');
        return;
    }

    const bloodType = document.getElementById('patient-blood-type').value;
    let bloodGroup;
    let rhFactor;

    if (bloodType === 'Unknown') {
        bloodGroup = 'Unknown';
        rhFactor = null;
    } else {
        bloodGroup = bloodType.slice(0, -1);
        rhFactor = bloodType.slice(-1);
    }

    const patientData = {
        fullName: document.getElementById('patient-fullName').value,
        dob: dob,
        sex: document.getElementById('patient-sex').value,
        bloodGroup: bloodGroup,
        rhFactor: rhFactor,
        bloodType: bloodType,
    };

    try {
        if (state.isEditMode) {
            await services.patient.updatePatient(state.selectedItemId, patientData);
            alert('Patient updated successfully!');
        } else {
            await services.patient.addPatient(patientData);
            alert('Patient added successfully!');
        }
        document.getElementById('patient-modal').classList.add('opacity-0', 'pointer-events-none');
        fetchAndDisplayData();
    } catch (error) {
        console.error("Error saving patient:", error);
        alert(`An error occurred: ${error.message}`);
    }
}

// --- Request Modal ---
async function openRequestModal() {
    state.setState('selectedPatientForRequest', null);
    const form = document.getElementById('request-form');
    form.reset();

    const quantityInput = document.getElementById('request-quantity');
    quantityInput.value = '';
    const allButtons = document.querySelectorAll('#request-quantity-btns .qty-btn');
    allButtons.forEach(btn => btn.classList.remove('selected'));

    const scheduledAtInput = document.getElementById('request-scheduled-at');
    scheduledAtInput.disabled = true;
    scheduledAtInput.classList.add('bg-gray-100');
    // NEW: Set min date for scheduled date input to today
    scheduledAtInput.min = utils.getTodayString();


    if (state.allPatientsCache.length === 0) {
        state.setState('allPatientsCache', await services.patient.getPatients());
    }

    document.getElementById('request-patient-search-component').classList.remove('hidden');
    document.getElementById('request-selected-patient-display').classList.add('hidden');
    document.getElementById('request-modal').classList.remove('opacity-0', 'pointer-events-none');
}

function handlePatientSearchInput(e) {
    const searchResults = document.getElementById('request-patient-search-results');
    const searchTerm = e.target.value.toLowerCase();
    if (searchTerm.length < 2) {
        searchResults.classList.add('hidden');
        return;
    }
    const results = state.allPatientsCache.filter(p => p.fullName.toLowerCase().includes(searchTerm) || p.id.toLowerCase().includes(searchTerm));
    searchResults.innerHTML = results.length > 0
        ? results.map(p => `<div class="p-3 hover:bg-blue-50 cursor-pointer" data-patient-id="${p.id}">${p.fullName} (ID: ${p.id})</div>`).join('')
        : `<div class="p-3 text-gray-500">No patients found.</div>`;
    searchResults.classList.remove('hidden');
}

function handleSelectPatientForRequest(e) {
    const selectedId = e.target.closest('[data-patient-id]')?.dataset.patientId;
    if (!selectedId) return;
    
    const patient = state.allPatientsCache.find(p => p.id === selectedId);
    state.setState('selectedPatientForRequest', patient);

    document.getElementById('request-selected-patient-name').textContent = patient.fullName;
    document.getElementById('request-selected-patient-info').textContent = `ID: ${patient.id} | Blood Type: ${patient.bloodType}`;
    
    document.getElementById('request-patient-search-component').classList.add('hidden');
    document.getElementById('request-selected-patient-display').classList.remove('hidden');
    document.getElementById('request-patient-search-results').classList.add('hidden');
}

function handleClearPatientSelection() {
    state.setState('selectedPatientForRequest', null);
    const searchInput = document.getElementById('request-patient-search');
    searchInput.value = '';
    document.getElementById('request-selected-patient-display').classList.add('hidden');
    document.getElementById('request-patient-search-component').classList.remove('hidden');
    searchInput.focus();
}

async function handleRequestFormSubmit(e) {
    e.preventDefault();
    const patient = state.selectedPatientForRequest;
    const urgency = document.getElementById('request-urgency').value;

    if (!patient && (urgency !== 'Urgent' && urgency !== 'Emergency')) {
        alert("Please select a patient for the request.");
        return;
    }

    const scheduledAt = document.getElementById('request-scheduled-at').value;
    // NEW: Validate that the scheduled date is not in the past.
    if (scheduledAt && new Date(scheduledAt) < new Date(utils.getTodayString())) {
        alert('Scheduled date cannot be in the past.');
        return;
    }

    const specialRequirements = Array.from(document.querySelectorAll('#request-special-requirements input:checked')).map(cb => cb.value);

    const requestData = {
        patientId: patient ? patient.id : null,
        bloodType: patient ? (patient.bloodType === 'Unknown' || !patient.bloodType ? 'Any' : patient.bloodType) : 'Any',
        quantity: parseInt(document.getElementById('request-quantity').value),
        urgency: document.getElementById('request-urgency').value,
        condition: document.getElementById('request-condition').value,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        specialRequirements: specialRequirements,
    };

    try {
        await services.request.createRequest(requestData);
        alert('Blood request created successfully!');
        document.getElementById('request-modal').classList.add('opacity-0', 'pointer-events-none');
        if (state.currentView === 'requests') {
            fetchAndDisplayData();
        }
    } catch (error) {
        console.error("Error creating request:", error);
        alert(`An error occurred: ${error.message}`);
    }
}

function handleQuantityClick(e) {
    const button = e.target.closest('.qty-btn');
    if (!button) return;

    const quantityInput = document.getElementById('request-quantity');
    quantityInput.value = button.dataset.value;

    const allButtons = document.querySelectorAll('#request-quantity-btns .qty-btn');
    allButtons.forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
}

function handleUrgencyChange(e) {
    const urgency = e.target.value;
    const scheduledAtInput = document.getElementById('request-scheduled-at');
    
    if (urgency === 'Scheduled') {
        scheduledAtInput.disabled = false;
        scheduledAtInput.classList.remove('bg-gray-100');
    } else {
        scheduledAtInput.disabled = true;
        scheduledAtInput.classList.add('bg-gray-100');
        scheduledAtInput.value = '';
    }
}

async function handleCancelRequest() {
    const requestId = state.selectedItemId;
    if (!requestId) return;

    if (confirm('Are you sure you want to cancel this blood request? This action cannot be undone.')) {
        try {
            await services.request.cancelRequest(requestId);
            alert('Request cancelled successfully.');
            fetchAndDisplayData(); // Refresh data to show the new status
        } catch (error) {
            console.error('Error cancelling request:', error);
            alert(`Failed to cancel request: ${error.message}`);
        }
    }
}

// --- Blood Matching ---
function getExpectedAntibodies(abo) {
    switch (abo) {
        case 'A': return ['Anti-B'];
        case 'B': return ['Anti-A'];
        case 'O': return ['Anti-A', 'Anti-B'];
        case 'AB': return [];
        default: return [];
    }
}

async function handleFindMatch() {
    const patient = state.allPageData.find(p => p.id === state.selectedItemId);
    if (!patient) {
        alert('No patient selected.');
        return;
    }

    // TODO: Show a proper loading indicator in the modal
    // ui.showMatchLoading();

    try {
        console.log('[Hospital] Finding match for patient:', patient);
        const inventory = await services.inventory.getInventory();
        console.log('[Hospital] Fetched inventory for matching:', inventory);
        
        const patientProfileForMatching = {
            bloodGroup: patient.bloodGroup,
            rhFactor: patient.rhFactor,
            antibodyHistory: patient.antibodyHistory || [],
        };

        const compatibleBags = findCompatibleBloodBags(patientProfileForMatching, inventory);
        
        ui.renderMatchingResults(patient, compatibleBags);

    } catch (error) {
        console.error("Error finding compatible blood bags:", error);
        alert(`An error occurred while finding matches: ${error.message}`);
        // ui.hideMatchLoading();
    }
}

// --- Patient Blood Test Modal ---
async function openPatientBloodTestModal() {
    state.setState('selectedPatientForBloodTest', null);
    const form = document.getElementById('patient-blood-test-form');
    form.reset();

    if (state.allPatientsCache.length === 0) {
        state.setState('allPatientsCache', await services.patient.getPatients());
    }

    // Initialize antibody UI
    const antibodyContainer = document.getElementById('blood-test-antibody-container');
    antibodyContainer.innerHTML = createAntibodyButtonsUI('blood-test');
    initAntibodyButtonsUI('blood-test');

    document.getElementById('blood-test-patient-search-component').classList.remove('hidden');
    document.getElementById('blood-test-selected-patient-display').classList.add('hidden');
    document.getElementById('patient-blood-test-modal').classList.remove('opacity-0', 'pointer-events-none');
}

function handleBloodTestPatientSearchInput(e) {
    const searchResults = document.getElementById('blood-test-patient-search-results');
    const searchTerm = e.target.value.toLowerCase();
    if (searchTerm.length < 2) {
        searchResults.classList.add('hidden');
        return;
    }
    const results = state.allPatientsCache.filter(p => p.fullName.toLowerCase().includes(searchTerm) || p.id.toLowerCase().includes(searchTerm));
    searchResults.innerHTML = results.length > 0
        ? results.map(p => `<div class="p-3 hover:bg-blue-50 cursor-pointer" data-patient-id="${p.id}">${p.fullName} (ID: ${p.id})</div>`).join('')
        : `<div class="p-3 text-gray-500">No patients found.</div>`;
    searchResults.classList.remove('hidden');
}

function handleSelectPatientForBloodTest(e) {
    const selectedId = e.target.closest('[data-patient-id]')?.dataset.patientId;
    if (!selectedId) return;
    
    const patient = state.allPatientsCache.find(p => p.id === selectedId);
    state.setState('selectedPatientForBloodTest', patient);

    document.getElementById('blood-test-selected-patient-name').textContent = patient.fullName;
    document.getElementById('blood-test-selected-patient-info').textContent = `ID: ${patient.id} | Blood Type: ${patient.bloodType}`;
    
    document.getElementById('blood-test-patient-search-component').classList.add('hidden');
    document.getElementById('blood-test-selected-patient-display').classList.remove('hidden');
    document.getElementById('blood-test-patient-search-results').classList.add('hidden');
}

function handleClearPatientSelectionForBloodTest() {
    state.setState('selectedPatientForBloodTest', null);
    const searchInput = document.getElementById('blood-test-patient-search');
    searchInput.value = '';
    document.getElementById('blood-test-selected-patient-display').classList.add('hidden');
    document.getElementById('blood-test-patient-search-component').classList.remove('hidden');
    searchInput.focus();
}

async function handlePatientBloodTestFormSubmit(e) {
    e.preventDefault();
    const patient = state.selectedPatientForBloodTest;
    
    if (!patient) {
        alert("Please select a patient for the blood test.");
        return;
    }

    const bloodTestData = {
        patientId: patient.id,
        antibodies: getSelectedAntibodies('blood-test'),
        testDate: new Date(),
    };

    try {
        // Save the blood test results to the patient's record
        await services.patient.updatePatient(patient.id, {
            currentAntibodies: bloodTestData.antibodies,
            lastBloodTest: bloodTestData.testDate
        });
        
        alert('Patient blood test results saved successfully!');
        document.getElementById('patient-blood-test-modal').classList.add('opacity-0', 'pointer-events-none');
        fetchAndDisplayData();
    } catch (error) {
        console.error("Error saving patient blood test results:", error);
        alert(`An error occurred: ${error.message}`);
    }
}

// =================================================================
// --- APP INITIALIZATION ---
// =================================================================

function initializeEventListeners() {
    document.getElementById('logout-btn').addEventListener('click', services.auth.handleLogout);
    document.getElementById('main-nav').addEventListener('click', handleNavClick);
    document.getElementById('data-table-body').addEventListener('click', handleTableClick);
    document.getElementById('details-panel').addEventListener('click', handleDetailsActionClick);

    // Patient Modal
    document.getElementById('patient-form').addEventListener('submit', handlePatientFormSubmit);
    document.getElementById('patient-cancel-btn').addEventListener('click', () => document.getElementById('patient-modal').classList.add('opacity-0', 'pointer-events-none'));

    // Request Modal
    document.getElementById('request-form').addEventListener('submit', handleRequestFormSubmit);
    document.getElementById('request-cancel-btn').addEventListener('click', () => document.getElementById('request-modal').classList.add('opacity-0', 'pointer-events-none'));
    document.getElementById('request-patient-search').addEventListener('input', handlePatientSearchInput);
    document.getElementById('request-patient-search-results').addEventListener('click', handleSelectPatientForRequest);
    document.getElementById('request-clear-patient-selection-btn').addEventListener('click', handleClearPatientSelection);
    document.getElementById('request-urgency').addEventListener('change', handleUrgencyChange);
    document.getElementById('request-quantity-btns').addEventListener('click', handleQuantityClick);

    // Match Results Modal
    document.getElementById('match-results-close-btn')?.addEventListener('click', () => document.getElementById('match-results-modal').classList.add('opacity-0', 'pointer-events-none'));

    // NEW: Set dynamic date constraints
    const today = utils.getTodayString();
    document.getElementById('patient-dob').max = today;
    document.getElementById('request-scheduled-at').min = today;

    // Patient Blood Test Modal Listeners
    document.getElementById('patient-blood-test-form').addEventListener('submit', handlePatientBloodTestFormSubmit);
    document.getElementById('blood-test-cancel-btn').addEventListener('click', () => document.getElementById('patient-blood-test-modal').classList.add('opacity-0', 'pointer-events-none'));
    document.getElementById('blood-test-patient-search').addEventListener('input', handleBloodTestPatientSearchInput);
    document.getElementById('blood-test-patient-search-results').addEventListener('click', handleSelectPatientForBloodTest);
    document.getElementById('blood-test-clear-patient-selection-btn').addEventListener('click', handleClearPatientSelectionForBloodTest);

    // Confirm Receipt Modal Listeners
    document.getElementById('confirm-receipt-cancel-btn').addEventListener('click', ui.hideConfirmReceiptModal);
    document.getElementById('confirm-receipt-confirm-btn').addEventListener('click', (e) => {
        const reportId = e.target.dataset.reportId;
        handleConfirmReceipt(reportId);
    });
}

export async function initialize() {
    initializeEventListeners();
    
    const initialView = 'requests';
    state.setState('currentView', initialView);
    ui.switchViewUI(initialView);
    ui.updatePageActionsUI(getAddHandlerForCurrentView());
    ui.updateTableControlsUI(applyFilters);
    
    await fetchAndDisplayData();
}
