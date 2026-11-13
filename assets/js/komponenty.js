const host = window.location.hostname;
const path = window.location.pathname;

let siteRoot = '/';
if (host.includes('github.io')) {
  const repoName = path.split('/')[1]; 
  siteRoot = `/${repoName}/`;
}

async function loadComponent(selector, path) {
  const target = document.querySelector(selector);
  if (!target) return;
  const response = await fetch(siteRoot + path);
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