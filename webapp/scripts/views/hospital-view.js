import { getRequestsByHospital, createRequest, cancelRequest } from '../services/request.service.js';
import { isPastDate, isFutureDate } from '../utils.js';

// --- DOM Elements ---
const navLinks = {
    requests: document.getElementById('nav-requests'),
    notifications: document.getElementById('nav-notifications'),
};
const pageTitle = document.getElementById('page-title');
const pageActions = document.getElementById('page-actions');
const tableControls = document.getElementById('table-controls');
const tableHead = document.getElementById('data-table-head');
const tableBody = document.getElementById('data-table-body');
const detailsPanel = document.getElementById('details-panel');
const newRequestBtn = document.getElementById('new-request-btn');

// Modals
const requestModal = document.getElementById('request-modal');
const requestForm = document.getElementById('request-form');
const requestCancelBtn = document.getElementById('request-cancel-btn');

// --- State Management ---
let currentView = 'requests';
let allPageData = [];
let filteredPageData = [];
let selectedItemId = null;

// --- UI Update Functions ---
function switchView(view) {
    currentView = view;
    selectedItemId = null;

    for (const link in navLinks) {
        navLinks[link].classList.remove('active');
    }
    navLinks[view].classList.add('active');
    
    updatePage();
}

function updatePage() {
    pageTitle.textContent = currentView === 'requests' ? 'Blood Requests' : 'Notifications';
    pageActions.classList.toggle('hidden', currentView !== 'requests');
    
    fetchAndDisplayData();
}

async function fetchAndDisplayData() {
    tableHead.innerHTML = '';
    tableBody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-gray-500">Loading...</td></tr>`;
    detailsPanel.innerHTML = '<h3 class="text-lg font-semibold">Details</h3><p class="text-gray-500">Select an item to see details.</p>';

    if (currentView === 'requests') {
        // This assumes a hospitalId is available. For now, we can hardcode it.
        const hospitalId = "test-hospital"; // Replace with actual hospital ID later
        allPageData = await getRequestsByHospital(hospitalId);
        renderRequestsTable(allPageData);
    } else if (currentView === 'notifications') {
        tableHead.innerHTML = `<tr><th class="th">Notification</th><th class="th">Date</th></tr>`.replaceAll('class="th"', 'class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"');
        tableBody.innerHTML = `<tr><td colspan="2" class="p-6 text-center text-gray-500">No new notifications.</td></tr>`;
    }
    renderDetailsPanel();
}

function renderRequestsTable(requests) {
    tableHead.innerHTML = `<tr><th class="th">Patient Name</th><th class="th">Blood Type</th><th class="th">Status</th></tr>`.replaceAll('class="th"', 'class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"');
    tableBody.innerHTML = '';
    if (requests.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3" class="p-6 text-center text-gray-500">No requests found.</td></tr>`;
        return;
    }
    requests.forEach(request => {
        const row = document.createElement('tr');
        row.className = `hover:bg-blue-50 cursor-pointer ${request.id === selectedItemId ? 'bg-blue-100' : ''}`;
        row.dataset.id = request.id;
        let statusColor = 'bg-yellow-100 text-yellow-800';
        if (request.status === 'Fulfilled') {
            statusColor = 'bg-green-100 text-green-800';
        } else if (request.status.includes('Allocated')) {
            statusColor = 'bg-blue-100 text-blue-800';
        }
        row.innerHTML = `<td class="px-6 py-4 font-medium">${request.patientName || 'N/A'}</td><td class="px-6 py-4">${request.bloodType}</td><td class="px-6 py-4"><span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">${request.status}</span></td>`;
        tableBody.appendChild(row);
    });
}

function renderDetailsPanel() {
    if (!selectedItemId) {
        detailsPanel.innerHTML = '<h3 class="text-lg font-semibold">Details</h3><p class="text-gray-500">Select an item to see details.</p>';
        return;
    }
    const selectedItem = allPageData.find(item => item.id === selectedItemId);
    if (!selectedItem) {
        detailsPanel.innerHTML = '<h3 class="text-lg font-semibold">Error</h3><p class="text-red-500">Could not find item.</p>';
        return;
    }
    let detailsHtml = '';
    if (currentView === 'requests') {
        detailsHtml = `
            <h3 class="text-lg font-semibold mb-4 border-b pb-2">Request Details</h3>
            <div class="space-y-4">
               <div><label class="lbl">Patient Name</label><p class="val">${selectedItem.patientName || 'N/A'}</p></div>
               <div><label class="lbl">Request ID</label><p class="text-sm text-gray-700 break-all">${selectedItem.id}</p></div>
               <div><label class="lbl">Blood Type</label><p class="val">${selectedItem.bloodType}</p></div>
               <div><label class="lbl">Quantity</label><p class="val">${selectedItem.quantity} Units</p></div>
               <div><label class="lbl">Status</label><p class="val">${selectedItem.status}</p></div>
               ${selectedItem.status !== 'Cancelled' && selectedItem.status !== 'Fulfilled' ? `
               <div class="pt-4 border-t mt-4">
                   <button id="cancel-request-btn" class="w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700">Cancel Request</button>
               </div>
               ` : ''}
            </div>
        `;
    }
    detailsPanel.innerHTML = detailsHtml.replaceAll('class="lbl"', 'class="block text-sm font-medium text-gray-500"').replaceAll('class="val"', 'class="text-lg font-semibold"');

    const cancelBtn = document.getElementById('cancel-request-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => handleCancelRequest(selectedItem.id));
    }
}

// --- Action Handlers ---
function handleNewRequestClick() {
    requestForm.reset();
    renderQuantityButtons();
    requestModal.classList.remove('opacity-0', 'pointer-events-none');
}

function renderQuantityButtons(selectedQty = 1) {
    const buttonGroup = document.getElementById('quantity-btn-group');
    const hiddenInput = document.getElementById('quantity');
    buttonGroup.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = i;
        button.dataset.qty = i;
        const isActive = i === selectedQty;
        button.className = `py-2 px-4 rounded-lg border ${isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`;
        buttonGroup.appendChild(button);
    }
    hiddenInput.value = selectedQty;
}

async function handleRequestFormSubmit(e) {
    e.preventDefault();
    const dob = document.getElementById('patient-dob').value;
    if (dob && !isPastDate(dob)) {
        alert("Date of birth must be in the past.");
        return;
    }
    const urgency = document.getElementById('request-urgency').value;
    const scheduledDate = document.getElementById('request-scheduled-at').value;
    if (urgency === 'Scheduled' && !isFutureDate(scheduledDate)) {
        alert("Scheduled date must be in the future.");
        return;
    }

    const selectedPatient = state.selectedPatientForRequest;
    if (!selectedPatient) {
        alert("Please select a patient.");
        return;
    }

    const requestData = {
        patientId: selectedPatient.id,
        patientName: selectedPatient.fullName,
        bloodType: selectedPatient.bloodType,
        quantity: parseInt(document.getElementById('request-quantity').value, 10),
        hospitalId: "test-hospital", // Replace with actual hospital ID later
        urgency: document.getElementById('request-urgency').value,
        scheduledAt: scheduledDate || null,
        condition: document.getElementById('request-condition').value,
    };

    try {
        await createRequest(requestData);
        alert('Successfully created new request.');
        requestModal.classList.add('opacity-0', 'pointer-events-none');
        fetchAndDisplayData();
    } catch (error) {
        console.error("Error creating request:", error);
        alert("An error occurred while creating the request.");
    }
}

async function handleCancelRequest(requestId) {
    if (confirm('Are you sure you want to cancel this request?')) {
        try {
            await cancelRequest(requestId);
            alert('Request cancelled successfully.');
            selectedItemId = null; // Deselect item
            fetchAndDisplayData();
        } catch (error) {
            console.error("Error cancelling request:", error);
            alert("An error occurred while cancelling the request.");
        }
    }
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    for (const link in navLinks) {
        navLinks[link].addEventListener('click', (e) => { e.preventDefault(); switchView(link); });
    }

    newRequestBtn.addEventListener('click', handleNewRequestClick);
    requestCancelBtn.addEventListener('click', () => requestModal.classList.add('opacity-0', 'pointer-events-none'));
    requestForm.addEventListener('submit', handleRequestFormSubmit);

    document.getElementById('quantity-btn-group').addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (target) {
            const qty = parseInt(target.dataset.qty, 10);
            renderQuantityButtons(qty);
        }
    });

    tableBody.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (row && row.dataset.id) {
            selectedItemId = row.dataset.id;
            renderRequestsTable(allPageData); // Re-render table to show selection
            renderDetailsPanel();
        }
    });

    switchView('requests');
});