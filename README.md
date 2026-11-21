# Web Oddíl ROJ (73. PTO ROJ)

Oficiální webové stránky pražského dětského tábornického oddílu **ROJ**, který působí v rámci tábornického klubu **Modrý Kruh** a **České tábornické unie (ČTU)**.

- **Produkční web:** [https://www.oddil-roj.cz/](https://www.oddil-roj.cz/) (nebo záložní GitHub Pages)
- **Produkční větev:** `main`
- **Vývojová/testovací větev:** `testing`

---

## 1. Architektura a použité technologie

Web je navržen s důrazem na maximální rychlost, jednoduchost, bezpečnost a nulové provozní náklady:

- **Frontend:** Čisté HTML5, moderní modulární CSS (custom properties, flexbox, CSS grid, `sticky` pozicování) a vanilla JavaScript (ES moduly bez nutnosti složitého bundleru).
- **Hosting veřejného webu:** **GitHub Pages** (servírováno z produkční větve `main`).
- **Testovací prostředí (Preview):** **Vercel** (napojený na větev `testing`).
- **Backend a databáze:** **Google Firebase**:
  - **Firebase Authentication:** Přihlašování vedoucích přes Google účet.
  - **Cloud Firestore:** NoSQL databáze pro akce, vedení a historii změn.
  - **Firebase Storage:** Cloudové úložiště pro lístečky k akcím a profilové fotografie vedoucích.
  - **Firestore & Storage Security Rules:** Zabezpečení na úrovni databáze řízené jednotným whitelist e-mailů.

---

## 2. Struktura repozitáře

```text
├── 404.html                 # Vlastní chybová stránka pro GitHub Pages
├── index.html               # Úvodní stránka webu (o nás, nejbližší akce, kalendář, partneři)
├── robots.txt               # Pravidla pro vyhledávače (zákaz indexace /admin/)
├── sitemap.xml              # XML mapa stránek pro Google a Seznam
├── site.webmanifest         # PWA manifest pro uložení na plochu telefonu
├── package.json             # NPM skripty (build bezpečnostních pravidel)
│
├── admin/                   # Administrační rozhraní
│   └── index.html           # Správa akcí, vedení a historie změn (přístup přes Google přihlášení)
│
├── akce/                    # Veřejná sekce akcí
│   └── index.html           # Přehled nadcházejících a proběhlých akcí s lístečky
│
├── kontakt/                 # Veřejná sekce vedení
│   └── index.html           # Profily vedoucích a kontaktní údaje
│
├── letni-tabor/             # Informace o letním táboře
│   └── index.html           # Podrobnosti k táboru ve Vlčí jámě u Dolního Radíkova
│
├── fotogalerie/             # Fotogalerie
│   └── index.html           # Odkazy na oddílová alba na Rajčeti
│
├── components/              # Sdílené HTML komponenty (načítají se dynamicky)
│   ├── header.html          # Hlavní hlavička webu, navigace a testovací štítek
│   └── footer.html          # Patička s kontakty, fakturačními údaji a odkazem do adminu
│
├── assets/                  # Statické prostředky webu
│   ├── css/
│   │   └── style.css        # Kompletní styly celého webu i administrace
│   ├── js/
│   │   ├── admin.js         # Logika administrace (CRUD, formuláře, nahrávání souborů)
│   │   ├── akce.js          # Načítání a vykreslování akcí na veřejném webu
│   │   ├── vedeni.js        # Načítání a vykreslování vedoucích na veřejném webu
│   │   ├── firebase-config.js # Inicializace Firebase a autodetekce testovacího režimu
│   │   ├── komponenty.js    # Načítání hlavičky/patičky, sticky header, kontrola stavu přihlášení
│   │   ├── lightbox.js      # Centrální modální okno pro náhled lístečků a fotografií
│   │   └── utils.js         # Sdílené pomocné funkce (formátování datumu, telefonů, timestamps)
│   └── img/                 # Aktivní obrázky (loga, hero bannery stránek)
│       ├── shared/          # Logo oddílu a ikony
│       └── uvod/            # Loga partnerů (ČTU, Modrý Kruh, MŠMT, Praha)
│
├── firebase/                # Správa zabezpečení Firebase
│   ├── admins.json          # JEDNOTNÝ SEZNAM e-mailů administrátorů (Single Source of Truth)
│   ├── build-rules.mjs      # Generátor pravidel (vytváří firestore.rules a storage.rules)
│   ├── firestore.rules      # Vygenerovaná bezpečnostní pravidla pro Firestore
│   └── storage.rules        # Vygenerovaná bezpečnostní pravidla pro Storage
│
└── unused/                  # Záloha původních statických souborů před přechodem na Firebase
    ├── README.md
    ├── akce/listecky/       # Původní lokální lístečky
    └── vedeni/foto_vedeni/  # Původní lokální fotky vedoucích
```

---

## 3. Administrace webu (`/admin/`)

Administrace slouží vedoucím oddílu pro snadnou správu obsahu bez nutnosti zasahovat do zdrojového kódu.

### Přístup do administrace:
1. Přejděte na `/admin/` (nebo klikněte na odkaz **„Sekce pro vedení“** v patičce webu).
2. Přihlaste se kliknutím na tlačítko **„Přihlásit se přes Google“**.
3. Přihlásit se mohou pouze uživatelé s ověřeným e-mailem uvedeným na whitelistu v `firebase/admins.json`. Pokud se pokusí přihlásit neoprávněný účet, Firebase Security Rules zablokují přístup k datům a zobrazí se chybové hlášení.
4. Po přihlášení se v hlavním navigačním menu webu automaticky zobrazí odkaz **„Sekce pro vedení“** a v patičce možnost **„Odhlásit se“**.

### Funkce administrace:
- **Záložka [Akce]:**
  - Přidávání nových akcí i editace stávajících v modálním okně.
  - Termín: datum od a volitelné datum do (s automatickou validací, aby konec nebyl před začátkem).
  - Kontakty: e-mail a telefon (telefon se automaticky formátuje do mezinárodního tvaru).
  - Lísteček: nahrání obrázku (JPG, PNG, WebP). Prohlížeč před nahráním obrázek automaticky optimalizuje (zmenší na max 1600 px a převede na úsporný formát WebP). Starý soubor se ve Storage automaticky smaže.
  - Přepínač **„Skrýt akci na webu“**: Akce zůstane viditelná v administraci, ale skryje se pro veřejnost.
- **Záložka [Vedení]:**
  - Správa profilů vedoucích (jméno/přezdívka, oddílová funkce, e-mail, telefon).
  - Profilová fotka: povinná u nového vedoucího. Skript automaticky provede **středový ořez na poměr stran 2:3** a optimalizuje do formátu WebP (max 1600 px).
  - Řazení: Pořadí vedoucích na stránce lze jednoduše měnit pomocí tlačítek **▲** a **▼** (změna se v databázi uloží atomicky).
  - Přepínač **„Skrýt vedoucího na webu“**.
- **Záložka [Historie změn]:**
  - Audit log všech důležitých operací (vytvoření, úprava, smazání akce či vedoucího).
  - Každý záznam obsahuje přesné datum a čas, e-mail vedoucího, typ operace a podrobný seznam provedených změn (např. `Termín: 1. 5. → 10. 5. – 12. 5. 2026`).
  - U záznamů s více změnami je k dispozici tlačítko pro otevření detailního okna.
  - Stránkování po 10 záznamech s tlačítkem „Načíst dalších 10 záznamů“.

---

## 4. Správa administrátorů a bezpečnostních pravidel

Bezpečnost dat je řízena přímo na úrovni serverů Google Firebase (uživatel nemůže pravidla obejít ani přímým voláním API).

### Jak přidat nebo odebrat vedoucího:
1. Otevřete soubor `firebase/admins.json`.
2. Do pole přidejte nový Google e-mail vedoucího (nebo odeberte stávající):
   ```json
   [
     "adam.rott@modrykruh.cz",
     "novy.vedouci@modrykruh.cz"
   ]
   ```
3. V terminálu spusťte příkaz:
   ```bash
   npm run build:rules
   ```
4. Tento skript automaticky aktualizuje soubory `firebase/firestore.rules` a `firebase/storage.rules`.
5. Změny commitněte a pushněte do repozitáře. Automatická GitHub akce (`.github/workflows/firebase-deploy.yml`) nasadí nová pravidla přímo do Firebase projektu.

---

## 5. Testovací vs. produkční režim dat

Aby při vývoji a úpravách nedocházelo k nechtěnému přepsání nebo smazání ostrých dat oddílu, má web vestavěný duální režim:

- **Autodetekce:**
  - Pokud web běží na `localhost`, `127.0.0.1` nebo na preview doménách `*.vercel.app`, automaticky se aktivuje **testovací režim** (`isTesting = true`).
  - Pokud web běží na ostré doméně `www.oddil-roj.cz` nebo GitHub Pages, běží v **produkčním režimu**.
- **Oddělené kolekce v databázi:**
  - Produkce: `akce`, `vedeni`, `log`, storage cesty `listecky/` a `vedeni/`.
  - Testování: `test_akce`, `test_vedeni`, `test_log`.
- **Vizuální indikátor:**
  - V testovacím režimu se vedle loga v hlavičce webu zobrazuje výrazný oranžový štítek **„testovací data“**.
- **Ruční vynucení:**
  - V souboru `assets/js/firebase-config.js` lze nastavit `FORCE_TESTING = true` (vynutí testovací data kdekoli) nebo `FORCE_TESTING = false` (vynutí produkční data).

---

## 6. Lokální spuštění a vývoj

Pro lokální vývoj nepotřebujete žádné těžkopádné nástroje. Stačí jakýkoliv lokální HTTP server, aby fungovaly ES moduly a `fetch()` komponent.

### Spuštění lokálního serveru:
Pomocí Node.js:
```bash
npx serve .
```
Nebo pomocí Pythonu:
```bash
python -m http.server 8000
```
Následně otevřete v prohlížeči adresu `http://localhost:8000` (či port, který vám nástroj vypíše).

---

## 7. Doporučený pracovní postup (Git Workflow)

1. **Vývoj a testování probíhá ve větvi `testing`:**
   ```bash
   git checkout testing
   # provádění úprav...
   git add .
   git commit -m "Popis změn"
   git push origin testing
   ```
2. **Kontrola:**
   - Prohlédněte si výsledek na Vercel preview nebo lokálně. Vyzkoušejte funkčnost v testovacím režimu.
3. **Nasazení na produkční web (GitHub Pages):**
   - Jakmile je vše otestováno, sloučí se větev `testing` do produkční větve `main`:
   ```bash
   git checkout main
   git merge testing
   git push origin main
   ```
   - Během 1–2 minut GitHub Pages automaticky nasadí novou verzi na ostrou doménu [https://www.oddil-roj.cz/](https://www.oddil-roj.cz/).
