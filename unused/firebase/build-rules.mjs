import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const firebaseDir = __dirname;

const adminsPath = path.join(firebaseDir, "admins.json");
const firestoreRulesPath = path.join(firebaseDir, "firestore.rules");
const storageRulesPath = path.join(firebaseDir, "storage.rules");

if (!fs.existsSync(adminsPath)) {
  console.error("Chyba: Soubor admins.json nebyl nalezen!");
  process.exit(1);
}

const admins = JSON.parse(fs.readFileSync(adminsPath, "utf-8"));
if (!Array.isArray(admins)) {
  console.error("Chyba: admins.json musí obsahovat pole e-mailových adres!");
  process.exit(1);
}

const formattedAdmins = admins.map((mail) => `          '${mail.trim().toLowerCase()}'`).join(",\n");

// --- 1. FIRESTORE RULES ---
const firestoreRules = `rules_version = '2';
// Tento soubor byl automaticky vygenerován ze souboru admins.json
// Pro úpravu pravidel nebo adminů upravte firebase/admins.json a spusťte: npm run build:rules

service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null
        && request.auth.token.email_verified == true
        && request.auth.token.email in [
${formattedAdmins}
        ];
    }

    // Akce (produkční i testovací)
    match /akce/{docId} { allow read: if true; allow write: if isAdmin(); }
    match /test_akce/{docId} { allow read: if true; allow write: if isAdmin(); }

    // Vedení (produkční i testovací)
    match /vedeni/{docId} { allow read: if true; allow write: if isAdmin(); }
    match /test_vedeni/{docId} { allow read: if true; allow write: if isAdmin(); }

    // Obsah webu a tábora (produkční i testovací)
    match /tabor/{docId} { allow read: if true; allow write: if isAdmin(); }
    match /test_tabor/{docId} { allow read: if true; allow write: if isAdmin(); }

    // Administrace a brána ověření
    match /admin/{docId} { allow read, write: if isAdmin(); }

    // Audit logy (produkční i testovací)
    match /log/{docId} { allow read, write: if isAdmin(); }
    match /test_log/{docId} { allow read, write: if isAdmin(); }
  }
}
`;

// --- 2. STORAGE RULES ---
const storageRules = `rules_version = '2';
// Tento soubor byl automaticky vygenerován ze souboru admins.json
// Pro úpravu pravidel nebo adminů upravte firebase/admins.json a spusťte: npm run build:rules

service firebase.storage {
  match /b/{bucket}/o {
    function isAdmin() {
      return request.auth != null
        && request.auth.token.email_verified == true
        && request.auth.token.email in [
${formattedAdmins}
        ];
    }

    match /{allPaths=**} {
      allow read: if true;
      allow delete: if isAdmin();
      allow create, update: if isAdmin()
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
`;

fs.writeFileSync(firestoreRulesPath, firestoreRules, "utf-8");
fs.writeFileSync(storageRulesPath, storageRules, "utf-8");

console.log(`✅ Úspěšně vygenerována pravidla pro ${admins.length} administrátorů:`);
console.log(` - ${path.relative(rootDir, firestoreRulesPath)}`);
console.log(` - ${path.relative(rootDir, storageRulesPath)}`);
