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
 * - true: vynuceně testovací data (i na produkční doméně)
 * - false: vynuceně produkční/ostrá data (i na localhostu nebo Vercelu)
 */
export const FORCE_TESTING = false;

function detectTestingMode() {
  if (typeof FORCE_TESTING === "boolean") {
    return FORCE_TESTING;
  }
  if (typeof window !== "undefined" && window.location) {
    const host = window.location.hostname;
    return host.includes("vercel.app") || host === "localhost" || host === "127.0.0.1";
  }
  return false;
}

export const isTesting = detectTestingMode();

/**
 * Vrátí název kolekce s případným testovacím prefixem.
 * Např. getCollectionName("akce") vrátí "test_akce" v testovacím režimu nebo "akce" v ostrém režimu.
 */
export function getCollectionName(baseName) {
  return isTesting ? `test_${baseName}` : baseName;
}
