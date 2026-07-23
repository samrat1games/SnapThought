import { getCurrentUser } from './state.js';

const routes = [];
let currentPage = null;
let notFoundHandler = null;

export function addRoute(pattern, pageName, paramNames = []) {
  routes.push({ pattern, pageName, paramNames });
}

export function setNotFound(handler) {
  notFoundHandler = handler;
}

const pageModules = {};

export async function loadPage(name) {
  if (!pageModules[name]) {
    pageModules[name] = await import(`./pages/${name}.js`);
  }
  return pageModules[name];
}

function matchRoute(hash) {
  const path = hash.replace(/^#/, '') || '/';

  for (const route of routes) {
    const match = path.match(route.pattern);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });

      const urlParams = new URLSearchParams(window.location.search);
      for (const [key, value] of urlParams) {
        params[key] = value;
      }

      return { pageName: route.pageName, params };
    }
  }
  return null;
}

const protectedRoutes = new Set([
  'feed', 'profile', 'post-detail', 'search', 'explore',
  'notifications', 'bookmarks', 'settings', 'admin', 'ai-support', 'messages',
  'groups', 'group-detail', 'live', 'live-detail', 'awards', 'discussions', 'discussion-detail'
]);

export async function navigate(hash) {
  if (currentPage?.cleanup) {
    currentPage.cleanup();
    currentPage = null;
  }

  const result = matchRoute(hash);

  if (!result) {
    if (notFoundHandler) notFoundHandler();
    return;
  }

  if (protectedRoutes.has(result.pageName) && !getCurrentUser()) {
    window.location.hash = '#/login';
    return;
  }

  if ((result.pageName === 'auth-page') && getCurrentUser()) {
    window.location.hash = '#/';
    return;
  }

  try {
    const pageModule = await loadPage(result.pageName);
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = '';
      pageModule.render(mainContent, result.params);
      currentPage = pageModule;
    }
  } catch (err) {
    console.error('Page load error:', err);
    if (notFoundHandler) notFoundHandler();
  }
}

export function initRouter() {
  window.addEventListener('hashchange', () => {
    navigate(window.location.hash);
  });

  navigate(window.location.hash || '#/');
}
