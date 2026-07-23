import { el, clearElement, showLoader } from '../utils/dom.js';
import { getCurrentUser } from '../state.js';
import { getTimeline, getFollowingFeed, getForYouFeed } from '../services/feed.js';
import { renderPostCard, renderPostSkeleton } from '../components/post-card.js';
import { renderStoriesBar } from '../components/stories-bar.js';
import { t } from '../i18n.js';

let loading = false;
let hasMore = true;
let lastCursor = null;
let observer = null;
let activeFeedType = 'for-you';
let feedLoaders = {
  'for-you': getForYouFeed,
  'following': getFollowingFeed,
  'latest': getTimeline,
};

export async function render(container) {
  const user = getCurrentUser();
  if (!user) return;

  // Only show header on desktop (mobile has compact-top-header)
  const isMobile = window.innerWidth <= 640;
  if (!isMobile) {
    const header = el('div', { className: 'page-header' }, [
      el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
        el('img', { src: 'icons/text-logo.png?v=1.6.0', style: { height: '28px', borderRadius: '6px' } }),
        el('h1', { className: 'page-header-title', textContent: t('home') }),
      ]),
    ]);
    container.appendChild(header);
  }

  // Feed tabs
  const feedTabs = el('div', { className: 'feed-tabs', style: { display: 'flex', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: '0', background: 'var(--bg-primary)', zIndex: '10' } });
  const tabDefs = [
    { id: 'for-you', labelKey: 'forYou' },
    { id: 'following', labelKey: 'followingTab' },
    { id: 'latest', labelKey: 'latest' },
  ];
  const tabBtns = [];

  for (const tabDef of tabDefs) {
    const btn = el('button', {
      className: 'feed-tab-btn' + (tabDef.id === activeFeedType ? ' active' : ''),
      textContent: t(tabDef.labelKey),
      style: {
        flex: '1', padding: '12px', fontSize: '14px', fontWeight: tabDef.id === activeFeedType ? '700' : '500',
        color: tabDef.id === activeFeedType ? 'var(--accent)' : 'var(--text-secondary)',
        background: 'none', border: 'none', borderBottom: tabDef.id === activeFeedType ? '2px solid var(--accent)' : '2px solid transparent',
        cursor: 'pointer', transition: 'all 0.15s',
      },
    });
    btn.addEventListener('click', () => {
      activeFeedType = tabDef.id;
      tabBtns.forEach(b => {
        b.style.fontWeight = '500';
        b.style.color = 'var(--text-secondary)';
        b.style.borderBottomColor = 'transparent';
        b.classList.remove('active');
      });
      btn.style.fontWeight = '700';
      btn.style.color = 'var(--accent)';
      btn.style.borderBottomColor = 'var(--accent)';
      btn.classList.add('active');
      // Reload feed
      hasMore = true;
      lastCursor = null;
      loadFeed(user, postsContainer, sentinel);
    });
    tabBtns.push(btn);
    feedTabs.appendChild(btn);
  }

  const newPostsBanner = el('div', { className: 'feed-new-posts', textContent: t('newPosts') });
  const storiesContainer = el('div', { className: 'feed-stories' });
  const postsContainer = el('div', { className: 'posts-container' });
  const sentinel = el('div', { className: 'feed-sentinel' });

  container.append(feedTabs, newPostsBanner, storiesContainer, postsContainer, sentinel);

  // Load stories + live streams
  renderStoriesBar(storiesContainer);
  renderLiveStreamsInFeed(storiesContainer);

  // Refresh stories when one is created
  const handleStoryUpdate = () => {
    storiesContainer.innerHTML = '';
    renderStoriesBar(storiesContainer);
  };
  window.addEventListener('stories-updated', handleStoryUpdate);

  // Show initial skeletons
  for (let i = 0; i < 3; i++) {
    renderPostSkeleton(postsContainer);
  }

  await loadFeed(user, postsContainer, sentinel);

  // Infinite scroll
  observer = new IntersectionObserver(async ([entry]) => {
    if (entry.isIntersecting && !loading && hasMore) {
      loading = true;
      try {
        const loader = feedLoaders[activeFeedType] || getTimeline;
        const posts = await loader(user.id, { limit: 20, cursor: lastCursor });
        posts.forEach(post => renderPostCard(postsContainer, post));
        lastCursor = posts[posts.length - 1]?.created_at;
        hasMore = posts.length === 20;
      } catch (err) {
        console.error('Failed to load more posts:', err);
      }
      loading = false;
    }
  }, { rootMargin: '200px' });

  observer.observe(sentinel);

  // Listen for new posts
  const handleNewPost = () => {
    lastCursor = null;
    hasMore = true;
    loadFeed(user, postsContainer, sentinel);
  };
  window.addEventListener('post-created', handleNewPost);

  return () => {
    window.removeEventListener('post-created', handleNewPost);
    window.removeEventListener('stories-updated', handleStoryUpdate);
  };
}

async function loadFeed(user, postsContainer, sentinel) {
  try {
    const loader = feedLoaders[activeFeedType] || getTimeline;
    const posts = await loader(user.id, { limit: 20 });
    postsContainer.innerHTML = '';

    if (posts.length === 0) {
      const emptyEl = el('div', { className: 'empty-state' }, [
        el('h2', { textContent: 'Welcome to SnapThought!', style: { marginBottom: '8px' } }),
        el('p', { textContent: activeFeedType === 'following' ? 'Follow some people to see their posts here.' : 'Be the first to post something!' }),
      ]);

      // Show who to follow suggestions
      try {
        const { getSuggestedUsers } = await import('../services/users.js');
        const { renderUserCard } = await import('../components/user-card.js');
        const suggested = await getSuggestedUsers(user.id, { limit: 5 });
        if (suggested.length > 0) {
          emptyEl.appendChild(el('div', { style: { marginTop: '24px', textAlign: 'left', width: '100%', maxWidth: '400px' } }, [
            el('h3', { textContent: t('whoToFollow'), style: { marginBottom: '12px', fontSize: '16px' } }),
          ]));
          const suggestionsList = emptyEl.querySelector('div');
          for (const s of suggested) {
            renderUserCard(suggestionsList, s);
          }
        }
      } catch (e) { /* ignore */ }

      postsContainer.appendChild(emptyEl);
      return;
    }

    posts.forEach(post => renderPostCard(postsContainer, post));
    lastCursor = posts[posts.length - 1]?.created_at;
    hasMore = posts.length === 20;
  } catch (err) {
    console.error('Failed to load feed:', err);
    postsContainer.innerHTML = '';
    postsContainer.appendChild(el('div', { className: 'error-message', textContent: t('error') + ': Failed to load feed' }));
  }
}

async function renderLiveStreamsInFeed(storiesContainer) {
  try {
    const { LiveStreamingService } = await import('../services/live-streaming.js');
    const { data: streams } = await LiveStreamingService.getActiveStreams(5);
    if (!streams || streams.length === 0) return;

    // Add a "Live" section before stories
    const liveSection = el('div', { style: { padding: '0 12px 8px', borderBottom: '1px solid var(--border-color)' } }, [
      el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' } }, [
        el('span', { style: { width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.5s infinite' } }),
        el('span', { textContent: t('live'), style: { fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' } }),
      ]),
    ]);

    const liveScroll = el('div', { style: { display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' } });

    for (const stream of streams) {
      const streamer = stream.streamer || {};
      const card = el('div', {
        style: {
          flexShrink: '0', width: '64px', textAlign: 'center', cursor: 'pointer',
        },
        onClick: () => { window.location.hash = '#/live/' + stream.id; },
      }, [
        el('div', { style: {
          width: '60px', height: '60px', borderRadius: '50%', padding: '3px',
          background: 'linear-gradient(45deg, #ef4444, #f97316)', marginBottom: '4px',
        }}, [
          el('div', { style: {
            width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
            border: '3px solid var(--bg-primary)', background: 'var(--bg-tertiary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: 'white',
          } }, [
            streamer.avatar_url
              ? el('img', { src: streamer.avatar_url, style: { width: '100%', height: '100%', objectFit: 'cover' } })
              : el('span', { textContent: (streamer.display_name || '?')[0] }),
          ]),
        ]),
        el('div', { style: { fontSize: '10px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, [
          el('span', { textContent: stream.title || streamer.display_name || 'Live' }),
        ]),
      ]);
      liveScroll.appendChild(card);
    }

    liveSection.appendChild(liveScroll);

    // Insert live section before stories
    storiesContainer.parentNode.insertBefore(liveSection, storiesContainer);
  } catch (err) {
    console.error('Failed to load live streams:', err);
  }
}

export function cleanup() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  hasMore = true;
  lastCursor = null;
  loading = false;
}
