import { el } from '../utils/dom.js';
import { timeAgo, formatNumber } from '../utils/time.js';
import { renderAvatar } from './avatar.js';
import { toggleLike, isLiked, toggleRepost, isReposted, toggleBookmark, isBookmarked, deletePost, editPost, canEditPost } from '../services/posts.js';
import { getCurrentUser } from '../state.js';
import { getRoleBadges } from '../constants.js';
import { renderMarkdown } from '../utils/markdown.js';
import { sharePost } from '../utils/share.js';

let activeMenu = null;

function closeMenu() {
  if (activeMenu) {
    activeMenu.remove();
    activeMenu = null;
  }
}

export function renderPostCard(container, post, options = {}) {
  if (post.post_type && post.post_type !== 'original' && post.post_type !== 'repost') return null;
  const user = getCurrentUser();
  const profile = post.profiles;
  const isOwn = user && user.id === post.user_id;

  const card = el('div', { className: 'post-card', dataset: { postId: post.id } });

  // Avatar
  const avatar = el('div', { className: 'post-card-avatar' }, [
    renderAvatar(profile, 'md'),
  ]);
  avatar.addEventListener('click', (e) => {
    e.stopPropagation();
    window.location.hash = '#/user/' + profile.username;
  });

  // Badges
  const roleBadges = getRoleBadges(profile);
  const badgeElements = roleBadges.map(b => el('span', { innerHTML: b }));

  // Header
  const pinnedIndicator = post.is_pinned ? el('div', { className: 'post-card-pinned', innerHTML: '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg> Pinned' }) : null;

  const header = el('div', { className: 'post-card-header' }, [
    el('span', { className: 'post-card-name', textContent: profile.display_name }),
    ...badgeElements,
    el('span', { className: 'post-card-handle', textContent: '@' + profile.username }),
    el('span', { className: 'post-card-dot', textContent: '\u00B7' }),
    el('span', { className: 'post-card-time', textContent: timeAgo(post.created_at) }),
  ]);

  // 3-dot menu button
  const moreBtn = el('button', { className: 'post-card-more', textContent: '\u2026' });
  moreBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    closeMenu();

    const menu = el('div', { className: 'post-menu', style: {
      position: 'absolute', top: '40px', right: '16px', zIndex: '200',
      background: 'var(--bg-primary)', borderRadius: '12px', boxShadow: 'var(--shadow-lg)',
      border: '1px solid var(--border-color)', minWidth: '160px', overflow: 'hidden',
    }});

    if (isOwn) {
      if (canEditPost(post)) {
        const editBtn = el('button', {
          className: 'dropdown-item',
          textContent: 'Edit post',
          onClick: (e) => {
            e.stopPropagation();
            closeMenu();
            openEditPostInline(post, card);
          },
        });
        menu.appendChild(editBtn);
      }

      // Pin/Unpin option
      const { togglePinPost } = await import('../services/posts.js');
      const pinBtn = el('button', {
        className: 'dropdown-item',
        textContent: post.is_pinned ? 'Unpin from profile' : 'Pin to profile',
        onClick: async (e) => {
          e.stopPropagation();
          await togglePinPost(post.id, user.id);
          post.is_pinned = !post.is_pinned;
          closeMenu();
        },
      });
      menu.appendChild(pinBtn);

      const deleteBtn = el('button', {
        className: 'dropdown-item',
        textContent: 'Delete post',
        style: { color: 'var(--danger)' },
        onClick: async (e) => {
          e.stopPropagation();
          if (confirm('Delete this post?')) {
            await deletePost(post.id);
            card.remove();
          }
          closeMenu();
        },
      });
      menu.appendChild(deleteBtn);
    }

    const shareBtn = el('button', {
      className: 'dropdown-item',
      textContent: 'Share post',
      onClick: async (e) => {
        e.stopPropagation();
        const result = await sharePost(post.id, post.content);
        if (result === 'copied') {
          const orig = shareBtn.textContent;
          shareBtn.textContent = 'Link copied!';
          setTimeout(() => { shareBtn.textContent = orig; }, 1500);
        }
        closeMenu();
      },
    });
    menu.appendChild(shareBtn);

    const copyBtn = el('button', {
      className: 'dropdown-item',
      textContent: 'Copy link',
      onClick: (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(window.location.origin + window.location.pathname + '#/post/' + post.id);
        closeMenu();
      },
    });
    menu.appendChild(copyBtn);

    if (!isOwn && user) {
      const reportBtn = el('button', {
        className: 'dropdown-item',
        textContent: 'Report',
        onClick: async (e) => {
          e.stopPropagation();
          try {
            const { createReport } = await import('../services/reports.js');
            const reason = prompt('Why are you reporting this post?');
            if (reason && reason.trim()) {
              await createReport(user.id, { postId: post.id, reason: reason.trim() });
              alert('Report submitted. Thank you.');
            }
          } catch (err) {
            console.error('Failed to report:', err);
            alert('Failed to submit report.');
          }
          closeMenu();
        },
      });
      menu.appendChild(reportBtn);
    }

    document.body.appendChild(menu);
    activeMenu = menu;

    const closeHandler = (e) => {
      if (!menu.contains(e.target)) {
        closeMenu();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
  });

  header.appendChild(moreBtn);
  header.style.position = 'relative';

  // Content (with markdown support)
  const content = post.content ? el('div', { className: 'post-card-content', innerHTML: renderMarkdown(post.content) }) : null;

  // Location
  const location = post.location_name ? el('div', { className: 'post-card-location' }, [
    el('span', { innerHTML: '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>' }),
    el('span', { textContent: post.location_name }),
  ]) : null;

  // Edited indicator
  const editedIndicator = post.edited_at ? el('span', { className: 'post-card-edited', textContent: '(edited)' }) : null;

  // Media (image carousel, single image, or video)
  let media = null;
  const allImages = [];
  if (post.images && Array.isArray(post.images) && post.images.length > 0) {
    allImages.push(...post.images);
  } else if (post.image_url) {
    allImages.push(post.image_url);
  }

  if (allImages.length > 1) {
    // Carousel
    const carousel = el('div', { className: 'post-card-carousel' });
    const track = el('div', { className: 'carousel-track' });
    let currentSlide = 0;

    for (const imgUrl of allImages) {
      const slide = el('div', { className: 'carousel-slide' }, [
        el('img', { src: imgUrl, alt: 'Post image', loading: 'lazy' }),
      ]);
      track.appendChild(slide);
    }

    // Navigation arrows
    const prevBtn = el('button', { className: 'carousel-btn carousel-prev', innerHTML: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' });
    const nextBtn = el('button', { className: 'carousel-btn carousel-next', innerHTML: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' });

    // Dots
    const dots = el('div', { className: 'carousel-dots' });
    for (let i = 0; i < allImages.length; i++) {
      dots.appendChild(el('span', { className: 'carousel-dot' + (i === 0 ? ' active' : '') }));
    }

    function goToSlide(index) {
      if (index < 0 || index >= allImages.length) return;
      currentSlide = index;
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === index));
      prevBtn.style.display = index === 0 ? 'none' : '';
      nextBtn.style.display = index === allImages.length - 1 ? 'none' : '';
    }

    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); goToSlide(currentSlide - 1); });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); goToSlide(currentSlide + 1); });

    prevBtn.style.display = 'none';
    carousel.append(track, prevBtn, nextBtn, dots);
    media = carousel;
  } else if (allImages.length === 1) {
    media = el('div', { className: 'post-card-image' }, [
      el('img', { src: allImages[0], alt: 'Post image', loading: 'lazy' }),
    ]);
  } else if (post.video_url) {
    media = el('div', { className: 'post-card-image' }, [
      el('video', { src: post.video_url, controls: 'controls', preload: 'metadata', style: { width: '100%', maxHeight: '510px', borderRadius: '16px' } }),
    ]);
  }

  // View count
  const viewCount = post.view_count ? el('div', { className: 'post-card-location', style: { fontSize: '12px' } }, [
    el('span', { innerHTML: '<svg viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>' }),
    el('span', { textContent: formatNumber(post.view_count) }),
  ]) : null;

  // Actions
  const actions = el('div', { className: 'post-card-actions' });

  let liked = false;
  let reposted = false;
  let bookmarked = false;
  let likeCount = post.like_count;
  let repostCount = post.repost_count;

  const likeBtn = el('button', { className: 'post-action post-action-like' }, [
    el('span', { innerHTML: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>' }),
    el('span', { className: 'post-action-count', textContent: formatNumber(likeCount) }),
  ]);

  const repostBtn = el('button', { className: 'post-action post-action-repost' }, [
    el('span', { innerHTML: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M17 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 13v2a4 4 0 0 1-4 4H3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
    el('span', { className: 'post-action-count', textContent: formatNumber(repostCount) }),
  ]);

  const commentBtn = el('button', { className: 'post-action post-action-comment' }, [
    el('span', { innerHTML: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
    el('span', { className: 'post-action-count', textContent: formatNumber(post.reply_count) }),
  ]);

  const bookmarkBtn = el('button', { className: 'post-action post-action-bookmark' }, [
    el('span', { innerHTML: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
  ]);

  const shareBtn = el('button', { className: 'post-action post-action-share' }, [
    el('span', { innerHTML: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
  ]);

  // Tip button (only shown for other users' posts)
  let tipBtn = null;
  if (user && !isOwn) {
    tipBtn = el('button', { className: 'post-action post-action-tip', title: 'Send a tip' }, [
      el('span', { innerHTML: '<svg viewBox="0 0 24 24" width="18" height="18"><line x1="12" y1="1" x2="12" y2="23" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
    ]);
    tipBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      openTipModal(post.user_id, post.id);
    });
  }

  shareBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const result = await sharePost(post.id, post.content);
    if (result === 'copied') {
      shareBtn.classList.add('active');
      setTimeout(() => shareBtn.classList.remove('active'), 1500);
    }
  });

  if (user) {
    likeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      liked = await toggleLike(post.id, user.id);
      likeCount += liked ? 1 : -1;
      likeBtn.classList.toggle('active', liked);
      likeBtn.querySelector('.post-action-count').textContent = formatNumber(likeCount);
      likeBtn.querySelector('svg path').setAttribute('fill', liked ? 'var(--like-color)' : 'currentColor');
    });

    repostBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      reposted = await toggleRepost(post.id, user.id);
      repostCount += reposted ? 1 : -1;
      repostBtn.classList.toggle('active', reposted);
      repostBtn.querySelector('.post-action-count').textContent = formatNumber(repostCount);
    });

    bookmarkBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      bookmarked = await toggleBookmark(post.id, user.id);
      bookmarkBtn.classList.toggle('active', bookmarked);
    });

    Promise.all([
      isLiked(post.id, user.id),
      isReposted(post.id, user.id),
      isBookmarked(post.id, user.id),
    ]).then(([l, r, b]) => {
      liked = l; reposted = r; bookmarked = b;
      likeBtn.classList.toggle('active', liked);
      repostBtn.classList.toggle('active', reposted);
      bookmarkBtn.classList.toggle('active', bookmarked);
      if (liked) likeBtn.querySelector('svg path').setAttribute('fill', 'var(--like-color)');
    });
  }

  commentBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.location.hash = '#/post/' + post.id;
  });

  actions.append(repostBtn, commentBtn, likeBtn, bookmarkBtn, shareBtn);
  if (tipBtn) actions.appendChild(tipBtn);

  card.append(avatar, el('div', { className: 'post-card-body' }, [pinnedIndicator, header, content, media, location, viewCount, editedIndicator, actions].filter(Boolean)));

  card.addEventListener('click', () => {
    window.location.hash = '#/post/' + post.id;
  });

  container.appendChild(card);
  return card;
}

function openEditPostInline(post, card) {
  const body = card.querySelector('.post-card-body');
  if (!body) return;

  const existingContent = body.querySelector('.post-card-content');
  const textarea = el('textarea', {
    className: 'composer-textarea',
    value: post.content,
    style: { width: '100%', minHeight: '80px', padding: '12px', borderRadius: '12px', resize: 'vertical' },
  });

  const btnRow = el('div', { style: { display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' } }, [
    el('button', {
      className: 'btn btn-outline btn-sm',
      textContent: 'Cancel',
      onClick: () => {
        textarea.remove();
        btnRow.remove();
        if (existingContent) existingContent.style.display = '';
      },
    }),
    el('button', {
      className: 'btn btn-primary btn-sm',
      textContent: 'Save',
      onClick: async () => {
        const newContent = textarea.value.trim();
        if (!newContent) return;
        try {
          const updated = await editPost(post.id, { content: newContent, edit_count: post.edit_count || 0 });
          if (existingContent) {
            existingContent.innerHTML = renderMarkdown(newContent);
          }
          textarea.remove();
          btnRow.remove();
          if (existingContent) existingContent.style.display = '';
        } catch (err) {
          console.error('Failed to edit post:', err);
        }
      },
    }),
  ]);

  if (existingContent) existingContent.style.display = 'none';
  body.insertBefore(textarea, body.querySelector('.post-card-image') || body.querySelector('.post-card-location') || body.querySelector('.post-card-actions'));
  body.insertBefore(btnRow, textarea.nextSibling);
  textarea.focus();
}

export function renderPostSkeleton(container) {
  const skeleton = el('div', { className: 'post-skeleton' }, [
    el('div', { className: 'skeleton post-skeleton-avatar' }),
    el('div', { className: 'skeleton post-skeleton-body' }, [
      el('div', { className: 'skeleton post-skeleton-line w60' }),
      el('div', { className: 'skeleton post-skeleton-line w80' }),
      el('div', { className: 'skeleton post-skeleton-line w100' }),
      el('div', { className: 'skeleton post-skeleton-line w100 h120' }),
    ]),
  ]);
  container.appendChild(skeleton);
  return skeleton;
}

async function openTipModal(toUserId, postId) {
  const user = getCurrentUser();
  if (!user) return;

  const { getPaymentLinks, PAYMENT_PLATFORMS } = await import('../services/monetization.js');
  const links = await getPaymentLinks(toUserId);

  const overlay = el('div', { className: 'password-modal-overlay' });

  const children = [
    el('h2', { textContent: 'Support this creator' }),
    el('p', { textContent: 'Choose a payment method to send a tip directly.' }),
  ];

  if (links.length === 0) {
    children.push(el('div', {
      style: {
        padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px',
        textAlign: 'center', marginBottom: '12px',
      },
    }, [
      el('div', { textContent: '😔', style: { fontSize: '32px', marginBottom: '8px' } }),
      el('div', { textContent: 'This creator hasn\'t set up payment methods yet.', style: { color: 'var(--text-secondary)', fontSize: '14px' } }),
    ]));
  } else {
    for (const link of links) {
      const platform = PAYMENT_PLATFORMS[link.platform] || PAYMENT_PLATFORMS.other;
      const btn = el('button', {
        style: {
          display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
          padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)', cursor: 'pointer', transition: 'all 0.2s',
          marginBottom: '8px', textAlign: 'left',
        },
        onClick: () => {
          overlay.remove();
          showRedirectWarning(link.url, platform.name, platform.icon);
        },
      }, [
        el('span', { textContent: platform.icon, style: { fontSize: '24px', flexShrink: '0' } }),
        el('div', { style: { flex: 1, minWidth: 0 } }, [
          el('div', { textContent: platform.name, style: { fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)' } }),
          el('div', {
            textContent: link.label || link.url,
            style: {
              fontSize: '12px', color: 'var(--text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            },
          }),
        ]),
        el('span', {
          innerHTML: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 17L17 7M17 7H7M17 7v10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
          style: { flexShrink: '0', color: 'var(--text-secondary)' },
        }),
      ]);
      btn.addEventListener('mouseenter', () => { btn.style.borderColor = platform.color; btn.style.background = 'var(--bg-primary)'; });
      btn.addEventListener('mouseleave', () => { btn.style.borderColor = 'var(--border-color)'; btn.style.background = 'var(--bg-secondary)'; });
      children.push(btn);
    }
  }

  children.push(el('button', {
    className: 'btn btn-outline',
    textContent: 'Cancel',
    style: { width: '100%', marginTop: '8px' },
    onClick: () => overlay.remove(),
  }));

  overlay.appendChild(el('div', { className: 'password-modal' }, children));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function showRedirectWarning(url, platformName, platformIcon) {
  const overlay = el('div', { className: 'password-modal-overlay' });

  const goToBtn = el('button', {
    className: 'btn-confirm',
    textContent: 'Continue to ' + platformName,
    style: {
      background: 'var(--accent)', color: 'white', padding: '14px 24px',
      fontSize: '15px', fontWeight: '700', borderRadius: '10px', width: '100%',
      marginTop: '12px', border: 'none', cursor: 'pointer',
    },
    onClick: () => {
      window.open(url, '_blank', 'noopener,noreferrer');
      overlay.remove();
    },
  });

  overlay.appendChild(el('div', { className: 'password-modal', style: { textAlign: 'center' } }, [
    el('div', { textContent: platformIcon, style: { fontSize: '48px', marginBottom: '12px' } }),
    el('h2', { textContent: 'You\'re leaving SnapThought' }),
    el('p', { textContent: 'You will be redirected to ' + platformName + ' to complete your payment. SnapThought does not process payments directly.' }),
    el('div', {
      style: {
        padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px',
        fontSize: '13px', color: '#f59e0b', marginBottom: '8px', textAlign: 'left',
      },
    }, [
      el('strong', { textContent: '⚠️ Important: ' }),
      el('span', { textContent: 'Make sure the URL is correct before proceeding. Never share your payment credentials on sites you don\'t trust.' }),
    ]),
    el('div', {
      style: {
        padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '8px',
        fontSize: '12px', color: 'var(--text-secondary)', wordBreak: 'break-all', marginBottom: '8px',
        fontFamily: 'monospace',
      },
      textContent: url,
    }),
    goToBtn,
    el('button', {
      className: 'btn btn-outline',
      textContent: 'Go back',
      style: { width: '100%', marginTop: '8px' },
      onClick: () => overlay.remove(),
    }),
  ]));

  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}
