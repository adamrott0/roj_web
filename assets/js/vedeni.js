const VEDENI = [
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
  { name: "Bárny", role: "Instruktor", filename: "barny.jpg" },

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
  image.src = `../assets/img/vedeni/${person.filename}`;
  image.alt = `Portrét: ${person.name}`;
  image.loading = "lazy";
  card.append(image);
  card.append(createElement("h3", "leader-card__name", person.name));
  card.append(createElement("p", "leader-card__role", person.role));

  if (person.mail) {
    const mail = createElement("a", "leader-card__contact", person.mail);
    mail.href = `mailto:${person.mail}`;
    card.append(mail);
  }
  if (person.phone) {
  const p = createElement("p", "leader-card__contact");
  const phone = createElement("a", "", person.phone);
  phone.href = `tel:${person.phone.replace(/\s+/g, "")}`;
  p.append(phone);
  card.append(p);
}
  return card;
}

function renderLeadership() {
  const container = document.querySelector("#vedeni-seznam");
  if (!container) return;
  const grid = createElement("div", "leadership-grid");
  VEDENI.forEach((person) => grid.append(createLeaderCard(person)));
  container.replaceChildren(grid);
}

renderLeadership();
