const scriptUrl = document.currentScript ? document.currentScript.src : window.location.href;
const siteRoot = new URL("../../", scriptUrl).href;

async function loadComponent(selector, path) {
  const target = document.querySelector(selector);
  if (!target) return;

  const response = await fetch(new URL(path, siteRoot));
  if (!response.ok) throw new Error(`Component failed to load: ${path}`);
  target.innerHTML = (await response.text()).replaceAll("{{ROOT}}", siteRoot);
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
    setupNavigation();
  } catch (error) {
    console.error(error);
  }
}

initializeComponents();