import { getCurrentUser } from '../state.js';

const shortcuts = [
  { key: 'n', label: 'New post', action: () => window.dispatchEvent(new CustomEvent('open-composer')) },
  { key: '/', label: 'Search', action: () => { window.location.hash = '#/search'; } },
  { key: 'g', label: 'Go to Home', action: () => { window.location.hash = '#/'; }, modifier: null },
  { key: 'l', label: 'Like focused post', action: () => {
    const focused = document.querySelector('.post-card:focus-within, .post-card:hover');
    if (focused) focused.querySelector('.post-action-like')?.click();
  }},
  { key: 'j', label: 'Next post', action: () => navigatePost(1) },
  { key: 'k', label: 'Previous post', action: () => navigatePost(-1) },
  { key: 'b', label: 'Bookmark focused post', action: () => {
    const focused = document.querySelector('.post-card:focus-within, .post-card:hover');
    if (focused) focused.querySelector('.post-action-bookmark')?.click();
  }},
];

let enabled = false;
let handler = null;

function navigatePost(direction) {
  const posts = [...document.querySelectorAll('.post-card')];
  if (posts.length === 0) return;

  const current = document.activeElement?.closest('.post-card');
  let idx = current ? posts.indexOf(current) : -1;
  idx += direction;
  if (idx < 0) idx = 0;
  if (idx >= posts.length) idx = posts.length - 1;
  posts[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
  posts[idx].focus();
}

function isInInput() {
  const tag = document.activeElement?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
}

export function initShortcuts() {
  if (enabled) return;
  enabled = true;

  handler = (e) => {
    if (!getCurrentUser()) return;
    if (isInInput()) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const shortcut = shortcuts.find(s => s.key === e.key);
    if (shortcut) {
      e.preventDefault();
      shortcut.action();
    }
  };

  document.addEventListener('keydown', handler);
}

export function destroyShortcuts() {
  if (handler) {
    document.removeEventListener('keydown', handler);
    handler = null;
  }
  enabled = false;
}

export function getShortcutList() {
  return shortcuts.map(s => ({
    key: s.key,
    label: s.label,
  }));
}
