import { el, clearElement, showLoader } from '../utils/dom.js';
import { getCurrentUser } from '../state.js';
import { getShortVs, createShortV, deleteShortV, toggleShortVLike, isShortVLiked, getShortVComments, addShortVComment, incrementViews } from '../services/shortvs.js';
import { uploadImage } from '../services/storage.js';
import { renderAvatar } from '../components/avatar.js';
import { timeAgo, formatNumber } from '../utils/time.js';

let currentIndex = 0;
let shortvs = [];
let container = null;
let isAnimating = false;
let isMobile = false;

function checkMobile() {
  isMobile = window.innerWidth <= 640;
}

export async function render(c) {
  const user = getCurrentUser();
  if (!user) return;

  container = c;
  clearElement(container);
  checkMobile();

  const feed = el('div', { id: 'shortvs-feed' });
  feed.className = isMobile ? 'shortvs-feed-mobile' : 'shortvs-feed-desktop';

  // Header for both modes
  if (isMobile) {
    // Mobile: minimal header (absolute positioned over feed)
    const header = el('div', { className: 'shortvs-mobile-header' }, [
      el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } }, [
        el('button', {
          className: 'shortvs-create-btn-mobile',
          innerHTML: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
          onClick: () => { window.location.hash = '#/'; },
        }),
        el('span', { className: 'shortvs-mobile-title', textContent: 'ShortV' }),
      ]),
      el('button', {
        className: 'shortvs-create-btn-mobile',
        innerHTML: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>',
        onClick: () => { window.location.hash = '#/camera'; },
      }),
    ]);
    container.appendChild(header);
    container.appendChild(feed);
  } else {
    // Desktop: normal header with title + create button
    const header = el('div', { className: 'page-header' }, [
      el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
        el('h1', { className: 'page-header-title', textContent: 'ShortV' }),
        el('button', {
          className: 'btn btn-primary btn-sm',
          textContent: '+ Create',
          onClick: () => { window.location.hash = '#/camera'; },
        }),
      ]),
    ]);
    container.append(header, feed);
  }

  showLoader(feed);

  try {
    shortvs = await getShortVs({ limit: 50 });
    clearElement(feed);

    if (shortvs.length === 0) {
      if (isMobile) {
        feed.appendChild(el('div', { className: 'shortvs-empty', textContent: 'No ShortV yet. Create the first one!' }));
      } else {
        feed.appendChild(el('div', { className: 'empty-state' }, [
          el('h2', { textContent: 'No ShortV yet', style: { marginBottom: '8px' } }),
          el('p', { textContent: 'Create the first one!', style: { color: 'var(--text-secondary)', marginBottom: '16px' } }),
          el('button', {
            className: 'btn btn-primary',
            textContent: '+ Create ShortV',
            onClick: () => { window.location.hash = '#/camera'; },
          }),
        ]));
      }
      return;
    }

    if (isMobile) {
      renderMobileSlides(feed, user);
      setupSwipeNavigation(feed);
      // Small delay to ensure DOM is ready for autoplay
      setTimeout(() => goToSlide(0), 100);
    } else {
      renderDesktopCards(feed, user);
    }
  } catch (err) {
    console.error('Failed to load shortvs:', err);
    clearElement(feed);
    feed.appendChild(el('div', { className: 'error-message', textContent: 'Failed to load ShortV' }));
  }

  // Re-check on resize
  window.addEventListener('resize', () => {
    const wasMobile = isMobile;
    checkMobile();
    if (wasMobile !== isMobile) {
      render(c);
    }
  });
}

// ===== DESKTOP: Card grid layout =====
function renderDesktopCards(feed, user) {
  feed.style.display = 'flex';
  feed.style.flexDirection = 'column';
  feed.style.alignItems = 'center';
  feed.style.gap = '16px';
  feed.style.padding = '16px';

  for (const sv of shortvs) {
    feed.appendChild(renderDesktopCard(sv, user));
  }
}

function renderDesktopCard(sv, user) {
  const profile = sv.profiles;

  const card = el('div', {
    className: 'shortvs-desktop-card',
    style: {
      width: '100%', maxWidth: '420px', background: 'var(--bg-primary)', borderRadius: '16px',
      overflow: 'hidden', border: '1px solid var(--border-color)',
    },
  });

  // Video container
  const videoContainer = el('div', { style: { position: 'relative', background: '#000', borderRadius: '16px 16px 0 0', overflow: 'hidden' } });
  const video = el('video', {
    src: sv.video_url,
    playsinline: 'playsinline',
    loop: 'loop',
    muted: 'muted',
    preload: 'metadata',
    style: { width: '100%', maxHeight: '500px', objectFit: 'contain', display: 'block', cursor: 'pointer' },
  });

  // Unmute button
  const unmuteBtn = el('div', {
    style: { position: 'absolute', bottom: '12px', left: '12px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', color: '#fff', cursor: 'pointer', zIndex: '5' },
    innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  });
  unmuteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    video.muted = !video.muted;
    unmuteBtn.innerHTML = video.muted
      ? '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  });

  // Single click play/pause, double-click like
  let lastClick = 0;
  let liked = false;
  const likeCount = sv.like_count || 0;

  video.addEventListener('click', (e) => {
    const now = Date.now();
    if (now - lastClick < 300) {
      // Double click - like
      if (!liked) {
        liked = true;
        toggleShortVLike(sv.id, user.id);
        likeBtn.classList.add('active');
        const countEl = likeBtn.querySelector('.post-action-count');
        if (countEl) countEl.textContent = formatNumber(likeCount + 1);
      }
    } else {
      // Single click - play/pause
      if (video.paused) video.play();
      else video.pause();
    }
    lastClick = now;
  });

  video.addEventListener('play', () => { incrementViews(sv.id); });

  videoContainer.append(video, unmuteBtn);

  // Info
  const info = el('div', { style: { padding: '12px 16px' } }, [
    el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } }, [
      renderAvatar(profile, 'sm'),
      el('span', { style: { fontWeight: '700', fontSize: '14px' }, textContent: profile.display_name }),
      el('span', { style: { fontSize: '13px', color: 'var(--text-secondary)' }, textContent: '@' + profile.username }),
    ]),
    sv.caption ? el('div', { style: { fontSize: '14px', marginBottom: '8px', lineHeight: '1.4' }, textContent: sv.caption }) : null,
    el('div', { style: { display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)' } }, [
      el('span', { textContent: formatNumber(sv.view_count) + ' views' }),
      el('span', { textContent: formatNumber(sv.like_count) + ' likes' }),
      el('span', { textContent: timeAgo(sv.created_at) }),
    ]),
  ]);

  // Actions
  const actions = el('div', { style: { display: 'flex', justifyContent: 'space-around', padding: '8px 16px', borderTop: '1px solid var(--border-color)' } });

  const likeBtn = el('button', {
    className: 'post-action post-action-like',
    innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>',
    onClick: async (e) => {
      e.stopPropagation();
      liked = await toggleShortVLike(sv.id, user.id);
      likeBtn.classList.toggle('active', liked);
    },
  });

  isShortVLiked(sv.id, user.id).then(l => {
    liked = l;
    likeBtn.classList.toggle('active', liked);
  });

  actions.appendChild(likeBtn);

  // Comment button
  const commentBtn = el('button', {
    className: 'post-action post-action-comment',
    innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    onClick: (e) => {
      e.stopPropagation();
      openCommentSheet(sv, user);
    },
  });
  actions.appendChild(commentBtn);

  // Share button
  const shareBtn = el('button', {
    className: 'post-action post-action-share',
    innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    onClick: (e) => {
      e.stopPropagation();
      openShareSheet(sv, user);
    },
  });
  actions.appendChild(shareBtn);

  card.append(videoContainer, info, actions);
  return card;
}

// ===== MOBILE: TikTok full-screen slides =====
function renderMobileSlides(feed, user) {
  shortvs.forEach((sv, index) => {
    feed.appendChild(renderTikTokSlide(sv, user, index));
  });
}

function renderTikTokSlide(sv, user, index) {
  const profile = sv.profiles;
  const slide = el('div', { className: 'shortvs-slide', dataset: { index: index } });

  // Video
  const videoContainer = el('div', { className: 'shortvs-video-container' });
  const video = el('video', {
    src: sv.video_url,
    playsinline: 'playsinline',
    loop: 'loop',
    muted: 'muted',
    preload: 'metadata',
    className: 'shortvs-video',
  });

  // Unmute button
  const unmuteBtn = el('div', { className: 'shortvs-unmute', innerHTML: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' });
  unmuteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    video.muted = !video.muted;
    unmuteBtn.innerHTML = video.muted
      ? '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    unmuteBtn.style.display = video.muted ? 'flex' : 'none';
  });
  videoContainer.appendChild(video);
  videoContainer.appendChild(unmuteBtn);

  // Double-tap to like
  let lastTap = 0;
  let heartAnim = null;
  video.addEventListener('click', (e) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      // Double tap - like
      e.stopPropagation();
      if (!liked) {
        liked = true;
        toggleShortVLike(sv.id, user.id);
        likeBtn.classList.add('liked');
        const countEl = likeBtn.querySelector('.shortvs-action-count');
        if (countEl) countEl.textContent = formatNumber(likeCount + 1);
      }
      // Show heart animation
      if (heartAnim) heartAnim.remove();
      heartAnim = el('div', { className: 'shortvs-heart-anim', innerHTML: '<svg viewBox="0 0 24 24" width="80" height="80"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#ff2d55"/></svg>' });
      heartAnim.style.left = (e.clientX || e.touches?.[0]?.clientX || window.innerWidth / 2) + 'px';
      heartAnim.style.top = (e.clientY || e.touches?.[0]?.clientY || window.innerHeight / 2) + 'px';
      slide.appendChild(heartAnim);
      setTimeout(() => heartAnim.remove(), 800);
    } else {
      // Single tap - play/pause
      if (video.paused) video.play();
      else video.pause();
    }
    lastTap = now;
  });

  // Right side actions
  const actions = el('div', { className: 'shortvs-actions' });

  // Avatar
  const avatarBtn = el('div', { className: 'shortvs-action-item shortvs-avatar-action' }, [
    el('div', { className: 'shortvs-action-avatar', innerHTML: profile.avatar_url ? `<img src="${profile.avatar_url}" alt="">` : '<div class="shortvs-avatar-placeholder">' + (profile.display_name?.[0] || 'U') + '</div>' }),
    el('div', { className: 'shortvs-follow-badge', textContent: '+' }),
  ]);

  // Like
  let liked = false;
  const likeCount = sv.like_count || 0;
  const likeBtn = el('div', { className: 'shortvs-action-item shortvs-like-btn' }, [
    el('div', { className: 'shortvs-action-icon', innerHTML: '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>' }),
    el('span', { className: 'shortvs-action-count', textContent: formatNumber(likeCount) }),
  ]);
  isShortVLiked(sv.id, user.id).then(l => {
    liked = l;
    if (liked) likeBtn.classList.add('liked');
  });
  likeBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    liked = await toggleShortVLike(sv.id, user.id);
    likeBtn.classList.toggle('liked', liked);
    const countEl = likeBtn.querySelector('.shortvs-action-count');
    if (countEl) countEl.textContent = formatNumber(liked ? likeCount + 1 : likeCount);
  });

  // Comment
  const commentBtn = el('div', { className: 'shortvs-action-item' }, [
    el('div', { className: 'shortvs-action-icon', innerHTML: '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
    el('span', { className: 'shortvs-action-count', textContent: formatNumber(sv.comment_count || 0) }),
  ]);
  commentBtn.addEventListener('click', (e) => { e.stopPropagation(); openCommentSheet(sv, user); });

  // Share
  const shareBtn = el('div', { className: 'shortvs-action-item' }, [
    el('div', { className: 'shortvs-action-icon', innerHTML: '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
    el('span', { className: 'shortvs-action-count', textContent: 'Share' }),
  ]);
  shareBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openShareSheet(sv, user);
  });

  actions.append(avatarBtn, likeBtn, commentBtn, shareBtn);

  // Bottom info
  const info = el('div', { className: 'shortvs-info' }, [
    el('div', { className: 'shortvs-info-user' }, [
      el('span', { className: 'shortvs-info-username', textContent: '@' + profile.username }),
    ]),
    sv.caption ? el('div', { className: 'shortvs-info-caption', textContent: sv.caption }) : null,
    el('div', { className: 'shortvs-info-meta' }, [
      el('span', { textContent: formatNumber(sv.view_count) + ' views' }),
      el('span', { textContent: timeAgo(sv.created_at) }),
    ]),
  ]);

  slide.append(videoContainer, actions, info);
  return slide;
}

// ===== SHARE SHEET =====
function openShareSheet(sv, user) {
  const overlay = el('div', { className: 'shortvs-sheet-overlay', onClick: (e) => { if (e.target === overlay) overlay.remove(); } });
  const sheet = el('div', { className: 'shortvs-share-sheet' });

  // Header
  const header = el('div', { className: 'shortvs-sheet-header' }, [
    el('div', { className: 'shortvs-sheet-handle' }),
  ]);

  // Friends section (top)
  const friendsSection = el('div', { className: 'share-friends-section' }, [
    el('div', { className: 'share-section-title', textContent: 'Share to friends' }),
    el('div', { className: 'share-friends-list', textContent: 'Loading friends...', style: { color: 'var(--text-secondary)', fontSize: '14px', padding: '12px' } }),
  ]);

  // Actions section (bottom)
  const actionsSection = el('div', { className: 'share-actions-section' });

  const url = window.location.origin + window.location.pathname + '#/shortvs';

  // Copy link
  actionsSection.appendChild(el('button', {
    className: 'share-action-item',
    innerHTML: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Copy link</span>',
    onClick: () => {
      navigator.clipboard.writeText(url);
      overlay.remove();
    },
  }));

  // Repost
  actionsSection.appendChild(el('button', {
    className: 'share-action-item',
    innerHTML: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M17 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 13v2a4 4 0 0 1-4 4H3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Repost</span>',
    onClick: () => { overlay.remove(); },
  }));

  // Report
  actionsSection.appendChild(el('button', {
    className: 'share-action-item',
    innerHTML: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Report</span>',
    onClick: () => { alert('Reported.'); overlay.remove(); },
  }));

  // Delete (owner only)
  if (user.id === sv.user_id) {
    actionsSection.appendChild(el('button', {
      className: 'share-action-item share-action-danger',
      innerHTML: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Delete</span>',
      onClick: async () => {
        if (confirm('Delete this ShortV?')) {
          await deleteShortV(sv.id);
          overlay.remove();
          // Remove from DOM
          document.querySelectorAll('.shortvs-slide, .shortvs-desktop-card').forEach(card => {
            if (card.querySelector('video')?.src === sv.video_url) card.remove();
          });
          shortvs = shortvs.filter(s => s.id !== sv.id);
        }
      },
    }));
  }

  sheet.append(header, friendsSection, actionsSection);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);

  // Load friends
  loadShareFriends(sv, user, friendsSection);
}

async function loadShareFriends(sv, user, container) {
  try {
    const { getFollowing } = await import('../services/follows.js');
    const friends = await getFollowing(user.id);
    const list = container.querySelector('.share-friends-list');
    if (!list) return;
    list.innerHTML = '';

    if (friends.length === 0) {
      list.textContent = 'No friends to share with';
      return;
    }

    for (const friend of friends) {
      const friendBtn = el('div', { className: 'share-friend-item' }, [
        el('div', { className: 'share-friend-avatar' }, [
          friend.avatar_url
            ? el('img', { src: friend.avatar_url, alt: '' })
            : el('div', { className: 'share-friend-placeholder', textContent: (friend.display_name?.[0] || 'U') }),
        ]),
        el('div', { className: 'share-friend-name', textContent: friend.display_name }),
      ]);
      friendBtn.addEventListener('click', () => {
        alert('Shared with ' + friend.display_name);
      });
      list.appendChild(friendBtn);
    }
  } catch (err) {
    console.error('Failed to load friends:', err);
  }
}

// ===== SWIPE NAVIGATION (mobile only) =====
function setupSwipeNavigation(feed) {
  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  feed.addEventListener('touchstart', (e) => {
    if (isAnimating) return;
    startY = e.touches[0].clientY;
    isDragging = true;
  }, { passive: true });

  feed.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    const slides = feed.querySelectorAll('.shortvs-slide');
    if (slides[currentIndex]) {
      slides[currentIndex].style.transform = `translateY(${diff}px)`;
    }
  }, { passive: true });

  feed.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    const diff = currentY - startY;
    const slides = feed.querySelectorAll('.shortvs-slide');
    if (slides[currentIndex]) slides[currentIndex].style.transform = '';

    if (Math.abs(diff) > 80) {
      if (diff < 0 && currentIndex < shortvs.length - 1) goToSlide(currentIndex + 1);
      else if (diff > 0 && currentIndex > 0) goToSlide(currentIndex - 1);
    }
  });

  feed.addEventListener('wheel', (e) => {
    if (isAnimating) return;
    e.preventDefault();
    if (e.deltaY > 30 && currentIndex < shortvs.length - 1) goToSlide(currentIndex + 1);
    else if (e.deltaY < -30 && currentIndex > 0) goToSlide(currentIndex - 1);
  }, { passive: false });

  document.addEventListener('keydown', shortvsKeyHandler);
}

function shortvsKeyHandler(e) {
  if (isAnimating || !isMobile) return;
  if (e.key === 'ArrowDown' || e.key === 'j') {
    if (currentIndex < shortvs.length - 1) goToSlide(currentIndex + 1);
  } else if (e.key === 'ArrowUp' || e.key === 'k') {
    if (currentIndex > 0) goToSlide(currentIndex - 1);
  }
}

function goToSlide(index) {
  if (isAnimating || index === currentIndex) return;
  isAnimating = true;

  const feed = document.getElementById('shortvs-feed');
  if (!feed) { isAnimating = false; return; }

  const slides = feed.querySelectorAll('.shortvs-slide');
  const prevVideo = slides[currentIndex]?.querySelector('video');
  const nextVideo = slides[index]?.querySelector('video');

  // Pause previous
  if (prevVideo) { prevVideo.pause(); prevVideo.currentTime = 0; }

  currentIndex = index;

  // Scroll to slide
  if (slides[index]) slides[index].scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Play next video
  if (nextVideo) {
    nextVideo.play().catch(() => {});
    incrementViews(shortvs[index].id);

    // Show/hide unmute button
    const unmuteBtn = slides[index]?.querySelector('.shortvs-unmute');
    if (unmuteBtn) {
      unmuteBtn.style.display = nextVideo.muted ? 'flex' : 'none';
    }
  }

  // Hide unmute on previous slide
  if (prevVideo) {
    const prevUnmute = slides[currentIndex - 1]?.querySelector('.shortvs-unmute');
    if (prevUnmute) prevUnmute.style.display = 'none';
  }

  setTimeout(() => { isAnimating = false; }, 400);
}

// ===== COMMENT SHEET =====
function openCommentSheet(sv, user) {
  const overlay = el('div', { className: 'shortvs-sheet-overlay', onClick: (e) => { if (e.target === overlay) overlay.remove(); } });
  const sheet = el('div', { className: 'shortvs-comment-sheet' });

  const header = el('div', { className: 'shortvs-sheet-header' }, [
    el('div', { className: 'shortvs-sheet-handle' }),
  ]);

  const commentList = el('div', { className: 'shortvs-comment-list' });
  const inputArea = el('div', { className: 'shortvs-comment-input-area' });
  const input = el('input', { className: 'shortvs-comment-input', placeholder: 'Add a comment...', type: 'text' });
  const sendBtn = el('button', { className: 'shortvs-comment-send', textContent: 'Post' });

  sendBtn.addEventListener('click', async () => {
    const text = input.value.trim();
    if (!text) return;
    try {
      const comment = await addShortVComment(sv.id, user.id, text);
      commentList.appendChild(renderCommentItem(comment));
      input.value = '';
      commentList.scrollTop = commentList.scrollHeight;
    } catch (err) { console.error('Failed:', err); }
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendBtn.click(); });

  inputArea.append(input, sendBtn);
  sheet.append(header, commentList, inputArea);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);

  getShortVComments(sv.id).then(comments => {
    comments.forEach(c => commentList.appendChild(renderCommentItem(c)));
    commentList.scrollTop = commentList.scrollHeight;
  });
}

function renderCommentItem(comment) {
  const profile = comment.profiles;
  return el('div', { className: 'shortvs-comment-item' }, [
    el('div', { className: 'shortvs-comment-avatar' }, [
      profile?.avatar_url ? el('img', { src: profile.avatar_url, alt: '' }) : el('div', { className: 'shortvs-avatar-placeholder small', textContent: (profile?.display_name?.[0] || 'U') }),
    ]),
    el('div', { className: 'shortvs-comment-body' }, [
      el('div', { className: 'shortvs-comment-header' }, [
        el('span', { className: 'shortvs-comment-name', textContent: profile?.display_name || 'User' }),
        el('span', { className: 'shortvs-comment-time', textContent: timeAgo(comment.created_at) }),
      ]),
      el('div', { className: 'shortvs-comment-text', textContent: comment.content }),
    ]),
  ]);
}

// ===== CREATE SHORTV =====
function openCreateShortV(user) {
  let videoFile = null;

  const captionInput = el('input', { className: 'shortvs-create-input', placeholder: 'Write a caption...', type: 'text' });
  const fileInput = el('input', { type: 'file', accept: 'video/mp4,video/webm,video/ogg', style: { display: 'none' } });

  const previewArea = el('div', { className: 'shortvs-create-preview' }, [
    el('div', { className: 'shortvs-create-upload-hint', innerHTML: '<svg viewBox="0 0 24 24" width="48" height="48"><path fill="currentColor" d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>' }),
    el('div', { textContent: 'Tap to select video', style: { color: 'var(--text-secondary)', fontSize: '14px' } }),
    el('div', { textContent: 'MP4, WebM, OGG (max 50MB)', style: { fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' } }),
  ]);

  previewArea.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { alert('Video too large (max 50MB)'); return; }
    videoFile = file;
    const url = URL.createObjectURL(file);
    previewArea.innerHTML = '';
    previewArea.appendChild(el('video', { src: url, controls: 'controls', style: { width: '100%', maxHeight: '300px', borderRadius: '12px' } }));
  });

  const submitBtn = el('button', {
    className: 'shortvs-create-submit',
    textContent: 'Post',
    onClick: async () => {
      if (!videoFile) { alert('Select a video first'); return; }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Posting...';
      try {
        const videoUrl = await uploadImage('shortvs', videoFile, user.id);
        await createShortV({ videoUrl, caption: captionInput.value.trim(), userId: user.id });
        overlay.remove();
        window.location.hash = '#/shortvs';
      } catch (err) { console.error('Failed:', err); alert('Failed to upload'); }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Post';
    },
  });

  const overlay = el('div', { className: 'shortvs-sheet-overlay', onClick: (e) => { if (e.target === overlay) overlay.remove(); } });
  const sheet = el('div', { className: 'shortvs-create-sheet' }, [
    el('div', { className: 'shortvs-sheet-header' }, [el('div', { className: 'shortvs-sheet-handle' })]),
    el('div', { className: 'shortvs-create-body' }, [fileInput, previewArea, captionInput, submitBtn]),
  ]);

  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
}

export function cleanup() {
  currentIndex = 0;
  shortvs = [];
  container = null;
  isAnimating = false;
  document.removeEventListener('keydown', shortvsKeyHandler);
}
