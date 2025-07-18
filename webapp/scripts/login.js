import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const signupContainer = document.getElementById('signup-container');
    const showSignup = document.getElementById('show-signup');
    const showLogin = document.getElementById('show-login');

    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    const roleOptions = document.querySelectorAll('.role-option');
    const selectedRoleInput = document.getElementById('selected-role');

    showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        loginContainer.style.display = 'none';
        signupContainer.style.display = 'block';
    });

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        signupContainer.style.display = 'none';
        loginContainer.style.display = 'block';
    });

    roleOptions.forEach(option => {
        option.addEventListener('click', () => {
            roleOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedRoleInput.value = option.dataset.role;
        });
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const role = selectedRoleInput.value;

        if (!role) {
            alert('Please select a role.');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                name: name,
                email: email,
                role: role
            });

            alert('Signup successful!');
            if (role === 'hospital') {
                window.location.href = 'hospital.html';
            } else if (role === 'bloodbank') {
                window.location.href = 'bloodbank.html';
            }

        } catch (error) {
            console.error("Error signing up:", error);
            alert(`Error: ${error.message}`);
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // You might want to redirect based on the user's role stored in Firestore.
            // This would require an additional Firestore read.
            alert('Login successful!');
            // For now, a generic redirect.
            // You'll need to implement role-based redirection.
            window.location.href = 'hospital.html'; 


        } catch (error) {
            console.error("Error signing in:", error);
            alert(`Error: ${error.message}`);
        }
    });
});