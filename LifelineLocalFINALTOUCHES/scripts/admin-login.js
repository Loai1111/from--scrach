import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// --- Admin User Creation (for emergency use) ---
// This function is intended for developers to run from the browser console
// to re-create the admin user if it's ever deleted from Firebase.
// Example usage from console:
// await window.createAdminUser('admin@lifeline.com', 'your-secure-password');
const createAdminUser = async (email, password) => {
    if (!email || !password) {
        console.error("Email and password are required.");
        return;
    }
    if (password.length < 6) {
        console.error("Password must be at least 6 characters long.");
        return;
    }

    try {
        console.log(`Attempting to create admin user: ${email}`);
        // Step 1: Create user in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("Firebase Auth user created successfully:", user.uid);

        // Step 2: Create user document in Firestore with 'admin' role
        await setDoc(doc(db, "users", user.uid), {
            name: "Admin",
            email: email,
            role: "admin"
        });
        console.log("Firestore user document created with admin role.");
        alert(`Admin user ${email} created successfully. You can now log in.`);
    } catch (error) {
        console.error("Error creating admin user:", error.code, error.message);
        alert(`Failed to create admin user. Check the console for details. Error: ${error.message}`);
    }
};

// Expose the function to the window object for console access
window.createAdminUser = createAdminUser;


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
