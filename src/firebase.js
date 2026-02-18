import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace with your actual Firebase config from Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyBzCjGhr6b2Ys9oNk9ZSfy7r40XBpm_jUg",
    authDomain: "werewolf-online-ded78.firebaseapp.com",
    projectId: "werewolf-online-ded78",
    storageBucket: "werewolf-online-ded78.firebasestorage.app",
    messagingSenderId: "1044838231400",
    appId: "1:1044838231400:web:7aa6d42f08cc0b2258fadd",
    measurementId: "G-CHWE8RXNG2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
