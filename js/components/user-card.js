import { el } from '../utils/dom.js';
import { renderAvatar } from './avatar.js';
import { getCurrentUser } from '../state.js';
import { toggleFollow } from '../services/follows.js';
import { getRoleBadgesSm } from '../constants.js';

export function renderUserCard(container, user, isFollowingUser = false) {
  const currentUser = getCurrentUser();
  const isOwn = currentUser && currentUser.id === user.id;

  const followBtn = isOwn ? null : el('button', {
    className: `follow-btn ${isFollowingUser ? 'following' : 'follow'}`,
    textContent: isFollowingUser ? 'Following' : 'Follow',
    onClick: async (e) => {
      e.stopPropagation();
      if (!currentUser) return;
      const nowFollowing = await toggleFollow(currentUser.id, user.id);
      followBtn.className = nowFollowing ? 'follow-btn following' : 'follow-btn follow';
      followBtn.textContent = nowFollowing ? 'Following' : 'Follow';
    },
  });

  const roleBadges = getRoleBadgesSm(user);

  const card = el('div', { className: 'user-card' }, [
    renderAvatar(user, 'md'),
    el('div', { className: 'user-card-info' }, [
      el('div', { className: 'user-card-name' }, [user.display_name, ...roleBadges.map(b => el('span', { innerHTML: ' ' + b }))].filter(Boolean)),
      el('div', { className: 'user-card-handle', textContent: '@' + user.username }),
    ]),
    followBtn,
  ].filter(Boolean));

  card.addEventListener('click', () => {
    window.location.hash = `#/user/${user.username}`;
  });

  container.appendChild(card);
  return card;
}
