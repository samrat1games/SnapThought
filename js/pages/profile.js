import { el, clearElement, showLoader } from '../utils/dom.js';
import { getCurrentUser } from '../state.js';
import { getProfile, getUserStats } from '../services/users.js';
import { getRoleBadges } from '../constants.js';
import { getUserPosts } from '../services/posts.js';
import { toggleFollow, isFollowing } from '../services/follows.js';
import { renderAvatar } from '../components/avatar.js';
import { renderPostCard, renderPostSkeleton } from '../components/post-card.js';
import { uploadImage } from '../services/storage.js';
import { updateProfile } from '../services/users.js';
import { isBlocked, blockUser, unblockUser, isMuted, muteUser, unmuteUser } from '../services/blocks.js';
import { getPinnedPost } from '../services/posts.js';
import { getUserAchievements, getBadgeDefinitions } from '../services/achievements.js';
import { t } from '../i18n.js';

let observer = null;
let loading = false;
let hasMore = true;
let lastCursor = null;

export async function render(container, params) {
  const currentUser = getCurrentUser();
  const username = params.username;

  showLoader(container);

  try {
    let profile;
    try {
      profile = await getProfile(username);
    } catch {
      // Username not found - if this is the current user, use their profile
      if (currentUser && currentUser.username === username) {
        profile = currentUser;
      } else {
        throw new Error('User not found');
      }
    }
    const stats = await getUserStats(profile.id);
    const isOwn = currentUser && currentUser.id === profile.id;
    let following = false;
    let blocked = false;
    let muted = false;

    if (!isOwn && currentUser) {
      [following, blocked, muted] = await Promise.all([
        isFollowing(currentUser.id, profile.id),
        isBlocked(currentUser.id, profile.id),
        isMuted(currentUser.id, profile.id),
      ]);
    }

    clearElement(container);

    // Show blocked message
    if (blocked && !isOwn) {
      container.appendChild(el('div', { className: 'page-header' }, [
        el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } }, [
          el('button', {
            className: 'btn-ghost',
            innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            onClick: () => window.history.back(),
          }),
          el('h1', { className: 'page-header-title', textContent: 'Profile' }),
        ]),
      ]));
      container.appendChild(el('div', { className: 'empty-state' }, [
        el('h3', { textContent: 'You blocked this user', style: { marginBottom: '8px' } }),
        el('p', { textContent: 'You won\'t see their posts or be able to interact with them.' }),
      ]));
      return;
    }

    // Banner
    const banner = profile.cover_url
      ? el('img', { className: 'profile-banner', src: profile.cover_url, alt: 'Cover' })
      : el('div', { className: 'profile-banner' });

    // Header
    const header = el('div', { className: 'profile-header' }, [
      el('div', { className: 'profile-avatar-wrapper' }, [
        renderAvatar(profile, 'xl'),
      ]),
    ]);

    // Actions
    const actions = el('div', { className: 'profile-actions' });

    if (isOwn) {
      const editBtn = el('button', {
        className: 'btn btn-outline',
        textContent: t('editProfile'),
        onClick: () => openEditProfile(profile, container, username),
      });
      const settingsBtn = el('a', {
        href: '#/settings',
        className: 'btn btn-outline',
        textContent: 'Settings',
        style: { textDecoration: 'none' },
      });
      actions.appendChild(editBtn);
      actions.appendChild(settingsBtn);
    } else if (currentUser) {
      const followBtn = el('button', {
        className: `follow-btn ${following ? 'following' : 'follow'}`,
        textContent: following ? t('following') : t('follow'),
        onClick: async () => {
          following = await toggleFollow(currentUser.id, profile.id);
          followBtn.className = following ? 'follow-btn following' : 'follow-btn follow';
          followBtn.textContent = following ? t('following') : t('follow');
          const newStats = await getUserStats(profile.id);
          statsEl.querySelector('.followers-count').textContent = newStats.followers;
        },
      });
      actions.appendChild(followBtn);

      // Subscribe button (if creator has plans)
      import('../services/monetization.js').then(async ({ getCreatorPlans, isSubscribed }) => {
        const plans = await getCreatorPlans(profile.id);
        const subscribed = await isSubscribed(currentUser.id, profile.id);
        if (plans.length > 0) {
          const subscribeBtn = el('button', {
            className: 'btn',
            textContent: subscribed ? 'Subscribed' : 'Subscribe',
            style: {
              padding: '8px 20px', borderRadius: '9999px', fontWeight: '600', fontSize: '14px',
              background: subscribed ? '#10b981' : 'var(--accent)', color: 'white', border: 'none',
            },
            onClick: () => {
              openSubscribeModal(profile, plans);
            },
          });
          actions.appendChild(subscribeBtn);
        }
      });

      // More options (block/mute)
      const moreBtn = el('button', {
        className: 'btn btn-outline btn-sm',
        textContent: '\u2026',
        style: { padding: '6px 12px' },
        onClick: async (e) => {
          e.stopPropagation();
          const menu = el('div', {
            className: 'post-menu',
            style: { position: 'absolute', top: '100%', right: '0', zIndex: '200', background: 'var(--bg-primary)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)', minWidth: '160px', overflow: 'hidden' },
          }, [
            el('button', {
              className: 'dropdown-item',
              textContent: muted ? 'Unmute' : 'Mute',
              onClick: async () => {
                if (muted) {
                  await unmuteUser(currentUser.id, profile.id);
                } else {
                  await muteUser(currentUser.id, profile.id);
                }
                muted = !muted;
                menu.remove();
              },
            }),
            el('button', {
              className: 'dropdown-item',
              textContent: blocked ? 'Unblock' : 'Block',
              style: { color: blocked ? 'var(--text-primary)' : 'var(--danger)' },
              onClick: async () => {
                if (blocked) {
                  await unblockUser(currentUser.id, profile.id);
                } else {
                  await blockUser(currentUser.id, profile.id);
                }
                blocked = !blocked;
                menu.remove();
              },
            }),
          ]);

          document.body.appendChild(menu);
          setTimeout(() => {
            const close = (ev) => {
              if (!menu.contains(ev.target)) {
                menu.remove();
                document.removeEventListener('click', close);
              }
            };
            document.addEventListener('click', close);
          }, 0);
        },
      });
      actions.style.position = 'relative';
      actions.appendChild(moreBtn);
    }

    // Info
    const roleBadges = getRoleBadges(profile);
    const badgeElements = roleBadges.map(b => el('span', { innerHTML: b }));

    const info = el('div', {}, [
      el('div', { className: 'profile-name' }, [profile.display_name, ...badgeElements].filter(Boolean)),
      el('div', { className: 'profile-handle', textContent: '@' + profile.username }),
      profile.bio ? el('div', { className: 'profile-bio', textContent: profile.bio }) : null,
      profile.website ? el('div', { className: 'profile-meta' }, [
        el('span', { innerHTML: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M18.36 5.64c-1.95-1.96-5.11-1.96-7.07 0L9.88 7.05 8.46 5.64l1.42-1.42c2.73-2.73 7.16-2.73 9.9 0 2.73 2.74 2.73 7.17 0 9.9l-1.42 1.42-1.41-1.42 1.41-1.41c1.96-1.96 1.96-5.12 0-7.07zm-2.12 3.53l-7.07 7.07-1.41-1.41 7.07-7.07 1.41 1.41zm-4.95 7.78l-1.41 1.41c-1.96 1.96-5.12 1.96-7.07 0-1.96-1.95-1.96-5.11 0-7.07l1.41-1.41 1.42 1.41-1.42 1.42c-1.17 1.17-1.17 3.07 0 4.24 1.18 1.17 3.07 1.17 4.24 0l1.42-1.41 1.41 1.41z"/></svg>` }),
        el('a', { href: profile.website.startsWith('http') ? profile.website : 'https://' + profile.website, textContent: profile.website.replace(/^https?:\/\//, ''), target: '_blank' }),
      ]) : null,
      el('div', { className: 'profile-meta' }, [
        el('span', { textContent: `Joined ${new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` }),
      ]),
    ]);

    // Stats
    const statsEl = el('div', { className: 'profile-stats' }, [
      el('span', {}, [
        el('strong', { className: 'following-count', textContent: stats.following }),
        el('span', { textContent: ' ' + t('following') }),
      ]),
      el('span', {}, [
        el('strong', { className: 'followers-count', textContent: stats.followers }),
        el('span', { textContent: ' ' + t('followers') }),
      ]),
    ]);

    // Tabs
    const tabs = el('div', { className: 'tabs' }, [
      el('div', { className: 'tab active', textContent: t('posts'), dataset: { tab: 'posts' } }),
      el('div', { className: 'tab', textContent: 'Replies', dataset: { tab: 'replies' } }),
    ]);

    const postsContainer = el('div', { className: 'posts-container' });
    const sentinel = el('div');

    container.append(banner, header, actions, info, statsEl, tabs, postsContainer, sentinel);

    // Load achievements
    loadAchievements(container, profile.id);

    // Load posts
    loadUserPosts(postsContainer, profile.id, sentinel);

    // Tab switching
    tabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (!tab) return;
      tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      hasMore = true;
      lastCursor = null;
      postsContainer.innerHTML = '';
      loadUserPosts(postsContainer, profile.id, sentinel, tab.dataset.tab === 'replies');
    });

    // Infinite scroll
    observer = new IntersectionObserver(async ([entry]) => {
      if (entry.isIntersecting && !loading && hasMore) {
        loading = true;
        const activeTab = tabs.querySelector('.tab.active')?.dataset.tab || 'posts';
        const posts = await getUserPosts(profile.id, { limit: 20, cursor: lastCursor });
        const filtered = activeTab === 'replies'
          ? posts.filter(p => p.post_type === 'reply')
          : posts.filter(p => p.post_type === 'original');
        filtered.forEach(post => renderPostCard(postsContainer, post));
        lastCursor = posts[posts.length - 1]?.created_at;
        hasMore = posts.length === 20;
        loading = false;
      }
    }, { rootMargin: '200px' });

    observer.observe(sentinel);

  } catch (err) {
    console.error('Failed to load profile:', err);
    clearElement(container);
    container.appendChild(el('div', { className: 'error-message', textContent: 'User not found' }));
  }
}

async function loadUserPosts(container, userId, sentinel, replies = false) {
  showLoader(container);
  try {
    let posts = await getUserPosts(userId, { limit: 20 });

    // Show pinned post at top (only for original posts tab)
    if (!replies) {
      const pinned = await getPinnedPost(userId);
      if (pinned) {
        posts = posts.filter(p => p.id !== pinned.id);
        clearElement(container);
        renderPostCard(container, pinned);
        posts.forEach(post => renderPostCard(container, post));
        lastCursor = posts.length > 0 ? posts[posts.length - 1].created_at : pinned.created_at;
        hasMore = posts.length === 19; // 20 - 1 pinned
        return;
      }
    }

    if (replies) {
      posts = posts.filter(p => p.post_type === 'reply');
    }
    clearElement(container);
    if (posts.length === 0) {
      container.appendChild(el('div', { className: 'empty-state', textContent: 'No posts yet' }));
      return;
    }
    posts.forEach(post => renderPostCard(container, post));
    lastCursor = posts[posts.length - 1]?.created_at;
    hasMore = posts.length === 20;
  } catch (err) {
    console.error('Failed to load posts:', err);
  }
}

async function openEditProfile(profile, container, username) {
  const { openModal } = await import('../components/modal.js');

  const nameInput = el('input', { className: 'input', value: profile.display_name, placeholder: 'Display name' });
  const bioInput = el('textarea', { className: 'settings-textarea', value: profile.bio, placeholder: 'Bio', rows: '3' });
  const websiteInput = el('input', { className: 'input', value: profile.website, placeholder: 'Website' });

  let newAvatarUrl = profile.avatar_url;
  let newCoverUrl = profile.cover_url;

  const avatarPreview = renderAvatar({ ...profile, avatar_url: newAvatarUrl }, 'lg');
  const avatarInput = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
  avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      newAvatarUrl = await uploadImage('avatars', file, profile.id);
      avatarPreview.replaceWith(renderAvatar({ ...profile, avatar_url: newAvatarUrl }, 'lg'));
    }
  });

  const saveBtn = el('button', {
    className: 'btn btn-primary',
    textContent: 'Save',
    onClick: async () => {
      saveBtn.disabled = true;
      try {
        await updateProfile(profile.id, {
          display_name: nameInput.value.trim(),
          bio: bioInput.value.trim(),
          website: websiteInput.value.trim(),
          avatar_url: newAvatarUrl,
          cover_url: newCoverUrl,
        });
        modal.close();
        render(container, { username });
      } catch (err) {
        console.error('Failed to update profile:', err);
      }
      saveBtn.disabled = false;
    },
  });

  const content = el('div', { className: 'settings-form' }, [
    el('div', { className: 'settings-avatar-section' }, [
      el('div', { className: 'settings-avatar-upload', onClick: () => avatarInput.click() }, [
        avatarPreview,
        el('div', { className: 'settings-avatar-overlay', innerHTML: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="13" r="4" fill="none" stroke="currentColor" stroke-width="2"/></svg>' }),
        avatarInput,
      ]),
    ]),
    el('div', { className: 'input-group' }, [
      el('label', { className: 'input-label', textContent: 'Display name' }),
      nameInput,
    ]),
    el('div', { className: 'input-group' }, [
      el('label', { className: 'input-label', textContent: 'Bio' }),
      bioInput,
      el('div', { className: 'char-counter', textContent: `${bioInput.value.length}/160` }),
    ]),
    el('div', { className: 'input-group' }, [
      el('label', { className: 'input-label', textContent: 'Website' }),
      websiteInput,
    ]),
    saveBtn,
  ]);

  bioInput.addEventListener('input', () => {
    const counter = content.querySelector('.char-counter');
    if (counter) counter.textContent = `${bioInput.value.length}/160`;
  });

  const modal = openModal(content, { title: t('editProfile') });
}

async function loadAchievements(container, userId) {
  try {
    const [achievements, defs] = await Promise.all([
      getUserAchievements(userId),
      Promise.resolve(getBadgeDefinitions()),
    ]);

    if (achievements.length === 0) return;

    const section = el('div', { className: 'profile-achievements', style: { padding: '16px', borderBottom: '1px solid var(--border-color)' } }, [
      el('h3', { textContent: 'Achievements', style: { fontSize: '16px', fontWeight: '700', marginBottom: '12px' } }),
    ]);

    const grid = el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } });
    for (const ach of achievements) {
      const def = defs[ach.badge_type];
      if (!def) continue;
      const badge = el('div', { className: 'achievement-badge', title: def.description }, [
        el('span', { innerHTML: def.icon, style: { display: 'flex', alignItems: 'center', color: def.color || 'var(--accent)' } }),
        el('span', { textContent: def.name, style: { fontSize: '12px', fontWeight: '600' } }),
      ]);
      grid.appendChild(badge);
    }
    section.appendChild(grid);

    // Insert before tabs
    const tabsEl = container.querySelector('.tabs');
    if (tabsEl) {
      tabsEl.before(section);
    }
  } catch (err) {
    console.error('Failed to load achievements:', err);
  }
}

function openSubscribeModal(profile, plans) {
  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const overlay = el('div', { className: 'password-modal-overlay' });

  const planCards = plans.map(plan => {
    const btn = el('button', {
      className: 'btn btn-primary',
      textContent: 'Subscribe - $' + (plan.price_cents / 100).toFixed(2) + '/' + plan.interval,
      style: { width: '100%', marginTop: '8px', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600' },
      onClick: async () => {
        btn.disabled = true;
        btn.textContent = 'Subscribing...';
        try {
          const { subscribe } = await import('../services/monetization.js');
          await subscribe(currentUser.id, profile.id, plan.id);
          overlay.remove();
          const toast = el('div', {
            style: {
              position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
              background: '#10b981', color: 'white', padding: '12px 24px', borderRadius: '12px',
              fontWeight: '600', zIndex: '99999', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            },
            textContent: 'Subscribed to ' + profile.display_name + '!',
          });
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 3000);
        } catch (err) {
          alert(err.message || 'Failed to subscribe');
          btn.disabled = false;
          btn.textContent = 'Subscribe - $' + (plan.price_cents / 100).toFixed(2) + '/' + plan.interval;
        }
      },
    });

    return el('div', { style: { padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', marginBottom: '8px' } }, [
      el('div', { textContent: plan.name, style: { fontWeight: '700', fontSize: '16px' } }),
      el('div', { textContent: plan.description || 'No description', style: { color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' } }),
      btn,
    ]);
  });

  overlay.appendChild(el('div', { className: 'password-modal' }, [
    el('h2', { textContent: 'Subscribe to ' + profile.display_name }),
    el('p', { textContent: 'Get exclusive content and support this creator.' }),
    ...planCards,
    el('button', {
      className: 'btn btn-outline',
      textContent: 'Cancel',
      style: { width: '100%', marginTop: '8px' },
      onClick: () => overlay.remove(),
    }),
  ]));

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}

export function cleanup() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  loading = false;
  hasMore = true;
  lastCursor = null;
}
