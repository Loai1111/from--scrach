/**
 * ui.js (hospital)
 * Handles all DOM manipulation and rendering for the hospital portal.
 */

import * as state from './state.js';
import { markAsRead } from '../../services/notification.service.js';

// --- DOM Element References ---
let navLinks, pageTitle, pageActions, tableControls, tableHead, tableBody, detailsPanel;

/**
 * Initializes all DOM element references.
 */
export function init() {
    navLinks = {
        requests: document.getElementById('nav-requests'),
        patients: document.getElementById('nav-patients'),
        notifications: document.getElementById('nav-notifications'),
    };
    pageTitle = document.getElementById('page-title');
    pageActions = document.getElementById('page-actions');
    tableControls = document.getElementById('table-controls');
    tableHead = document.getElementById('data-table-head');
    tableBody = document.getElementById('data-table-body');
    detailsPanel = document.getElementById('details-panel');
}

// --- Helper Functions ---
function safeFormatDate(timestamp, format = 'date') {
    if (timestamp && typeof timestamp.toDate === 'function') {
        const date = timestamp.toDate();
        return format === 'datetime' ? date.toLocaleString() : date.toLocaleDateString();
    }
    return 'N/A';
}

function calculateAge(dobString) {
    if (!dobString) return 'N/A';
    const dob = new Date(dobString);
    const ageDifMs = Date.now() - dob.getTime();
    const ageDate = new Date(ageDifMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function formatBloodComponents(components) {
    if (!components || Object.keys(components).length === 0) {
        return '<span class="text-gray-500">None</span>';
    }
    return Object.entries(components)
        .map(([key, value]) => `
            <div class="flex justify-between items-center">
                <span class="text-sm text-gray-700">${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
                <span class="text-sm font-semibold ${value ? 'text-green-600' : 'text-red-600'}">${value ? 'Yes' : 'No'}</span>
            </div>
        `)
        .join('');
}

// --- Main UI Update Functions ---
export function switchViewUI(view) {
    for (const link in navLinks) {
        navLinks[link].classList.remove('active');
    }
    navLinks[view].classList.add('active');
}

export function updatePageActionsUI(addHandler) {
    pageActions.innerHTML = '';
    let btnText = '';
    if (state.currentView === 'requests') btnText = 'Create Request';
    else if (state.currentView === 'patients') btnText = 'Add New Patient';

    if (btnText) {
        const actionBtn = document.createElement('button');
        actionBtn.className = 'bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 text-sm';
        actionBtn.textContent = btnText;
        actionBtn.addEventListener('click', addHandler);
        pageActions.appendChild(actionBtn);
    }
}

export function updateTableControlsUI(filterHandler) {
    tableControls.innerHTML = `
        <div class="relative w-full max-w-xs">
            <input type="text" id="search-input" placeholder="Search..." class="w-full pl-10 pr-4 py-2 border rounded-lg">
            <i class="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
        </div>
    `;
    const searchInput = tableControls.querySelector('#search-input');
    searchInput.addEventListener('input', filterHandler);

    let statusOptions = [];
    if (state.currentView === 'requests') {
        statusOptions = ['All', 'Pending', 'Allocated', 'Fulfilled', 'Cancelled'];
    }

    if (statusOptions.length > 0) {
        const statusFilter = document.createElement('select');
        statusFilter.id = 'status-filter';
        statusFilter.className = 'px-4 py-2 border border-gray-300 rounded-lg';
        statusOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt.replace(/_/g, ' ');
            statusFilter.appendChild(option);
        });
        statusFilter.addEventListener('change', filterHandler);
        tableControls.appendChild(statusFilter);
    }
}

export function showLoadingState() {
    tableHead.innerHTML = '';
    tableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-gray-500">Loading...</td></tr>`;
    renderDetailsPanel();
}

export function renderPage() {
    pageTitle.textContent = getPageTitle(state.currentView);
    const renderFunction = getRenderFunctionForView(state.currentView);
    if (renderFunction) {
        renderFunction(state.filteredPageData);
    } else {
        console.error(`[UI] No render function found for view: ${state.currentView}`);
        tableBody.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-red-500">ERROR: UI configuration missing for this view.</td></tr>`;
    }
}

function getRenderFunctionForView(view) {
    const viewMap = {
        requests: renderRequestsTable,
        patients: renderPatientsTable,
        notifications: renderNotifications,
    };
    return viewMap[view];
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
        notificationElement.className = 'notification-item p-4 border-b cursor-pointer hover:bg-blue-50';
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

function getPageTitle(view) {
    const titles = {
        requests: 'Blood Requests',
        patients: 'Patient Records',
        notifications: 'Notifications'
    };
    return titles[view] || 'Dashboard';
}

// --- Table Rendering ---
function renderRequestsTable(requests) {
    tableHead.innerHTML = `<tr><th class="th">Patient ID</th><th class="th">Blood Type</th><th class="th">Status</th><th class="th">Date</th></tr>`.replaceAll('class="th"', 'class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"');
    tableBody.innerHTML = requests.length === 0 ? `<tr><td colspan="4" class="p-6 text-center text-gray-500">No requests found.</td></tr>` : requests.map(request => {
        const status = request.status || '';
        let statusColor = 'bg-gray-100 text-gray-800';
        if (status === 'Pending') statusColor = 'bg-yellow-100 text-yellow-800';
        else if (status === 'Allocated') statusColor = 'bg-blue-100 text-blue-800';
        else if (status === 'Fulfilled') statusColor = 'bg-green-100 text-green-800';
        else if (status === 'Cancelled') statusColor = 'bg-red-100 text-red-800';
        
        return `<tr class="hover:bg-blue-50 cursor-pointer ${request.id === state.selectedItemId ? 'bg-blue-100' : ''}" data-id="${request.id}">
            <td class="px-6 py-4 font-mono text-xs">${request.patientId}</td>
            <td class="px-6 py-4">${request.bloodType}</td>
            <td class="px-6 py-4"><span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">${status.replace(/_/g, ' ')}</span></td>
            <td class="px-6 py-4">${safeFormatDate(request.createdAt)}</td>
        </tr>`;
    }).join('');
}

function renderPatientsTable(patients) {
    tableHead.innerHTML = `<tr><th class="th">Name</th><th class="th">Blood Type</th><th class="th">Age</th><th class="th">Sex</th></tr>`.replaceAll('class="th"', 'class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"');
    tableBody.innerHTML = patients.length === 0 ? `<tr><td colspan="4" class="p-6 text-center text-gray-500">No patients found.</td></tr>` : patients.map(patient => `
        <tr class="hover:bg-blue-50 cursor-pointer ${patient.id === state.selectedItemId ? 'bg-blue-100' : ''}" data-id="${patient.id}">
            <td class="px-6 py-4 font-medium">${patient.fullName}</td>
            <td class="px-6 py-4">${patient.bloodType}</td>
            <td class="px-6 py-4">${calculateAge(patient.dob)}</td>
            <td class="px-6 py-4">${patient.sex}</td>
        </tr>`).join('');
}


// --- Details Panel Rendering ---
export function renderDetailsPanel() {
    if (!detailsPanel) return;
    if (!state.selectedItemId) {
        detailsPanel.innerHTML = '<h3 class="text-lg font-semibold">Details</h3><p class="text-gray-500 mt-2">Select an item to see details.</p>';
        return;
    }
    const selectedItem = state.allPageData.find(item => item.id === state.selectedItemId);
    if (!selectedItem) {
        detailsPanel.innerHTML = '<h3 class="text-lg font-semibold">Error</h3><p class="text-red-500 mt-2">Could not find the selected item.</p>';
        return;
    }

    const detailsHtml = state.currentView === 'requests' ? renderRequestDetails(selectedItem) : renderPatientDetails(selectedItem);
    detailsPanel.innerHTML = detailsHtml
        .replaceAll('class="lbl"', 'class="block text-sm font-medium text-gray-500"')
        .replaceAll('class="val"', 'class="mt-1 text-base font-semibold text-gray-900"');

    // Add event listener for the new confirm receipt button
    const confirmButtons = detailsPanel.querySelectorAll('.confirm-receipt-btn');
    confirmButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const reportId = e.target.dataset.reportId;
            const report = state.crossmatchReportsCache.find(r => r.id === reportId);
            if (report) {
                showConfirmReceiptModal(report.bloodBagId, reportId);
            }
        });
    });
}

function renderRequestDetails(item) {
    const patient = state.allPatientsCache.find(p => p.id === item.patientId);
    const canCancel = !['cancelled'].includes(item.status);

    // FIX: The logic for displaying allocated units was flawed.
    // It should iterate over actual crossmatch reports, not an assumed number of units.
    const reportsForRequest = state.crossmatchReportsCache.filter(r => r.requestId === item.id);
    const compatibleReports = reportsForRequest.filter(r => r.result === 'Pass' || r.result === 'Success' || r.status === 'issued');
    const allocatedCount = compatibleReports.length;
    const totalUnits = item.quantity || 0;

    let crossmatchTable = '';
    if (reportsForRequest.length > 0) {
        const rows = reportsForRequest.map(report => {
            const isCompatible = report.result === 'Compatible' || report.result === 'Pass' || report.result === 'Success';
            let statusText = report.status === 'issued' ? 'Issued' : (isCompatible ? 'Allocated' : report.result);
            let statusColor = 'bg-gray-100 text-gray-800';
            if (report.status === 'issued') {
                statusColor = 'bg-green-100 text-green-800';
            } else if (isCompatible) {
                statusColor = 'bg-blue-100 text-blue-800';
            } else {
                statusColor = 'bg-red-100 text-red-800';
            }

            let actionButtons = 'N/A';

            if (isCompatible && report.reportUrl) {
                const downloadButton = `<a href="${report.reportUrl}" target="_blank" class="bg-green-600 text-white font-bold py-1 px-3 rounded-lg hover:bg-green-700 text-xs">Download</a>`;
                
                if (report.status === 'issued') {
                    actionButtons = `
                        <div class="flex items-center gap-2">
                            ${downloadButton}
                            <span class="text-xs text-green-700 font-semibold flex items-center gap-1"><i class="ph-bold ph-check-circle"></i> Issued</span>
                        </div>
                    `;
                } else {
                    actionButtons = `
                        <div class="flex items-center gap-2">
                            ${downloadButton}
                            <button data-report-id="${report.id}" class="confirm-receipt-btn bg-blue-600 text-white font-bold py-1 px-3 rounded-lg hover:bg-blue-700 text-xs">Confirm Receipt</button>
                        </div>
                    `;
                }
            } else if (isCompatible) {
                actionButtons = '<span class="text-xs text-gray-500">Pending Report</span>';
            }

            return `
                <tr class="border-b">
                    <td class="py-2 px-3 text-sm font-mono">${report.bloodBagId ? `...${report.bloodBagId.slice(-6)}` : 'N/A'}</td>
                    <td class="py-2 px-3 text-sm"><span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">${statusText}</span></td>
                    <td class="py-2 px-3 text-sm">${actionButtons}</td>
                </tr>
            `;
        }).join('');

        crossmatchTable = `
            <div class="mt-6">
                <h4 class="lbl">Crossmatch Results</h4>
                <div class="mt-2 border rounded-lg overflow-hidden">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="th_small">Bag ID</th>
                                <th class="th_small">Status</th>
                                <th class="th_small">Actions</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `.replaceAll('class="th_small"', 'class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase"');
    }

    return `
        <h3 class="text-lg font-semibold">Request Details</h3>
        <div class="space-y-4 mt-4">
            <div><span class="lbl">Request ID</span><span class="val font-mono text-sm">${item.id}</span></div>
            <div><span class="lbl">Patient</span><span class="val">${patient ? patient.fullName : item.patientId}</span></div>
            <div><span class="lbl">Status</span><span class="val">${item.status.replace(/_/g, ' ')}</span></div>
            <div><span class="lbl">Blood Type</span><span class="val">${item.bloodType}</span></div>
            <div><span class="lbl">Quantity</span><span class="val">${item.matchedCount || 0} Matched / ${allocatedCount} Allocated / ${totalUnits} Required</span></div>
            <div><span class="lbl">Urgency</span><span class="val">${item.urgency}</span></div>
            ${item.scheduledAt ? `<div><span class="lbl">Scheduled For</span><span class="val">${safeFormatDate(item.scheduledAt)}</span></div>` : ''}
            ${item.specialRequirements && item.specialRequirements.length > 0 ? `<div><span class="lbl">Special Requirements</span><div class="mt-1 flex flex-wrap gap-2">${item.specialRequirements.map(r => `<span class="bg-gray-200 text-gray-800 text-xs font-medium px-2.5 py-1 rounded-full">${r}</span>`).join('')}</div></div>` : ''}
            <div><span class="lbl">Reason</span><p class="text-sm text-gray-700 mt-1">${item.condition || 'N/A'}</p></div>
        </div>
        ${crossmatchTable}
        ${canCancel ? `
        <div id="details-actions" class="mt-6 pt-6 border-t space-y-2">
            ${canCancel ? `<button id="cancel-request-btn" class="w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700">Cancel Request</button>` : ''}
        </div>
        ` : ''}
    `;
}

function renderPatientDetails(item) {
    const bloodGroup = `${item.bloodGroup || ''}${item.rhFactor || ''}`;

    const renderCurrentAntibodies = (antibodies) => {
        if (!antibodies || antibodies.length === 0) {
            return '<span class="val">None</span>';
        }
        return `<span class="val">${antibodies.join(', ')}</span>`;
    };

    const renderAntibodyHistory = (history) => {
        if (!history || history.length === 0) {
            return '<span class="val">None</span>';
        }
        const formattedHistory = history
            .map(h => {
                if (!h || !h.antibody) return null;
                const date = h.dateDetected ? safeFormatDate(h.dateDetected) : 'N/A';
                return `${h.antibody} (${date})`;
            })
            .filter(Boolean)
            .join(', ');

        return `<span class="val">${formattedHistory || 'None'}</span>`;
    };

    const renderAntigens = (antigens) => {
        if (!antigens || antigens.length === 0) {
            return '<span class="val">N/A</span>';
        }
        return `<div class="mt-1 flex flex-wrap gap-2">${antigens.map(ag => `<span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">${ag}</span>`).join('')}</div>`;
    };

    return `
        <h3 class="text-lg font-semibold">Patient Profile</h3>
        <div class="space-y-4 mt-4">
            <div><span class="lbl">Patient ID</span><span class="val font-mono text-sm">${item.id}</span></div>
            <div><span class="lbl">Full Name</span><span class="val">${item.fullName}</span></div>
            <div><span class="lbl">Age</span><span class="val">${calculateAge(item.dob)}</span></div>
            <div><span class="lbl">Sex</span><span class="val">${item.sex}</span></div>
            <div><span class="lbl">Blood Type</span><span class="val">${item.bloodType}</span></div>
            <div><span class="lbl">Current Antibodies</span>${renderCurrentAntibodies(item.currentAntibodies)}</div>
            <div><span class="lbl">Antibody History</span>${renderAntibodyHistory(item.antibodyHistory)}</div>
        </div>
        <div id="details-actions" class="mt-6 pt-6 border-t space-y-2">
            <button id="edit-patient-btn" class="w-full bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700">Edit Patient</button>
        </div>
    `;
}


export function renderMatchingResults(patient, compatibleBags) {
    const modal = document.getElementById('match-results-modal');
    const title = document.getElementById('match-results-title');
    const resultsContainer = document.getElementById('match-results-list');

    title.textContent = `Matching Results for ${patient.fullName}`;
    
    if (compatibleBags.length === 0) {
        resultsContainer.innerHTML = '<p class="text-gray-500 p-4">No compatible blood bags found in the current inventory.</p>';
    } else {
        resultsContainer.innerHTML = `
            <table class="w-full text-sm text-left text-gray-500">
                <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                        <th scope="col" class="px-6 py-3">Bag ID</th>
                        <th scope="col" class="px-6 py-3">Blood Type</th>
                        <th scope="col" class="px-6 py-3">Donation Date</th>
                        <th scope="col" class="px-6 py-3">Expiry Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${compatibleBags.map(bag => `
                        <tr class="bg-white border-b hover:bg-gray-50">
                            <td class="px-6 py-4 font-mono text-xs">${bag.id}</td>
                            <td class="px-6 py-4">${bag.bloodType}</td>
                            <td class="px-6 py-4">${safeFormatDate(bag.donatedAt)}</td>
                            <td class="px-6 py-4">${safeFormatDate(bag.expiresAt)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    modal.classList.remove('opacity-0', 'pointer-events-none');
}

// --- Modal Functions ---
export function showConfirmReceiptModal(bloodBagId, reportId) {
    const modal = document.getElementById('confirm-receipt-modal');
    document.getElementById('confirm-receipt-bag-id').textContent = bloodBagId;
    const confirmBtn = document.getElementById('confirm-receipt-confirm-btn');
    
    // Clone and replace the button to remove old event listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    newConfirmBtn.dataset.reportId = reportId; // Store reportId on the button

    modal.classList.remove('opacity-0', 'pointer-events-none');
}

export function hideConfirmReceiptModal() {
    const modal = document.getElementById('confirm-receipt-modal');
    modal.classList.add('opacity-0', 'pointer-events-none');
}
