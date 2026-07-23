import { el } from '../utils/dom.js';
import { timeAgo } from '../utils/time.js';
import { renderAvatar } from './avatar.js';
import { getRoleBadgesSm } from '../constants.js';

const TYPE_CONFIG = {
  like: {
    icon: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>',
    class: 'like',
    text: 'liked your post',
  },
  follow: {
    icon: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM20 8v6M23 11h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    class: 'follow',
    text: 'followed you',
  },
  repost: {
    icon: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M17 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 13v2a4 4 0 0 1-4 4H3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    class: 'repost',
    text: 'reposted your post',
  },
  comment: {
    icon: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    class: 'comment',
    text: 'replied to your post',
  },
};

export function renderNotificationItem(container, notification) {
  const config = TYPE_CONFIG[notification.type];
  if (!config) return;

  const actor = notification.actor;
  const item = el('div', {
    className: `notification-item ${notification.is_read ? '' : 'unread'}`,
    dataset: { id: notification.id },
  }, [
    el('div', { className: `notification-icon ${config.class}`, innerHTML: config.icon }),
    el('div', { className: 'notification-body' }, [
      el('div', { className: 'notification-text' }, [
        el('span', {}, [renderAvatar(actor, 'sm')]),
        el('strong', { textContent: ' ' + (actor.display_name || actor.username) }),
        ...getRoleBadgesSm(actor).map(b => el('span', { innerHTML: ' ' + b })),
        el('span', { textContent: ' ' + config.text }),
      ]),
      notification.post?.content
        ? el('div', { className: 'notification-content-preview', textContent: notification.post.content.substring(0, 100) })
        : null,
      el('div', { className: 'notification-time', textContent: timeAgo(notification.created_at) }),
    ].filter(Boolean)),
  ].filter(Boolean));

  item.addEventListener('click', () => {
    if (notification.type === 'follow') {
      window.location.hash = `#/user/${actor.username}`;
    } else if (notification.post_id) {
      window.location.hash = `#/post/${notification.post_id}`;
    }
  });

  container.appendChild(item);
  return item;
}
