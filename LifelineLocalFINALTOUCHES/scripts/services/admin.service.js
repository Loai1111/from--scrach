import { db, auth } from '../firebase-config.js';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, writeBatch, query, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const getUsers = async () => {
    const usersCollection = collection(db, 'users');
    const snapshot = await getDocs(usersCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// IMPORTANT: This is a workaround for a client-side limitation.
// Creating a user with email/password signs out the current user (the admin).
// This function creates the user, then the calling code MUST handle re-authenticating the admin.
const createUser = async (userData) => {
    const { email, password, name, role } = userData;
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // This is the critical part. It MUST complete.
        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            role: role
        });

        // If we get here, the user is created in Auth and Firestore.
        // Now, we know the admin is logged out. We can't do anything else.
        // The onAuthStateChanged listener will handle the redirect.
        // The key is to give a success message *here*.
        alert("User created successfully. The admin will now be logged out. Please log in again.");
        window.location.href = 'admin-login.html'; // Force the redirect.
        return user;
    } catch (error) {
        // This will catch auth errors (like email already exists)
        console.error("Failed to create user:", error);
        throw error;
    }
};

const updateUser = async (id, userData) => {
    if (userData.password) {
        console.warn("Password updates from the admin panel are not supported on the client-side.");
        delete userData.password;
    }
    const docRef = doc(db, 'users', id);
    return await updateDoc(docRef, userData);
};

const deleteUser = async (id) => {
    console.warn("This action only deletes the Firestore user record, not the Firebase Auth user.");
    const docRef = doc(db, 'users', id);
    return await deleteDoc(docRef);
};

const sendPasswordReset = async (email) => {
    return await sendPasswordResetEmail(auth, email);
};

const deleteCollection = async (collectionName) => {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);

    if (snapshot.empty) {
        console.log(`Collection '${collectionName}' is already empty.`);
        return;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Successfully deleted all documents from '${collectionName}'.`);
};

const deleteCollectionWhere = async (collectionName, field, value) => {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, where(field, "==", value));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        console.log(`No documents to delete in '${collectionName}' where ${field} == ${value}.`);
        return;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Successfully deleted documents from '${collectionName}' where ${field} == ${value}.`);
};

export const adminService = {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    sendPasswordReset,
    deleteCollection,
    deleteCollectionWhere,
};
