import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA2oatyOvHpkQ4S1n1OOqB3ra8xb3Q22Xs",
  authDomain: "oddil-roj-ac78b.firebaseapp.com",
  projectId: "oddil-roj-ac78b",
  storageBucket: "oddil-roj-ac78b.firebasestorage.app",
  messagingSenderId: "949315903805",
  appId: "1:949315903805:web:eb69fb065867416af2a554"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);