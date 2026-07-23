import { getTheme, setTheme } from './state.js';

export function initTheme() {
  const saved = localStorage.getItem('snapthought-theme') || 'dark';
  setTheme(saved);
}

export function toggleTheme() {
  const current = getTheme();
  setTheme(current === 'dark' ? 'light' : 'dark');
}
