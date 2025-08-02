import { state } from './state.js';
import { renderUsers } from './ui.js';
import { auth, admin } from '../../services/index.js';

const { authService } = auth;
const { adminService } = admin;

export const initHandlers = () => {
    try {
        console.log("Initializing admin handlers...");
        document.getElementById('logout-btn').addEventListener('click', () => {
            authService.logout();
            window.location.href = 'admin-login.html';
        });

        document.getElementById('add-user-btn').addEventListener('click', () => openUserModal());
        document.querySelector('.modal .close-btn').addEventListener('click', closeUserModal);
        document.getElementById('user-form').addEventListener('submit', handleUserFormSubmit);
        document.getElementById('send-reset-btn').addEventListener('click', handleSendPasswordReset);

        document.querySelectorAll('.btn-delete-collection').forEach(button => {
            button.addEventListener('click', handleDeleteCollection);
        });

        loadUsers();
    } catch (error) {
        console.error("Error initializing handlers:", error);
        alert("Failed to initialize the admin dashboard. Please check the console for errors.");
    }
};

const handleDeleteCollection = async (e) => {
    const button = e.currentTarget;

    const collectionName = button.dataset.collection;
    const whereField = button.dataset.whereField;
    const whereValue = button.dataset.whereValue;

    let confirmMessage = `Are you sure you want to delete all documents in the '${collectionName}' collection?`;
    if (whereField) {
        confirmMessage = `Are you sure you want to delete all documents from '${collectionName}' where ${whereField} is '${whereValue}'?`;
    }
    confirmMessage += "\n\nThis action cannot be undone.";

    if (confirm(confirmMessage)) {
        button.disabled = true;
        button.textContent = 'Deleting...';
        try {
            if (whereField && whereValue) {
                await adminService.deleteCollectionWhere(collectionName, whereField, whereValue);
                alert(`Successfully deleted documents from '${collectionName}'.`);
            } else {
                await adminService.deleteCollection(collectionName);
                alert(`Successfully deleted all documents from '${collectionName}'.`);
            }
        } catch (error) {
            console.error(`Failed to delete from collection '${collectionName}':`, error);
            alert(`Error deleting data: ${error.message}`);
        } finally {
            button.disabled = false;
            button.textContent = button.textContent.replace('Deleting...', 'Delete');
        }
    }
};

const loadUsers = async () => {
    try {
        state.users = await adminService.getUsers();
        renderUsers();
    } catch (error) {
        console.error("Failed to load users:", error);
        alert("Could not load user data.");
    }
};

const openUserModal = (user = null) => {
    const modal = document.getElementById('user-modal');
    const form = document.getElementById('user-form');
    form.reset();

    const passwordGroup = document.getElementById('password-group');
    const sendResetBtn = document.getElementById('send-reset-btn');
    const emailInput = document.getElementById('user-email');

    document.getElementById('user-id').value = user ? user.id : '';
    document.getElementById('modal-title').textContent = user ? 'Edit User' : 'Add New User';
    
    if (user) {
        // Editing existing user
        document.getElementById('user-name').value = user.name;
        emailInput.value = user.email;
        emailInput.readOnly = true; // Prevent editing email as it's the identifier
        document.getElementById('user-role').value = user.role;
        passwordGroup.style.display = 'none';
        sendResetBtn.style.display = 'inline-block';
    } else {
        // Adding new user
        emailInput.readOnly = false;
        passwordGroup.style.display = 'block';
        document.getElementById('user-password').required = true;
        sendResetBtn.style.display = 'none';
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
        const userData = {
            name: document.getElementById('user-name').value,
            email: document.getElementById('user-email').value,
            role: document.getElementById('user-role').value,
        };

        if (id) {
            // Update existing user
            await adminService.updateUser(id, userData);
        } else {
            // Create new user
            userData.password = document.getElementById('user-password').value;
            if (!userData.password || userData.password.length < 6) {
                throw new Error("Password is required and must be at least 6 characters long.");
            }
            // The createUser function in admin.service now handles success alert and redirection.
            await adminService.createUser(userData);
            // The script will likely not proceed beyond this point due to the page redirect.
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

const handleSendPasswordReset = async () => {
    const email = document.getElementById('user-email').value;
    if (!email) return;

    if (confirm(`Are you sure you want to send a password reset email to ${email}?`)) {
        try {
            await adminService.sendPasswordReset(email);
            alert('Password reset email sent successfully.');
            closeUserModal();
        } catch (error) {
            console.error('Failed to send password reset email:', error);
            alert(`Error: ${error.message}`);
        }
    }
};

export const handleEditUser = (id) => {
    const user = state.users.find(u => u.id === id);
    if (user) {
        openUserModal(user);
    }
};

export const handleDeleteUser = async (id) => {
    if (confirm('Are you sure you want to delete this user\'s data? This does not delete their login credentials.')) {
        try {
            await adminService.deleteUser(id);
            alert('User data deleted successfully.');
            loadUsers();
        } catch (error) {
            console.error('Failed to delete user:', error);
            alert(`Error deleting user: ${error.message}`);
        }
    }
};
