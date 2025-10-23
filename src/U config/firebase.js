// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBjDD2mqiUrGMnl-_yoZmx1gsEat_Ouxuk",
  authDomain: "attendance-portal-19add.firebaseapp.com",
  projectId: "attendance-portal-19add",
  storageBucket: "attendance-portal-19add.firebasestorage.app",
  messagingSenderId: "1070657637880",
  appId: "1:1070657637880:web:f7e1f7357548f7ce6a9a0d",
  measurementId: "G-2VYZXKNN01"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db }

export default app;