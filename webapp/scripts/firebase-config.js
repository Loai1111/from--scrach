// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAetcq5zP5m9neR-i7yHuoplT0Fucpb33Y",
  authDomain: "lifeline-17e8d.firebaseapp.com",
  projectId: "lifeline-17e8d",
  storageBucket: "lifeline-17e8d.firebasestorage.app",
  messagingSenderId: "201870417965",
  appId: "1:201870417965:web:6c96573b3e2bfef9fe18a4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Export the database and auth objects to be used in other scripts
export { db, auth };