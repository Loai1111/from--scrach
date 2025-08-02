import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { setDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                const role = userData.role;

                alert('Login successful!');

                if (role === 'hospital') {
                    window.location.href = 'hospital.html';
                } else if (role === 'bloodbank') {
                    window.location.href = 'bloodbank.html';
                } else {
                    console.error("User role not found or invalid.");
                    alert("Could not determine user role. Please contact support.");
                }
            } else {
                console.error("No such user document! This user's data has likely been deleted.");
                alert("Your user account has been deactivated or deleted. Please contact an administrator.");
                // Log the user out from Firebase Auth
                auth.signOut();
            }

        } catch (error) {
            console.error("Error signing in:", error);
            alert(`Error: ${error.message}`);
        }
    });
});