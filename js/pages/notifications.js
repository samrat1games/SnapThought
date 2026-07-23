import { el, clearElement, showLoader } from '../utils/dom.js';
import { getCurrentUser } from '../state.js';
import { getNotifications, markAllRead } from '../services/notifications.js';
import { renderNotificationItem } from '../components/notification-item.js';

export async function render(container) {
  const user = getCurrentUser();
  if (!user) return;

  const markAllBtn = el('button', {
    className: 'mark-all-read-btn',
    textContent: 'Mark all as read',
    onClick: async () => {
      await markAllRead(user.id);
      container.querySelectorAll('.notification-item.unread').forEach(item => {
        item.classList.remove('unread');
      });
    },
  });

  const header = el('div', { className: 'page-header' }, [
    el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
      el('h1', { className: 'page-header-title', textContent: 'Notifications' }),
      markAllBtn,
    ]),
  ]);

  const list = el('div', { className: 'notifications-list' });

  container.append(header, list);

  showLoader(list);

  try {
    const notifications = await getNotifications();
    clearElement(list);

    if (notifications.length === 0) {
      list.appendChild(el('div', { className: 'empty-state', textContent: 'No notifications yet' }));
      return;
    }

    notifications.forEach(n => renderNotificationItem(list, n));
  } catch (err) {
    console.error('Failed to load notifications:', err);
    clearElement(list);
    list.appendChild(el('div', { className: 'error-message', textContent: 'Failed to load notifications' }));
  }
}

export function cleanup() {}
