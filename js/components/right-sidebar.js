import { el, clearElement } from '../utils/dom.js';
import { getCurrentUser } from '../state.js';
import { getSuggestedUsers } from '../services/users.js';
import { renderAvatar } from './avatar.js';
import { toggleFollow, isFollowing } from '../services/follows.js';
import { getTrendingHashtags } from '../services/hashtags.js';
import { t } from '../i18n.js';

export async function renderRightSidebar(container) {
  clearElement(container);

  const searchWrapper = el('div', { className: 'right-sidebar-search' }, [
    el('div', { className: 'search-input-wrapper' }, [
      el('span', { innerHTML: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z"/></svg>` }),
      el('input', {
        className: 'search-input',
        type: 'text',
        placeholder: t('searchPlaceholder'),
        onKeydown: (e) => {
          if (e.key === 'Enter' && e.target.value.trim()) {
            window.location.hash = `#/search?q=${encodeURIComponent(e.target.value.trim())}`;
          }
        },
      }),
    ]),
  ]);

  container.appendChild(searchWrapper);

  const user = getCurrentUser();
  if (!user) return;

  // Trending hashtags widget
  try {
    const hashtags = await getTrendingHashtags({ limit: 5 });
    if (hashtags.length > 0) {
      const trendingWidget = el('div', { className: 'widget' }, [
        el('div', { className: 'widget-header', textContent: t('trendsTitle') }),
      ]);

      for (const h of hashtags) {
        const item = el('div', { className: 'widget-item', onClick: () => {
          window.location.hash = `#/search?q=${encodeURIComponent(h.tag)}`;
        }}, [
          el('div', { className: 'widget-item-title', textContent: h.tag }),
          el('div', { className: 'widget-item-subtitle', textContent: h.count + ' posts' }),
        ]);
        trendingWidget.appendChild(item);
      }

      trendingWidget.appendChild(el('div', { style: { padding: '8px 16px' } }, [
        el('a', { href: '#/trends', textContent: 'Show more', style: { fontSize: '14px' } }),
      ]));

      container.appendChild(trendingWidget);
    }
  } catch (err) {
    console.error('Failed to load trends:', err);
  }

  // Who to follow widget
  try {
    const suggested = await getSuggestedUsers(user.id, { limit: 5 });

    if (suggested.length > 0) {
      const whoToFollow = el('div', { className: 'widget' }, [
        el('div', { className: 'widget-header', textContent: t('whoToFollow') }),
      ]);

      for (const suggestion of suggested) {
        const followBtn = el('button', {
          className: 'follow-btn follow',
          textContent: t('follow'),
          onClick: async (e) => {
            e.stopPropagation();
            const isNowFollowing = await toggleFollow(user.id, suggestion.id);
            followBtn.className = isNowFollowing ? 'follow-btn following' : 'follow-btn follow';
            followBtn.textContent = isNowFollowing ? t('following') : t('follow');
          },
        });

        const card = el('div', { className: 'user-card' }, [
          renderAvatar(suggestion, 'md'),
          el('div', { className: 'user-card-info' }, [
            el('div', { className: 'user-card-name', textContent: suggestion.display_name }),
            el('div', { className: 'user-card-handle', textContent: '@' + suggestion.username }),
          ]),
          followBtn,
        ]);

        card.addEventListener('click', () => {
          window.location.hash = `#/user/${suggestion.username}`;
        });

        whoToFollow.appendChild(card);
      }

      container.appendChild(whoToFollow);
    }
  } catch (err) {
    console.error('Failed to load suggestions:', err);
  }
}
