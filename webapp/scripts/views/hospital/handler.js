/**
 * handler.js (hospital)
 * Contains all logic for the hospital portal application.
 */

import * as services from '../../services/index.js';
import * as ui from './ui.js';
import * as state from './state.js';
import * as utils from '../../utils.js';

// =================================================================
// --- DATA HANDLING ---
// =================================================================

async function fetchAndDisplayData() {
    ui.showLoadingState();
    let data = [];
    
    if (state.currentView === 'requests') {
        if (state.allPatientsCache.length === 0) {
            state.setState('allPatientsCache', await services.patient.getPatients());
        }
        const [requests, crossmatchReports] = await Promise.all([
            services.request.getRequests(),
            services.crossmatch.getAllCrossmatches()
        ]);
        state.setState('crossmatchReportsCache', crossmatchReports);
        data = requests;
    } else if (state.currentView === 'patients') {
        data = await services.patient.getPatients();
    } else { // notifications view
        data = await services.notification.getNotifications('hospital');
    }
    
    state.setState('allPageData', data);
    applyFilters();
    if (state.selectedItemId) {
        ui.renderDetailsPanel();
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
        
        let matchesStatus = status === 'All' || item.status === status;
        
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

function handleTableClick(e) {
    const row = e.target.closest('tr');
    if (row && row.dataset.id) {
        state.setState('selectedItemId', row.dataset.id);
        ui.renderPage(); 
        ui.renderDetailsPanel(); 
    }
}

// =================================================================
// --- ACTIONS & MODALS ---
// =================================================================

function handleDetailsActionClick(e) {
    const button = e.target.closest('button');
    if (!button || button.disabled) return;

    if (button.id === 'edit-patient-btn') {
        openPatientModal(true);
    } else if (button.id === 'cancel-request-btn') {
        handleCancelRequest();
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
        document.getElementById('patient-blood-type').value = patient.bloodType;
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

    const patientData = {
        fullName: document.getElementById('patient-fullName').value,
        dob: dob,
        sex: document.getElementById('patient-sex').value,
        bloodType: document.getElementById('patient-blood-type').value,
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
    if (!patient) {
        alert("Please select a patient for the request.");
        return;
    }

    const scheduledAt = document.getElementById('request-scheduled-at').value;
    // NEW: Validate that the scheduled date is not in the past.
    if (scheduledAt && new Date(scheduledAt) < new Date(utils.getTodayString())) {
        alert('Scheduled date cannot be in the past.');
        return;
    }

    const requestData = {
        patientId: patient.id,
        bloodType: patient.bloodType,
        quantity: parseInt(document.getElementById('request-quantity').value),
        urgency: document.getElementById('request-urgency').value,
        condition: document.getElementById('request-condition').value,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
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

// =================================================================
// --- APP INITIALIZATION ---
// =================================================================

function initializeEventListeners() {
    document.getElementById('logout-btn').addEventListener('click', () => services.auth.handleLogout());
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

    // NEW: Set dynamic date constraints
    const today = utils.getTodayString();
    document.getElementById('patient-dob').max = today;
    document.getElementById('request-scheduled-at').min = today;
}

export function initialize() {
    initializeEventListeners();
    
    const initialView = 'requests';
    state.setState('currentView', initialView);
    ui.switchViewUI(initialView);
    ui.updatePageActionsUI(getAddHandlerForCurrentView());
    ui.updateTableControlsUI(applyFilters);
    
    fetchAndDisplayData();
}
