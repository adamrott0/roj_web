import { db, getCollectionName } from "./firebase-config.js";
import {
  collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

let eventsPromise = null;

function fetchEvents() {
  if (!eventsPromise) {
    const q = query(collection(db, getCollectionName("akce")), orderBy("dateStart", "asc"));
    eventsPromise = getDocs(q).then((snap) =>
      snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    );
  }
  return eventsPromise;
}

function getTodayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatEventDate(start, end) {
  if (!start) return "";
  const [sy, sm, sd] = start.split("-").map(Number);

  if (!end || end <= start) {
    return `${sd}. ${sm}. ${sy}`;
  }

  const [ey, em, ed] = end.split("-").map(Number);

  if (sy === ey && sm === em) {
    return `${sd}. – ${ed}. ${sm}. ${sy}`;
  }
  if (sy === ey) {
    return `${sd}. ${sm}. – ${ed}. ${em}. ${sy}`;
  }
  return `${sd}. ${sm}. ${sy} – ${ed}. ${em}. ${ey}`;
}

async function downloadImage(url, filename, buttonEl) {
  const originalHtml = buttonEl ? buttonEl.innerHTML : "";
  if (buttonEl) {
    buttonEl.disabled = true;
    buttonEl.textContent = "Stahuji…";
  }
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.warn("Přímé stažení se nezdařilo, otevírám soubor v novém okně:", err);
    window.open(url, "_blank", "noopener,noreferrer");
  } finally {
    if (buttonEl) {
      buttonEl.disabled = false;
      buttonEl.innerHTML = originalHtml;
    }
  }
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createModal() {
  const modal = createElement("div", "modal");
  modal.hidden = true;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Náhled lístečku");

  const panel = createElement("div", "modal__panel");
  const close = createElement("button", "modal__close", "×");
  close.type = "button";
  close.setAttribute("aria-label", "Zavřít náhled");
  const image = createElement("img", "modal__image");
  image.alt = "Lístek akce";

  panel.append(close, image);
  modal.append(panel);
  document.body.append(modal);

  const closeModal = () => {
    modal.hidden = true;
    image.removeAttribute("src");
    document.body.style.overflow = "";
  };
  const openModal = (event) => {
    image.src = event.flyerUrl;
    image.alt = `Lístek akce: ${event.name}`;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    close.focus();
  };

  close.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });
  return openModal;
}

function createEventCard(event, openModal) {
  const article = createElement("article", "event-card");
  const body = createElement("div", "event-card__body");
  const details = createElement("div", "event-card__details");

  const time = createElement("time", "event-card__date", formatEventDate(event.dateStart, event.dateEnd));
  time.dateTime = event.dateStart;
  details.append(time);

  if (event.mail) {
    const mail = createElement("a", "event-card__contact", event.mail);
    mail.href = `mailto:${event.mail}`;
    details.append(mail);
  }
  if (event.phone) {
    const phone = createElement("a", "event-card__contact", event.phone);
    phone.href = `tel:${event.phone.replace(/\s+/g, "")}`;
    details.append(phone);
  }

  body.append(createElement("h3", "event-card__title", event.name), details);

  if (event.flyerUrl) {
    const actions = createElement("div", "event-card__actions");

    const viewBtn = createElement("button", "event-card__button", "Zobrazit lísteček");
    viewBtn.type = "button";
    viewBtn.addEventListener("click", () => openModal(event));

    const downloadBtn = createElement("button", "event-card__button event-card__button--secondary", "Stáhnout lísteček");
    downloadBtn.type = "button";
    downloadBtn.addEventListener("click", () => {
      const safeName = (event.name || "akce")
        .replace(/[\\/:*?"<>|]/g, "")
        .trim()
        .replace(/\s+/g, "_");
      const ext = event.flyerPath?.split(".").pop() || "webp";
      const filename = `listecek_${safeName}.${ext}`;
      downloadImage(event.flyerUrl, filename, downloadBtn);
    });

    actions.append(viewBtn, downloadBtn);
    body.append(actions);
  }

  article.append(body);
  return article;
}

async function renderEvents() {
  const container = document.querySelector("#akce-seznam");
  if (!container) return;

  container.replaceChildren(createElement("p", "events-empty", "Načítám akce…"));

  try {
    const events = await fetchEvents();
    const today = getTodayIso();
    const visibleEvents = events.filter((ev) => !ev.hide);

    const upcoming = visibleEvents.filter((ev) => (ev.dateEnd || ev.dateStart) >= today);
    const past = visibleEvents.filter((ev) => (ev.dateEnd || ev.dateStart) < today).reverse();
    const openModal = createModal();

    const renderGroup = (title, groupEvents) => {
      const heading = createElement("h2", "events-heading", title);
      const list = createElement("div", "events-list");
      if (groupEvents.length) {
        groupEvents.forEach((ev) => list.append(createEventCard(ev, openModal)));
      } else {
        list.append(createElement("p", "events-empty", "Momentálně nejsou žádné akce."));
      }
      container.append(heading, list);
    };

    container.replaceChildren();
    renderGroup("Nadcházející akce", upcoming);
    renderGroup("Proběhlé akce", past);
  } catch (error) {
    console.error("Nepodařilo se načíst akce:", error);
    container.replaceChildren(
      createElement("p", "events-empty", "Akce se nepodařilo načíst. Zkuste to prosím později.")
    );
  }
}

export async function renderNextEvent() {
  const target = document.querySelector("[data-next-event]");
  if (!target) return;

  try {
    const events = await fetchEvents();
    const today = getTodayIso();
    const visibleEvents = events.filter((ev) => !ev.hide);
    const nextEvent = visibleEvents.find((ev) => (ev.dateEnd || ev.dateStart) >= today);

    if (!nextEvent) {
      target.textContent = "Další akce brzy doplníme.";
      return;
    }
    target.textContent = `${nextEvent.name} – ${formatEventDate(nextEvent.dateStart, nextEvent.dateEnd)}`;
  } catch (error) {
    console.error("Nepodařilo se načíst nejbližší akci:", error);
  }
}

renderEvents();
renderNextEvent();
