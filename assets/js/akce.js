const AKCE = [
  { name: "Stanová výprava", date: "2025-09-19", filename: "1000001267.png" },
  { name: "Piknik s promítáním", date: "2025-09-14", filename: "Piknik-s-promitanim.jpeg" },
  { name: "MK družinovka", date: "2025-04-09", filename: "mkdruzinovka.jpeg" },
  { name: "Vraní", date: "2025-04-13", filename: "vrani_25-2.jpeg" },
  { name: "Březnová výprava", date: "2025-03-07", filename: "breznovka25.jpeg" },
  { name: "Jednodenka", date: "2025-02-16", filename: "jednodenka25.jpeg" },
  { name: "Lyžařská výprava", date: "2025-01-30", filename: "lyzarka-2025.jpeg" },
  { name: "Bruslení", date: "2025-01-19", filename: "brusleni-2025.jpeg" },
  { name: "Hra po Praze", date: "2025-01-18", filename: "hra-po-praze-2025.jpeg" },
  { name: "Velká říjnová výprava", date: "2024-10-25", filename: "rijnovka.jpeg" },
  { name: "Březnová výprava", date: "2024-03-08", filename: "Listecek-Breznovka-2024.jpeg" },
  { name: "Jednodenka", date: "2024-02-25", filename: "jednodenka-s-Adamem-25.2..jpeg" },
  { name: "Půldenka", date: "2024-02-24", filename: "puldenka-s-Andri-24.2-1.jpeg" },
  { name: "Lyžařská výprava", date: "2024-02-01", filename: "LYZARSKA-VYPRAVA-2024-listecek_page-0001.jpeg" },
  { name: "Vánoční výprava s Bebe a Anet", date: "2023-12-15", filename: "vanocka.jpeg" },
  { name: "Pečení cukroví u Háně", date: "2023-12-09", filename: "cukrovi.jpeg" },
  { name: "Oblastní orienťák", date: "2023-11-25", filename: "OBLASTNI-ORIENTAK-1.jpeg" },
  { name: "Jednodenka", date: "2023-11-26", filename: "jednodenka.png" },
  { name: "Říjnovka", date: "2023-10-25", filename: "rijnovka23.jpeg" },
  { name: "Softík", date: "2023-10-08", filename: "softik1023.jpeg" },
  { name: "Piknik", date: "2023-09-10", filename: "piknik23.jpeg" },
  { name: "Koupací výprava", date: "2023-06-11", filename: "koupacka23.png" },
  { name: "Cyklo výprava", date: "2023-05-28", filename: "kolovyprava.png" },
  { name: "Vraní", date: "2023-04-16", filename: "vrani23.png" },
  { name: "Dubnová půldenka", date: "2023-04-15", filename: "breznovaPuldenka.jpg" },
  { name: "Březnovka", date: "2023-03-24", filename: "breznovka23.jpg" }
];

const dateFormatter = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "numeric",
  year: "numeric"
});

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
    image.src = `../assets/img/${event.filename}`;
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
  body.append(
    createElement("h3", "event-card__title", event.name),
    createElement("time", "event-card__date", dateFormatter.format(new Date(`${event.date}T12:00:00`)))
  );
  const button = createElement("button", "event-card__button", "Zobrazit lísteček");
  button.type = "button";
  button.addEventListener("click", () => openModal(event));
  body.append(button);
  article.append(body);
  return article;
}

function renderEvents() {
  const container = document.querySelector("#akce-seznam");
  if (!container) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = AKCE.filter((event) => new Date(`${event.date}T00:00:00`) >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = AKCE.filter((event) => new Date(`${event.date}T00:00:00`) < today)
    .sort((a, b) => b.date.localeCompare(a.date));
  const openModal = createModal();

  const renderGroup = (title, events) => {
    const heading = createElement("h2", "events-heading", title);
    const list = createElement("div", "events-list");
    if (events.length) {
      events.forEach((event) => list.append(createEventCard(event, openModal)));
    } else {
      list.append(createElement("p", "events-empty", "Momentálně nejsou žádné akce."));
    }
    container.append(heading, list);
  };

  renderGroup("Nadcházející akce", upcoming);
  renderGroup("Proběhlé akce", past);
}

export function renderNextEvent() {
  const target = document.querySelector("[data-next-event]");
  if (!target) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextEvent = AKCE.filter((event) => new Date(`${event.date}T00:00:00`) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  if (!nextEvent) {
    target.textContent = "Další akce brzy doplníme.";
    return;
  }
  target.textContent = `${nextEvent.name} · ${dateFormatter.format(new Date(`${nextEvent.date}T12:00:00`))}`;
}

renderEvents();
renderNextEvent();
