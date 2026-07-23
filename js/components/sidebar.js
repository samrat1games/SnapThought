import { el } from '../utils/dom.js';
import { getCurrentUser } from '../state.js';
import { renderAvatar } from './avatar.js';
import { signOut } from '../auth.js';
import { getRoleBadgesSm } from '../constants.js';
import { t } from '../i18n.js';

const ICONS = {
  home: '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="9 22 9 12 15 12 15 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  trends: '<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="17 6 23 6 23 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  notifications: '<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.73 21a2 2 0 0 1-3.46 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bookmarks: '<svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  lists: '<svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="8" y1="12" x2="21" y2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="8" y1="18" x2="21" y2="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="3" y1="6" x2="3.01" y2="6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="3" y1="12" x2="3.01" y2="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="3" y1="18" x2="3.01" y2="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  discussions: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  messages: '<svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="22,6 12,13 2,6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  shortv: '<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  support: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="17" x2="12.01" y2="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  profile: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  groups: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  live: '<svg viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  awards: '<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  earnings: '<svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

const NAV_ITEMS = [
  { labelKey: 'home', hash: '#/', iconKey: 'home' },
  { labelKey: 'trends', hash: '#/trends', iconKey: 'trends' },
  { labelKey: 'lists', hash: '#/lists', iconKey: 'lists' },
  { labelKey: 'explore', hash: '#/explore', iconKey: 'search' },
  { labelKey: 'notifications', hash: '#/notifications', iconKey: 'notifications' },
  { labelKey: 'messages', hash: '#/messages', iconKey: 'messages' },
  { labelKey: 'bookmarks', hash: '#/bookmarks', iconKey: 'bookmarks' },
  { labelKey: 'discussions', hash: '#/discussions', iconKey: 'discussions' },
  { labelKey: 'groups', hash: '#/groups', iconKey: 'groups' },
  { labelKey: 'shortv', hash: '#/shortvs', iconKey: 'shortv' },
  { labelKey: 'live', hash: '#/live', iconKey: 'live' },
  { labelKey: 'awards', hash: '#/awards', iconKey: 'awards' },
  { labelKey: 'earnings', hash: '#/earnings', iconKey: 'earnings' },
  { labelKey: 'support', hash: '#/support', iconKey: 'support' },
  { labelKey: 'profile', hash: null, iconKey: 'profile', dynamic: true },
  { labelKey: 'settings', hash: '#/settings', iconKey: 'settings' },
];

export function renderSidebar(container) {
  const user = getCurrentUser();

  const navLinks = NAV_ITEMS.map(item => {
    const href = item.dynamic && user ? '#/user/' + user.username : item.hash;
    return el('a', {
      className: 'nav-link',
      href: href,
      dataset: { route: item.labelKey },
    }, [
      el('span', { innerHTML: ICONS[item.iconKey] }),
      el('span', { className: 'nav-label', textContent: t(item.labelKey) }),
    ]);
  });

  const composeBtn = el('div', { className: 'sidebar-compose' }, [
    el('button', {
      className: 'btn btn-primary',
      onClick: function() { window.dispatchEvent(new CustomEvent('open-composer')); },
    }, [
      el('span', { textContent: t('compose') }),
    ]),
  ]);

  var profileSection = null;
  if (user) {
    profileSection = el('div', {
      className: 'sidebar-profile',
      onClick: function() {
        var dropdown = container.querySelector('.profile-dropdown');
        if (dropdown) dropdown.classList.toggle('visible');
      },
    }, [
      renderAvatar(user, 'md'),
      el('div', { className: 'sidebar-profile-info' }, [
        el('div', { className: 'sidebar-profile-name' }, [
          user.display_name,
          ...getRoleBadgesSm(user).map(b => el('span', { innerHTML: ' ' + b })),
        ].filter(Boolean)),
        el('div', { className: 'sidebar-profile-handle', textContent: '@' + user.username }),
      ]),
      el('span', { className: 'sidebar-profile-more', textContent: '\u2026' }),
    ]);
  }

  var dropdown = null;
  if (user) {
    var dropdownItems = [];

    if (user.is_admin) {
      dropdownItems.push(el('a', {
        className: 'dropdown-item',
        href: '#/admin',
        textContent: 'Admin Panel',
        style: { color: 'var(--accent)', display: 'block', textDecoration: 'none' },
      }));
    }

    dropdownItems.push(el('button', {
      className: 'dropdown-item',
      textContent: t('logout'),
      onClick: function() {
        signOut().then(function() {
          window.location.hash = '#/login';
        });
      },
    }));

    dropdown = el('div', { className: 'profile-dropdown' }, dropdownItems);
  }

  var children = [
    el('div', { className: 'sidebar-logo' }, [
      el('a', { href: '#/' }, [
        el('img', { src: 'icons/text-logo.png?v=1.6.0', style: { height: '32px', borderRadius: '6px' }, alt: 'SnapThought' }),
      ]),
    ]),
    el('nav', { className: 'sidebar-nav' }, navLinks),
    composeBtn,
  ];
  if (profileSection) children.push(profileSection);
  if (dropdown) children.push(dropdown);

  container.appendChild(el('aside', { className: 'sidebar' }, children));

  updateActiveLink();
}

export function updateActiveLink() {
  var hash = window.location.hash || '#/';
  document.querySelectorAll('.nav-link').forEach(function(link) {
    var route = link.dataset.route;
    var isActive = false;

    if (route === 'home') isActive = hash === '#/' || hash === '#/home';
    else if (route === 'explore') isActive = hash === '#/explore';
    else if (route === 'notifications') isActive = hash === '#/notifications';
    else if (route === 'bookmarks') isActive = hash === '#/bookmarks';
    else if (route === 'settings') isActive = hash === '#/settings';
    else if (route === 'profile') isActive = hash.indexOf('#/user/') === 0;

    if (isActive) link.classList.add('active');
    else link.classList.remove('active');
  });
}
