/**
 * Sdílený Lightbox pro náhled lístečků a fotografií
 * Používá se napříč veřejným webem (akce, vedení) i administrací.
 */

import { downloadImage } from "./utils.js";

let modalEl = null;
let imageEl = null;
let downloadBtnEl = null;
let closeBtnEl = null;
let currentDownloadData = null;

function ensureLightbox() {
  if (modalEl) return modalEl;

  // Zkontrolujeme, zda modal již neexistuje v DOMu (např. v adminu)
  modalEl = document.getElementById("image-modal");

  if (!modalEl) {
    modalEl = document.createElement("div");
    modalEl.id = "image-modal";
    modalEl.className = "modal";
    modalEl.hidden = true;
    modalEl.setAttribute("role", "dialog");
    modalEl.setAttribute("aria-modal", "true");
    modalEl.setAttribute("aria-label", "Náhled obrázku");

    modalEl.innerHTML = `
      <div class="modal__panel">
        <button type="button" class="modal__close" id="image-modal-close" aria-label="Zavřít náhled">×</button>
        <img id="image-modal-img" class="modal__image" alt="Náhled">
        <div id="image-modal-actions" style="position:absolute; bottom:.75rem; left:50%; transform:translateX(-50%); z-index:2;" hidden>
          <button type="button" class="btn btn-sm" id="image-modal-download-btn" style="box-shadow: 0 4px 14px rgba(0,0,0,.35);">
            Stáhnout lísteček
          </button>
        </div>
      </div>
    `;
    document.body.append(modalEl);
  }

  imageEl = modalEl.querySelector("#image-modal-img");
  closeBtnEl = modalEl.querySelector("#image-modal-close");
  downloadBtnEl = modalEl.querySelector("#image-modal-download-btn");

  // Zavření křížkem
  closeBtnEl?.addEventListener("click", closeLightbox);

  // Zavření kliknutím na pozadí (backdrop)
  modalEl.addEventListener("click", (e) => {
    if (e.target === modalEl) closeLightbox();
  });

  // Klávesa Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalEl && !modalEl.hidden) {
      closeLightbox();
    }
  });

  // Stažení souboru
  downloadBtnEl?.addEventListener("click", async () => {
    if (currentDownloadData) {
      await downloadImage(currentDownloadData.url, currentDownloadData.filename, downloadBtnEl);
    }
  });

  return modalEl;
}

export function openLightbox({ src, alt = "Náhled", downloadFilename = null }) {
  if (!src) return;
  ensureLightbox();

  if (imageEl) {
    imageEl.src = src;
    imageEl.alt = alt;
  }

  const actionsEl = modalEl.querySelector("#image-modal-actions");
  if (downloadFilename) {
    currentDownloadData = { url: src, filename: downloadFilename };
    if (actionsEl) actionsEl.hidden = false;
  } else {
    currentDownloadData = null;
    if (actionsEl) actionsEl.hidden = true;
  }

  modalEl.hidden = false;
  document.body.style.overflow = "hidden";
  closeBtnEl?.focus();
}

export function closeLightbox() {
  if (!modalEl || modalEl.hidden) return;
  modalEl.hidden = true;
  if (imageEl) imageEl.removeAttribute("src");
  document.body.style.overflow = "";
}

// Delegovaný odposlech pro všechny prvky s [data-preview-img]
document.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-preview-img]");
  if (!trigger) return;

  // Pokud je trigger odkaz s platným href bez preventDefault, zamezíme přechodu
  e.preventDefault();

  const src = trigger.dataset.previewImg || trigger.getAttribute("href") || trigger.src;
  const alt = trigger.dataset.previewAlt || trigger.getAttribute("alt") || "Náhled";
  const downloadFilename = trigger.dataset.previewDownload || null;

  openLightbox({ src, alt, downloadFilename });
});
