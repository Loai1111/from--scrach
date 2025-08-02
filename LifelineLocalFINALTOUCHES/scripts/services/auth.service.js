import { auth, db } from '../firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const logout = () => {
    return signOut(auth);
};

export function handleLogout() {
    logout()
        .then(() => {
            console.log('User signed out successfully.');
            // Redirect to the main login page after sign-out
            window.location.href = '/pages/login.html';
        })
        .catch((error) => {
            console.error('Sign out error:', error);
            // Even if there's an error, try to redirect
            window.location.href = '/pages/login.html';
        });
}

export const getCurrentUser = async () => {
    const user = auth.currentUser;
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            return {
                uid: user.uid,
                email: user.email,
                ...userDoc.data()
            };
        }
    }
    return null;
};

export const authService = {
    logout,
    handleLogout,
    getCurrentUser,
};
