import { db, getCollectionName } from "./firebase-config.js";
import {
  collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import "./lightbox.js";

const STATIC_VEDENI = [
  { name: "Anet (Aneta Měřínská)", role: "Hlavní vedoucí oddílu, zdravotnice", filename: "350662-IMG_3960.jpeg", mail: "aneta.merinska@modrykruh.cz", phone: "735 883 580" },
  { name: "Andří (Andrea Holubová)", role: "Hlavní vedoucí tábora", filename: "IMG_3851.jpeg", mail: "andrea.holubova@modrykruh.cz", phone: "737 245 522" },
  { name: "Dejva (David Procházka)", role: "Oddílový účetní", filename: "IMG_3839.jpeg", mail: "david.prochazka@modrykruh.cz" },
  { name: "Dráp (Lukáš Dostál)", role: "Náčelník MK", filename: "IMG_3980.jpeg", mail: "lukas.dostal@modrykruh.cz", phone: "732 420 913" },
  { name: "Dan (Daniel Vacek)", role: "Zdravotník", filename: "dan.jpg" },
  { name: "Aleš", role: "Vedoucí", filename: "ales.jpg" },
  { name: "Písky (Jiří Měřínský)", role: "Vedoucí", filename: "IMG_3136.jpeg", mail: "jiri.merinsky@modrykruh.cz" },
  { name: "Pavián", role: "Vedoucí", filename: "IMG_3888.jpeg", mail: "alexandr.sekera@modrykruh.cz" },
  { name: "Mol (Ondřej Křížek)", role: "Vedoucí", filename: "IMG_5649.jpeg", mail: "ondrej.krizek@modrykruh.cz" },
  { name: "Máca", role: "Vedoucí", filename: "IMG_3835.jpeg" },
  { name: "JT", role: "Vedoucí", filename: "IMG_3993.jpeg" },
  { name: "Adam", role: "Vedoucí", filename: "IMG_3871.jpeg" },
  { name: "Bebe", role: "Vedoucí", filename: "IMG_3856.jpeg" },
  { name: "Téra", role: "Instruktorka", filename: "tera.jpg" },
  { name: "Niky", role: "Instruktorka", filename: "niky.jpg" },
  { name: "Bert", role: "Instruktor", filename: "bert.jpg" },
  { name: "Miki", role: "Instruktor", filename: "miki.jpg" },
  { name: "Jony", role: "Instruktor", filename: "jony.jpg" },
  { name: "Kuba", role: "Instruktor", filename: "kuba.jpg" },
  { name: "Sára", role: "Instruktorka", filename: "sara.jpg" },
  { name: "Julča", role: "Instruktorka", filename: "julca.jpg" },
  { name: "Hanička", role: "Instruktorka", filename: "hanicka.jpg" },
  { name: "Bárny", role: "Instruktor", filename: "barny.jpg" }
];

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createLeaderCard(person) {
  const card = createElement("article", "leader-card");
  const image = createElement("img", "leader-card__photo");
  image.src = person.photoUrl || (person.filename ? `../unused/vedeni/foto_vedeni/${person.filename}` : "");
  image.alt = `Portrét: ${person.name}`;
  image.loading = "lazy";
  if (person.photoUrl) {
    image.style.cursor = "pointer";
    image.title = "Kliknutím zobrazíte fotku";
    image.dataset.previewImg = person.photoUrl;
    image.dataset.previewAlt = `Portrét: ${person.name}`;
  }
  card.append(image);

  if (person.name) {
    const nameEl = createElement("h3", "leader-card__name", person.name);
    nameEl.style.setProperty("--len", person.name.length);
    card.append(nameEl);
  }

  if (person.role) {
    const roleEl = createElement("p", "leader-card__role", person.role);
    roleEl.style.setProperty("--len", person.role.length);
    card.append(roleEl);
  }

  if (person.mail) {
    const p = createElement("p", "leader-card__contact leader-card__contact--mail");
    const mail = createElement("a", "", person.mail);
    mail.href = `mailto:${person.mail}`;
    p.style.setProperty("--len", person.mail.length);
    p.append(mail);
    card.append(p);
  }

  if (person.phone) {
    const p = createElement("p", "leader-card__contact leader-card__contact--phone");
    const phone = createElement("a", "", person.phone);
    phone.href = `tel:${person.phone.replace(/\s+/g, "")}`;
    p.style.setProperty("--len", person.phone.length);
    p.append(phone);
    card.append(p);
  }
  return card;
}

async function renderLeadership() {
  const container = document.querySelector("#vedeni-seznam");
  if (!container) return;

  try {
    const q = query(collection(db, getCollectionName("vedeni")), orderBy("order", "asc"));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const leaders = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((person) => !person.hide);

      if (leaders.length > 0) {
        const grid = createElement("div", "leadership-grid");
        leaders.forEach((person) => grid.append(createLeaderCard(person)));
        container.replaceChildren(grid);
        return;
      }
    }
  } catch (err) {
    console.warn("Načtení vedení z Firebase se nezdařilo, použije se záložní seznam:", err);
  }

  // Záložní zobrazení ze statických dat, pokud je Firestore prázdný nebo nedostupný
  const grid = createElement("div", "leadership-grid");
  STATIC_VEDENI.forEach((person) => grid.append(createLeaderCard(person)));
  container.replaceChildren(grid);
}

renderLeadership();
