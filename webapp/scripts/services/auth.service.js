import { auth } from '../firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const logout = () => {
    return signOut(auth);
};

export const authService = {
    logout,
};