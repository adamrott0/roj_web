/**
 * Sdílený modul pro správu všech modálních oken a Lightboxu na webu i v administraci.
 * Zajišťuje:
 * - 100% spolehlivé uzamčení scrollování pozadí na PC i mobilu (wheel, touch, html/body overflow)
 * - Jednotné zavírání klávesou Escape a kliknutím na backdrop pozadí
 * - Jednotný SVG křížek a stylování zavíracích tlačítek napříč celým projektem
 */

export const CLOSE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

let openModalsCount = 0;
let savedScrollY = 0;

function preventBackdropScroll(e) {
  // Povolíme scroll pouze uvnitř karet formulářů, které mohou přesahovat výšku obrazovky
  const scrollable = e.target.closest(".modal-form-card, .confirm-modal__card");
  if (!scrollable) {
    e.preventDefault();
  }
}

function lockScrollPosition() {
  if (openModalsCount > 0 && typeof savedScrollY === "number") {
    if (window.scrollY !== savedScrollY) {
      window.scrollTo(0, savedScrollY);
    }
  }
}

export function openModal(modal) {
  if (!modal) return;
  modal.hidden = false;
  openModalsCount++;

  if (openModalsCount === 1) {
    savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");
    window.addEventListener("wheel", preventBackdropScroll, { passive: false });
    window.addEventListener("touchmove", preventBackdropScroll, { passive: false });
    window.addEventListener("scroll", lockScrollPosition, { passive: false });
  }

  // Fokusujeme samotný modální kontejner (aby spolehlivě fungoval Escape, ale nerozsvítilo se zavírací tlačítko)
  if (!modal.hasAttribute("tabindex")) {
    modal.setAttribute("tabindex", "-1");
  }
  modal.focus({ preventScroll: true });
}

export function closeModal(modal) {
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  openModalsCount = Math.max(0, openModalsCount - 1);

  if (openModalsCount === 0) {
    document.documentElement.classList.remove("modal-open");
    document.body.classList.remove("modal-open");
    window.removeEventListener("wheel", preventBackdropScroll, { passive: false });
    window.removeEventListener("touchmove", preventBackdropScroll, { passive: false });
    window.removeEventListener("scroll", lockScrollPosition, { passive: false });
    if (typeof savedScrollY === "number") {
      window.scrollTo({ top: savedScrollY, behavior: "instant" });
    }
  }
}

// Globální zavírání kliknutím na ztmavené pozadí modálu
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal") && !e.target.hidden) {
    closeModal(e.target);
  }
});

const SCROLL_KEYS = new Set([
  "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "
]);

// Globální správa klávesnice (Escape + zákaz rolování pozadí)
document.addEventListener("keydown", (e) => {
  if (openModalsCount > 0 && SCROLL_KEYS.has(e.key)) {
    const isFormInput = e.target.closest("input, textarea, select, [contenteditable]");
    const scrollable = e.target.closest(".modal-form-card, .confirm-modal__card");
    if (!isFormInput && !scrollable) {
      e.preventDefault();
    }
  }

  if (e.key === "Escape") {
    const openModals = Array.from(document.querySelectorAll(".modal:not([hidden])"));
    if (openModals.length > 0) {
      closeModal(openModals[openModals.length - 1]);
    }
  }
});

// --- LIGHTBOX PRO OBRÁZKY (LÍSTEČKY, FOTKY VEDENÍ) ---
let lightboxModalEl = null;
let lightboxImgEl = null;

function ensureLightbox() {
  if (lightboxModalEl) return lightboxModalEl;

  lightboxModalEl = document.getElementById("image-modal");

  if (!lightboxModalEl) {
    lightboxModalEl = document.createElement("div");
    lightboxModalEl.id = "image-modal";
    lightboxModalEl.className = "modal";
    lightboxModalEl.hidden = true;
    lightboxModalEl.setAttribute("role", "dialog");
    lightboxModalEl.setAttribute("aria-modal", "true");
    lightboxModalEl.setAttribute("aria-label", "Náhled obrázku");

    lightboxModalEl.innerHTML = `
      <div class="modal__panel">
        <button type="button" class="modal__close-btn modal__close-btn--floating" id="image-modal-close" aria-label="Zavřít náhled">
          ${CLOSE_SVG}
        </button>
        <img id="image-modal-img" class="modal__image" alt="Náhled">
      </div>
    `;
    document.body.append(lightboxModalEl);
  } else {
    // Pokud modal již v HTML existuje, zajistíme jednotný SVG křížek
    const existingClose = lightboxModalEl.querySelector("#image-modal-close");
    if (existingClose) {
      existingClose.className = "modal__close-btn modal__close-btn--floating";
      existingClose.innerHTML = CLOSE_SVG;
    }
  }

  lightboxImgEl = lightboxModalEl.querySelector("#image-modal-img");
  const closeBtn = lightboxModalEl.querySelector("#image-modal-close");
  closeBtn?.addEventListener("click", () => closeModal(lightboxModalEl));

  return lightboxModalEl;
}

export function openLightbox({ src, alt = "Náhled" }) {
  if (!src) return;
  const modal = ensureLightbox();

  if (lightboxImgEl) {
    lightboxImgEl.src = src;
    lightboxImgEl.alt = alt;
  }

  openModal(modal);
}

export function closeLightbox() {
  if (!lightboxModalEl || lightboxModalEl.hidden) return;
  closeModal(lightboxModalEl);
  if (lightboxImgEl) lightboxImgEl.removeAttribute("src");
}

// Delegovaný odposlech pro všechny prvky s atributem [data-preview-img]
document.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-preview-img]");
  if (!trigger) return;

  e.preventDefault();
  const src = trigger.dataset.previewImg || trigger.getAttribute("href") || trigger.src;
  const alt = trigger.dataset.previewAlt || trigger.getAttribute("alt") || "Náhled";

  openLightbox({ src, alt });
});
