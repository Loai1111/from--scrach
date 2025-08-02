/**
 * ui.js
 * Handles all DOM manipulation and rendering for the blood bank portal.
 */

import * as state from './state.js';
import { getDonor } from '../../services/donor.service.js';
import { getHealthScreening } from '../../services/healthscreening.service.js';
import { markAsRead } from '../../services/notification.service.js';

// --- DOM Element References ---
let navLinks, pageTitle, pageActions, mainContent, testsPageContent, detailsPanel, testsDetailsPanel;
let tableControls, dataTableHead, dataTableBody;
let testsTabs, testsTableControls, testsTabContents, testTableHeads, testTableBodies, addTestBtn, testFormsModal, testFormsContainer;

// --- Initialization ---
export function init() {
    // Main layout
    pageTitle = document.getElementById('page-title');
    pageActions = document.getElementById('page-actions');
    mainContent = document.getElementById('main-content');
    testsPageContent = document.getElementById('tests-page-content');
    detailsPanel = document.getElementById('details-panel');
    testsDetailsPanel = document.getElementById('tests-details-panel');
    
    // Nav
    navLinks = {
        requests: document.getElementById('nav-requests'),
        donations: document.getElementById('nav-donations'),
        tests: document.getElementById('nav-tests'),
        donors: document.getElementById('nav-donors'),
        inventory: document.getElementById('nav-inventory'),
        notifications: document.getElementById('nav-notifications'),
    };

    // Main table (for non-test views)
    tableControls = document.getElementById('table-controls');
    dataTableHead = document.getElementById('data-table-head');
    dataTableBody = document.getElementById('data-table-body');

    // Tests Page
    testsTabs = document.getElementById('tests-tabs');
    testsTableControls = document.getElementById('tests-table-controls');
    addTestBtn = document.getElementById('add-test-btn');
    testsTabContents = {
        questionnaire: document.querySelector('[data-tab-content="questionnaire"]'),
        screening: document.querySelector('[data-tab-content="screening"]'),
        lab: document.querySelector('[data-tab-content="lab"]'),
        crossmatching: document.querySelector('[data-tab-content="crossmatching"]'),
    };
    testTableHeads = {
        questionnaire: document.getElementById('questionnaire-table-head'),
        screening: document.getElementById('screening-table-head'),
        lab: document.getElementById('lab-table-head'),
        crossmatching: document.getElementById('crossmatching-table-head'),
    };
    testTableBodies = {
        questionnaire: document.getElementById('questionnaire-table-body'),
        screening: document.getElementById('screening-table-body'),
        lab: document.getElementById('lab-table-body'),
        crossmatching: document.getElementById('crossmatching-table-body'),
    };

    // Modals
    testFormsModal = document.getElementById('test-forms-modal');
    testFormsContainer = document.getElementById('test-forms-container');
}

export function showLoadingState() {
    if (dataTableBody) {
        dataTableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-gray-500">Loading data...</td></tr>`;
    }
    // Also show loading for test tables if they are visible
    if (state.currentView === 'tests' && testTableBodies[state.currentTestTab]) {
        testTableBodies[state.currentTestTab].innerHTML = `<tr><td colspan="4" class="p-6 text-center text-gray-500">Loading data...</td></tr>`;
    }
}

export function clearTable() {
    if (dataTableBody) {
        dataTableBody.innerHTML = '';
    }
}

// --- Helper Functions ---
function safeFormatDate(timestamp) {
    if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString();
    }
    return 'N/A';
}

async function getDonorName(donorId) {
    // First, check the cache
    let donor = state.allDonorsCache.find(d => d.id === donorId);
    if (donor) {
        return donor.fullName;
    }

    // If not in cache, fetch from the service
    try {
        donor = await getDonor(donorId);
        if (donor) {
            // Optional: Add the fetched donor to the cache for future use
            state.allDonorsCache.push(donor);
            return donor.fullName;
        }
    } catch (error) {
        console.error(`[UI] Error fetching donor name for ID ${donorId}:`, error);
    }

    return 'Unknown Donor';
}

function getPatientName(patientId) {
    const patient = state.patientsCache.find(p => p.id === patientId);
    return patient ? patient.fullName : 'Unknown Patient';
}

function getStatusBadge(status) {
    let color = 'bg-gray-100 text-gray-800';
    if (!status) {
        // This is the fix: handle undefined or null status
    } else if (status === 'Pass' || status === 'Compatible' || status === 'Fulfilled' || status === 'Available' || status === 'Success') {
           color = 'bg-green-100 text-green-800';
       } else if (status === 'Pending' || status === 'Matched') {
           color = 'bg-yellow-100 text-yellow-800';
       } else if (status.includes('Disqualification') || status === 'Incompatible' || status === 'REJECTED' || status === 'Expired' || status === 'Positive' || status === 'Fail' || status === 'Cancelled') {
           color = 'bg-red-100 text-red-800';
       } else if (status === 'Allocated' || status === 'Crossmatching' || status === 'Skipped') {
           color = 'bg-blue-100 text-blue-800';
       }
    
    return `<span class="px-2 py-1 text-xs font-semibold rounded-full ${color}">${(status || 'N/A').replace(/_/g, ' ')}</span>`;
}

// --- View & Tab Switching ---

export function switchViewUI(view) {
    Object.values(navLinks).forEach(link => link.classList.remove('active'));
    if (navLinks[view]) navLinks[view].classList.add('active');

    const isTestsView = view === 'tests';
    const isNotificationsView = view === 'notifications';

    mainContent.classList.toggle('hidden', isTestsView || isNotificationsView);
    testsPageContent.classList.toggle('hidden', !isTestsView);
    document.getElementById('notifications-page-content').classList.toggle('hidden', !isNotificationsView);
    pageActions.classList.toggle('hidden', isTestsView || isNotificationsView);

    pageTitle.textContent = isTestsView ? 'Test History' : (navLinks[view]?.textContent || 'Dashboard');
}

export function switchTestTabUI(tab) {
    testsTabs.querySelectorAll('.tab-link').forEach(link => {
        link.classList.toggle('active', link.dataset.tab === tab);
    });

    Object.values(testsTabContents).forEach(content => content.classList.add('hidden'));
    if (testsTabContents[tab]) testsTabContents[tab].classList.remove('hidden');
    
    const isCrossmatch = tab === 'crossmatching';
    // Don't disable the button for crossmatching - the handler will manage the behavior
    addTestBtn.disabled = false;
    addTestBtn.title = isCrossmatch ? 'Add Crossmatching Test' : 'Add New Test';
}

export function updatePageActionsUI(addHandler) {
    if (!pageActions) return;
    pageActions.innerHTML = ''; // Clear existing buttons
    if (addHandler) {
        const button = document.createElement('button');
        button.id = 'add-new-btn';
        button.className = 'bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 text-sm';
        button.textContent = `Add New ${state.currentView.slice(0, -1)}`;
        button.onclick = addHandler;
        pageActions.appendChild(button);
    }
}

export function updateTableControlsUI(filterHandler) {
    const statusFilter = document.getElementById('status-filter');
    const searchInput = document.getElementById('search-input');
    if (!statusFilter || !searchInput) return;

    // Define the status options for each view
    const statusOptions = {
        requests: ['All', 'Pending', 'Allocated', 'Fulfilled', 'Cancelled'],
        donations: ['All', 'Completed', 'Pending'],
        donors: ['All', 'Eligible', 'Temporary Disqualification', 'Permanent Disqualification'],
        inventory: ['All', 'Available', 'Allocated', 'Expired', 'Crossmatching']
    };
    const currentStatusOptions = statusOptions[state.currentView] || [];

    // Only update the options, not the entire control structure
    statusFilter.innerHTML = currentStatusOptions.map(s => `<option value="${s}">${s.replace(/_/g, ' ')}</option>`).join('');

    // Remove old listeners to prevent duplicates
    searchInput.removeEventListener('input', filterHandler);
    statusFilter.removeEventListener('change', filterHandler);

    // Add fresh listeners
    if (filterHandler) {
        searchInput.addEventListener('input', filterHandler);
        statusFilter.addEventListener('change', filterHandler);
    }
}

export function updateTestTableControlsUI(filterHandler) {
    if (!testsTableControls) return;

    testsTableControls.innerHTML = `
        <div class="relative w-full max-w-xs">
            <input type="text" id="search-input-tests" placeholder="Search..." class="w-full pl-10 pr-4 py-2 border rounded-lg">
            <i class="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
        </div>
    `;
    if (filterHandler) {
        document.getElementById('search-input-tests').addEventListener('input', filterHandler);
    }
}

// --- Page Rendering ---

export async function renderPage() {
    if (state.currentView === 'tests') {
        await renderTestsPage();
    } else {
        const renderFunction = getRenderFunctionForView(state.currentView);
        if (renderFunction) {
            await renderFunction(state.filteredPageData);
        } else {
            console.error(`[UI] No render function found for view: ${state.currentView}`);
            dataTableBody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-red-500">ERROR: UI configuration missing for this view.</td></tr>`;
        }
        await renderDetailsPanel();
    }
}

export async function renderTestsPage() {
    const renderFunction = getRenderFunctionForView(state.currentTestTab);
    if(renderFunction) await renderFunction();
    await renderTestDetailsPanel();
}

// --- Table Renderers ---

function getRenderFunctionForView(view) {
    const viewMap = {
        requests: renderRequestsTable,
        donations: renderDonationsTable,
        donors: renderDonorsTable,
        inventory: renderInventoryTable,
        questionnaire: renderQuestionnaireTable,
        screening: renderScreeningTable,
        lab: renderLabTestTable,
        crossmatching: renderCrossmatchingTable,
        notifications: renderNotifications,
    };
    const func = viewMap[view];
    console.log(`[UI] Getting render function for view: ${view}. Function found: ${!!func}`);
    return func;
}

async function renderQuestionnaireTable() {
    console.log('[UI] Rendering Questionnaire Table.');
    const head = testTableHeads.questionnaire;
    const body = testTableBodies.questionnaire;
    head.innerHTML = `<tr><th class="th">Donor</th><th class="th">Result</th><th class="th">Date</th></tr>`;
    
    const data = state.filteredPageData;
    if (data.length === 0) {
        body.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-gray-500">No questionnaires match the current filter.</td></tr>`;
    } else {
        const rows = await Promise.all(data.map(async (q) => {
            const donorName = await getDonorName(q.donorId);
            return `
                <tr class="hover:bg-red-50 cursor-pointer" data-id="${q.id}">
                    <td class="px-6 py-4">${donorName}</td>
                    <td class="px-6 py-4">${getStatusBadge(q.result)}</td>
                    <td class="px-6 py-4">${safeFormatDate(q.createdAt)}</td>
                </tr>`;
        }));
        body.innerHTML = rows.join('');
    }
    head.querySelectorAll('.th').forEach(th => th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase');
}

async function renderScreeningTable() {
    const head = testTableHeads.screening;
    const body = testTableBodies.screening;
    head.innerHTML = `<tr><th class="th">Donor</th><th class="th">Result</th><th class="th">Date</th></tr>`;
    
    const data = state.filteredPageData;
    if (data.length === 0) {
        body.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-gray-500">No health screenings match the current filter.</td></tr>`;
    } else {
        const rows = await Promise.all(data.map(async (s) => {
            const donorName = await getDonorName(s.donorId);
            return `
                <tr class="hover:bg-red-50 cursor-pointer" data-id="${s.id}">
                    <td class="px-6 py-4">${donorName}</td>
                    <td class="px-6 py-4">${getStatusBadge(s.result)}</td>
                    <td class="px-6 py-4">${safeFormatDate(s.createdAt)}</td>
                </tr>`;
        }));
        body.innerHTML = rows.join('');
    }
    head.querySelectorAll('.th').forEach(th => th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase');
}

async function renderLabTestTable() {
    const head = testTableHeads.lab;
    const body = testTableBodies.lab;
    head.innerHTML = `<tr><th class="th">Donor</th><th class="th">Result</th><th class="th">Date</th></tr>`;
    
    const data = state.filteredPageData;
    if (data.length === 0) {
        body.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-gray-500">No lab tests match the current filter.</td></tr>`;
    } else {
        const rows = await Promise.all(data.map(async (l) => {
            const donorName = await getDonorName(l.donorId);
            return `
                <tr class="hover:bg-red-50 cursor-pointer" data-id="${l.id}">
                    <td class="px-6 py-4">${donorName}</td>
                    <td class="px-6 py-4">${getStatusBadge(l.result)}</td>
                    <td class="px-6 py-4">${safeFormatDate(l.createdAt)}</td>
                </tr>`;
        }));
        body.innerHTML = rows.join('');
    }
    head.querySelectorAll('.th').forEach(th => th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase');
}

async function renderCrossmatchingTable() {
    const head = testTableHeads.crossmatching;
    const body = testTableBodies.crossmatching;
    head.innerHTML = `<tr><th class="th">Patient / Request</th><th class="th">Blood Unit</th><th class="th">Status</th><th class="th">Actions</th></tr>`;

    const crossmatchTests = state.filteredPageData;

    if (crossmatchTests.length === 0) {
        body.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-gray-500">No crossmatch tests found.</td></tr>`;
        return;
    }

    const rows = await Promise.all(crossmatchTests.map(async (test) => {
        const request = state.allRequestsCache.find(r => r.id === test.requestId);
        const patientName = request ? getPatientName(request.patientId) : 'Unknown Patient';
        const isUrgent = request && (request.urgency === 'EMERGENCY' || request.urgency === 'URGENT');
        
        let actionButtons = 'Completed';
        if (test.status === 'Matched') {
            actionButtons = `
                <button class="crossmatch-action-btn bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded text-xs" data-test-id="${test.id}" data-blood-bag-id="${test.bloodBagId}" data-action="Pass">Pass</button>
                <button class="crossmatch-action-btn bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-xs" data-test-id="${test.id}" data-blood-bag-id="${test.bloodBagId}" data-action="Fail">Fail</button>
                ${isUrgent ? `<button class="crossmatch-action-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded text-xs" data-test-id="${test.id}" data-blood-bag-id="${test.bloodBagId}" data-action="Skipped">Skip</button>` : ''}
            `;
        }

        return `
            <tr class="hover:bg-red-50" data-id="${test.id}">
                <td class="px-6 py-4">
                    <div>${patientName}</div>
                    <div class="font-mono text-xs text-gray-500">Req ID: ${test.requestId}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="font-mono text-sm">${test.bloodBagId}</div>
                </td>
                <td class="px-6 py-4">${getStatusBadge(test.status)}</td>
                <td class="px-6 py-4 space-x-2">
                    ${actionButtons}
                </td>
            </tr>`;
    }));

    body.innerHTML = rows.join('');
    head.querySelectorAll('.th').forEach(th => th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase');
}

// --- Legacy Renderers for Main Views ---
// (These functions are simplified placeholders and should be replaced with your original detailed implementations)

function renderRequestsTable(data) {
    dataTableHead.innerHTML = `<tr><th class="th">Patient</th><th class="th">Blood Type</th><th class="th">Status</th><th class="th">Date</th></tr>`;
    dataTableBody.innerHTML = data.map(item => `
        <tr class="hover:bg-red-50 cursor-pointer" data-id="${item.id}">
            <td class="px-6 py-4">${getPatientName(item.patientId)}</td>
            <td class="px-6 py-4">${item.bloodType}</td>
            <td class="px-6 py-4">${getStatusBadge(item.status)}</td>
            <td class="px-6 py-4">${safeFormatDate(item.createdAt)}</td>
        </tr>
    `).join('');
    dataTableHead.querySelectorAll('.th').forEach(th => th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase');
}

async function renderDonationsTable(data) {
    dataTableHead.innerHTML = `<tr><th class="th">Donor</th><th class="th">Blood Type</th><th class="th">Status</th><th class="th">Date</th></tr>`;
    if (!data || data.length === 0) {
        dataTableBody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-gray-500">No donations found.</td></tr>`;
        return;
    }
    try {
        const rows = await Promise.all(data.map(async (item) => {
            const donorName = await getDonorName(item.donorId);
            return `
                <tr class="hover:bg-red-50 cursor-pointer" data-id="${item.id}">
                    <td class="px-6 py-4">${donorName}</td>
                    <td class="px-6 py-4">${item.bloodType}</td>
                    <td class="px-6 py-4">${getStatusBadge(item.status)}</td>
                    <td class="px-6 py-4">${safeFormatDate(item.donatedAt)}</td>
                </tr>`;
        }));
        dataTableBody.innerHTML = rows.join('');
    } catch (error) {
        console.error('[UI] Error rendering donations table rows:', error);
        dataTableBody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-red-500">Error displaying donations.</td></tr>`;
    }
}

function renderDonorsTable(data) {
    dataTableHead.innerHTML = `<tr><th class="th">Name</th><th class="th">Blood Type</th><th class="th">Donations</th><th class="th">Status</th><th class="th">ID</th></tr>`;
    dataTableBody.innerHTML = data.map(item => `
        <tr class="hover:bg-red-50 cursor-pointer" data-id="${item.id}">
            <td class="px-6 py-4">${item.fullName}</td>
            <td class="px-6 py-4">${item.bloodType}</td>
            <td class="px-6 py-4">${item.donationRecord}</td>
            <td class="px-6 py-4">${getStatusBadge(item.disqualificationStatus || 'Eligible')}</td>
            <td class="px-6 py-4 font-mono text-xs">${item.id}</td>
        </tr>
    `).join('');
}

function renderInventoryTable(data) {
    dataTableHead.innerHTML = `<tr><th class="th">Bag ID</th><th class="th">Blood Type</th><th class="th">Status</th><th class="th">Donation Date</th></tr>`;
    dataTableBody.innerHTML = data.map(item => `
        <tr class="hover:bg-red-50 cursor-pointer" data-id="${item.id}">
            <td class="px-6 py-4 font-mono text-xs">${item.id}</td>
            <td class="px-6 py-4">${item.bloodType}</td>
            <td class="px-6 py-4">${getStatusBadge(item.status)}</td>
            <td class="px-6 py-4">${safeFormatDate(item.donatedAt)}</td>
        </tr>
    `).join('');
}

function renderNotifications(data) {
    const notificationListItems = document.getElementById('notification-list-items');
    const notificationDetailPanel = document.getElementById('notification-detail-panel');
    if (!notificationListItems || !notificationDetailPanel) return;

    notificationListItems.innerHTML = '';
    let hasUnread = false;

    if (data.length === 0) {
        notificationListItems.innerHTML = '<p class="p-4 text-gray-500">No notifications.</p>';
        notificationDetailPanel.innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-gray-500">No notifications.</p></div>';
        return;
    }

    data.forEach(notification => {
        const notificationElement = document.createElement('div');
        notificationElement.className = 'notification-item p-4 border-b cursor-pointer hover:bg-red-50';
        if (notification.isRead) {
            notificationElement.classList.add('read', 'bg-gray-100');
        } else {
            hasUnread = true;
        }
        notificationElement.innerHTML = `
            <p class="font-semibold truncate">${notification.message}</p>
            <p class="text-xs text-gray-500">${new Date(notification.timestamp.seconds * 1000).toLocaleString()}</p>
        `;
        notificationListItems.appendChild(notificationElement);

        notificationElement.addEventListener('click', () => {
            renderNotificationDetail(notification, notificationDetailPanel);
            if (!notification.isRead) {
                markAsRead(notification.notificationId);
                notificationElement.classList.add('read', 'bg-gray-100');
            }
        });
    });
}

function renderNotificationDetail(notification, container) {
    container.innerHTML = `
        <div class="p-6">
            <h3 class="font-bold text-lg mb-2">Notification Details</h3>
            <p class="mb-4">${notification.message}</p>
            <p class="text-sm text-gray-500">Received: ${new Date(notification.timestamp.seconds * 1000).toLocaleString()}</p>
        </div>
    `;
}

async function renderDetailsPanel() {
    const detailsContent = document.getElementById('details-panel');
    if (!detailsContent) return;

    const selectedItem = state.allPageData.find(item => item.id === state.selectedItemId);

    if (!selectedItem) {
        detailsContent.innerHTML = `<div class="p-4 text-center text-gray-500">Select an item to see details.</div>`;
        return;
    }

    let content = ``;
    // Generate details content based on the view
    // Generate details content based on the view
    switch (state.currentView) {
        case 'requests':
            content = `
                <h3 class="font-bold text-lg mb-4">Request Details</h3>
                <div class="space-y-2 text-sm">
                    <p><strong>ID:</strong> <span class="font-mono text-xs">${selectedItem.id}</span></p>
                    <p><strong>Patient ID:</strong> <span class="font-mono text-xs">${selectedItem.patientId}</span></p>
                    <p><strong>Blood Type:</strong> ${selectedItem.bloodType}</p>
                    <p><strong>Quantity:</strong> ${selectedItem.matchedCount || 0} Matched / ${selectedItem.allocatedCount || 0} Allocated / ${selectedItem.quantity} Required</p>
                    <p><strong>Status:</strong> ${getStatusBadge(selectedItem.status)}</p>
                    <p><strong>Created:</strong> ${safeFormatDate(selectedItem.createdAt)}</p>
                </div>
            `;
            break;
        case 'donations':
            const donorName = await getDonorName(selectedItem.donorId);
            content = `
                <h3 class="font-bold text-lg mb-4">Donation Details</h3>
                <div class="space-y-2 text-sm">
                    <p><strong>ID:</strong> <span class="font-mono text-xs">${selectedItem.id}</span></p>
                    <p><strong>Donor:</strong> ${donorName}</p>
                    <p><strong>Blood Bag ID:</strong> <span class="font-mono text-xs">${selectedItem.bloodBagId}</span></p>
                    <p><strong>Blood Type:</strong> ${selectedItem.bloodType}</p>
                    <p><strong>Status:</strong> ${getStatusBadge(selectedItem.status)}</p>
                    <p><strong>Donated On:</strong> ${safeFormatDate(selectedItem.donatedAt)}</p>
                </div>
            `;
            break;
        case 'donors':
             content = `
                <h3 class="font-bold text-lg mb-4">Donor Details</h3>
                <div class="space-y-2 text-sm">
                    <p><strong>ID:</strong> <span class="font-mono text-xs">${selectedItem.id}</span></p>
                    <p><strong>Name:</strong> ${selectedItem.fullName}</p>
                    <p><strong>Blood Type:</strong> ${selectedItem.bloodType}</p>
                    <p><strong>Donations:</strong> ${selectedItem.donationRecord}</p>
                    <p><strong>Status:</strong> ${getStatusBadge(selectedItem.disqualificationStatus || 'Eligible')}</p>
                    <p><strong>Antibody History:</strong> ${(selectedItem.antibody_history || []).join(', ') || 'N/A'}</p>
                </div>
                <div class="mt-6">
                    <button id="edit-donor-btn" class="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Edit Donor</button>
                </div>
            `;
            break;
        case 'inventory':
            content = `
                <h3 class="font-bold text-lg mb-4">Blood Bag Details</h3>
                <div class="space-y-2 text-sm">
                    <p><strong>Bag ID:</strong> <span class="font-mono text-xs">${selectedItem.id}</span></p>
                    <p><strong>Donor ID:</strong> <span class="font-mono text-xs">${selectedItem.donorId}</span></p>
                    <p><strong>Blood Type:</strong> ${selectedItem.bloodType}</p>
                    <p><strong>Status:</strong> ${getStatusBadge(selectedItem.status)}</p>
                    <p><strong>Donation Date:</strong> ${safeFormatDate(selectedItem.donatedAt)}</p>
                    <p><strong>CMV Status:</strong> ${selectedItem.cmvStatus ? getStatusBadge(selectedItem.cmvStatus === 'Negative' ? 'Pass' : 'Fail') : 'N/A'}</p>
                    <p><strong>Sickle Cell Status:</strong> ${selectedItem.sickleCellStatus ? getStatusBadge(selectedItem.sickleCellStatus === 'Negative' ? 'Pass' : 'Fail') : 'N/A'}</p>
                    <p><strong>Antigen Profile:</strong> ${(selectedItem.antigen_profile || []).join(', ') || 'N/A'}</p>
                    <p><strong>Special Attributes:</strong> ${(selectedItem.special_attributes || []).join(', ') || 'N/A'}</p>
                    <p><strong>Minor Antigens:</strong> ${(selectedItem.minorAntigens || []).join(', ') || 'N/A'}</p>
                </div>
                <div class="mt-6">
                    <button id="edit-blood-unit-btn" class="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Edit Details</button>
                </div>
            `;
            break;
        default:
            content = `<div class="p-4 text-center text-gray-500">Details view not implemented for this section.</div>`;
    }
    detailsContent.innerHTML = content;
}

async function renderTestDetailsPanel() {
    if (!testsDetailsPanel) return;

    const selectedItem = state.getSelectedTestItem();

    if (!selectedItem) {
        testsDetailsPanel.innerHTML = `<div class="p-4 text-center text-gray-500">Select an item to see details.</div>`;
        return;
    }

    let content = ``;
    const donorName = selectedItem.donorId ? await getDonorName(selectedItem.donorId) : 'N/A';

    switch (state.currentTestTab) {
        case 'questionnaire':
            content = `
                <h3 class="font-bold text-lg mb-4">Questionnaire Details</h3>
                <div class="space-y-2 text-sm">
                    <p><strong>ID:</strong> <span class="font-mono text-xs">${selectedItem.id}</span></p>
                    <p><strong>Donor:</strong> ${donorName}</p>
                    <p><strong>Result:</strong> ${getStatusBadge(selectedItem.result)}</p>
                    <p><strong>Date:</strong> ${safeFormatDate(selectedItem.createdAt)}</p>
                    <p><strong>Reason:</strong> ${selectedItem.reason || 'N/A'}</p>
                </div>
            `;
            break;
        case 'screening':
            const screeningDetails = await getHealthScreening(selectedItem.id);
            if (screeningDetails) {
                content = `
                    <h3 class="font-bold text-lg mb-4">Screening Details</h3>
                    <div class="space-y-2 text-sm">
                        <p><strong>ID:</strong> <span class="font-mono text-xs">${screeningDetails.id}</span></p>
                        <p><strong>Donor:</strong> ${donorName}</p>
                        <p><strong>Result:</strong> ${getStatusBadge(screeningDetails.result)}</p>
                        <p><strong>Date:</strong> ${safeFormatDate(screeningDetails.createdAt)}</p>
                        <hr class="my-4">
                        <p><strong>Weight:</strong> ${screeningDetails.weight} kg</p>
                        <p><strong>Temperature:</strong> ${screeningDetails.temperature} °C</p>
                        <p><strong>Heart Rate:</strong> ${screeningDetails.heartRate} bpm</p>
                        <p><strong>Blood Pressure:</strong> ${screeningDetails.vitals.bloodPressure.systolic}/${screeningDetails.vitals.bloodPressure.diastolic} mmHg</p>
                        <p><strong>Comments:</strong> ${screeningDetails.comments || 'N/A'}</p>
                    </div>
                `;
            } else {
                content = `<div class="p-4 text-center text-gray-500">Could not load screening details.</div>`;
            }
            break;
        case 'lab':
            content = `
                <h3 class="font-bold text-lg mb-4">Lab Test Details</h3>
                <div class="space-y-2 text-sm">
                    <p><strong>ID:</strong> <span class="font-mono text-xs">${selectedItem.id}</span></p>
                    <p><strong>Donor:</strong> ${donorName}</p>
                    <p><strong>Result:</strong> ${getStatusBadge(selectedItem.result)}</p>
                    <p><strong>Date:</strong> ${safeFormatDate(selectedItem.createdAt)}</p>
                    <hr class="my-4">
                    <p><strong>Hemoglobin:</strong> ${selectedItem.bloodLevels.hemoglobin} g/dL</p>
                    <p><strong>Hematocrit:</strong> ${selectedItem.bloodLevels.hematocrit} %</p>
                    <hr class="my-4">
                    <p><strong>Hepatitis B:</strong> ${getStatusBadge(selectedItem.viralMarkers.hepatitisB)}</p>
                    <p><strong>Hepatitis C:</strong> ${getStatusBadge(selectedItem.viralMarkers.hepatitisC)}</p>
                    <p><strong>HIV/AIDS:</strong> ${getStatusBadge(selectedItem.viralMarkers.hivAids)}</p>
                </div>
            `;
            break;
        case 'crossmatching':
            const request = state.allRequestsCache.find(r => r.id === selectedItem.requestId);
            const patientName = request ? getPatientName(request.patientId) : 'Unknown Patient';
            const inventoryItem = state.allInventoryCache.find(i => i.id === selectedItem.bloodBagId);
            const donorNameFromInventory = inventoryItem ? await getDonorName(inventoryItem.donorId) : 'Unknown Donor';

            content = `
                <h3 class="font-bold text-lg mb-4">Crossmatch Details</h3>
                <div class="space-y-2 text-sm">
                    <p><strong>Test ID:</strong> <span class="font-mono text-xs">${selectedItem.id}</span></p>
                    <p><strong>Status:</strong> ${getStatusBadge(selectedItem.status)}</p>
                    <p><strong>Date:</strong> ${safeFormatDate(selectedItem.createdAt)}</p>
                    ${selectedItem.reportUrl ? `<p><strong>Report:</strong> <a href="${selectedItem.reportUrl}" target="_blank" class="text-blue-600 hover:underline">View Report</a></p>` : ''}
                    <hr class="my-4">
                    <h4 class="font-semibold">Request Info</h4>
                    <p><strong>Request ID:</strong> <span class="font-mono text-xs">${selectedItem.requestId}</span></p>
                    <p><strong>Patient:</strong> ${patientName}</p>
                    <p><strong>Urgency:</strong> ${request ? getStatusBadge(request.urgency) : 'N/A'}</p>
                     <hr class="my-4">
                    <h4 class="font-semibold">Blood Unit Info</h4>
                    <p><strong>Bag ID:</strong> <span class="font-mono text-xs">${selectedItem.bloodBagId}</span></p>
                    <p><strong>Blood Type:</strong> ${inventoryItem ? inventoryItem.bloodType : 'N/A'}</p>
                    <p><strong>Donor:</strong> ${donorNameFromInventory}</p>
                </div>
            `;
            break;
        default:
            content = `<div class="p-4 text-center text-gray-500">Details view not implemented for this section.</div>`;
    }
    testsDetailsPanel.innerHTML = content;
}

// --- Modal UI ---

export function showTestFormModal() {
    // This function should now just show the modal. 
    // The specific form to show will be handled by the handler.
    if (testFormsModal) {
        testFormsModal.classList.remove('opacity-0', 'pointer-events-none');
    }
}

export function hideTestFormModal() {
    if (testFormsModal) {
        testFormsModal.classList.add('opacity-0', 'pointer-events-none');
    }
}

export function showFormInModal(formId) {
    // Hide all forms first
    if (testFormsContainer) {
        const forms = testFormsContainer.querySelectorAll('form');
        forms.forEach(form => form.classList.add('hidden'));
        
        // Show the correct form
        const activeForm = document.getElementById(formId);
        if (activeForm) {
            activeForm.classList.remove('hidden');
            activeForm.reset();
        }
    }
}

export function renderQuestionnaireQuestions(questionnaireConfig) {
    const container = document.getElementById('questionnaire-questions-container');
    if (!container) return;
    container.innerHTML = questionnaireConfig.map(q => `
        <div class="flex items-center justify-between">
            <label for="q-${q.key}" class="text-sm">${q.text}</label>
            <div class="flex gap-4">
                <label class="flex items-center gap-2"><input type="radio" name="q-${q.key}" value="yes" required> Yes</label>
                <label class="flex items-center gap-2"><input type="radio" name="q-${q.key}" value="no" required> No</label>
            </div>
        </div>
    `).join('');
}

export function showSelectedDonorForQuestionnaire() {
    const donor = state.selectedDonorForQuestionnaire;
    if (!donor) return;
    document.getElementById('q-selected-donor-name').textContent = donor.fullName;
    document.getElementById('q-selected-donor-info').textContent = `ID: ${donor.id} | Type: ${donor.bloodType}`;
    document.getElementById('q-donor-search-component').classList.add('hidden');
    document.getElementById('q-selected-donor-display').classList.remove('hidden');
    document.getElementById('q-donor-search-results').classList.add('hidden');
}

export function showSelectedQuestionnaireForScreening() {
    const questionnaire = state.selectedQuestionnaireForScreening;
    const donor = state.allDonorsCache.find(d => d.id === questionnaire.donorId);
    if (!questionnaire || !donor) return;
    document.getElementById('s-selected-q-name').textContent = donor.fullName;
    document.getElementById('s-selected-q-info').textContent = `Q-ID: ${questionnaire.id} | Date: ${safeFormatDate(questionnaire.createdAt)}`;
    document.getElementById('s-q-search-component').classList.add('hidden');
    document.getElementById('s-selected-q-display').classList.remove('hidden');
    document.getElementById('s-q-search-results').classList.add('hidden');
}

export function showSelectedScreeningForLabTest() {
    const screening = state.selectedScreeningForLabTest;
    const donor = state.allDonorsCache.find(d => d.id === screening.donorId);
    if (!screening || !donor) return;
    document.getElementById('l-selected-s-name').textContent = donor.fullName;
    document.getElementById('l-selected-s-info').textContent = `S-ID: ${screening.id} | Date: ${safeFormatDate(screening.createdAt)}`;
    document.getElementById('l-s-search-component').classList.add('hidden');
    document.getElementById('l-selected-s-display').classList.remove('hidden');
    document.getElementById('l-s-search-results').classList.add('hidden');
}
