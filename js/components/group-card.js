/**
 * Group Card Component
 */

export function createGroupCard(group, onJoin = null) {
  const div = document.createElement('div');
  div.className = 'group-card';
  div.innerHTML = `
    <div class="group-card__header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
      ${group.cover_url ? `<img src="${group.cover_url}" alt="${group.name}" class="group-card__cover">` : ''}
    </div>
    <div class="group-card__content">
      <div class="group-card__icon">
        ${group.icon_url ? `<img src="${group.icon_url}" alt="${group.name}">` : `<span>${group.name.charAt(0)}</span>`}
      </div>
      <h3 class="group-card__title">${group.name}${group.is_verified ? ' ✓' : ''}</h3>
      <p class="group-card__description">${group.description || 'No description'}</p>
      
      <div class="group-card__meta">
        <span class="group-card__members">👥 ${group.members_count} members</span>
        <span class="group-card__private">${group.is_private ? '🔒 Private' : '🌐 Public'}</span>
      </div>

      <div class="group-card__creator">
        <img src="${group.creator.avatar_url || '/assets/default-avatar.png'}" alt="${group.creator.username}" class="group-card__creator-avatar">
        <span>Created by <strong>${group.creator.display_name}</strong></span>
      </div>

      <button class="group-card__button btn btn-primary" onclick="window.location.hash = '#group/${group.id}'">
        View Group
      </button>
    </div>
  `;

  if (onJoin) {
    const joinBtn = document.createElement('button');
    joinBtn.className = 'group-card__join btn btn-secondary';
    joinBtn.textContent = 'Join';
    joinBtn.onclick = onJoin;
    div.querySelector('.group-card__content').appendChild(joinBtn);
  }

  return div;
}

export function createGroupSidebar(group, members) {
  const div = document.createElement('div');
  div.className = 'group-sidebar';
  div.innerHTML = `
    <div class="group-sidebar__header">
      <h3>${group.name}</h3>
      ${group.is_verified ? '<span class="badge badge-verified">✓ Verified</span>' : ''}
    </div>

    <div class="group-sidebar__info">
      <p class="group-sidebar__description">${group.description}</p>
      
      ${group.rules ? `
        <div class="group-sidebar__rules">
          <h4>Rules</h4>
          <p>${group.rules}</p>
        </div>
      ` : ''}
    </div>

    <div class="group-sidebar__stats">
      <div class="stat">
        <span class="stat__label">Members</span>
        <span class="stat__value">${group.members_count}</span>
      </div>
      <div class="stat">
        <span class="stat__label">Type</span>
        <span class="stat__value">${group.is_private ? 'Private' : 'Public'}</span>
      </div>
    </div>

    <div class="group-sidebar__members">
      <h4>Recent Members</h4>
      <div class="group-sidebar__members-list">
        ${members?.slice(0, 5).map(m => `
          <div class="group-member-item">
            <img src="${m.avatar_url || '/assets/default-avatar.png'}" alt="${m.username}" class="group-member-item__avatar">
            <span class="group-member-item__name">${m.display_name}</span>
          </div>
        `).join('') || '<p>No members yet</p>'}
      </div>
    </div>
  `;

  return div;
}
