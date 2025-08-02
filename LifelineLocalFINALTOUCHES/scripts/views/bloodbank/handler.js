/**
 * handler.js
 * This is the consolidated handler for the entire blood bank portal application.
 * It contains all logic for initialization, navigation, data handling, user actions,
 * modal interactions, and the new tabbed testing workflow.
 */

import { rankingService } from '../../services/ranking.service.js';
import * as services from '../../services/index.js';
import * as ui from './ui.js';
import * as state from './state.js';
import { validatePhoneNumber, isAdult, isPastDate, bloodCompatibility } from '../../utils.js';
import { createAntigenAntibodyUI, initAntigenAntibodyUI, setSelectedButtons, getSelectedValues } from '../shared/antigenAntibody.js';

// =================================================================
// --- CONFIGURATION & CONSTANTS ---
// =================================================================


const questionnaireConfig = [
    { key: 'allergies', text: 'Do you have severe or chronic allergic diseases?', type: 'Permanent' },
    { key: 'chronicDisease', text: 'Do you have chronic diseases (diabetes, heart, kidney, lung)?', type: 'Permanent' },
    { key: 'cancer', text: 'Have you ever had cancer?', type: 'Permanent' },
    { key: 'adverseReaction', text: 'Have you experienced adverse reactions to blood donation more than twice?', type: 'Permanent' },
    { key: 'jaundice', text: 'Do you have jaundice or any liver diseases?', type: 'Permanent' },
    { key: 'addiction', text: 'Are you addicted to any medications or illicit drugs?', type: 'Permanent' },
    { key: 'aidsOrStd', text: 'Do you have AIDS or any other sexually transmitted diseases (STDs)?', type: 'Permanent' },
    { key: 'epilepsy', text: 'Do you have epilepsy?', type: 'Permanent' },
    { key: 'bloodDisease', text: 'Do you have any blood diseases or hereditary bleeding disorders?', type: 'Permanent' },
    { key: 'hepatitis', text: 'Have you ever been infected with viral Hepatitis B or C?', type: 'Permanent' },
    { key: 'leprosy', text: 'Do you have leprosy?', type: 'Permanent' },
    { key: 'schizophrenia', text: 'Do you have schizophrenia?', type: 'Permanent' },
    { key: 'vitiligo', text: 'Do you have vitiligo?', type: 'Permanent' },
    { key: 'weightLoss', text: 'Have you experienced unexplained weight loss recently?', type: 'Temporary' },
    { key: 'endocrine', text: 'Do you have any endocrine disorders?', type: 'Permanent' },
    { key: 'polycythemia', text: 'Do you have Polycythemia Vera?', type: 'Permanent' },
    { key: 'brucellosis', text: 'Have you ever had a Brucellosis infection?', type: 'Permanent' },
    { key: 'surgery', text: 'Have you undergone neurosurgery, organ, or cell transplantation?', type: 'Permanent' },
];

const healthScreeningConfig = {
    minWeightKg: 50,
    maxTempC: 37.5,
    minHeartRateBPM: 60,
    maxHeartRateBPM: 100,
    maxAgeMale: 55,
    maxAgeFemale: 50,
    minAge: 18,
    bpSystolic: { min: 90, max: 140 },
    bpDiastolic: { min: 60, max: 90 },
};

const labTestConfig = {
    hemoglobinMale: { min: 14, max: 18 },
    hemoglobinFemale: { min: 12.5, max: 16 },
    hematocritMale: { min: 42, max: 54 },
    hematocritFemale: { min: 38, max: 48 },
};

// --- LOCAL HELPER FUNCTIONS ---
function calculateAge(dobString) {
    if (!dobString) return 'N/A';
    const dob = new Date(dobString);
    const ageDifMs = Date.now() - dob.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

// =================================================================
// --- DATA HANDLING ---
// =================================================================

async function fetchAndDisplayData() {
    ui.showLoadingState();
    try {
        if (state.currentView === 'tests') {
            await fetchAllTestData();
        } else {
            const [requests, patients, donations, donors, inventory, notifications] = await Promise.all([
                services.request.getRequests(),
                services.patient.getPatients(),
                services.donation.getDonations(),
                services.donor.getDonors(),
                services.inventory.getAllBloodBags(),
                services.notification.getNotifications('bloodbank')
            ]);

            state.setState('patientsCache', patients);
            state.setState('allDonorsCache', donors);
            state.setState('allInventoryCache', inventory);
            state.setState('allNotifications', notifications);

            let data = [];
            switch (state.currentView) {
                case 'requests':
                    data = requests;
                    break;
                case 'donations':
                    const bagsMap = new Map(inventory.map(bag => [bag.id, bag]));
                    data = donations.map(donation => ({
                        ...donation,
                        bloodType: bagsMap.get(donation.bloodBagId)?.bloodType || 'N/A'
                    }));
                    break;
                case 'inventory':
                    data = inventory;
                    break;
                case 'donors':
                    data = donors;
                    break;
                case 'notifications':
                    data = notifications;
                    break;
            }
            state.setState('allPageData', data);
        }
        applyFilters();
        if (state.selectedItemId) {
            ui.renderDetailsPanel();
        }
    } catch (error) {
        console.error(`[Data Fetch] Failed to fetch data for view: ${state.currentView}`, error);
        const tableBody = document.getElementById('data-table-body');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-red-500">An error occurred while loading data.</td></tr>`;
        }
    }
}

async function fetchAllTestData() {
    const [donors, questionnaires, screenings, labTests, crossmatches, requests, patients, inventory] = await Promise.all([
        services.donor.getDonors(),
        services.questionnaire.getQuestionnaires(),
        services.healthScreening.getHealthScreenings(),
        services.labTest.getLabTests(),
        services.crossmatch.getAllCrossmatches(),
        services.request.getRequests(),
        services.patient.getPatients(),
        services.inventory.getAllBloodBags(),
    ]);

    state.setState('allDonorsCache', donors);
    state.setState('allQuestionnairesCache', questionnaires);
    state.setState('allScreeningsCache', screenings);
    state.setState('allLabTestsCache', labTests);
    state.setState('allCrossmatchesCache', crossmatches);
    state.setState('allRequestsCache', requests);
    state.setState('patientsCache', patients);
    state.setState('allInventoryCache', inventory);
}

function applyFilters() {
    const isTests = state.currentView === 'tests';
    const searchInput = document.getElementById(isTests ? 'search-input-tests' : 'search-input');
    const statusFilter = document.getElementById('status-filter');
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const status = statusFilter ? statusFilter.value : 'All';

    const sourceData = isTests ? state.getCurrentTestTabData() : state.allPageData;

    if (state.currentView === 'notifications') {
        state.setState('filteredPageData', sourceData);
        ui.renderPage();
        return;
    }

    const filtered = sourceData.filter(item => {
        let matchesSearch = searchTerm === '';
        if (!matchesSearch) {
            if (isTests) {
                if (state.currentTestTab === 'crossmatching') {
                    const request = state.allRequestsCache.find(r => r.id === item.requestId);
                    const patient = request ? state.patientsCache.find(p => p.id === request.patientId) : null;
                    const patientName = patient ? patient.fullName.toLowerCase() : '';
            
                    const inventoryItem = state.allInventoryCache.find(i => i.id === item.bloodBagId);
                    const donor = inventoryItem ? state.allDonorsCache.find(d => d.id === inventoryItem.donorId) : null;
                    const donorName = donor ? donor.fullName.toLowerCase() : '';
            
                    matchesSearch = patientName.includes(searchTerm) ||
                                    donorName.includes(searchTerm) ||
                                    item.id.toLowerCase().includes(searchTerm);
                } else {
                    const donorName = state.allDonorsCache.find(d => d.id === item.donorId)?.fullName || '';
                    matchesSearch = donorName.toLowerCase().includes(searchTerm) || item.id.toLowerCase().includes(searchTerm);
                }
            } else {
                switch (state.currentView) {
                    case 'requests': {
                        const patient = state.patientsCache.find(p => p.id === item.patientId);
                        const patientName = patient ? patient.fullName.toLowerCase() : '';
                        matchesSearch = (item.patientId?.toLowerCase().includes(searchTerm) ||
                                       item.id.toLowerCase().includes(searchTerm) ||
                                       patientName.includes(searchTerm));
                        break;
                    }
                    case 'donations': {
                        const donor = state.allDonorsCache.find(d => d.id === item.donorId);
                        const donorName = donor ? donor.fullName.toLowerCase() : '';
                        matchesSearch = (item.id.toLowerCase().includes(searchTerm) ||
                                       item.donorId?.toLowerCase().includes(searchTerm) ||
                                       item.bloodBagId?.toLowerCase().includes(searchTerm) ||
                                       donorName.includes(searchTerm));
                        break;
                    }
                    case 'inventory': {
                        const donor = state.allDonorsCache.find(d => d.id === item.donorId);
                        const donorName = donor ? donor.fullName.toLowerCase() : '';
                        matchesSearch = (item.id.toLowerCase().includes(searchTerm) ||
                                       item.donorId?.toLowerCase().includes(searchTerm) ||
                                       donorName.includes(searchTerm));
                        break;
                    }
                    case 'donors': {
                        const donorName = item.fullName || item.name || '';
                        matchesSearch = donorName.toLowerCase().includes(searchTerm) || item.id.toLowerCase().includes(searchTerm);
                        break;
                    }
                }
            }
        }
        
        let matchesStatus = isTests || status === 'All';
        if (!matchesStatus) {
            const itemStatus = (item.status || item.result || (item.disqualificationStatus || 'None')).toLowerCase();
            matchesStatus = itemStatus === status.toLowerCase();
        }

        return matchesSearch && matchesStatus;
    });

    if (isTests) {
        state.setState('filteredPageData', filtered); // Keep this for details panel consistency if needed
    } else {
        state.setState('filteredPageData', filtered);
    }
    ui.renderPage();
}

// =================================================================
// --- NAVIGATION & VIEW SWITCHING ---
// =================================================================

function handleNavClick(e) {
    e.preventDefault();
    const link = e.target.closest('.nav-link');
    if (!link || state.currentView === link.id.replace('nav-', '')) return;

    const view = link.id.replace('nav-', '');
    state.setState('currentView', view);
    state.setState('selectedItemId', null); 
    
    ui.switchViewUI(view);

    if (view === 'tests') {
        state.setState('currentTestTab', 'questionnaire');
        ui.switchTestTabUI('questionnaire');
        ui.updatePageActionsUI(null);
        ui.updateTestTableControlsUI(applyFilters);
        fetchAndDisplayData();
    } else {
        ui.updatePageActionsUI(getAddHandlerForCurrentView());
        ui.updateTableControlsUI(applyFilters);
        fetchAndDisplayData();
    }
}

function handleTestTabClick(e) {
    e.preventDefault();
    const clickedTab = e.target.closest('.tab-link');
    if (!clickedTab || clickedTab.classList.contains('active')) return;
    
    const tabName = clickedTab.dataset.tab;
    state.setState('currentTestTab', tabName);
    ui.switchTestTabUI(tabName);
    applyFilters();
}

function handleTableClick(e) {
    const row = e.target.closest('tr');
    if (row && row.dataset.id) {
        state.setState('selectedItemId', row.dataset.id);
        ui.renderPage();
    }
}

function handleTestTableClick(e) {
    const row = e.target.closest('tr');
    if (row && row.dataset.id) {
        state.setState('selectedTestItemId', row.dataset.id);
        ui.renderTestsPage();
    }
}

// =================================================================
// --- ACTIONS (MODALS, DETAILS PANEL, ETC.) ---
// =================================================================

function handleDetailsActionClick(e) {
    const button = e.target.closest('button');
    if (!button || button.disabled) return;

    const actionHandlers = {
        'edit-donor-btn': () => openDonorModal(true),
        'edit-blood-unit-btn': () => openBloodUnitModal(),
    };

    if (actionHandlers[button.id]) {
        actionHandlers[button.id]();
    }
}

function getAddHandlerForCurrentView() {
    const handlers = {
        donors: () => openDonorModal(false),
        donations: handleAddDonationClick,
    };
    return handlers[state.currentView];
}

function handleAddTestClick() {
    const currentTab = state.currentTestTab;
    let formIdToShow = '';

    switch (currentTab) {
        case 'questionnaire':
            formIdToShow = 'questionnaire-form';
            ui.renderQuestionnaireQuestions(questionnaireConfig);
            break;
        case 'screening':
            formIdToShow = 'screening-form';
            break;
        case 'lab':
            formIdToShow = 'lab-form';
            break;
    }

    if (formIdToShow) {
        ui.showFormInModal(formIdToShow);
        ui.showTestFormModal();
    }
}

function openDonorModal(isEdit) {
    state.setState('isEditMode', isEdit);
    document.getElementById('donor-form').reset();
    const modal = document.getElementById('donor-modal');

    if (isEdit) {
        const selectedDonor = state.allPageData.find(d => d.id === state.selectedItemId);
        if (!selectedDonor) return;
        document.getElementById('donor-modal-title').textContent = 'Edit Donor Profile';
        document.getElementById('donor-id-text').textContent = selectedDonor.id;
        document.getElementById('donor-fullName').value = selectedDonor.fullName;
        document.getElementById('donor-dob').value = selectedDonor.dob;
        document.getElementById('donor-sex').value = selectedDonor.sex;
        document.getElementById('donor-blood-type').value = selectedDonor.bloodType;
        document.getElementById('donor-email').value = selectedDonor.email || '';
        document.getElementById('donor-phone').value = selectedDonor.phone || '';
        
        const container = document.getElementById('donor-antigen-antibody-container');
        container.innerHTML = createAntigenAntibodyUI('donor');
        initAntigenAntibodyUI('donor');
        setSelectedButtons('donor', selectedDonor.antigen_profile, selectedDonor.antibody_history);

        document.getElementById('donor-id-display').classList.remove('hidden');
    } else {
        document.getElementById('donor-modal-title').textContent = 'Add New Donor';
        const container = document.getElementById('donor-antigen-antibody-container');
        container.innerHTML = createAntigenAntibodyUI('donor');
        initAntigenAntibodyUI('donor');
        document.getElementById('donor-id-display').classList.add('hidden');
    }
    modal.classList.remove('opacity-0', 'pointer-events-none');
}

function openBloodUnitModal() {
    const selectedUnit = state.allPageData.find(d => d.id === state.selectedItemId);
    if (!selectedUnit) return;

    document.getElementById('blood-unit-form').reset();
    const modal = document.getElementById('blood-unit-modal');

    document.getElementById('blood-unit-modal-title').textContent = 'Edit Blood Unit Details';
    document.getElementById('blood-unit-id-text').textContent = selectedUnit.id;
    document.getElementById('blood-unit-antigen-profile').value = (selectedUnit.antigen_profile || []).join(', ');
    document.getElementById('blood-unit-special-attributes').value = (selectedUnit.special_attributes || []).join(', ');
    document.getElementById('blood-unit-minor-antigens').value = (selectedUnit.minorAntigens || []).join(', ');
    document.getElementById('blood-unit-id-display').classList.remove('hidden');
    
    modal.classList.remove('opacity-0', 'pointer-events-none');
}

async function handleBloodUnitFormSubmit(e) {
    e.preventDefault();
    const unitData = {
        antigen_profile: document.getElementById('blood-unit-antigen-profile').value.split(',').map(s => s.trim()).filter(Boolean),
        special_attributes: document.getElementById('blood-unit-special-attributes').value.split(',').map(s => s.trim()).filter(Boolean),
        minorAntigens: document.getElementById('blood-unit-minor-antigens').value.split(',').map(s => s.trim()).filter(Boolean),
    };

    try {
        await services.inventory.updateBloodBag(state.selectedItemId, unitData);
        alert(`Successfully updated blood unit ${state.selectedItemId}.`);
        document.getElementById('blood-unit-modal').classList.add('opacity-0', 'pointer-events-none');
        fetchAndDisplayData();
    } catch (error) {
        console.error("Error saving blood unit:", error);
        alert("An error occurred while saving the blood unit details.");
    }
}

async function handleAddDonationClick() {
    document.getElementById('donation-form').reset();
    state.setState('selectedLabTestForDonation', null);
    
    // Fetch necessary data
    if(state.allDonorsCache.length === 0) {
        state.setState('allDonorsCache', await services.donor.getDonors());
    }
    const availableTests = await services.labTest.getAvailablePassedTests();
    state.setState('availableLabTestsCache', availableTests);

    document.getElementById('donation-lab-test-search').value = '';
    document.getElementById('lab-test-search-results').classList.add('hidden');
    document.getElementById('selected-lab-test-display').classList.add('hidden');
    document.getElementById('lab-test-search-component').classList.remove('hidden');
    document.getElementById('donation-modal').classList.remove('opacity-0', 'pointer-events-none');
}


function updateCrossmatchCounter(limit) {
    const cmBagList = document.getElementById('cm-bag-list');
    const cmSelectionCounter = document.getElementById('cm-selection-counter');
    const selectedCheckboxes = cmBagList.querySelectorAll('.cm-checkbox:checked');
    cmSelectionCounter.textContent = `${selectedCheckboxes.length} / ${limit} selected`;
    cmBagList.querySelectorAll('.cm-checkbox').forEach(cb => {
        if (!cb.checked) cb.disabled = selectedCheckboxes.length >= limit;
    });
}

async function handleDonationFormSubmit(e) {
    e.preventDefault();
    const labTest = state.selectedLabTestForDonation;
    if (!labTest) { alert("Please search for and select a passed lab test."); return; }

    try {
        const donor = state.allDonorsCache.find(d => d.id === labTest.donorId);
        if (!donor) {
            alert("Could not find the donor associated with this lab test.");
            return;
        }
        await services.donation.addDonation(donor, labTest.id);
        alert(`Successfully recorded donation for ${donor.fullName}.`);
        document.getElementById('donation-modal').classList.add('opacity-0', 'pointer-events-none');
        if (state.currentView === 'donations' || state.currentView === 'inventory') fetchAndDisplayData();
    } catch (error) { console.error("Error saving donation:", error); alert("An error occurred while saving the donation."); }
}

async function handleDonorFormSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('donor-email').value;
    const phone = document.getElementById('donor-phone').value;
    if (!email && !phone) { alert("Please provide either an email or phone number."); return; }
    if (phone && !validatePhoneNumber(phone)) {
        alert("Invalid phone number. Please use the format 7XXXXXXXX.");
        return;
    }
    const dob = document.getElementById('donor-dob').value;
    if (!isAdult(dob)) {
        alert("Donor must be at least 18 years old.");
        return;
    }
    if (!isPastDate(dob)) {
        alert("Date of birth must be in the past.");
        return;
    }
    const donorData = {
        fullName: document.getElementById('donor-fullName').value,
        dob: dob,
        sex: document.getElementById('donor-sex').value,
        bloodType: document.getElementById('donor-blood-type').value.toUpperCase(),
        email,
        phone,
        antigen_profile: getSelectedValues('donor').antigens,
        antibody_history: getSelectedValues('donor').antibodies,
    };
    try {
        if (state.isEditMode) {
            await services.donor.updateDonor(state.selectedItemId, donorData);
            alert(`Successfully updated donor ${state.selectedItemId}.`);
        } else {
            await services.donor.addDonor(donorData);
            alert(`Successfully added new donor.`);
        }
        document.getElementById('donor-modal').classList.add('opacity-0', 'pointer-events-none');
        fetchAndDisplayData();
    } catch (error) { console.error("Error saving donor:", error); alert("An error occurred while saving the donor."); }
}


function handleLabTestSearchForDonationInput(e) {
    const searchResultsContainer = document.getElementById('lab-test-search-results');
    const searchTerm = e.target.value.toLowerCase();
    if (searchTerm.length < 2) {
        searchResultsContainer.classList.add('hidden');
        return;
    }

    const results = state.availableLabTestsCache.filter(test => {
        const donor = state.allDonorsCache.find(d => d.id === test.donorId);
        const donorName = donor ? donor.fullName.toLowerCase() : '';
        return donorName.includes(searchTerm) || test.id.toLowerCase().includes(searchTerm);
    });

    searchResultsContainer.innerHTML = results.length > 0
        ? results.map(test => {
            const donor = state.allDonorsCache.find(d => d.id === test.donorId);
            return `<div class="p-3 hover:bg-red-50 cursor-pointer" data-lab-test-id="${test.id}">
                        <strong>${donor.fullName}</strong> (Test ID: ${test.id})
                    </div>`;
          }).join('')
        : `<div class="p-3 text-gray-500">No matching passed lab tests found.</div>`;

    searchResultsContainer.classList.remove('hidden');
}

function handleSelectLabTestForDonation(e) {
    const selectedId = e.target.closest('[data-lab-test-id]')?.dataset.labTestId;
    if (!selectedId) return;

    const selectedTest = state.availableLabTestsCache.find(t => t.id === selectedId);
    const donor = state.allDonorsCache.find(d => d.id === selectedTest.donorId);
    state.setState('selectedLabTestForDonation', selectedTest);

    document.getElementById('selected-lab-test-donor-name').textContent = donor.fullName;
    document.getElementById('selected-lab-test-info').textContent = `Test ID: ${selectedTest.id} | Blood Type: ${donor.bloodType}`;
    
    document.getElementById('lab-test-search-component').classList.add('hidden');
    document.getElementById('selected-lab-test-display').classList.remove('hidden');
    document.getElementById('lab-test-search-results').classList.add('hidden');
}

function handleClearLabTestSelection() {
    state.setState('selectedLabTestForDonation', null);
    const searchInput = document.getElementById('donation-lab-test-search');
    searchInput.value = '';
    document.getElementById('selected-lab-test-display').classList.add('hidden');
    document.getElementById('lab-test-search-component').classList.remove('hidden');
    searchInput.focus();
}


// --- NEW UPLOAD HELPER ---
function handleFileUpload() {
    return new Promise((resolve, reject) => {
        const uploadModal = document.getElementById('upload-modal');
        const confirmBtn = document.getElementById('upload-modal-confirm-btn');
        const cancelBtn = document.getElementById('upload-modal-cancel-btn');
        const closeBtn = document.getElementById('upload-modal-close-btn');
        
        const widget = uploadcare.Widget('[role=uploadcare-uploader]');
        let uploadedFile = null;

        const cleanupUploadModal = () => {
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
            closeBtn.onclick = null;
            if (widget) {
                widget.onChange(null);
            }
            widget.value(null);
            uploadModal.classList.add('opacity-0', 'pointer-events-none');
        };

        const handleConfirmUpload = () => {
            if (uploadedFile) {
                const url = uploadedFile.cdnUrl; // Store the URL before cleanup
                cleanupUploadModal();
                resolve(url);
            }
        };

        const handleCancelUpload = () => {
            cleanupUploadModal();
            reject(new Error('Upload cancelled by user.'));
        };

        confirmBtn.onclick = handleConfirmUpload;
        cancelBtn.onclick = handleCancelUpload;
        closeBtn.onclick = handleCancelUpload;

        // Use the v3 onChange event
        widget.onChange(file => {
            if (file) {
                // The file object is a promise
                file.done(fileInfo => {
                    uploadedFile = fileInfo;
                    confirmBtn.disabled = false;
                });
            } else {
                // File was cleared from the widget
                uploadedFile = null;
                confirmBtn.disabled = true;
            }
        });

        // Reset state before showing
        uploadedFile = null;
        confirmBtn.disabled = true;
        widget.value(null);
        uploadModal.classList.remove('opacity-0', 'pointer-events-none');
    });
}

async function handleCrossmatchAction(testId, bloodBagId, action) {
    try {
        let reportUrl = null;
        // For 'Pass' and 'Fail', we require a report upload.
        if (action === 'Pass' || action === 'Fail') {
            try {
                reportUrl = await handleFileUpload();
            } catch (uploadError) {
                // Handle user cancelling the upload modal
                if (uploadError.message === 'Upload cancelled by user.') {
                    console.log("Crossmatch report upload was cancelled by the user.");
                    return; // Stop execution if upload is cancelled
                }
                throw uploadError; // Re-throw other upload errors
            }
        }

        // The status sent to the service can be the same as the action.
        // The service already handles 'Pass', 'Fail', and 'Skipped'.
        await services.crossmatch.updateCrossmatchStatus(testId, action, bloodBagId, reportUrl);
        alert(`Crossmatch test ${testId} updated to ${action}.`);
        fetchAndDisplayData(); // Refresh the view

    } catch (error) {
        console.error(`Error updating crossmatch status to ${action}:`, error);
        alert(`Failed to update crossmatch status. Error: ${error.message}`);
    }
}


// =================================================================
// --- TEST FORM SEARCH & SELECT LOGIC (RESTORED) ---
// =================================================================

function handleQuestionnaireSearchInput(e) {
    const searchTerm = e.target.value.toLowerCase();
    const resultsContainer = document.getElementById('q-donor-search-results');
    if (searchTerm.length < 2) {
        resultsContainer.classList.add('hidden');
        return;
    }
    const results = state.allDonorsCache.filter(d => {
        const name = d.fullName || '';
        return d.disqualificationStatus !== 'Permanent' &&
               (name.toLowerCase().includes(searchTerm) || d.id.toLowerCase().includes(searchTerm));
    });
    resultsContainer.innerHTML = results.length ? results.map(d => `<div class="p-3 hover:bg-red-50 cursor-pointer" data-id="${d.id}">${d.fullName} (${d.bloodType})</div>`).join('') : '<div class="p-3 text-gray-500">No eligible donors found.</div>';
    resultsContainer.classList.remove('hidden');
}

async function handleSelectDonorForQuestionnaire(e) {
    const target = e.target.closest('[data-id]');
    if (!target) return;
    const donor = state.allDonorsCache.find(d => d.id === target.dataset.id);
    state.setState('selectedDonorForQuestionnaire', donor);
    
    // TODO: Re-implement fetching the last donation date efficiently.
    // For now, we will leave the field blank. The eligibility check
    // during submission still works correctly.
    document.getElementById('q-last-donation').value = '';

    ui.showSelectedDonorForQuestionnaire();
}

function handleClearDonorSelectionForQuestionnaire() {
    state.setState('selectedDonorForQuestionnaire', null);
    document.getElementById('q-donor-search-component').classList.remove('hidden');
    document.getElementById('q-selected-donor-display').classList.add('hidden');
    document.getElementById('q-donor-search').value = '';
}

function handleScreeningSearchInput(e) {
    const searchTerm = e.target.value.toLowerCase();
    const resultsContainer = document.getElementById('s-q-search-results');
    if (searchTerm.length < 2) {
        resultsContainer.classList.add('hidden');
        return;
    }
    const usedQuestionnaireIds = new Set(state.allScreeningsCache.map(s => s.questionnaireId));
    const passedQuestionnaires = state.allQuestionnairesCache.filter(q => 
        q.result === 'Pass' && !usedQuestionnaireIds.has(q.id)
    );
    
    const results = passedQuestionnaires.filter(q => {
        const donor = state.allDonorsCache.find(d => d.id === q.donorId);
        const name = donor ? (donor.fullName || '') : '';
        return donor && (name.toLowerCase().includes(searchTerm) || q.id.toLowerCase().includes(searchTerm));
    });

    resultsContainer.innerHTML = results.length ? results.map(q => {
        const donor = state.allDonorsCache.find(d => d.id === q.donorId);
        return `<div class="p-3 hover:bg-red-50 cursor-pointer" data-id="${q.id}">${donor.fullName} (Q-ID: ${q.id})</div>`;
    }).join('') : '<div class="p-3 text-gray-500">No available passed questionnaires found.</div>';
    resultsContainer.classList.remove('hidden');
}

function handleSelectQuestionnaireForScreening(e) {
    const target = e.target.closest('[data-id]');
    if (!target) return;
    const questionnaire = state.allQuestionnairesCache.find(q => q.id === target.dataset.id);
    state.setState('selectedQuestionnaireForScreening', questionnaire);
    ui.showSelectedQuestionnaireForScreening();
}

function handleClearQuestionnaireSelection() {
    state.setState('selectedQuestionnaireForScreening', null);
    document.getElementById('s-q-search-component').classList.remove('hidden');
    document.getElementById('s-selected-q-display').classList.add('hidden');
    document.getElementById('s-q-search').value = '';
}

function handleLabTestSearchInput(e) {
    const searchTerm = e.target.value.toLowerCase();
    const resultsContainer = document.getElementById('l-s-search-results');
    if (searchTerm.length < 2) {
        resultsContainer.classList.add('hidden');
        return;
    }
    const usedScreeningIds = new Set(state.allLabTestsCache.map(l => l.healthScreeningId));
    const passedScreenings = state.allScreeningsCache.filter(s => 
        s.result === 'Pass' && !usedScreeningIds.has(s.id)
    );

    const results = passedScreenings.filter(s => {
        const donor = state.allDonorsCache.find(d => d.id === s.donorId);
        const name = donor ? (donor.fullName || '') : '';
        return donor && (name.toLowerCase().includes(searchTerm) || s.id.toLowerCase().includes(searchTerm));
    });
    resultsContainer.innerHTML = results.length ? results.map(s => {
        const donor = state.allDonorsCache.find(d => d.id === s.donorId);
        return `<div class="p-3 hover:bg-red-50 cursor-pointer" data-id="${s.id}">${donor.fullName} (S-ID: ${s.id})</div>`;
    }).join('') : '<div class="p-3 text-gray-500">No available passed health screenings found.</div>';
    resultsContainer.classList.remove('hidden');
}

function handleSelectScreeningForLabTest(e) {
    const target = e.target.closest('[data-id]');
    if (!target) return;
    const screening = state.allScreeningsCache.find(s => s.id === target.dataset.id);
    state.setState('selectedScreeningForLabTest', screening);
    ui.showSelectedScreeningForLabTest();
}

function handleClearScreeningSelection() {
    state.setState('selectedScreeningForLabTest', null);
    document.getElementById('l-s-search-component').classList.remove('hidden');
    document.getElementById('l-selected-s-display').classList.add('hidden');
    document.getElementById('l-s-search').value = '';
}


// =================================================================
// --- TEST FORM SUBMISSION LOGIC ---
// =================================================================

async function handleQuestionnaireSubmit(e) {
    e.preventDefault();
    const donor = state.selectedDonorForQuestionnaire;
    if (!donor) { alert("Please select a donor first."); return; }

    const lastDonationDateStr = document.getElementById('q-last-donation').value;
    if (lastDonationDateStr) {
        const lastDonationDate = new Date(lastDonationDateStr);
        const today = new Date();
        const monthsRequired = donor.sex === 'Male' ? 3 : 6;
        const eligibilityDate = new Date(new Date(lastDonationDate).setMonth(lastDonationDate.getMonth() + monthsRequired));
        if (today < eligibilityDate) {
            alert(`Donor is not eligible. Next eligible donation date is ${eligibilityDate.toLocaleDateString()}.`);
            return;
        }
    }

    const formData = new FormData(e.target);
    const answers = {};
    let finalDisqualificationType = 'None';
    for (const config of questionnaireConfig) {
        const answer = formData.get(`q-${config.key}`);
        answers[config.key] = answer;
        if (answer === 'yes') {
            if (config.type === 'Permanent') {
                finalDisqualificationType = 'Permanent';
                break; 
            } else if (finalDisqualificationType !== 'Permanent') {
                finalDisqualificationType = 'Temporary';
            }
        }
    }

    const result = finalDisqualificationType === 'None' ? 'Pass' : `${finalDisqualificationType} Disqualification`;

    try {
        await services.questionnaire.addQuestionnaire({
            donorId: donor.id,
            nationalId: document.getElementById('q-national-id').value,
            address: document.getElementById('q-address').value,
            phone: document.getElementById('q-phone').value.trim(),
            lastDonationDate: lastDonationDateStr ? new Date(lastDonationDateStr) : null,
            answers,
            result,
        });
        
        if (finalDisqualificationType === 'Permanent') {
            await services.donor.updateDonorDisqualificationStatus(donor.id, 'Permanent');
        }

        alert(`Questionnaire submitted. Result: ${result}`);
        ui.hideTestFormModal();
        fetchAndDisplayData();
    } catch (error) {
        console.error("Error submitting questionnaire:", error);
        alert("An error occurred during questionnaire submission.");
    }
}

async function handleScreeningSubmit(e) {
    e.preventDefault();
    const questionnaire = state.selectedQuestionnaireForScreening;
    if (!questionnaire) { alert("Please select a completed questionnaire first."); return; }
    const donor = state.allDonorsCache.find(d => d.id === questionnaire.donorId);
    if (!donor) { alert("Could not find donor associated with the questionnaire."); return; }

    const { minWeightKg, maxTempC, minHeartRateBPM, maxHeartRateBPM, maxAgeMale, maxAgeFemale, minAge, bpSystolic, bpDiastolic } = healthScreeningConfig;
    
    const weight = parseFloat(document.getElementById('s-weight').value);
    const temperature = parseFloat(document.getElementById('s-temp').value);
    const heartRate = parseInt(document.getElementById('s-heart-rate').value);
    const systolic = parseInt(document.getElementById('s-bp-systolic').value);
    const diastolic = parseInt(document.getElementById('s-bp-diastolic').value);
    const age = calculateAge(donor.dob);
    const manualFail = document.getElementById('s-fail-checkbox').checked;
    const comments = document.getElementById('s-comments').value;

    if (manualFail && !comments) {
        alert("Comments are required when manually failing a screening.");
        return;
    }

    let issues = [];
    if (weight < minWeightKg) issues.push('Weight below minimum');
    if (temperature > maxTempC) issues.push('Temperature too high');
    if (heartRate < minHeartRateBPM || heartRate > maxHeartRateBPM) issues.push('Heart rate out of range');
    if (systolic < bpSystolic.min || systolic > bpSystolic.max) issues.push('Systolic BP out of range');
    if (diastolic < bpDiastolic.min || diastolic > bpDiastolic.max) issues.push('Diastolic BP out of range');
    if (age < minAge) issues.push('Donor is underage');
    if (donor.sex === 'Male' && age > maxAgeMale) issues.push('Donor is over the age limit for males');
    if (donor.sex === 'Female' && age > maxAgeFemale) issues.push('Donor is over the age limit for females');

    const result = issues.length === 0 && !manualFail ? 'Pass' : 'Temporary Disqualification';
    
    try {
        await services.healthScreening.addHealthScreening({
            questionnaireId: questionnaire.id,
            donorId: donor.id,
            vitals: {
                weight,
                temperature,
                heartRate,
                bloodPressure: {
                    systolic: systolic,
                    diastolic: diastolic
                },
            },
            comments: comments,
            result,
        });
        
        alert(`Health screening submitted. Result: ${result}. ${issues.length > 0 ? 'Issues: ' + issues.join(', ') : ''}`);
        ui.hideTestFormModal();
        fetchAndDisplayData();
    } catch (error) {
        console.error("Error submitting health screening:", error);
        alert("An error occurred during health screening submission.");
    }
}

async function handleLabTestSubmit(e) {
    e.preventDefault();
    const screening = state.selectedScreeningForLabTest;
    if (!screening) { alert("Please select a completed health screening first."); return; }
    const donor = state.allDonorsCache.find(d => d.id === screening.donorId);
    if (!donor) { alert("Could not find donor associated with the screening."); return; }

    const hemoglobin = parseFloat(document.getElementById('l-hemoglobin').value);
    const hematocrit = parseFloat(document.getElementById('l-hematocrit').value);
    const viralMarkers = {
        hepatitisB: document.getElementById('l-hep-b').value,
        hepatitisC: document.getElementById('l-hep-c').value,
        hivAids: document.getElementById('l-aids').value,
    };

    let disqualificationType = 'None';
    let issues = [];

    if (viralMarkers.hepatitisB === 'Positive' || viralMarkers.hepatitisC === 'Positive' || viralMarkers.hivAids === 'Positive') {
        disqualificationType = 'Permanent';
        issues.push('Positive viral marker detected');
    } else {
        const hemoConfig = donor.sex === 'Male' ? labTestConfig.hemoglobinMale : labTestConfig.hemoglobinFemale;
        const hemaConfig = donor.sex === 'Male' ? labTestConfig.hematocritMale : labTestConfig.hematocritFemale;
        if (hemoglobin < hemoConfig.min || hemoglobin > hemoConfig.max) {
            disqualificationType = 'Temporary';
            issues.push('Hemoglobin out of range');
        }
        if (hematocrit < hemaConfig.min || hematocrit > hemaConfig.max) {
            disqualificationType = 'Temporary';
            issues.push('Hematocrit out of range');
        }
    }
    
    const result = disqualificationType === 'None' ? 'Pass' : `${disqualificationType} Disqualification`;

    try {
        await services.labTest.addLabTest({
            healthScreeningId: screening.id,
            donorId: donor.id,
            bloodLevels: {
                hemoglobin,
                hematocrit,
            },
            viralMarkers,
            result,
        });

        if (disqualificationType === 'Permanent') {
            await services.donor.updateDonorDisqualificationStatus(donor.id, 'Permanent');
        }
        
        alert(`Lab test submitted. Result: ${result}. ${issues.length > 0 ? 'Issues: ' + issues.join(', ') : ''}`);
        ui.hideTestFormModal();
        fetchAndDisplayData();
    } catch (error) {
        console.error("Error submitting lab test:", error);
        alert("An error occurred during lab test submission.");
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
    document.getElementById('tests-details-panel').addEventListener('click', handleDetailsActionClick);

    // Modals
    document.getElementById('bag-cancel-btn').addEventListener('click', () => document.getElementById('bag-modal').classList.add('opacity-0', 'pointer-events-none'));
    document.getElementById('donor-cancel-btn').addEventListener('click', () => document.getElementById('donor-modal').classList.add('opacity-0', 'pointer-events-none'));
    document.getElementById('donation-cancel-btn').addEventListener('click', () => document.getElementById('donation-modal').classList.add('opacity-0', 'pointer-events-none'));
    document.getElementById('blood-unit-cancel-btn').addEventListener('click', () => document.getElementById('blood-unit-modal').classList.add('opacity-0', 'pointer-events-none'));
    document.getElementById('donor-form').addEventListener('submit', handleDonorFormSubmit);
    document.getElementById('blood-unit-form').addEventListener('submit', handleBloodUnitFormSubmit);
    document.getElementById('donation-form').addEventListener('submit', handleDonationFormSubmit);
    document.getElementById('donation-lab-test-search').addEventListener('input', handleLabTestSearchForDonationInput);
    document.getElementById('lab-test-search-results').addEventListener('click', handleSelectLabTestForDonation);
    document.getElementById('clear-lab-test-selection-btn').addEventListener('click', handleClearLabTestSelection);

    // Tests Page
    document.getElementById('tests-tabs').addEventListener('click', handleTestTabClick);
   document.getElementById('tests-tab-content').addEventListener('click', (e) => {
       const actionBtn = e.target.closest('.crossmatch-action-btn');
       if (actionBtn) {
           const { testId, bloodBagId, action } = actionBtn.dataset;
           if (testId && bloodBagId && action) {
               handleCrossmatchAction(testId, bloodBagId, action);
           }
           return;
       }
       handleTestTableClick(e);
   });
    document.getElementById('add-test-btn').addEventListener('click', handleAddTestClick);
    
    // Test Form Submissions (now in a modal)
    document.getElementById('questionnaire-form').addEventListener('submit', handleQuestionnaireSubmit);
    document.getElementById('screening-form').addEventListener('submit', handleScreeningSubmit);
    document.getElementById('lab-form').addEventListener('submit', handleLabTestSubmit);

    // Test Form Search/Select Logic (RESTORED)
    document.getElementById('q-donor-search').addEventListener('input', handleQuestionnaireSearchInput);
    document.getElementById('q-donor-search-results').addEventListener('click', handleSelectDonorForQuestionnaire);
    document.getElementById('q-clear-donor-selection-btn').addEventListener('click', handleClearDonorSelectionForQuestionnaire);
    document.getElementById('s-q-search').addEventListener('input', handleScreeningSearchInput);
    document.getElementById('s-q-search-results').addEventListener('click', handleSelectQuestionnaireForScreening);
    document.getElementById('s-clear-q-selection-btn').addEventListener('click', handleClearQuestionnaireSelection);
    document.getElementById('l-s-search').addEventListener('input', handleLabTestSearchInput);
    document.getElementById('l-s-search-results').addEventListener('click', handleSelectScreeningForLabTest);
    document.getElementById('l-clear-s-selection-btn').addEventListener('click', handleClearScreeningSelection);

    // Event listener for the new checkbox
    document.getElementById('s-fail-checkbox').addEventListener('change', (e) => {
        const commentsTextarea = document.getElementById('s-comments');
        if (e.target.checked) {
            commentsTextarea.disabled = false;
            commentsTextarea.classList.remove('bg-gray-100');
        } else {
            commentsTextarea.disabled = true;
            commentsTextarea.value = '';
            commentsTextarea.classList.add('bg-gray-100');
        }
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
