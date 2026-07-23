import { el, clearElement, showLoader } from '../utils/dom.js';
import { getCurrentUser } from '../state.js';
import { getTrendingHashtags } from '../services/hashtags.js';
import { getTrendingPosts } from '../services/explore.js';
import { searchByHashtag } from '../services/hashtags.js';
import { renderPostCard } from '../components/post-card.js';

export async function render(container) {
  const user = getCurrentUser();
  if (!user) return;

  const header = el('div', { className: 'page-header' }, [
    el('h1', { className: 'page-header-title', textContent: 'Trends' }),
  ]);

  const hashtagsSection = el('div');
  const postsSection = el('div');

  container.append(header, hashtagsSection, postsSection);

  showLoader(hashtagsSection);
  showLoader(postsSection);

  try {
    const [hashtags, posts] = await Promise.all([
      getTrendingHashtags({ limit: 20 }),
      getTrendingPosts({ limit: 20 }),
    ]);

    // Hashtags
    clearElement(hashtagsSection);
    if (hashtags.length > 0) {
      const grid = el('div', { className: 'trending-tags', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px', padding: '16px' } });
      for (const h of hashtags) {
        const tagEl = el('div', { className: 'trending-tag', style: { padding: '12px', background: 'var(--bg-secondary)', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.15s' } }, [
          el('div', { className: 'trending-tag-name', style: { fontWeight: '700', fontSize: '15px', color: 'var(--accent)' }, textContent: h.tag }),
          el('div', { className: 'trending-tag-count', style: { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }, textContent: h.count + ' posts' }),
        ]);
        tagEl.addEventListener('click', async () => {
          clearElement(postsSection);
          showLoader(postsSection);
          const tagPosts = await searchByHashtag(h.tag);
          clearElement(postsSection);
          postsSection.appendChild(el('div', { className: 'page-header', style: { border: 'none', padding: '12px 16px' } }, [
            el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } }, [
              el('button', {
                className: 'btn-ghost',
                innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                onClick: () => render(container),
              }),
              el('h2', { textContent: h.tag, style: { fontSize: '18px', fontWeight: '700' } }),
              el('span', { textContent: h.count + ' posts', style: { color: 'var(--text-secondary)', fontSize: '14px' } }),
            ]),
          ]));
          if (tagPosts.length === 0) {
            postsSection.appendChild(el('div', { className: 'empty-state', textContent: 'No posts with this hashtag' }));
          } else {
            tagPosts.forEach(post => renderPostCard(postsSection, post));
          }
        });
        tagEl.addEventListener('mouseenter', () => { tagEl.style.background = 'var(--bg-hover)'; });
        tagEl.addEventListener('mouseleave', () => { tagEl.style.background = 'var(--bg-secondary)'; });
        grid.appendChild(tagEl);
      }
      hashtagsSection.appendChild(el('div', { className: 'page-header', style: { border: 'none' } }, [
        el('h2', { textContent: 'Trending hashtags', style: { fontSize: '18px', fontWeight: '700' } }),
      ]));
      hashtagsSection.appendChild(grid);
    } else {
      hashtagsSection.appendChild(el('div', { className: 'empty-state', textContent: 'No trending hashtags yet' }));
    }

    // Posts
    clearElement(postsSection);
    if (posts.length > 0) {
      postsSection.appendChild(el('div', { className: 'page-header', style: { border: 'none' } }, [
        el('h2', { textContent: 'Popular posts', style: { fontSize: '18px', fontWeight: '700' } }),
      ]));
      posts.forEach(post => renderPostCard(postsSection, post));
    } else {
      postsSection.appendChild(el('div', { className: 'empty-state', textContent: 'No posts yet' }));
    }
  } catch (err) {
    console.error('Failed to load trends:', err);
    clearElement(hashtagsSection);
    clearElement(postsSection);
    hashtagsSection.appendChild(el('div', { className: 'error-message', textContent: 'Failed to load trends' }));
  }
}

export function cleanup() {}
