import { db, getCollectionName } from "./firebase-config.js";
import {
  collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { escapeHtml, formatDateRange, getTodayIso, sanitizeFilename, downloadImage } from "./utils.js";
import { openLightbox } from "./lightbox.js";

const CHEVRON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;

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
        alt: `Lístek akce: ${event.name}`
      });
    });

    // Tlačítko se třemi tečkami pro další akce (stažení lístečku)
    const moreWrapper = createElement("div", "event-card__more");
    const dotsBtn = createElement("button", "btn-more-dots");
    dotsBtn.type = "button";
    dotsBtn.title = "Možnosti lístečku";
    dotsBtn.setAttribute("aria-label", "Možnosti lístečku");
    dotsBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
        <circle cx="12" cy="5" r="2"/>
        <circle cx="12" cy="12" r="2"/>
        <circle cx="12" cy="19" r="2"/>
      </svg>
    `;

    const dropdown = createElement("div", "event-card__dropdown");
    dropdown.hidden = true;

    const dlBtn = createElement("button", "event-card__dropdown-item");
    dlBtn.type = "button";
    dlBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" x2="12" y1="15" y2="3"/>
      </svg>
      Stáhnout lísteček
    `;

    dlBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.hidden = true;
      downloadImage(event.flyerUrl, filename, dlBtn);
    });

    dotsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Zavřeme ostatní otevřené dropdowny
      document.querySelectorAll(".event-card__dropdown").forEach((d) => {
        if (d !== dropdown) d.hidden = true;
      });
      dropdown.hidden = !dropdown.hidden;
    });

    dropdown.append(dlBtn);
    moreWrapper.append(dotsBtn, dropdown);

    actions.append(viewBtn, moreWrapper);
    body.append(actions);
  }

  article.append(body);
  return article;
}

// Zavírání rozbalených dropdownů při kliknutí mimo
document.addEventListener("click", (e) => {
  if (!e.target.closest(".event-card__more")) {
    document.querySelectorAll(".event-card__dropdown").forEach((d) => {
      d.hidden = true;
    });
  }
});

function createGroupSection({ title, defaultOpen = false, contentEl }) {
  const details = createElement("details", "events-group");
  if (defaultOpen) details.open = true;

  const summary = createElement("summary", "events-group__header");
  const titleEl = createElement("h2", "events-heading", title);

  const icon = createElement("span", "events-group__icon");
  icon.innerHTML = CHEVRON_SVG;

  summary.append(titleEl, icon);

  const contentWrap = createElement("div", "events-group__content");
  contentWrap.append(contentEl);

  details.append(summary, contentWrap);
  return details;
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

    container.replaceChildren();

    // 1. Nadcházející akce (defaultně otevřené)
    const upcomingList = createElement("div", "events-list");
    if (upcoming.length) {
      upcoming.forEach((ev) => upcomingList.append(createEventCard(ev)));
    } else {
      upcomingList.append(createElement("p", "events-empty", "Momentálně nejsou žádné naplánované akce."));
    }
    container.append(
      createGroupSection({
        title: "Nadcházející akce",
        defaultOpen: true,
        contentEl: upcomingList
      })
    );

    // 2. Proběhlé akce (defaultně zavřené)
    const pastList = createElement("div", "events-list");
    if (past.length) {
      past.forEach((ev) => pastList.append(createEventCard(ev)));
    } else {
      pastList.append(createElement("p", "events-empty", "Žádné proběhlé akce v evidenci."));
    }
    container.append(
      createGroupSection({
        title: "Proběhlé akce",
        defaultOpen: false,
        contentEl: pastList
      })
    );

    // 3. Kalendář akcí (defaultně zavřený)
    const calendarWrap = createElement("div", "calendar-section");
    calendarWrap.innerHTML = `
      <iframe src="https://calendar.google.com/calendar/embed?height=600&amp;wkst=2&amp;bgcolor=%23ffffff&amp;ctz=Europe%2FPrague&amp;src=Y19mZGEyNXVrMWxsNHQ3cmo5ODMyZGI0cmJvMEBncm91cC5jYWxlbmRhci5nb29nbGUuY29t&amp;color=%239E69AF" style="border: 0; width: 100%; height: 600px; border-radius: .5rem;" frameborder="0" scrolling="no" loading="lazy"></iframe>
    `;
    container.append(
      createGroupSection({
        title: "Kalendář akcí",
        defaultOpen: false,
        contentEl: calendarWrap
      })
    );
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

    target.innerHTML = `${escapeHtml(nextEvent.name)} <span class="next-event__sep">–</span> <span class="next-event__date">${formatDateRange(nextEvent.dateStart, nextEvent.dateEnd)}</span>`;
  } catch (error) {
    console.error("Nepodařilo se načíst nejbližší akci:", error);
  }
}

renderEvents();
renderNextEvent();
