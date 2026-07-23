/**
 * Awards & Achievements Page
 */

import { getCurrentUserId } from '../supabase.js';
import { AwardsService } from '../services/awards-enhanced.js';
import { createAwardsShowcase, createLeaderboardEntry, createProgressBar, createAchievementCard } from '../components/awards-badge.js';
import { el, clearElement } from '../utils/dom.js';

export async function render(container, params = {}) {
  const currentUserId = await getCurrentUserId();

  clearElement(container);

  container.appendChild(el('div', { className: 'awards-page' }, [
    el('div', { className: 'awards-header' }, [
      el('h1', { textContent: '🏆 Achievements & Awards' }),
      el('div', { className: 'awards-nav', id: 'awardsTabs' }, [
        el('button', { className: 'tab tab--active', dataset: { tab: 'my-awards' }, textContent: 'My Awards' }),
        el('button', { className: 'tab', dataset: { tab: 'progress' }, textContent: 'Progress' }),
        el('button', { className: 'tab', dataset: { tab: 'leaderboard' }, textContent: 'Leaderboard' }),
        el('button', { className: 'tab', dataset: { tab: 'all-awards' }, textContent: 'All Awards' })
      ])
    ]),
    el('div', { className: 'awards-content' }, [
      el('div', { className: 'tab-content tab-content--active', id: 'my-awardsTab' }, [
        el('div', { id: 'myAwards', className: 'awards-container' }, [
          el('div', { className: 'loading', textContent: 'Loading your awards...' })
        ])
      ]),
      el('div', { className: 'tab-content', id: 'progressTab' }, [
        el('div', { id: 'progressContainer', className: 'progress-container' }, [
          el('div', { className: 'loading', textContent: 'Loading progress...' })
        ])
      ]),
      el('div', { className: 'tab-content', id: 'leaderboardTab' }, [
        el('div', { id: 'leaderboard', className: 'leaderboard' }, [
          el('div', { className: 'loading', textContent: 'Loading leaderboard...' })
        ])
      ]),
      el('div', { className: 'tab-content', id: 'all-awardsTab' }, [
        el('div', { id: 'allAwards', className: 'awards-grid' }, [
          el('div', { className: 'loading', textContent: 'Loading awards...' })
        ])
      ])
    ])
  ]));

  // Setup tabs
  setupTabs();

  // Load data
  if (currentUserId) {
    await loadMyAwards(currentUserId);
    await loadProgress(currentUserId);
  }
  await loadLeaderboard();
  await loadAllAwards();
}

async function loadMyAwards(userId) {
  try {
    const awards = await AwardsService.getUserAwards(userId);
    const container = document.getElementById('myAwards');
    if (!container) return;

    if (!awards || awards.length === 0) {
      container.innerHTML = '<p class="empty-state">No awards yet. Keep grinding! 💪</p>';
      return;
    }

    const showcase = createAwardsShowcase(awards);
    clearElement(container);
    container.appendChild(showcase);
  } catch (error) {
    const container = document.getElementById('myAwards');
    if (container) container.innerHTML = `<p class="error">Error loading awards: ${error.message}</p>`;
  }
}

async function loadProgress(userId) {
  try {
    const progress = await AwardsService.getAchievementProgress(userId);
    const container = document.getElementById('progressContainer');
    if (!container) return;

    const progressBars = [
      { label: 'Posts', current: progress.posts, target: 100 },
      { label: 'Likes Received', current: progress.likes, target: 1000 },
      { label: 'Followers', current: progress.followers, target: 10000 }
    ];

    clearElement(container);
    progressBars.forEach(bar => {
      const element = createProgressBar(bar.current, bar.target, bar.label);
      container.appendChild(element);
    });

    // Add achievements
    const achievementsDiv = el('div', { className: 'achievements-list' }, [
      el('h3', { textContent: 'Achievement Goals' })
    ]);

    const achievements = [
      { name: 'Content King', description: 'Create 100 posts', icon_url: '<svg viewBox="0 0 24 24" width="24" height="24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>', color: '#FFD700', unlocked: progress.achievements['100_posts'] },
      { name: 'Engagement Master', description: 'Get 1000 likes', icon_url: '<svg viewBox="0 0 24 24" width="24" height="24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="#C0C0C0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>', color: '#C0C0C0', unlocked: progress.achievements['1000_likes'] },
      { name: 'Influencer', description: 'Reach 10k followers', icon_url: '<svg viewBox="0 0 24 24" width="24" height="24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="#E5E4E2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>', color: '#E5E4E2', unlocked: progress.achievements['10k_followers'] }
    ];

    achievements.forEach(achievement => {
      const card = createAchievementCard(achievement, achievement.unlocked);
      achievementsDiv.appendChild(card);
    });

    container.appendChild(achievementsDiv);
  } catch (error) {
    const container = document.getElementById('progressContainer');
    if (container) container.innerHTML = `<p class="error">Error loading progress: ${error.message}</p>`;
  }
}

async function loadLeaderboard() {
  try {
    const leaderboard = await AwardsService.getLeaderboard(null, 20);
    const container = document.getElementById('leaderboard');
    if (!container) return;

    if (!leaderboard || leaderboard.length === 0) {
      container.innerHTML = '<p class="empty-state">Leaderboard is empty</p>';
      return;
    }

    clearElement(container);
    leaderboard.forEach((entry, index) => {
      const element = createLeaderboardEntry(entry.user, index + 1, entry.awardCount);
      container.appendChild(element);
    });
  } catch (error) {
    const container = document.getElementById('leaderboard');
    if (container) container.innerHTML = `<p class="error">Error loading leaderboard: ${error.message}</p>`;
  }
}

async function loadAllAwards() {
  try {
    const awards = await AwardsService.getAllAwards();
    const container = document.getElementById('allAwards');
    if (!container) return;

    if (!awards || awards.length === 0) {
      container.innerHTML = '<p class="empty-state">No awards available</p>';
      return;
    }

    clearElement(container);
    awards.forEach(award => {
      const badge = el('div', { className: 'award-badge award-badge--' + award.tier, style: { borderColor: award.color } }, [
        el('div', { className: 'award-badge__icon', innerHTML: award.icon_url || '<svg viewBox="0 0 24 24" width="24" height="24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>', style: { color: award.color || 'var(--accent)' } }),
        el('div', { className: 'award-badge__info' }, [
          el('h4', { className: 'award-badge__name', textContent: award.name }),
          el('p', { className: 'award-badge__description', textContent: award.description }),
          el('span', { className: 'award-badge__tier', textContent: (award.tier || '').toUpperCase() })
        ])
      ]);
      container.appendChild(badge);
    });
  } catch (error) {
    const container = document.getElementById('allAwards');
    if (container) container.innerHTML = `<p class="error">Error loading awards: ${error.message}</p>`;
  }
}

function setupTabs() {
  const tabs = document.querySelectorAll('.awards-nav .tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('tab--active'));
      contents.forEach(c => c.classList.remove('tab-content--active'));

      tab.classList.add('tab--active');
      const tabName = tab.dataset.tab;
      const tabElement = document.querySelector(`#${tabName}Tab`);
      if (tabElement) tabElement.classList.add('tab-content--active');
    });
  });
}
