import { db, auth } from '../firebase-config.js';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const getCollectionName = (type) => `${type}s`;

const getUsers = async (type) => {
    const colRef = collection(db, getCollectionName(type));
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const createUser = async (userData, type) => {
    const { email, password, name } = userData;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await setDoc(doc(db, getCollectionName(type), user.uid), {
        name: name,
        email: email,
        role: type
    });
};

const updateUser = async (id, userData, type) => {
    if (userData.password) {
        // This is not directly possible on the client-side without re-authenticating the user.
        // This functionality will be limited. For a full implementation, a server is needed.
        console.warn("Password updates from the admin panel are not fully supported on the client-side.");
        delete userData.password;
    }
    const docRef = doc(db, getCollectionName(type), id);
    return await updateDoc(docRef, userData);
};

const deleteUser = async (id, type) => {
    // This is also highly insecure from the client.
    console.warn("User deletion from the client-side is insecure and not recommended.");
    
    // To delete a user, they must be recently signed in. This is a major limitation.
    // This function will only delete the Firestore record, not the auth user.
    const docRef = doc(db, getCollectionName(type), id);
    return await deleteDoc(docRef);
};


export const adminService = {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
};