import { state } from './state.js';
import { handleEditUser, handleDeleteUser } from './handler.js';

export const renderUsers = () => {
    const tableBody = document.getElementById('users-table').querySelector('tbody');
    tableBody.innerHTML = '';
    if (!state.users) return;

    state.users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.name || 'N/A'}</td>
            <td>${user.email}</td>
            <td>${user.role || 'N/A'}</td>
            <td>
                <button class="btn btn-sm edit-btn">Edit</button>
                <button class="btn btn-sm btn-danger delete-btn">Delete</button>
            </td>
        `;
        row.querySelector('.edit-btn').addEventListener('click', () => handleEditUser(user.id));
        row.querySelector('.delete-btn').addEventListener('click', () => handleDeleteUser(user.id));
        tableBody.appendChild(row);
    });
};