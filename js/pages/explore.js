import { el, clearElement, showLoader } from '../utils/dom.js';
import { getCurrentUser } from '../state.js';
import { getSuggestedUsers } from '../services/users.js';
import { getTrendingHashtags } from '../services/hashtags.js';
import { getTrendingPosts } from '../services/explore.js';
import { renderUserCard } from '../components/user-card.js';
import { renderPostCard } from '../components/post-card.js';

let searchTimeout = null;

export async function render(container) {
  const user = getCurrentUser();
  if (!user) return;

  const header = el('div', { className: 'page-header' }, [
    el('h1', { className: 'page-header-title', textContent: 'Explore' }),
  ]);

  const searchInput = el('input', {
    className: 'input',
    type: 'text',
    placeholder: 'Search users or posts...',
  });

  const searchResults = el('div', { className: 'explore-search-results', style: { display: 'none' } });

  const trendingSection = el('div', { className: 'explore-section' });
  const suggestedSection = el('div', { className: 'explore-section' });
  const trendingPostsSection = el('div', { className: 'explore-section' });

  container.append(
    header,
    el('div', { style: { padding: '12px 16px' } }, [searchInput]),
    searchResults,
    trendingSection,
    suggestedSection,
    trendingPostsSection,
  );

  // Search handler
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const q = searchInput.value.trim();
      if (!q) {
        searchResults.style.display = 'none';
        trendingSection.style.display = '';
        suggestedSection.style.display = '';
        trendingPostsSection.style.display = '';
        return;
      }
      doSearch(q, searchResults, trendingSection, suggestedSection, trendingPostsSection);
    }, 300);
  });

  // Load trending + suggestions in parallel
  loadContent(trendingSection, suggestedSection, trendingPostsSection, user);
}

async function loadContent(trendingSection, suggestedSection, trendingPostsSection, user) {
  showLoader(trendingSection);
  showLoader(suggestedSection);

  try {
    const [hashtags, suggested, trendingPosts] = await Promise.all([
      getTrendingHashtags({ limit: 10 }).catch(() => []),
      getSuggestedUsers(user.id, { limit: 8 }),
      getTrendingPosts({ limit: 10 }),
    ]);

    // Trending hashtags
    clearElement(trendingSection);
    if (hashtags.length > 0) {
      trendingSection.appendChild(el('div', { className: 'explore-section-header' }, [
        el('h2', { className: 'explore-section-title', textContent: 'Trending' }),
      ]));

      const tagList = el('div', { className: 'trending-tags', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' } });
      for (const h of hashtags) {
        const tagEl = el('div', { className: 'trending-tag' }, [
          el('span', { className: 'trending-tag-name', textContent: h.tag }),
          el('span', { className: 'trending-tag-count', textContent: h.count + ' posts' }),
        ]);
        tagEl.addEventListener('click', () => {
          window.location.hash = '#/search?q=' + encodeURIComponent(h.tag);
        });
        tagList.appendChild(tagEl);
      }
      trendingSection.appendChild(tagList);
    } else {
      trendingSection.appendChild(el('div', { className: 'empty-state', textContent: 'No trending hashtags yet' }));
    }

    // Suggested users
    clearElement(suggestedSection);
    if (suggested.length > 0) {
      suggestedSection.appendChild(el('div', { className: 'explore-section-header' }, [
        el('h2', { className: 'explore-section-title', textContent: 'Who to follow' }),
      ]));

      const userList = el('div', { className: 'explore-users-list' });
      for (const u of suggested) {
        renderUserCard(userList, u);
      }
      suggestedSection.appendChild(userList);
    } else {
      suggestedSection.appendChild(el('div', { className: 'empty-state', textContent: 'No suggestions right now' }));
    }

    // Trending posts
    clearElement(trendingPostsSection);
    if (trendingPosts.length > 0) {
      trendingPostsSection.appendChild(el('div', { className: 'explore-section-header' }, [
        el('h2', { className: 'explore-section-title', textContent: 'Popular posts' }),
      ]));

      const postsList = el('div', { className: 'explore-posts-list' });
      for (const post of trendingPosts) {
        renderPostCard(postsList, post);
      }
      trendingPostsSection.appendChild(postsList);
    } else {
      trendingPostsSection.appendChild(el('div', { className: 'empty-state', textContent: 'No posts yet' }));
    }
  } catch (err) {
    console.error('Failed to load explore:', err);
    clearElement(trendingSection);
    clearElement(suggestedSection);
    clearElement(trendingPostsSection);
    trendingSection.appendChild(el('div', { className: 'error-message', textContent: 'Failed to load explore' }));
  }
}

async function doSearch(query, searchResults, trendingSection, suggestedSection, trendingPostsSection) {
  // Hide other sections, show search results
  trendingSection.style.display = 'none';
  suggestedSection.style.display = 'none';
  trendingPostsSection.style.display = 'none';
  searchResults.style.display = '';

  clearElement(searchResults);
  showLoader(searchResults);

  try {
    const { searchUsers } = await import('../services/users.js');
    const { searchPosts } = await import('../services/posts.js');

    const [users, posts] = await Promise.all([
      searchUsers(query, { limit: 5 }),
      searchPosts(query, { limit: 10 }),
    ]);

    clearElement(searchResults);

    if (users.length === 0 && posts.length === 0) {
      searchResults.appendChild(el('div', { className: 'empty-state', textContent: 'No results found' }));
      return;
    }

    if (users.length > 0) {
      searchResults.appendChild(el('div', { className: 'explore-section-header' }, [
        el('h2', { className: 'explore-section-title', textContent: 'People' }),
      ]));
      const userList = el('div', { className: 'explore-users-list' });
      for (const u of users) {
        renderUserCard(userList, u);
      }
      searchResults.appendChild(userList);
    }

    if (posts.length > 0) {
      searchResults.appendChild(el('div', { className: 'explore-section-header' }, [
        el('h2', { className: 'explore-section-title', textContent: 'Posts' }),
      ]));
      const postsList = el('div', { className: 'explore-posts-list' });
      for (const post of posts) {
        renderPostCard(postsList, post);
      }
      searchResults.appendChild(postsList);
    }
  } catch (err) {
    console.error('Search failed:', err);
    clearElement(searchResults);
    searchResults.appendChild(el('div', { className: 'error-message', textContent: 'Search failed' }));
  }
}

export function cleanup() {
  clearTimeout(searchTimeout);
}
