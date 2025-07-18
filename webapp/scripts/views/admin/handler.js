import { state } from './state.js';
import { renderUsers } from './ui.js';
import { authService, adminService } from '../../services/index.js';

export const initHandlers = () => {
    try {
        document.getElementById('logout-btn').addEventListener('click', () => {
            authService.logout();
            window.location.href = 'admin-login.html';
        });

        document.querySelector('.tabs').addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-link')) {
                const tab = e.target.dataset.tab;
                document.querySelectorAll('.tab-content, .tab-link').forEach(el => el.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(tab).classList.add('active');
            }
        });

        document.getElementById('add-hospital-user-btn').addEventListener('click', () => openUserModal('hospital'));
        document.getElementById('add-bloodbank-user-btn').addEventListener('click', () => openUserModal('bloodbank'));

        document.querySelector('.modal .close-btn').addEventListener('click', closeUserModal);
        document.getElementById('user-form').addEventListener('submit', handleUserFormSubmit);

        loadUsers();
    } catch (error) {
        console.error("Error initializing handlers:", error);
        alert("Failed to initialize the admin dashboard. Please check the console for errors.");
    }
};

const loadUsers = async () => {
    try {
        state.hospitalUsers = await adminService.getUsers('hospital');
        state.bloodbankUsers = await adminService.getUsers('bloodbank');
        renderUsers();
    } catch (error) {
        console.error("Failed to load users:", error);
        alert("Could not load user data. The dashboard may not function correctly.");
    }
};

const openUserModal = (userType, user = null) => {
    const modal = document.getElementById('user-modal');
    const form = document.getElementById('user-form');
    const passwordInput = document.getElementById('user-password');
    form.reset();
    document.getElementById('user-id').value = user ? user.id : '';
    document.getElementById('user-type').value = userType;
    document.getElementById('modal-title').textContent = user ? 'Edit User' : `Add ${userType} User`;
    if (user) {
        document.getElementById('user-name').value = user.name;
        document.getElementById('user-email').value = user.email;
        passwordInput.setAttribute('placeholder', 'Leave blank to keep current password');
        passwordInput.required = false;
    } else {
        passwordInput.setAttribute('placeholder', 'Enter password');
        passwordInput.required = true;
    }
    modal.style.display = 'block';
};

const closeUserModal = () => {
    document.getElementById('user-modal').style.display = 'none';
};

const handleUserFormSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const saveButton = form.querySelector('button[type="submit"]');
    saveButton.disabled = true;

    try {
        const id = document.getElementById('user-id').value;
        const type = document.getElementById('user-type').value;
        const name = document.getElementById('user-name').value;
        const email = document.getElementById('user-email').value;
        const password = document.getElementById('user-password').value;

        const userData = { name, email };
        if (password) {
            userData.password = password;
        }

        if (id) {
            await adminService.updateUser(id, userData, type);
        } else {
            await adminService.createUser(userData, type);
        }

        closeUserModal();
        loadUsers();
    } catch (error) {
        console.error('Failed to save user:', error);
        alert(`Error: ${error.message}`);
    } finally {
        saveButton.disabled = false;
    }
};

export const handleEditUser = (id, type) => {
    const user = type === 'hospital'
        ? state.hospitalUsers.find(u => u.id === id)
        : state.bloodbankUsers.find(u => u.id === id);
    openUserModal(type, user);
};

export const handleDeleteUser = async (id, type) => {
    if (confirm('Are you sure you want to delete this user?')) {
        await adminService.deleteUser(id, type);
        loadUsers();
    }
};