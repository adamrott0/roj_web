import { db, getCollectionName } from "./firebase-config.js";
import {
  collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { formatDateRange, getTodayIso, sanitizeFilename, downloadImage } from "./utils.js";
import { openLightbox } from "./lightbox.js";

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

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createEventCard(event) {
  const article = createElement("article", "event-card");
  const body = createElement("div", "event-card__body");
  const details = createElement("div", "event-card__details");

  const time = createElement("time", "event-card__date", formatDateRange(event.dateStart, event.dateEnd));
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
    const safeName = sanitizeFilename(event.name || "akce");
    const ext = event.flyerPath?.split(".").pop() || "webp";
    const filename = `listecek_${safeName}.${ext}`;

    const viewBtn = createElement("button", "event-card__button", "Zobrazit lísteček");
    viewBtn.type = "button";
    viewBtn.addEventListener("click", () => {
      openLightbox({
        src: event.flyerUrl,
        alt: `Lístek akce: ${event.name}`,
        downloadFilename: filename
      });
    });

    const downloadBtn = createElement("button", "event-card__button event-card__button--secondary", "Stáhnout lísteček");
    downloadBtn.type = "button";
    downloadBtn.addEventListener("click", () => {
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

    const renderGroup = (title, groupEvents) => {
      const heading = createElement("h2", "events-heading", title);
      const list = createElement("div", "events-list");
      if (groupEvents.length) {
        groupEvents.forEach((ev) => list.append(createEventCard(ev)));
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
    target.textContent = `${nextEvent.name} – ${formatDateRange(nextEvent.dateStart, nextEvent.dateEnd)}`;
  } catch (error) {
    console.error("Nepodařilo se načíst nejbližší akci:", error);
  }
}

renderEvents();
renderNextEvent();
