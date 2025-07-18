import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.email.value;
    const password = loginForm.password.value;

    // Hardcoded admin credentials
    const ADMIN_EMAIL = 'admin@lifeline.com';

    if (email !== ADMIN_EMAIL) {
        errorMessage.textContent = 'Invalid admin email.';
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = 'admin.html';
    } catch (error) {
        errorMessage.textContent = error.message;
    }
});