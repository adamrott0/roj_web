import { app, db } from "../assets/js/firebase-config.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-storage.js";

const auth = getAuth(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// DOM prvky
const loginView = document.getElementById("login-view");
const adminView = document.getElementById("admin-view");
const userBar = document.getElementById("user-bar");
const userEmailEl = document.getElementById("user-email");
const authError = document.getElementById("auth-error");

const form = document.getElementById("event-form");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const formStatus = document.getElementById("form-status");
const eventsList = document.getElementById("events-list");

const nameInput = document.getElementById("ev-name");
const dateStartInput = document.getElementById("ev-date-start");
const dateEndInput = document.getElementById("ev-date-end");
const mailInput = document.getElementById("ev-mail");
const flyerInput = document.getElementById("ev-flyer");
const currentFlyerBox = document.getElementById("current-flyer-box");
const currentFlyerLink = document.getElementById("current-flyer-link");
const removeFlyerCheckbox = document.getElementById("ev-remove-flyer");

let currentUser = null;
let cachedEvents = [];
let editingEvent = null;

// --- PŘIHLAŠOVÁNÍ A OVĚŘENÍ OPRÁVNĚNÍ ---

document.getElementById("login-btn").addEventListener("click", async () => {
  authError.hidden = true;
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    showAuthError("Přihlášení se nezdařilo: " + err.message);
  }
});

document.getElementById("logout-btn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUser = null;
    loginView.hidden = false;
    adminView.hidden = true;
    userBar.hidden = true;
    return;
  }

  // Ověření vůči Firestore Security Rules (bez nutnosti mít whitelist v JS)
  try {
    await getDoc(doc(db, "admin", "access"));
  } catch {
    await signOut(auth);
    showAuthError(`Účet ${user.email} nemá oprávnění pro vstup do administrace.`);
    return;
  }

  currentUser = user;
  userEmailEl.textContent = user.email;
  authError.hidden = true;
  loginView.hidden = true;
  adminView.hidden = false;
  userBar.hidden = false;
  await loadEvents();
});

function showAuthError(msg) {
  authError.textContent = msg;
  authError.hidden = false;
}

// --- PRÁCE S AKCEMI (CRUD) ---

async function loadEvents() {
  eventsList.textContent = "Načítám akce…";
  const q = query(collection(db, "akce"), orderBy("dateStart", "desc"));
  const snapshot = await getDocs(q);
  cachedEvents = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  renderEvents();
}

function renderEvents() {
  if (!cachedEvents.length) {
    eventsList.textContent = "Zatím nejsou přidané žádné akce.";
    return;
  }

  eventsList.innerHTML = cachedEvents.map((ev) => `
    <div class="event-row">
      <div>
        <strong>${escapeHtml(ev.name)}</strong>
        <div class="meta">
          ${formatDateRange(ev.dateStart, ev.dateEnd)}
          · ${escapeHtml(ev.mail || "")}
          ${ev.flyerUrl ? `· <a href="${escapeHtml(ev.flyerUrl)}" target="_blank" rel="noopener">lísteček</a>` : "· bez lístečku"}
          ${ev.updatedBy ? `· upravil: ${escapeHtml(ev.updatedBy)}` : ""}
        </div>
      </div>
      <div style="display:flex; gap:.5rem; flex-shrink:0;">
        <button type="button" class="secondary" data-edit="${ev.id}">Upravit</button>
        <button type="button" class="danger" data-delete="${ev.id}">Smazat</button>
      </div>
    </div>
  `).join("");
}

eventsList.addEventListener("click", async (e) => {
  const editId = e.target.dataset.edit;
  const deleteId = e.target.dataset.delete;

  if (editId) {
    const ev = cachedEvents.find((x) => x.id === editId);
    if (ev) startEdit(ev);
  } else if (deleteId) {
    const ev = cachedEvents.find((x) => x.id === deleteId);
    if (!ev || !confirm(`Opravdu smazat akci „${ev.name}“?`)) return;
    await deleteEvent(ev);
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("Ukládám…");
  submitBtn.disabled = true;

  try {
    let flyerUrl = editingEvent?.flyerUrl || "";
    let flyerPath = editingEvent?.flyerPath || "";
    const oldPath = editingEvent?.flyerPath || "";

    const newFile = flyerInput.files[0];

    if (newFile) {
      setStatus("Optimalizuji a nahrávám lísteček…");
      const uploaded = await uploadFlyer(newFile);
      flyerUrl = uploaded.url;
      flyerPath = uploaded.path;
      if (oldPath) await safeDeleteStorageFile(oldPath);
    } else if (editingEvent && removeFlyerCheckbox.checked) {
      if (oldPath) await safeDeleteStorageFile(oldPath);
      flyerUrl = "";
      flyerPath = "";
    }

    const payload = {
      name: nameInput.value.trim(),
      dateStart: dateStartInput.value,
      dateEnd: dateEndInput.value || "",
      mail: mailInput.value.trim(),
      flyerUrl,
      flyerPath,
      updatedBy: currentUser.email,
      updatedAt: serverTimestamp()
    };

    if (editingEvent) {
      await updateDoc(doc(db, "akce", editingEvent.id), payload);
      setStatus("Akce byla upravena.");
    } else {
      await addDoc(collection(db, "akce"), payload);
      setStatus("Akce byla přidána.");
    }

    resetForm();
    await loadEvents();
  } catch (err) {
    console.error(err);
    setStatus("Chyba při ukládání: " + err.message, true);
  } finally {
    submitBtn.disabled = false;
  }
});

async function deleteEvent(ev) {
  try {
    if (ev.flyerPath) await safeDeleteStorageFile(ev.flyerPath);
    await deleteDoc(doc(db, "akce", ev.id));
    if (editingEvent?.id === ev.id) resetForm();
    await loadEvents();
  } catch (err) {
    alert("Nepodařilo se smazat akci: " + err.message);
  }
}

function startEdit(ev) {
  editingEvent = ev;
  formTitle.textContent = `Úprava akce: ${ev.name}`;
  submitBtn.textContent = "Uložit změny";
  cancelEditBtn.hidden = false;

  nameInput.value = ev.name || "";
  dateStartInput.value = ev.dateStart || "";
  dateEndInput.value = ev.dateEnd || "";
  mailInput.value = ev.mail || "";
  flyerInput.value = "";
  removeFlyerCheckbox.checked = false;

  if (ev.flyerUrl) {
    currentFlyerLink.href = ev.flyerUrl;
    currentFlyerBox.hidden = false;
  } else {
    currentFlyerBox.hidden = true;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

cancelEditBtn.addEventListener("click", () => {
  resetForm();
  setStatus("");
});

function resetForm() {
  editingEvent = null;
  form.reset();
  formTitle.textContent = "Přidat novou akci";
  submitBtn.textContent = "Uložit akci";
  cancelEditBtn.hidden = true;
  currentFlyerBox.hidden = true;
}

// --- NAHRÁVÁNÍ A ZMENŠENÍ LÍSTEČKU ---

async function uploadFlyer(file) {
  const prepared = await prepareFile(file, 1600);
  const safeBase = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  const path = `flyers/${Date.now()}_${safeBase}.${prepared.ext}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, prepared.blob, {
    contentType: prepared.contentType,
    cacheControl: "public,max-age=31536000,immutable"
  });

  const url = await getDownloadURL(storageRef);
  return { url, path };
}

function prepareFile(file, maxDim) {
  if (file.type === "application/pdf") {
    return Promise.resolve({ blob: file, ext: "pdf", contentType: "application/pdf" });
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("Nepodařilo se zmenšit obrázek."));
        const isWebp = blob.type === "image/webp";
        resolve({ blob, ext: isWebp ? "webp" : "jpg", contentType: blob.type });
      }, "image/webp", 0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Soubor není platný obrázek."));
    };
    img.src = objectUrl;
  });
}

async function safeDeleteStorageFile(path) {
  try {
    await deleteObject(ref(storage, path));
  } catch (err) {
    if (err.code !== "storage/object-not-found") console.warn("Mazání ze Storage:", err);
  }
}

// --- POMOCNÉ FUNKCE ---

function setStatus(msg, isError = false) {
  formStatus.textContent = msg;
  formStatus.classList.toggle("error", isError);
}

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${Number(d)}. ${Number(m)}. ${y}`;
}

function formatDateRange(start, end) {
  return end && end !== start ? `${formatDate(start)} – ${formatDate(end)}` : formatDate(start);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}