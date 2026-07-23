const state = {
  currentUser: null,
  currentProfile: null,
  theme: localStorage.getItem('snapthought-theme') || 'dark',
};

const listeners = new Map();

export function getState() {
  return state;
}

export function setCurrentUser(user) {
  state.currentUser = user;
  emit('userChanged', user);
}

export function getCurrentUser() {
  return state.currentUser;
}

export function setTheme(theme) {
  state.theme = theme;
  localStorage.setItem('snapthought-theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff');
  emit('themeChanged', theme);
}

export function getTheme() {
  return state.theme;
}

export function on(event, callback) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(callback);
  return () => listeners.get(event).delete(callback);
}

function emit(event, data) {
  listeners.get(event)?.forEach(cb => cb(data));
}
