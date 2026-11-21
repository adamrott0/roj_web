import { app, db, auth, getCollectionName, isTesting } from "./firebase-config.js";
import {
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, writeBatch, limit, startAfter
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-storage.js";

const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// --- DOM PRVKY ---
const loginView = document.getElementById("login-view");
const adminView = document.getElementById("admin-view");
const userBar = document.getElementById("user-bar");
const userEmailEl = document.getElementById("user-email");
const authError = document.getElementById("auth-error");

// Záložky
const tabBtnAkce = document.getElementById("tab-btn-akce");
const tabBtnVedeni = document.getElementById("tab-btn-vedeni");
const tabBtnLog = document.getElementById("tab-btn-log");
const viewAkce = document.getElementById("view-akce");
const viewVedeni = document.getElementById("view-vedeni");
const viewLog = document.getElementById("view-log");
const countAkce = document.getElementById("count-akce");
const countVedeni = document.getElementById("count-vedeni");
const logsList = document.getElementById("logs-list");
const refreshLogBtn = document.getElementById("refresh-log-btn");

// Akce – seznam a modal
const eventsList = document.getElementById("events-list");
const openEventModalBtn = document.getElementById("open-event-modal-btn");
const eventModal = document.getElementById("event-modal");
const closeEventModalBtn = document.getElementById("close-event-modal-btn");
const eventCancelBtn = document.getElementById("event-cancel-btn");
const eventForm = document.getElementById("event-form");
const eventModalTitle = document.getElementById("event-modal-title");
const eventSubmitBtn = document.getElementById("event-submit-btn");
const eventFormStatus = document.getElementById("event-form-status");

const evNameInput = document.getElementById("ev-name");
const evDateStartInput = document.getElementById("ev-date-start");
const evDateEndInput = document.getElementById("ev-date-end");
const evMailInput = document.getElementById("ev-mail");
const evPhoneInput = document.getElementById("ev-phone");
const evFlyerInput = document.getElementById("ev-flyer");
const currentFlyerBox = document.getElementById("current-flyer-box");
const currentFlyerLink = document.getElementById("current-flyer-link");
const evRemoveFlyerCheckbox = document.getElementById("ev-remove-flyer");
const evHideCheckbox = document.getElementById("ev-hide");

// Vedení – seznam a modal
const leadersList = document.getElementById("leaders-list");
const openLeaderModalBtn = document.getElementById("open-leader-modal-btn");
const leaderModal = document.getElementById("leader-modal");
const closeLeaderModalBtn = document.getElementById("close-leader-modal-btn");
const leaderCancelBtn = document.getElementById("leader-cancel-btn");
const leaderForm = document.getElementById("leader-form");
const leaderModalTitle = document.getElementById("leader-modal-title");
const leaderSubmitBtn = document.getElementById("leader-submit-btn");
const leaderFormStatus = document.getElementById("leader-form-status");

const ldrNameInput = document.getElementById("ldr-name");
const ldrRoleInput = document.getElementById("ldr-role");
const ldrMailInput = document.getElementById("ldr-mail");
const ldrPhoneInput = document.getElementById("ldr-phone");
const ldrPhotoInput = document.getElementById("ldr-photo");
const currentLeaderPhotoBox = document.getElementById("current-leader-photo-box");
const currentLeaderPhotoLink = document.getElementById("current-leader-photo-link");
const ldrHideCheckbox = document.getElementById("ldr-hide");

// Náhled obrázku v modalu
const imageModal = document.getElementById("image-modal");
const imageModalImg = document.getElementById("image-modal-img");
const imageModalClose = document.getElementById("image-modal-close");

// Stav aplikace
let currentUser = null;
let cachedEvents = [];
let cachedLeaders = [];
let cachedLogs = [];
let editingEvent = null;
let editingLeader = null;

// --- AUTOMATICKÉ FORMÁTOVÁNÍ TELEFONŮ ---
evPhoneInput?.addEventListener("input", (e) => {
  e.target.value = formatPhoneNumber(e.target.value);
});
ldrPhoneInput?.addEventListener("input", (e) => {
  e.target.value = formatPhoneNumber(e.target.value);
});

// --- PŘIHLAŠOVÁNÍ A KONTROLA PŘÍSTUPU ---
document.getElementById("login-btn")?.addEventListener("click", async () => {
  if (authError) authError.hidden = true;
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    showAuthError("Přihlášení se nezdařilo: " + err.message);
  }
});

document.getElementById("logout-btn")?.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUser = null;
    if (loginView) loginView.hidden = false;
    if (adminView) adminView.hidden = true;
    if (userBar) userBar.hidden = true;
    return;
  }

  // Ověření vůči Firestore Security Rules
  try {
    await getDoc(doc(db, "admin", "access"));
  } catch {
    await signOut(auth);
    showAuthError(`Účet ${user.email} nemá oprávnění pro vstup do administrace.`);
    return;
  }

  currentUser = user;
  if (userEmailEl) userEmailEl.textContent = user.email;
  if (authError) authError.hidden = true;
  if (loginView) loginView.hidden = true;
  if (adminView) adminView.hidden = false;
  if (userBar) userBar.hidden = false;

  await Promise.all([loadEvents(), loadLeaders()]);
});

function showAuthError(msg) {
  if (!authError) return;
  authError.textContent = msg;
  authError.hidden = false;
}

// --- PŘEPÍNÁNÍ ZÁLOŽEK ---
tabBtnAkce?.addEventListener("click", () => switchTab("akce"));
tabBtnVedeni?.addEventListener("click", () => switchTab("vedeni"));
tabBtnLog?.addEventListener("click", () => switchTab("log"));
refreshLogBtn?.addEventListener("click", () => loadLogs());

function switchTab(tabName) {
  const isAkce = tabName === "akce";
  const isVedeni = tabName === "vedeni";
  const isLog = tabName === "log";

  tabBtnAkce?.classList.toggle("is-active", isAkce);
  tabBtnAkce?.setAttribute("aria-selected", isAkce ? "true" : "false");
  if (viewAkce) viewAkce.hidden = !isAkce;

  tabBtnVedeni?.classList.toggle("is-active", isVedeni);
  tabBtnVedeni?.setAttribute("aria-selected", isVedeni ? "true" : "false");
  if (viewVedeni) viewVedeni.hidden = !isVedeni;

  tabBtnLog?.classList.toggle("is-active", isLog);
  tabBtnLog?.setAttribute("aria-selected", isLog ? "true" : "false");
  if (viewLog) viewLog.hidden = !isLog;

  if (isLog) {
    loadLogs();
  }
}

// --- MODÁLNÍ OKNA (OTEVÍRÁNÍ / ZAVÍRÁNÍ) ---
function openModal(modal) {
  if (!modal) return;
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal(modal) {
  if (!modal) return;
  modal.hidden = true;
  if (!isAnyModalOpen()) {
    document.body.style.overflow = "";
  }
}

function isAnyModalOpen() {
  const modals = [eventModal, leaderModal, imageModal, document.getElementById("confirm-modal")];
  return modals.some((m) => m && !m.hidden);
}

// Zavírání modálů po kliknutí na pozadí, křížek a Escape
[eventModal, leaderModal, imageModal].forEach((modal) => {
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeModal(modal);
  });
});

closeEventModalBtn?.addEventListener("click", () => closeModal(eventModal));
eventCancelBtn?.addEventListener("click", () => closeModal(eventModal));

closeLeaderModalBtn?.addEventListener("click", () => closeModal(leaderModal));
leaderCancelBtn?.addEventListener("click", () => closeModal(leaderModal));

imageModalClose?.addEventListener("click", () => closeModal(imageModal));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (imageModal && !imageModal.hidden) closeModal(imageModal);
    else if (eventModal && !eventModal.hidden) closeModal(eventModal);
    else if (leaderModal && !leaderModal.hidden) closeModal(leaderModal);
  }
});

function showImagePreview(url, alt = "Náhled") {
  if (!imageModal || !imageModalImg) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  imageModalImg.src = url;
  imageModalImg.alt = alt;
  openModal(imageModal);
}

document.addEventListener("click", (e) => {
  const previewTrigger = e.target.closest("[data-preview-img]");
  if (previewTrigger) {
    e.preventDefault();
    const url = previewTrigger.dataset.previewImg || previewTrigger.getAttribute("href");
    if (url) showImagePreview(url);
  }
});

// --- VLASTNÍ POTVRZOVACÍ DIALOG ---
function confirmAction(title, text) {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirm-modal");
    const titleEl = document.getElementById("confirm-modal-title");
    const textEl = document.getElementById("confirm-modal-text");
    const cancelBtn = document.getElementById("confirm-modal-cancel");
    const confirmBtn = document.getElementById("confirm-modal-confirm");

    if (!modal) {
      return resolve(window.confirm(`${title}\n\n${text}`));
    }

    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;
    openModal(modal);

    const cleanup = (result) => {
      closeModal(modal);
      cancelBtn?.removeEventListener("click", onCancel);
      confirmBtn?.removeEventListener("click", onConfirm);
      document.removeEventListener("keydown", onKeyDown);
      modal.removeEventListener("click", onBackdrop);
      resolve(result);
    };

    const onCancel = () => cleanup(false);
    const onConfirm = () => cleanup(true);
    const onKeyDown = (e) => {
      if (e.key === "Escape") cleanup(false);
    };
    const onBackdrop = (e) => {
      if (e.target === modal) cleanup(false);
    };

    cancelBtn?.addEventListener("click", onCancel);
    confirmBtn?.addEventListener("click", onConfirm);
    document.addEventListener("keydown", onKeyDown);
    modal.addEventListener("click", onBackdrop);
    confirmBtn?.focus();
  });
}

// ==========================================================================
// 1. SEKCE AKCE (CRUD)
// ==========================================================================

async function loadEvents() {
  if (!eventsList) return;
  eventsList.textContent = "Načítám akce…";
  try {
    const q = query(collection(db, getCollectionName("akce")), orderBy("dateStart", "desc"));
    const snapshot = await getDocs(q);
    cachedEvents = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (countAkce) countAkce.textContent = cachedEvents.length;
    renderEvents();
  } catch (err) {
    console.error(err);
    eventsList.textContent = "Chyba při načítání akcí: " + err.message;
  }
}

function renderEvents() {
  if (!eventsList) return;
  if (!cachedEvents.length) {
    eventsList.innerHTML = `<p class="meta" style="margin:0;">Zatím nejsou přidané žádné akce.</p>`;
    return;
  }

  const rowsHtml = cachedEvents.map((ev) => {
    const thumbHtml = ev.flyerUrl
      ? `<img src="${escapeHtml(ev.flyerUrl)}" alt="" class="admin-thumb" data-preview-img="${escapeHtml(ev.flyerUrl)}" loading="lazy" title="Kliknutím zobrazíte lísteček">`
      : `<div class="admin-thumb admin-thumb--empty" title="Bez lístečku"><span>–</span></div>`;

    return `
      <tr>
        <td style="width: 3.5rem;">
          ${thumbHtml}
        </td>
        <td>
          <div class="admin-cell-main">
            <strong>${escapeHtml(ev.name)}</strong>
            ${ev.hide ? `<span class="badge-hidden">Skryto</span>` : ""}
          </div>
        </td>
        <td>
          <span class="admin-cell-main" style="white-space: nowrap;">${formatDateRange(ev.dateStart, ev.dateEnd)}</span>
        </td>
        <td>
          ${ev.mail ? `<div class="admin-cell-main"><a href="mailto:${escapeHtml(ev.mail)}">${escapeHtml(ev.mail)}</a></div>` : ""}
          ${ev.phone ? `<div class="admin-cell-sub"><a href="tel:${escapeHtml(ev.phone.replace(/\s+/g, ""))}">${escapeHtml(ev.phone)}</a></div>` : (!ev.mail ? `<span class="meta">–</span>` : "")}
        </td>
        <td class="admin-table-actions">
          <button type="button" class="btn secondary btn-sm" data-edit-event="${ev.id}">Upravit</button>
          <button type="button" class="btn danger btn-sm" data-delete-event="${ev.id}">Smazat</button>
        </td>
        <td style="white-space: nowrap;">
          <div class="admin-cell-main">${escapeHtml(ev.updatedBy || "–")}</div>
          <div class="admin-cell-sub">${formatTimestamp(ev.updatedAt)}</div>
        </td>
      </tr>
    `;
  }).join("");

  eventsList.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th style="width: 3.5rem;">Lísteček</th>
            <th>Název akce</th>
            <th>Termín</th>
            <th>Kontakt</th>
            <th class="admin-table-actions">Akce</th>
            <th>Poslední úprava</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

openEventModalBtn?.addEventListener("click", () => {
  resetEventForm();
  openModal(eventModal);
  evNameInput?.focus();
});

eventsList?.addEventListener("click", async (e) => {
  const editBtn = e.target.closest("[data-edit-event]");
  const deleteBtn = e.target.closest("[data-delete-event]");

  if (editBtn) {
    const editId = editBtn.dataset.editEvent;
    const ev = cachedEvents.find((x) => x.id === editId);
    if (ev) startEditEvent(ev);
  } else if (deleteBtn) {
    const deleteId = deleteBtn.dataset.deleteEvent;
    const ev = cachedEvents.find((x) => x.id === deleteId);
    if (!ev) return;
    const ok = await confirmAction(
      `Smazat akci „${ev.name}“?`,
      "Smazáním se odstraní záznam akce i nahraný lísteček. Tuto operaci nelze vrátit zpět."
    );
    if (!ok) return;
    await deleteEvent(ev);
  }
});

function startEditEvent(ev) {
  editingEvent = ev;
  eventModalTitle.textContent = `Úprava akce: ${ev.name}`;
  eventSubmitBtn.textContent = "Uložit změny";

  evNameInput.value = ev.name || "";
  evDateStartInput.value = ev.dateStart || "";
  evDateEndInput.value = ev.dateEnd || "";
  evMailInput.value = ev.mail || "";
  if (evPhoneInput) evPhoneInput.value = ev.phone || "";
  evFlyerInput.value = "";
  if (evRemoveFlyerCheckbox) evRemoveFlyerCheckbox.checked = false;
  if (evHideCheckbox) evHideCheckbox.checked = Boolean(ev.hide);

  if (ev.flyerUrl) {
    currentFlyerLink.href = ev.flyerUrl;
    currentFlyerLink.dataset.previewImg = ev.flyerUrl;
    currentFlyerBox.hidden = false;
  } else {
    currentFlyerBox.hidden = true;
  }

  setEventStatus("");
  openModal(eventModal);
  evNameInput?.focus();
}

function resetEventForm() {
  editingEvent = null;
  eventForm?.reset();
  eventModalTitle.textContent = "Přidat novou akci";
  eventSubmitBtn.textContent = "Uložit akci";
  currentFlyerBox.hidden = true;
  if (evHideCheckbox) evHideCheckbox.checked = false;
  setEventStatus("");
}

eventForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (evDateEndInput.value && evDateEndInput.value < evDateStartInput.value) {
    setEventStatus("Datum konce akce nesmí být dřívější než datum začátku.", true);
    evDateEndInput.focus();
    return;
  }

  setEventStatus("Ukládám…");
  eventSubmitBtn.disabled = true;

  try {
    let flyerUrl = editingEvent?.flyerUrl || "";
    let flyerPath = editingEvent?.flyerPath || "";
    const oldPath = editingEvent?.flyerPath || "";
    const newFile = evFlyerInput.files[0];

    if (newFile) {
      setEventStatus("Optimalizuji a nahrávám lísteček…");
      const uploaded = await uploadFlyer(newFile);
      flyerUrl = uploaded.url;
      flyerPath = uploaded.path;
      if (oldPath) await safeDeleteStorageFile(oldPath);
    } else if (editingEvent && evRemoveFlyerCheckbox.checked) {
      if (oldPath) await safeDeleteStorageFile(oldPath);
      flyerUrl = "";
      flyerPath = "";
    }

    const payload = {
      name: evNameInput.value.trim(),
      dateStart: evDateStartInput.value,
      dateEnd: evDateEndInput.value || "",
      mail: evMailInput.value.trim(),
      phone: evPhoneInput ? evPhoneInput.value.trim() : "",
      flyerUrl,
      flyerPath,
      hide: Boolean(evHideCheckbox.checked),
      updatedBy: currentUser.email,
      updatedAt: serverTimestamp()
    };

    if (editingEvent) {
      const changes = [];
      if (editingEvent.name !== payload.name) changes.push(`název na „${payload.name}“`);
      if (editingEvent.dateStart !== payload.dateStart || editingEvent.dateEnd !== payload.dateEnd) changes.push("termín");
      if (newFile) changes.push("nahrán nový lísteček");
      else if (evRemoveFlyerCheckbox.checked) changes.push("odstraněn lísteček");
      if (Boolean(editingEvent.hide) !== payload.hide) changes.push(payload.hide ? "skryto na webu" : "zobrazeno na webu");

      await updateDoc(doc(db, getCollectionName("akce"), editingEvent.id), payload);
      logAction("update", "akce", payload.name, changes.length > 0 ? `Změny: ${changes.join(", ")}` : "Úprava údajů akce");
    } else {
      await addDoc(collection(db, getCollectionName("akce")), payload);
      logAction("create", "akce", payload.name, `Termín: ${formatDateRange(payload.dateStart, payload.dateEnd)}`);
    }

    closeModal(eventModal);
    resetEventForm();
    await loadEvents();
  } catch (err) {
    console.error(err);
    setEventStatus("Chyba při ukládání: " + err.message, true);
  } finally {
    eventSubmitBtn.disabled = false;
  }
});

async function deleteEvent(ev) {
  try {
    if (ev.flyerPath) await safeDeleteStorageFile(ev.flyerPath);
    await deleteDoc(doc(db, getCollectionName("akce"), ev.id));
    logAction("delete", "akce", ev.name, "Smazání akce");
    if (editingEvent?.id === ev.id) {
      closeModal(eventModal);
      resetEventForm();
    }
    await loadEvents();
  } catch (err) {
    alert("Nepodařilo se smazat akci: " + err.message);
  }
}

function setEventStatus(msg, isError = false) {
  if (!eventFormStatus) return;
  eventFormStatus.textContent = msg;
  eventFormStatus.classList.toggle("error", isError);
}

// ==========================================================================
// 2. SEKCE VEDENÍ (CRUD, POŘADÍ, OŘEZ FOTKY 2:3)
// ==========================================================================

async function loadLeaders() {
  if (!leadersList) return;
  leadersList.textContent = "Načítám vedoucí…";
  try {
    const q = query(collection(db, getCollectionName("vedeni")), orderBy("order", "asc"));
    const snapshot = await getDocs(q);
    cachedLeaders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Seřadíme také lokálně pojistkou podle order
    cachedLeaders.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

    if (countVedeni) countVedeni.textContent = cachedLeaders.length;
    renderLeaders();
  } catch (err) {
    console.error(err);
    leadersList.textContent = "Chyba při načítání vedoucích: " + err.message;
  }
}

function renderLeaders() {
  if (!leadersList) return;
  if (!cachedLeaders.length) {
    leadersList.innerHTML = `<p class="meta" style="margin:0;">Zatím nejsou přidaní žádní vedoucí.</p>`;
    return;
  }

  const rowsHtml = cachedLeaders.map((ldr, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === cachedLeaders.length - 1;
    const thumbHtml = ldr.photoUrl
      ? `<img src="${escapeHtml(ldr.photoUrl)}" alt="" class="admin-thumb" data-preview-img="${escapeHtml(ldr.photoUrl)}" loading="lazy" title="Kliknutím zobrazíte fotku">`
      : `<div class="admin-thumb admin-thumb--empty" title="Bez fotky"><span>–</span></div>`;

    return `
      <tr>
        <td style="width: 2rem; padding-right: 0;">
          <div class="admin-arrows">
            <button type="button" class="btn-arrow" data-order-up="${idx}" title="Posunout nahoru" ${isFirst ? "disabled" : ""}>▲</button>
            <button type="button" class="btn-arrow" data-order-down="${idx}" title="Posunout dolů" ${isLast ? "disabled" : ""}>▼</button>
          </div>
        </td>
        <td class="admin-order-cell">
          ${idx + 1}.
        </td>
        <td style="width: 3.5rem;">
          ${thumbHtml}
        </td>
        <td>
          <div class="admin-cell-main">
            <strong>${escapeHtml(ldr.name)}</strong>
            ${ldr.hide ? `<span class="badge-hidden">Skryto</span>` : ""}
          </div>
          <div class="admin-cell-sub">${escapeHtml(ldr.role || "")}</div>
        </td>
        <td>
          ${ldr.mail ? `<div class="admin-cell-main"><a href="mailto:${escapeHtml(ldr.mail)}">${escapeHtml(ldr.mail)}</a></div>` : ""}
          ${ldr.phone ? `<div class="admin-cell-sub"><a href="tel:${escapeHtml(ldr.phone.replace(/\s+/g, ""))}">${escapeHtml(ldr.phone)}</a></div>` : (!ldr.mail ? `<span class="meta">–</span>` : "")}
        </td>
        <td class="admin-table-actions">
          <button type="button" class="btn secondary btn-sm" data-edit-leader="${ldr.id}">Upravit</button>
          <button type="button" class="btn danger btn-sm" data-delete-leader="${ldr.id}">Smazat</button>
        </td>
        <td style="white-space: nowrap;">
          <div class="admin-cell-main">${escapeHtml(ldr.updatedBy || "–")}</div>
          <div class="admin-cell-sub">${formatTimestamp(ldr.updatedAt)}</div>
        </td>
      </tr>
    `;
  }).join("");

  leadersList.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th style="width: 2rem; padding-right: 0;"></th>
            <th style="width: 2.5rem; text-align: center;">#</th>
            <th style="width: 3.5rem;">Fotka</th>
            <th>Jméno a role</th>
            <th>Kontakt</th>
            <th class="admin-table-actions">Akce</th>
            <th>Poslední úprava</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

openLeaderModalBtn?.addEventListener("click", () => {
  resetLeaderForm();
  openModal(leaderModal);
  ldrNameInput?.focus();
});

leadersList?.addEventListener("click", async (e) => {
  const upBtn = e.target.closest("[data-order-up]");
  const downBtn = e.target.closest("[data-order-down]");
  const editBtn = e.target.closest("[data-edit-leader]");
  const deleteBtn = e.target.closest("[data-delete-leader]");

  if (upBtn) {
    const idx = Number(upBtn.dataset.orderUp);
    await swapLeaderOrder(idx, idx - 1);
  } else if (downBtn) {
    const idx = Number(downBtn.dataset.orderDown);
    await swapLeaderOrder(idx, idx + 1);
  } else if (editBtn) {
    const editId = editBtn.dataset.editLeader;
    const ldr = cachedLeaders.find((x) => x.id === editId);
    if (ldr) startEditLeader(ldr);
  } else if (deleteBtn) {
    const deleteId = deleteBtn.dataset.deleteLeader;
    const ldr = cachedLeaders.find((x) => x.id === deleteId);
    if (!ldr) return;
    const ok = await confirmAction(
      `Smazat vedoucího „${ldr.name}“?`,
      "Smazáním se odstraní profil vedoucího i nahraná profilová fotka. Tuto operaci nelze vrátit zpět."
    );
    if (!ok) return;
    await deleteLeader(ldr);
  }
});

async function swapLeaderOrder(indexA, indexB) {
  if (indexA < 0 || indexB < 0 || indexA >= cachedLeaders.length || indexB >= cachedLeaders.length) return;

  const leaderA = cachedLeaders[indexA];
  const leaderB = cachedLeaders[indexB];

  let orderA = leaderA.order !== undefined ? Number(leaderA.order) : (indexA + 1);
  let orderB = leaderB.order !== undefined ? Number(leaderB.order) : (indexB + 1);

  if (orderA === orderB) {
    orderA = indexA + 1;
    orderB = indexB + 1;
  }

  // Optimistická aktualizace v paměti a překreslení
  leaderA.order = orderB;
  leaderB.order = orderA;
  cachedLeaders[indexA] = leaderB;
  cachedLeaders[indexB] = leaderA;
  renderLeaders();

  try {
    const batch = writeBatch(db);
    const collName = getCollectionName("vedeni");
    batch.update(doc(db, collName, leaderA.id), { order: orderB, updatedAt: serverTimestamp() });
    batch.update(doc(db, collName, leaderB.id), { order: orderA, updatedAt: serverTimestamp() });
    await batch.commit();
  } catch (err) {
    console.error("Chyba při změně pořadí:", err);
    alert("Nepodařilo se změnit pořadí: " + err.message);
    await loadLeaders();
  }
}

function startEditLeader(ldr) {
  editingLeader = ldr;
  leaderModalTitle.textContent = `Úprava vedoucího: ${ldr.name}`;
  leaderSubmitBtn.textContent = "Uložit změny";

  ldrNameInput.value = ldr.name || "";
  ldrRoleInput.value = ldr.role || "";
  ldrMailInput.value = ldr.mail || "";
  if (ldrPhoneInput) ldrPhoneInput.value = ldr.phone || "";
  ldrPhotoInput.value = "";
  ldrPhotoInput.required = false;
  if (ldrHideCheckbox) ldrHideCheckbox.checked = Boolean(ldr.hide);

  if (ldr.photoUrl) {
    currentLeaderPhotoLink.href = ldr.photoUrl;
    currentLeaderPhotoLink.dataset.previewImg = ldr.photoUrl;
    currentLeaderPhotoBox.hidden = false;
  } else {
    currentLeaderPhotoBox.hidden = true;
  }

  setLeaderStatus("");
  openModal(leaderModal);
  ldrNameInput?.focus();
}

function resetLeaderForm() {
  editingLeader = null;
  leaderForm?.reset();
  leaderModalTitle.textContent = "Přidat nového vedoucího";
  leaderSubmitBtn.textContent = "Uložit vedoucího";
  ldrPhotoInput.value = "";
  ldrPhotoInput.required = true;
  currentLeaderPhotoBox.hidden = true;
  if (ldrHideCheckbox) ldrHideCheckbox.checked = false;
  setLeaderStatus("");
}

leaderForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const newFile = ldrPhotoInput.files[0];
  if (!editingLeader && !newFile) {
    setLeaderStatus("Profilová fotka je povinná.", true);
    ldrPhotoInput.focus();
    return;
  }

  setLeaderStatus("Ukládám…");
  leaderSubmitBtn.disabled = true;

  try {
    let photoUrl = editingLeader?.photoUrl || "";
    let photoPath = editingLeader?.photoPath || "";
    const oldPath = editingLeader?.photoPath || "";

    if (newFile) {
      setLeaderStatus("Ořezávám fotku na poměr 2:3 a nahrávám…");
      const uploaded = await uploadLeaderPhoto(newFile);
      photoUrl = uploaded.url;
      photoPath = uploaded.path;
      if (oldPath) await safeDeleteStorageFile(oldPath);
    }

    // Určení pořadí: u nového nejvyšší order + 1, u editace zachovat stávající
    let order;
    if (editingLeader) {
      order = editingLeader.order !== undefined
        ? Number(editingLeader.order)
        : (cachedLeaders.indexOf(editingLeader) + 1);
    } else {
      const maxOrder = cachedLeaders.reduce((max, l) => Math.max(max, Number(l.order) || 0), 0);
      order = maxOrder + 1;
    }

    const payload = {
      name: ldrNameInput.value.trim(),
      role: ldrRoleInput.value.trim(),
      mail: ldrMailInput.value.trim(),
      phone: ldrPhoneInput ? ldrPhoneInput.value.trim() : "",
      photoUrl,
      photoPath,
      hide: Boolean(ldrHideCheckbox.checked),
      order,
      updatedBy: currentUser.email,
      updatedAt: serverTimestamp()
    };

    if (editingLeader) {
      const changes = [];
      if (editingLeader.name !== payload.name) changes.push(`jméno na „${payload.name}“`);
      if (editingLeader.role !== payload.role) changes.push(`funkce na „${payload.role}“`);
      if (newFile) changes.push("nahrána nová fotka");
      if (Boolean(editingLeader.hide) !== payload.hide) changes.push(payload.hide ? "skryto na webu" : "zobrazeno na webu");

      await updateDoc(doc(db, getCollectionName("vedeni"), editingLeader.id), payload);
      logAction("update", "vedeni", payload.name, changes.length > 0 ? `Změny: ${changes.join(", ")}` : "Úprava údajů vedoucího");
    } else {
      await addDoc(collection(db, getCollectionName("vedeni")), payload);
      logAction("create", "vedeni", payload.name, `Funkce: ${payload.role}`);
    }

    closeModal(leaderModal);
    resetLeaderForm();
    await loadLeaders();
  } catch (err) {
    console.error(err);
    setLeaderStatus("Chyba při ukládání: " + err.message, true);
  } finally {
    leaderSubmitBtn.disabled = false;
  }
});

async function deleteLeader(ldr) {
  try {
    if (ldr.photoPath) await safeDeleteStorageFile(ldr.photoPath);
    await deleteDoc(doc(db, getCollectionName("vedeni"), ldr.id));
    logAction("delete", "vedeni", ldr.name, `Funkce: ${ldr.role || ""}`);
    if (editingLeader?.id === ldr.id) {
      closeModal(leaderModal);
      resetLeaderForm();
    }
    await loadLeaders();
  } catch (err) {
    alert("Nepodařilo se smazat vedoucího: " + err.message);
  }
}

function setLeaderStatus(msg, isError = false) {
  if (!leaderFormStatus) return;
  leaderFormStatus.textContent = msg;
  leaderFormStatus.classList.toggle("error", isError);
}

// ==========================================================================
// 3. SEKCE HISTORIE ZMĚN (AUDIT LOG)
// ==========================================================================

async function logAction(action, targetType, targetName, details = "") {
  if (!currentUser) return;
  try {
    await addDoc(collection(db, getCollectionName("log")), {
      createdAt: serverTimestamp(),
      userEmail: currentUser.email,
      action,
      targetType,
      targetName: targetName || "",
      details: details || ""
    });
  } catch (err) {
    console.warn("Zápis do historie změn se nezdařil:", err);
  }
}

const LOGS_PAGE_SIZE = 10;
let lastVisibleLogDoc = null;
let hasMoreLogs = true;
let isLoadingLogs = false;

async function loadLogs(append = false) {
  if (!logsList || isLoadingLogs) return;
  isLoadingLogs = true;

  if (!append) {
    cachedLogs = [];
    lastVisibleLogDoc = null;
    hasMoreLogs = true;
    logsList.innerHTML = `<p class="meta" style="padding:.5rem 1rem; margin:0;">Načítám historii změn…</p>`;
  } else {
    const loadMoreBtn = document.getElementById("load-more-logs-btn");
    if (loadMoreBtn) {
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = "Načítám další…";
    }
  }

  try {
    let q;
    const collRef = collection(db, getCollectionName("log"));
    if (append && lastVisibleLogDoc) {
      q = query(collRef, orderBy("createdAt", "desc"), startAfter(lastVisibleLogDoc), limit(LOGS_PAGE_SIZE));
    } else {
      q = query(collRef, orderBy("createdAt", "desc"), limit(LOGS_PAGE_SIZE));
    }

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      hasMoreLogs = false;
    } else {
      lastVisibleLogDoc = snapshot.docs[snapshot.docs.length - 1];
      const newItems = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      cachedLogs = append ? [...cachedLogs, ...newItems] : newItems;
      if (snapshot.docs.length < LOGS_PAGE_SIZE) {
        hasMoreLogs = false;
      }
    }

    renderLogs();
  } catch (err) {
    console.error(err);
    if (!append) {
      logsList.innerHTML = `<p class="meta error" style="padding:.5rem 1rem; margin:0;">Chyba při načítání historie změn: ${escapeHtml(err.message)}</p>`;
    } else {
      alert("Nepodařilo se načíst další záznamy: " + err.message);
      renderLogs();
    }
  } finally {
    isLoadingLogs = false;
  }
}

function renderLogs() {
  if (!logsList) return;
  if (!cachedLogs.length) {
    logsList.innerHTML = `<p class="meta" style="padding:.75rem 1rem; margin:0;">Zatím zde nejsou žádné záznamy o provedených změnách.</p>`;
    return;
  }

  const actionBadges = {
    create: `<span class="badge-log badge-log--create">+ Přidáno</span>`,
    update: `<span class="badge-log badge-log--update">✎ Upraveno</span>`,
    delete: `<span class="badge-log badge-log--delete">✕ Smazáno</span>`
  };

  const targetTypeLabels = {
    akce: "Akce",
    vedeni: "Vedení"
  };

  const rowsHtml = cachedLogs.map((item) => {
    const badge = actionBadges[item.action] || `<span class="badge-log">${escapeHtml(item.action)}</span>`;
    const section = targetTypeLabels[item.targetType] || escapeHtml(item.targetType || "–");

    return `
      <tr>
        <td style="white-space: nowrap;">
          <span class="admin-cell-main">${formatTimestamp(item.createdAt)}</span>
        </td>
        <td style="white-space: nowrap;">
          <span class="admin-cell-main">${escapeHtml(item.userEmail || "–")}</span>
        </td>
        <td style="white-space: nowrap;">
          ${badge}
        </td>
        <td style="white-space: nowrap;">
          <span class="meta">${section}</span>
        </td>
        <td>
          <div class="admin-cell-main"><strong>${escapeHtml(item.targetName || "–")}</strong></div>
          ${item.details ? `<div class="admin-cell-sub">${escapeHtml(item.details)}</div>` : ""}
        </td>
      </tr>
    `;
  }).join("");

  logsList.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th style="width: 9.5rem;">Datum a čas</th>
            <th style="width: 14rem;">Kdo</th>
            <th style="width: 7rem;">Akce</th>
            <th style="width: 6rem;">Sekce</th>
            <th>Položka a detaily</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
    <div style="display:flex; justify-content:center; align-items:center; padding:.65rem 1rem; border-top:1px solid var(--line); background:var(--white);">
      ${hasMoreLogs ? `
        <button type="button" class="btn secondary btn-sm" id="load-more-logs-btn">Načíst dalších 10 záznamů</button>
      ` : `
        <span class="meta" style="font-size:.8rem;">Zobrazeno všech ${cachedLogs.length} záznamů</span>
      `}
    </div>
  `;
}

logsList?.addEventListener("click", async (e) => {
  if (e.target.closest("#load-more-logs-btn")) {
    await loadLogs(true);
  }
});

// ==========================================================================
// 4. STORAGE, ZPRACOVÁNÍ A OŘEZ OBRÁZKŮ
// ==========================================================================

// Lísteček – škálování na max 1600 px (zachování poměru stran)
async function uploadFlyer(file) {
  const prepared = await prepareFlyerFile(file, 1600);
  const safeBase = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  const path = `listecky/${Date.now()}_${safeBase}.${prepared.ext}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, prepared.blob, {
    contentType: prepared.contentType,
    cacheControl: "public,max-age=31536000,immutable"
  });

  const url = await getDownloadURL(storageRef);
  return { url, path };
}

function prepareFlyerFile(file, maxDim) {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Vybraný soubor není platný obrázek (povolené jsou pouze JPG, PNG, WebP)."));
  }
  if (file.size > 20 * 1024 * 1024) {
    return Promise.reject(new Error("Vybraný obrázek je příliš velký (maximum je 20 MB)."));
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

// Profilová fotka vedoucího – středový ořez na poměr 2:3, max výška 1600 px, WebP
async function uploadLeaderPhoto(file) {
  const prepared = await cropAndResizePhoto(file, 1600);
  const safeBase = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  const path = `vedeni/${Date.now()}_${safeBase}.${prepared.ext}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, prepared.blob, {
    contentType: prepared.contentType,
    cacheControl: "public,max-age=31536000,immutable"
  });

  const url = await getDownloadURL(storageRef);
  return { url, path };
}

function cropAndResizePhoto(file, maxDim) {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Vybraný soubor není platný obrázek (povolené jsou pouze JPG, PNG, WebP)."));
  }
  if (file.size > 20 * 1024 * 1024) {
    return Promise.reject(new Error("Vybraný obrázek je příliš velký (maximum je 20 MB)."));
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const targetRatio = 2 / 3;
      const srcRatio = img.width / img.height;

      let cropX = 0;
      let cropY = 0;
      let cropWidth = img.width;
      let cropHeight = img.height;

      if (srcRatio > targetRatio) {
        // Širší než 2:3 -> ořízneme boky se středovým vycentrováním
        cropWidth = Math.round(img.height * targetRatio);
        cropX = Math.round((img.width - cropWidth) / 2);
      } else if (srcRatio < targetRatio) {
        // Vyšší než 2:3 -> ořízneme vršek a spodek se středovým vycentrováním
        cropHeight = Math.round(img.width / targetRatio);
        cropY = Math.round((img.height - cropHeight) / 2);
      }

      // Výsledné rozměry (max výška maxDim px při zachování 2:3)
      const outHeight = Math.min(cropHeight, maxDim);
      const outWidth = Math.round(outHeight * targetRatio);

      const canvas = document.createElement("canvas");
      canvas.width = outWidth;
      canvas.height = outHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, outWidth, outHeight);

      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("Nepodařilo se zpracovat profilovou fotku."));
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

// ==========================================================================
// 4. POMOCNÉ FUNKCE
// ==========================================================================

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${Number(d)}. ${Number(m)}. ${y}`;
}

function formatDateRange(start, end) {
  return end && end !== start ? `${formatDate(start)} – ${formatDate(end)}` : formatDate(start);
}

function formatTimestamp(ts) {
  if (!ts) return "–";
  let date;
  if (typeof ts.toDate === "function") {
    date = ts.toDate();
  } else if (ts.seconds) {
    date = new Date(ts.seconds * 1000);
  } else if (ts instanceof Date) {
    date = ts;
  } else {
    date = new Date(ts);
  }
  if (Number.isNaN(date.getTime())) return "–";

  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${d}. ${m}. ${y} ${hh}:${mm}`;
}

function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function formatPhoneNumber(value) {
  if (!value) return "";
  const trimmed = value.trim();
  const isInternational = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) return isInternational ? "+" : "";

  if (isInternational && digits.startsWith("420")) {
    const rest = digits.slice(3, 12);
    const groups = rest.match(/.{1,3}/g) || [];
    return `+420 ${groups.join(" ")}`.trim();
  }

  if (!isInternational) {
    const groups = digits.slice(0, 9).match(/.{1,3}/g) || [];
    return groups.join(" ");
  }

  const groups = digits.slice(0, 15).match(/.{1,3}/g) || [];
  return `+${groups.join(" ")}`;
}
