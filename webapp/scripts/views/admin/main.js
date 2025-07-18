import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { auth } from "../../firebase-config.js";
import { initHandlers } from "./handler.js";
import { showSpinner, hideSpinner } from "../../utils.js";

const app = () => {
    showSpinner();
    onAuthStateChanged(auth, (user) => {
        if (user) {
            initHandlers();
            hideSpinner();
        } else {
            window.location.href = 'admin-login.html';
        }
    });
};

app();