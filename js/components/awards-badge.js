/**
 * Awards Badge Components
 */

export function createAwardBadge(award, size = 'md') {
  const div = document.createElement('div');
  div.className = `award-badge award-badge--${size} award-badge--${award.tier}`;
  div.style.borderColor = award.color;

  const iconWrap = document.createElement('div');
  iconWrap.className = 'award-badge__icon';
  iconWrap.style.color = award.color || 'var(--accent)';
  iconWrap.innerHTML = award.icon_url || getDefaultIcon();

  const info = document.createElement('div');
  info.className = 'award-badge__info';
  info.innerHTML = `
    <h4 class="award-badge__name">${award.name}</h4>
    <p class="award-badge__description">${award.description}</p>
    <span class="award-badge__tier">${(award.tier || '').toUpperCase()}</span>
  `;

  div.append(iconWrap, info);
  return div;
}

export function createAwardsShowcase(awards = []) {
  const div = document.createElement('div');
  div.className = 'awards-showcase';

  const byTier = {};
  awards.forEach(a => {
    const tier = a.tier || 'bronze';
    if (!byTier[tier]) byTier[tier] = [];
    byTier[tier].push(a);
  });

  const tiers = ['platinum', 'gold', 'silver', 'bronze'];
  const tierColors = { platinum: '#e5e7eb', gold: '#f59e0b', silver: '#94a3b8', bronze: '#cd7f32' };

  const header = document.createElement('div');
  header.className = 'awards-showcase__header';
  header.innerHTML = `<h3>Achievements</h3><span class="awards-showcase__count">${awards.length} awarded</span>`;
  div.appendChild(header);

  for (const tier of tiers) {
    const tierAwards = byTier[tier] || [];
    if (tierAwards.length === 0) continue;

    const tierSection = document.createElement('div');
    tierSection.className = 'awards-showcase__tier';

    const tierLabel = document.createElement('h4');
    tierLabel.className = 'awards-showcase__tier-label';
    tierLabel.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
    tierLabel.style.color = tierColors[tier] || 'var(--text-primary)';
    tierSection.appendChild(tierLabel);

    const items = document.createElement('div');
    items.className = 'awards-showcase__items';

    for (const award of tierAwards) {
      const item = document.createElement('div');
      item.className = 'awards-showcase__item';
      item.title = award.name;
      item.style.color = award.color || tierColors[tier];
      item.innerHTML = award.icon_url || getDefaultIcon();
      items.appendChild(item);
    }

    tierSection.appendChild(items);
    div.appendChild(tierSection);
  }

  if (awards.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'awards-showcase__empty';
    empty.textContent = 'No achievements yet';
    div.appendChild(empty);
  }

  return div;
}

export function createLeaderboardEntry(user, rank, awardCount) {
  const div = document.createElement('div');
  div.className = 'leaderboard-entry';

  if (rank <= 3) div.classList.add('leaderboard-entry--rank' + rank);

  const medals = [
    '<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="8" r="7" fill="#f59e0b" stroke="#d97706" stroke-width="1.5"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" fill="#f59e0b" stroke="#d97706" stroke-width="1.5"/></svg>',
    '<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="8" r="7" fill="#94a3b8" stroke="#64748b" stroke-width="1.5"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" fill="#94a3b8" stroke="#64748b" stroke-width="1.5"/></svg>',
    '<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="8" r="7" fill="#cd7f32" stroke="#a0522d" stroke-width="1.5"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" fill="#cd7f32" stroke="#a0522d" stroke-width="1.5"/></svg>',
  ];

  const rankEl = document.createElement('div');
  rankEl.className = 'leaderboard-entry__rank';
  rankEl.innerHTML = rank <= 3 ? medals[rank - 1] : `<span class="rank-number">#${rank}</span>`;

  const userEl = document.createElement('div');
  userEl.className = 'leaderboard-entry__user';
  userEl.innerHTML = `
    <img src="${user.avatar_url || ''}" alt="${user.username}" class="leaderboard-entry__avatar" onerror="this.style.display='none'">
    <div class="leaderboard-entry__info">
      <h4>${user.display_name}${user.is_verified ? ' <svg viewBox="0 0 22 22" width="16" height="16" style="vertical-align:middle"><path fill="#1d9bf0" d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.141.27.587.7 1.086 1.24 1.44.54.354 1.167.551 1.813.568.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.225 1.261.276 1.896.145.634-.131 1.218-.436 1.69-.882.445-.47.75-1.055.88-1.69.131-.634.084-1.29-.139-1.896.584-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/></svg>' : ''}</h4>
      <p>@${user.username}</p>
    </div>
  `;

  const awardsEl = document.createElement('div');
  awardsEl.className = 'leaderboard-entry__awards';
  awardsEl.innerHTML = `<span class="badge badge-primary">${awardCount} awards</span>`;

  div.append(rankEl, userEl, awardsEl);
  return div;
}

export function createProgressBar(current, target, label = '') {
  const div = document.createElement('div');
  div.className = 'progress-container';

  const percentage = Math.min((current / target) * 100, 100);
  const completed = current >= target;

  div.innerHTML = `
    <div class="progress-header">
      <span class="progress-label">${label}</span>
      <span class="progress-text">${current}/${target}</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${percentage}%; background: ${completed ? '#10b981' : 'var(--accent)'}"></div>
    </div>
    <span class="progress-status" style="color: ${completed ? '#10b981' : 'var(--text-secondary)'}">
      ${completed ? '<svg viewBox="0 0 24 24" width="14" height="14" style="vertical-align:middle"><polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Completed!' : `${target - current} to go`}
    </span>
  `;

  return div;
}

export function createAchievementCard(achievement, unlocked = false) {
  const div = document.createElement('div');
  div.className = `achievement-card ${unlocked ? 'achievement-card--unlocked' : 'achievement-card--locked'}`;

  const iconEl = document.createElement('div');
  iconEl.className = 'achievement-card__icon';
  if (unlocked) {
    iconEl.innerHTML = achievement.icon_url || getDefaultIcon();
    iconEl.style.color = achievement.color || 'var(--accent)';
  } else {
    iconEl.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    iconEl.style.color = 'var(--text-tertiary)';
  }

  const content = document.createElement('div');
  content.className = 'achievement-card__content';
  content.innerHTML = `
    <h4 class="achievement-card__title">${achievement.name}</h4>
    <p class="achievement-card__description">${achievement.description}</p>
  `;

  div.append(iconEl, content);

  if (unlocked) {
    const check = document.createElement('div');
    check.className = 'achievement-card__unlocked';
    check.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><polyline points="20 6 9 17 4 12" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    div.appendChild(check);
  }

  return div;
}

function getDefaultIcon() {
  return '<svg viewBox="0 0 24 24" width="24" height="24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
