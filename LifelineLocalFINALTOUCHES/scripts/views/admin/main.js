console.log("Admin main.js loaded");
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { auth, db } from "../../firebase-config.js";
import { initHandlers } from "./handler.js";
import { showSpinner, hideSpinner } from "../../utils.js";
import { runGlobalMatching } from "../../services/blood-match.service.js";

const app = () => {
    showSpinner();
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists() && userDoc.data().role === 'admin') {
                    console.log("Admin user confirmed.");
                    initHandlers();
                    runGlobalMatching();
                } else {
                    console.log("User is not an admin or does not exist in Firestore, redirecting.");
                    alert("Access denied. You must be an administrator to view this page.");
                    window.location.href = 'admin-login.html';
                }
            } catch (error) {
                console.error("Error verifying admin status:", error);
                alert("An error occurred while verifying your credentials.");
                window.location.href = 'admin-login.html';
            } finally {
                hideSpinner();
            }
        } else {
            console.log("No user logged in, redirecting.");
            hideSpinner();
            window.location.href = 'admin-login.html';
        }
    });
};

document.addEventListener('DOMContentLoaded', app);
