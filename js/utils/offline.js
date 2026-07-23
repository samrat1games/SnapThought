const DB_NAME = 'snapthought-offline';
const DB_VERSION = 1;
const STORES = {
  posts: 'posts',
  draftQueue: 'draftQueue',
};

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORES.posts)) {
        db.createObjectStore(STORES.posts, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.draftQueue)) {
        db.createObjectStore(STORES.draftQueue, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cachePosts(posts) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.posts, 'readwrite');
    const store = tx.objectStore(STORES.posts);
    for (const post of posts) {
      store.put(post);
    }
    return new Promise((resolve) => { tx.oncomplete = resolve; });
  } catch (err) {
    console.warn('Failed to cache posts:', err);
  }
}

export async function getCachedPosts() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.posts, 'readonly');
    const store = tx.objectStore(STORES.posts);
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function queueOfflineAction(action) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.draftQueue, 'readwrite');
    const store = tx.objectStore(STORES.draftQueue);
    store.add({ ...action, queuedAt: Date.now() });
    return new Promise((resolve) => { tx.oncomplete = resolve; });
  } catch (err) {
    console.warn('Failed to queue action:', err);
  }
}

export async function getQueuedActions() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.draftQueue, 'readonly');
    const store = tx.objectStore(STORES.draftQueue);
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function clearQueuedActions() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.draftQueue, 'readwrite');
    const store = tx.objectStore(STORES.draftQueue);
    store.clear();
    return new Promise((resolve) => { tx.oncomplete = resolve; });
  } catch (err) {
    console.warn('Failed to clear queue:', err);
  }
}

export function isOnline() {
  return navigator.onLine;
}

export function showOfflineBanner() {
  if (document.getElementById('offline-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'offline-banner';
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:var(--danger);color:#fff;text-align:center;padding:8px;font-size:14px;font-weight:600;';
  banner.textContent = 'You are offline. Some features may be limited.';
  document.body.appendChild(banner);
}

export function hideOfflineBanner() {
  const banner = document.getElementById('offline-banner');
  if (banner) banner.remove();
}

export function initOfflineDetection() {
  window.addEventListener('online', hideOfflineBanner);
  window.addEventListener('offline', showOfflineBanner);
  if (!navigator.onLine) showOfflineBanner();
}
