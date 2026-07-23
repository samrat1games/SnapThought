import { el, clearElement, showLoader } from '../utils/dom.js';
import { searchUsers } from '../services/users.js';
import { searchPosts } from '../services/posts.js';
import { renderUserCard } from '../components/user-card.js';
import { renderPostCard } from '../components/post-card.js';

let searchTimeout = null;

export async function render(container, params) {
  const initialQuery = params.q || '';

  const header = el('div', { className: 'page-header' }, [
    el('h1', { className: 'page-header-title', textContent: 'Search' }),
  ]);

  const searchInput = el('input', {
    className: 'input',
    type: 'text',
    placeholder: 'Search users or posts...',
    value: initialQuery,
  });

  const tabs = el('div', { className: 'tabs search-tabs' }, [
    el('div', { className: 'tab active', textContent: 'People', dataset: { tab: 'people' } }),
    el('div', { className: 'tab', textContent: 'Posts', dataset: { tab: 'posts' } }),
  ]);

  const resultsContainer = el('div', { className: 'search-results' });

  container.append(header, el('div', { style: { padding: '12px 16px' } }, [searchInput]), tabs, resultsContainer);

  let activeTab = 'people';

  async function doSearch(query) {
    if (!query.trim()) {
      resultsContainer.innerHTML = '';
      resultsContainer.appendChild(el('div', { className: 'empty-state', textContent: 'Search for users or posts' }));
      return;
    }

    showLoader(resultsContainer);

    try {
      if (activeTab === 'people') {
        const users = await searchUsers(query);
        resultsContainer.innerHTML = '';
        if (users.length === 0) {
          resultsContainer.appendChild(el('div', { className: 'empty-state', textContent: 'No users found' }));
          return;
        }
        users.forEach(user => renderUserCard(resultsContainer, user));
      } else {
        const posts = await searchPosts(query);
        resultsContainer.innerHTML = '';
        if (posts.length === 0) {
          resultsContainer.appendChild(el('div', { className: 'empty-state', textContent: 'No posts found' }));
          return;
        }
        posts.forEach(post => renderPostCard(resultsContainer, post));
      }
    } catch (err) {
      console.error('Search failed:', err);
      resultsContainer.innerHTML = '';
      resultsContainer.appendChild(el('div', { className: 'error-message', textContent: 'Search failed' }));
    }
  }

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      doSearch(searchInput.value);
      const q = encodeURIComponent(searchInput.value);
      history.replaceState(null, '', `#/search?q=${q}`);
    }, 300);
  });

  tabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeTab = tab.dataset.tab;
    doSearch(searchInput.value);
  });

  if (initialQuery) {
    doSearch(initialQuery);
  }
}

export function cleanup() {
  clearTimeout(searchTimeout);
}
