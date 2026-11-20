import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

const host = window.location.hostname;
const path = window.location.pathname;

let siteRoot = '/';
if (host.includes('github.io')) {
  const repoName = path.split('/')[1]; 
  siteRoot = `/${repoName}/`;
}

let currentUser = null;
let componentsLoaded = false;

async function loadComponent(selector, path) {
  const target = document.querySelector(selector);
  if (!target) return;
  const response = await fetch(siteRoot + path);
  if (!response.ok) throw new Error(`Component failed to load: ${path}`);
  
  target.innerHTML = (await response.text()).replaceAll("{{ROOT}}", siteRoot);
}

function updateAuthUI(user) {
  currentUser = user;
  if (!componentsLoaded) return;

  const navigation = document.querySelector(".site-navigation");
  const footerLogoutContainer = document.getElementById("footer-logout-container");
  const footerLogoutBtn = document.getElementById("footer-logout-btn");

  if (user) {
    if (navigation && !navigation.querySelector('[data-page="admin"]')) {
      const adminLink = document.createElement("a");
      adminLink.href = `${siteRoot}admin/`;
      adminLink.dataset.page = "admin";
      adminLink.className = "nav-leader-link";
      adminLink.textContent = "Sekce pro vedení";
      navigation.append(adminLink);

      if (document.body.dataset.page === "admin") {
        adminLink.setAttribute("aria-current", "page");
      }
    }

    if (footerLogoutContainer) {
      footerLogoutContainer.hidden = false;
    }

    if (footerLogoutBtn && !footerLogoutBtn.dataset.bound) {
      footerLogoutBtn.dataset.bound = "true";
      footerLogoutBtn.addEventListener("click", () => signOut(auth));
    }
  } else {
    navigation?.querySelector('[data-page="admin"]')?.remove();
    if (footerLogoutContainer) {
      footerLogoutContainer.hidden = true;
    }
  }
}

function setupNavigation() {
  const navigation = document.querySelector(".site-navigation");
  const toggle = document.querySelector(".menu-toggle");
  if (!navigation || !toggle) return;

  const page = document.body.dataset.page;
  navigation.querySelector(`[data-page="${page}"]`)?.setAttribute("aria-current", "page");

  toggle.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("menu-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      document.body.classList.remove("menu-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

async function initializeComponents() {
  try {
    await Promise.all([
      loadComponent("[data-component=header]", "components/header.html"),
      loadComponent("[data-component=footer]", "components/footer.html")
    ]);
    componentsLoaded = true;
    setupNavigation();
    updateAuthUI(currentUser);
  } catch (error) {
    console.error(error);
  }
}

onAuthStateChanged(auth, (user) => {
  updateAuthUI(user);
});

initializeComponents();
