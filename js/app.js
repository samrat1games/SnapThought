import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { initSupabase } from './supabase.js';
import { initTheme } from './theme.js';
import { setCurrentUser, getCurrentUser, on } from './state.js';
import { navigate, addRoute, initRouter } from './router.js';
import { renderSidebar, updateActiveLink } from './components/sidebar.js';
import { renderRightSidebar } from './components/right-sidebar.js';
import { initComposer } from './components/post-composer.js';
import { el, clearElement } from './utils/dom.js';
import { initShortcuts } from './utils/shortcuts.js';
import { initOfflineDetection } from './utils/offline.js';
import { setPasswordForOAuthUser } from './auth.js';
import { t } from './i18n.js';

const isConfigReady = SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';

// Register routes
addRoute(/^\/?$|^\/home$/, 'feed');
addRoute(/^\/login$/, 'auth-page');
addRoute(/^\/signup$/, 'auth-page');
addRoute(/^\/user\/([^/]+)$/, 'profile', ['username']);
addRoute(/^\/post\/([^/]+)$/, 'post-detail', ['id']);
addRoute(/^\/search$/, 'search');
addRoute(/^\/notifications$/, 'notifications');
addRoute(/^\/bookmarks$/, 'bookmarks');
addRoute(/^\/settings$/, 'settings');
addRoute(/^\/discussions$/, 'discussions');
addRoute(/^\/discussion\/([^/]+)$/, 'discussion-detail', ['name']);
addRoute(/^\/shortvs$/, 'shortvs');
addRoute(/^\/camera$/, 'camera');
addRoute(/^\/explore$/, 'explore');
addRoute(/^\/admin$/, 'admin');
addRoute(/^\/lists$/, 'lists');
addRoute(/^\/trends$/, 'trends');
addRoute(/^\/export$/, 'data-export');
addRoute(/^\/support$/, 'ai-support');
addRoute(/^\/messages$/, 'messages');
addRoute(/^\/messages\/([^/]+)$/, 'messages', ['partnerId']);

// NEW ROUTES - Groups, Live Streaming, Awards
addRoute(/^\/groups$/, 'groups');
addRoute(/^\/group\/([^/]+)$/, 'group-detail', ['groupId']);
addRoute(/^\/live$/, 'live');
addRoute(/^\/live\/([^/]+)$/, 'live-detail', ['streamId']);
addRoute(/^\/awards$/, 'awards');
addRoute(/^\/earnings$/, 'earnings');

let shellRendered = false;

async function initApp() {
  const app = document.getElementById('app');
  initTheme();
  initComposer();
  initShortcuts();
  initOfflineDetection();

  on('userChanged', () => {
    renderShell();
  });

  if (isConfigReady) {
    try {
      // Initialize Supabase client
      await initSupabase();

      const { onAuthStateChange, getSession } = await import('./auth.js');

      // Set up auth listener - it will call renderShell when profile is ready
      onAuthStateChange((event) => {
        renderShell();
        if (event === 'SIGNED_OUT') {
          window.location.hash = '#/login';
        }
      });

      // Check current session - this triggers onAuthStateChange
      await getSession();
    } catch (err) {
      console.error('Auth init failed:', err);
    }
  }

  // Small delay to let onAuthStateChange process
  await new Promise(r => setTimeout(r, 200));

  // Now render shell (user should be set by now)
  renderShell();

  initRouter();
}

function renderShell() {
  const app = document.getElementById('app');
  if (!app) return;
  const user = getCurrentUser();

  clearElement(app);

  if (!user) {
    const main = el('div', { id: 'main-content' });
    app.appendChild(main);

    if (!isConfigReady) {
      main.appendChild(el('div', { className: 'auth-page' }, [
        el('div', { className: 'auth-card' }, [
          el('div', { className: 'auth-logo' }, [
            el('span', { innerHTML: '<img src="icons/text-logo.png?v=1.6.1" style="height:48px;border-radius:8px" alt="SnapThought">' }),
          ]),
          el('h1', { className: 'auth-title', textContent: 'Welcome to SnapThought' }),
          el('div', { className: 'auth-error', style: { display: 'block', marginBottom: '16px' } }, [
            el('strong', { textContent: 'Configuration required' }),
            el('p', { textContent: 'Edit js/config.js with your Supabase credentials.', style: { marginTop: '8px', fontSize: '14px' } }),
          ]),
        ]),
      ]));
    }

    // Show auth page
    const hash = window.location.hash;
    if (hash && hash !== '#/login' && hash !== '#/signup') {
      window.location.hash = '#/login';
    }
    return;
  }

  // Main app layout
  const layout = el('div', { className: 'app-layout' });

  const sidebarContainer = el('div');
  renderSidebar(sidebarContainer);

  const mainArea = el('div', { className: 'main-content' });

  // Compact top header: Home text + search + notifications + compose on the right
  const topHeader = el('div', { className: 'compact-top-header' }, [
    el('div', { className: 'compact-top-header-left' }, [
      el('a', { href: '#/', className: 'compact-top-header-logo' }, [
        el('img', { src: 'icons/text-logo.png?v=1.6.0', style: { height: '28px', borderRadius: '6px' }, alt: 'SnapThought' }),
      ]),
      el('span', { className: 'compact-top-header-title', textContent: t('home') }),
    ]),
    el('div', { className: 'compact-top-header-right' }, [
      el('a', { href: '#/trends', className: 'compact-top-header-icon', title: 'Trends', innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="17 6 23 6 23 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
      el('a', { href: '#/lists', className: 'compact-top-header-icon', title: 'Lists', innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><line x1="8" y1="6" x2="21" y2="6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="8" y1="12" x2="21" y2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="8" y1="18" x2="21" y2="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="3" y1="6" x2="3.01" y2="6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="3" y1="12" x2="3.01" y2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="3" y1="18" x2="3.01" y2="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
      el('a', { href: '#/search', className: 'compact-top-header-icon', innerHTML: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' }),
      el('a', { href: '#/notifications', className: 'compact-top-header-icon', innerHTML: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.73 21a2 2 0 0 1-3.46 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
      el('button', { className: 'compact-top-header-icon compact-compose-btn', innerHTML: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>', onClick: function() { window.dispatchEvent(new CustomEvent('open-composer')); } }),
    ]),
  ]);

  const mainContent = el('div', { id: 'main-content' });
  mainArea.append(topHeader, mainContent);

  const rightSidebar = el('div', { className: 'right-sidebar' });

  layout.append(sidebarContainer, mainArea, rightSidebar);
  app.appendChild(layout);

  // Mobile bottom nav
  const mobileNav = el('div', { className: 'mobile-nav' });
  const mobileItems = el('div', { className: 'mobile-nav-items' });

  const mobileLinks = [
    { href: '#/', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="9 22 9 12 15 12 15 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
    { href: '#/discussions', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
    { href: '#/shortvs', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><polygon points="5 3 19 12 5 21 5 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
    { href: 'compose', icon: '<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>', compose: true },
    { href: '#/messages', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="22,6 12,13 2,6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
    { href: user ? '#/user/' + user.username : '#/', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
  ];

  for (const link of mobileLinks) {
    if (link.compose) {
      const btn = el('button', { className: 'mobile-nav-link', innerHTML: link.icon, onClick: function() {
        window.dispatchEvent(new CustomEvent('open-composer'));
      }});
      mobileItems.appendChild(btn);
    } else {
      const a = el('a', { className: 'mobile-nav-link', href: link.href, innerHTML: link.icon });
      mobileItems.appendChild(a);
    }
  }

  mobileNav.appendChild(mobileItems);
  app.appendChild(mobileNav);

  renderRightSidebar(rightSidebar);

  updateActiveLink();

  // Navigate to current page (avoid auth pages if logged in)
  const hash = window.location.hash;
  if (!hash || hash === '#/login' || hash === '#/signup') {
    navigate('#/');
  } else {
    navigate(hash);
  }

  // Password setup banner for OAuth users
  initPasswordBanner();
}

// Password setup banner & modal for OAuth-only users
function initPasswordBanner() {
  // Remove existing banner if any
  const existing = document.querySelector('.password-banner');
  if (existing) existing.remove();

  window.addEventListener('oauth-needs-password', (e) => {
    if (e.detail.mandatory) {
      // Show mandatory modal immediately - no banner
      showPasswordModal(e.detail.profile, true);
    } else {
      showPasswordBanner(e.detail);
    }
  });
}

function showPasswordBanner({ profile }) {
  const existing = document.querySelector('.password-banner');
  if (existing) return;

  const banner = el('div', { className: 'password-banner' }, [
    el('div', { className: 'password-banner-text' }, [
      el('h3', { textContent: 'Secure your account' }),
      el('p', { textContent: 'You signed in with a social account. Set a password so you can always log in.' }),
    ]),
    el('div', { className: 'password-banner-actions' }, [
      el('button', {
        className: 'btn-set',
        textContent: 'Set password now',
        onClick: () => {
          banner.remove();
          showPasswordModal(profile, true);
        },
      }),
    ]),
  ]);

  document.body.appendChild(banner);
}

function showPasswordModal(profile, mandatory = false) {
  // Remove any existing modal
  const existing = document.querySelector('.password-modal-overlay');
  if (existing) existing.remove();

  const overlay = el('div', { className: 'password-modal-overlay' });
  const errorDiv = el('div', { className: 'auth-error', style: { display: 'none', marginBottom: '12px' } });

  const pwInput = el('input', { className: 'input', type: 'password', placeholder: 'New password (min 6 chars)', required: 'required' });
  const confirmInput = el('input', { className: 'input', type: 'password', placeholder: 'Confirm password', required: 'required' });

  const confirmBtn = el('button', {
    className: 'btn-confirm',
    textContent: 'Create password & continue',
    onClick: async () => {
      const pw = pwInput.value;
      const pw2 = confirmInput.value;
      errorDiv.style.display = 'none';

      if (pw.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters';
        errorDiv.style.display = 'block';
        return;
      }
      if (pw !== pw2) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.style.display = 'block';
        return;
      }

      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Setting...';
      try {
        await setPasswordForOAuthUser(pw);
        // Refresh profile in state so has_password=true is reflected
        const { getUserProfile } = await import('./auth.js');
        const state = await import('./state.js');
        const u = state.getCurrentUser();
        if (u) {
          const fresh = await getUserProfile(u.id);
          state.setCurrentUser(fresh);
        }
        overlay.remove();
        // Show success toast
        const toast = el('div', {
          style: {
            position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
            background: '#10b981', color: 'white', padding: '12px 24px', borderRadius: '12px',
            fontWeight: '600', zIndex: '99999', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          },
          textContent: 'Password set! Welcome to SnapThought!',
        });
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      } catch (err) {
        errorDiv.textContent = err.message || 'Failed to set password';
        errorDiv.style.display = 'block';
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Create password & continue';
      }
    },
  });

  // Handle Enter key in password fields
  const handleEnter = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmBtn.click();
    }
  };
  pwInput.addEventListener('keydown', handleEnter);
  confirmInput.addEventListener('keydown', handleEnter);

  const children = [
    el('h2', { textContent: mandatory ? 'Create your password' : 'Set your password' }),
    el('p', { textContent: mandatory
      ? 'To continue using SnapThought, create a password. This is required for account security.'
      : 'Create a password so you can sign in without Google, GitHub, or Discord.'
    }),
  ];

  if (mandatory) {
    children.push(el('div', {
      style: {
        padding: '12px', background: 'rgba(99,102,241,0.1)', borderRadius: '8px',
        marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)',
      },
    }, [
      el('strong', { textContent: 'Required: ', style: { color: 'var(--accent)' } }),
      el('span', { textContent: 'You signed in with a social account. A password is required to secure your account and enable all features.' }),
    ]));
  }

  children.push(
    errorDiv,
    el('div', { className: 'input-group' }, [pwInput]),
    el('div', { className: 'input-group' }, [confirmInput]),
    confirmBtn,
  );

  overlay.appendChild(el('div', { className: 'password-modal' }, children));

  // Mandatory: can't close by clicking outside
  if (!mandatory) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  document.body.appendChild(overlay);
  pwInput.focus();
}

// Start
initApp();
