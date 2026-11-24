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

  if (modal.id === "image-modal") {
    resetZoom(false);
  }

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
    if (Date.now() - lastPanTime < 250) {
      return; // Ignorujeme kliknutí, pokud uživatel právě dokončil tažení/gesto
    }
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

// Stav zoomu a posunu
let scale = 1;
let tx = 0;
let ty = 0;
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const activePointers = new Map();
let prevPinchDist = 0;
let prevMidX = 0;
let prevMidY = 0;
let lastPanTime = 0;
let isPanning = false;

function applyTransform(smooth = false) {
  if (!lightboxImgEl) return;
  lightboxImgEl.style.transition = smooth ? "transform 0.25s cubic-bezier(0.2, 0.9, 0.4, 1)" : "none";
  lightboxImgEl.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
  lightboxImgEl.style.cursor = scale > 1 ? (isPanning ? "grabbing" : "grab") : "";
}

function clampPosition() {
  if (!lightboxImgEl || scale <= 1) {
    tx = 0;
    ty = 0;
    return;
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rect = lightboxImgEl.getBoundingClientRect();
  const unscaledW = lightboxImgEl.offsetWidth || (rect.width / scale);
  const unscaledH = lightboxImgEl.offsetHeight || (rect.height / scale);
  const imgW = unscaledW * scale;
  const imgH = unscaledH * scale;

  const maxTx = imgW > vw ? (imgW - vw) / 2 + 40 : 30;
  const maxTy = imgH > vh ? (imgH - vh) / 2 + 40 : 30;

  tx = Math.max(-maxTx, Math.min(maxTx, tx));
  ty = Math.max(-maxTy, Math.min(maxTy, ty));
}

export function resetZoom(smooth = false) {
  scale = 1;
  tx = 0;
  ty = 0;
  isPanning = false;
  activePointers.clear();
  prevPinchDist = 0;
  applyTransform(smooth);
}

function onWheel(e) {
  if (!lightboxModalEl || lightboxModalEl.hidden || !lightboxImgEl) return;
  e.preventDefault();
  e.stopPropagation();

  const factor = e.deltaY < 0 ? 1.18 : 0.84;
  const targetScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
  if (targetScale === scale) return;

  const rect = lightboxImgEl.getBoundingClientRect();
  const imgCenterX = rect.left + rect.width / 2;
  const imgCenterY = rect.top + rect.height / 2;
  const dx = e.clientX - imgCenterX;
  const dy = e.clientY - imgCenterY;
  const ratio = targetScale / scale;

  tx -= dx * (ratio - 1);
  ty -= dy * (ratio - 1);
  scale = targetScale;

  if (scale <= 1) {
    resetZoom(true);
  } else {
    clampPosition();
    applyTransform(false);
  }
}

function onPointerDown(e) {
  if (e.button !== 0 && e.pointerType === "mouse") return;
  if (!lightboxImgEl) return;

  try {
    lightboxImgEl.setPointerCapture(e.pointerId);
  } catch {}

  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (activePointers.size === 1) {
    if (scale > 1) {
      isPanning = true;
      applyTransform(false);
    }
  } else if (activePointers.size === 2) {
    isPanning = false;
    const [p1, p2] = Array.from(activePointers.values());
    prevPinchDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    prevMidX = (p1.x + p2.x) / 2;
    prevMidY = (p1.y + p2.y) / 2;
  }
}

function onPointerMove(e) {
  if (!activePointers.has(e.pointerId) || !lightboxImgEl) return;
  const prevP = activePointers.get(e.pointerId);
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (activePointers.size === 2) {
    // Pinch-to-zoom dvěma prsty
    const [p1, p2] = Array.from(activePointers.values());
    const currentDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    if (prevPinchDist > 0) {
      const factor = currentDist / prevPinchDist;
      const targetScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
      const ratio = targetScale / scale;

      const rect = lightboxImgEl.getBoundingClientRect();
      const imgCenterX = rect.left + rect.width / 2;
      const imgCenterY = rect.top + rect.height / 2;

      tx -= (midX - imgCenterX) * (ratio - 1);
      ty -= (midY - imgCenterY) * (ratio - 1);

      // Posun podle pohybu středu prstů
      tx += midX - prevMidX;
      ty += midY - prevMidY;

      scale = targetScale;
      clampPosition();
      applyTransform(false);
      lastPanTime = Date.now();
    }
    prevPinchDist = currentDist;
    prevMidX = midX;
    prevMidY = midY;
  } else if (activePointers.size === 1 && scale > 1) {
    // Tažení jedním prstem nebo myší při zvětšení
    const dx = e.clientX - prevP.x;
    const dy = e.clientY - prevP.y;

    if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
      tx += dx;
      ty += dy;
      clampPosition();
      applyTransform(false);
      lastPanTime = Date.now();
    }
  }
}

function onPointerUp(e) {
  if (activePointers.has(e.pointerId)) {
    try {
      lightboxImgEl?.releasePointerCapture(e.pointerId);
    } catch {}
    activePointers.delete(e.pointerId);
  }

  if (activePointers.size === 1) {
    prevPinchDist = 0;
    if (scale > 1) isPanning = true;
  } else if (activePointers.size === 0) {
    isPanning = false;
    prevPinchDist = 0;
    if (scale <= 1) {
      resetZoom(true);
    } else {
      applyTransform(false);
    }
  }
}

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
  closeBtn?.addEventListener("click", () => closeLightbox());

  // Registrace gest pro zoomování a posun
  lightboxModalEl.addEventListener("wheel", onWheel, { passive: false });
  lightboxImgEl.addEventListener("pointerdown", onPointerDown);
  lightboxImgEl.addEventListener("pointermove", onPointerMove);
  lightboxImgEl.addEventListener("pointerup", onPointerUp);
  lightboxImgEl.addEventListener("pointercancel", onPointerUp);

  window.addEventListener("resize", () => {
    if (scale > 1) {
      clampPosition();
      applyTransform(false);
    }
  });

  return lightboxModalEl;
}

export function openLightbox({ src, alt = "Náhled" }) {
  if (!src) return;
  const modal = ensureLightbox();

  resetZoom(false);
  if (lightboxImgEl) {
    lightboxImgEl.src = src;
    lightboxImgEl.alt = alt;
  }

  openModal(modal);
}

export function closeLightbox() {
  if (!lightboxModalEl || lightboxModalEl.hidden) return;
  resetZoom(false);
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
