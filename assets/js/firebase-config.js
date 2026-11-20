import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

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
export const auth = getAuth(app);

/**
 * Režim testovacích dat:
 * - null: automatická detekce (Vercel náhledy a localhost používají test_ prefix)
 * - true: vynuceně testovací data
 * - false: vynuceně produkční data
 */
export const FORCE_TESTING = null;

const hostname = typeof window !== "undefined" ? window.location.hostname : "";
const isAutoTesting = hostname.includes("vercel.app") || hostname === "localhost" || hostname === "127.0.0.1";

export const isTesting = FORCE_TESTING !== null ? FORCE_TESTING : isAutoTesting;

/**
 * Vrátí název kolekce s případným testovacím prefixem.
 * Např. getCollectionName("akce") vrátí "test_akce" na Vercelu / localhostu, nebo "akce" v produkci.
 */
export function getCollectionName(baseName) {
  return isTesting ? `test_${baseName}` : baseName;
}
