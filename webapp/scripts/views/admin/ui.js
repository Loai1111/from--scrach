import { state } from './state.js';
import { handleEditUser, handleDeleteUser } from './handler.js';

export const renderUsers = () => {
    renderTable('hospital-users-table', state.hospitalUsers, 'hospital');
    renderTable('bloodbank-users-table', state.bloodbankUsers, 'bloodbank');
};

const renderTable = (tableId, users, type) => {
    const tableBody = document.getElementById(tableId).querySelector('tbody');
    tableBody.innerHTML = '';
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>
                <button class="btn btn-sm edit-btn">Edit</button>
                <button class="btn btn-sm btn-danger delete-btn">Delete</button>
            </td>
        `;
        row.querySelector('.edit-btn').addEventListener('click', () => handleEditUser(user.id, type));
        row.querySelector('.delete-btn').addEventListener('click', () => handleDeleteUser(user.id, type));
        tableBody.appendChild(row);
    });
};