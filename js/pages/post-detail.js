import { el, clearElement, showLoader } from '../utils/dom.js';
import { getCurrentUser } from '../state.js';
import { getPost, canEditPost, editPost } from '../services/posts.js';
import { renderAvatar } from '../components/avatar.js';
import { renderCommentSection } from '../components/comment-section.js';
import { timeAgo, formatNumber } from '../utils/time.js';
import { toggleLike, isLiked, toggleRepost, isReposted, toggleBookmark, isBookmarked } from '../services/posts.js';
import { renderMarkdown } from '../utils/markdown.js';
import { sharePost } from '../utils/share.js';
import { recordPostView } from '../services/views.js';
import { getPoll, hasVoted, votePoll } from '../services/polls.js';

export async function render(container, params) {
  const user = getCurrentUser();
  const postId = params.id;

  showLoader(container);

  try {
    const post = await getPost(postId);
    const profile = post.profiles;

    // Record view
    if (user) {
      recordPostView(postId, user.id);
    } else {
      recordPostView(postId);
    }

    clearElement(container);

    const header = el('div', { className: 'page-header' }, [
      el('h1', { className: 'page-header-title', textContent: 'Post' }),
    ]);

    // Post content
    const postContent = el('div', { className: 'post-detail-card' }, [
      el('div', { style: { display: 'flex', gap: '12px' } }, [
        el('div', { className: 'post-card-avatar' }, [renderAvatar(profile, 'md')]),
        el('div', { style: { flex: '1' } }, [
          el('div', { className: 'post-card-header' }, [
            el('span', { className: 'post-card-name', textContent: profile.display_name }),
            el('span', { className: 'post-card-handle', textContent: '@' + profile.username }),
          ]),
        ]),
      ]),
      post.content ? el('div', { className: 'post-detail-content', innerHTML: renderMarkdown(post.content) }) : null,
      post.image_url ? el('div', { className: 'post-detail-image' }, [
        el('img', { src: post.image_url, alt: 'Post image' }),
      ]) : null,
      post.video_url ? el('div', { className: 'post-detail-image' }, [
        el('video', { src: post.video_url, controls: 'controls', style: { width: '100%', borderRadius: '16px' } }),
      ]) : null,
      post.location_name ? el('div', { className: 'post-card-location', style: { marginTop: '8px' } }, [
        el('span', { innerHTML: '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>' }),
        el('span', { textContent: post.location_name }),
      ]) : null,
      post.edited_at ? el('div', { className: 'post-card-edited', style: { marginTop: '4px' }, textContent: 'Edited' }) : null,
      el('div', { className: 'post-detail-meta' }, [
        el('span', { textContent: timeAgo(post.created_at) }),
        el('span', { textContent: '·' }),
        el('span', { textContent: new Date(post.created_at).toLocaleString() }),
      ]),
    ]);

    // Stats
    const statsEl = el('div', { className: 'post-detail-stats' }, [
      el('span', {}, [
        el('strong', { textContent: formatNumber(post.repost_count) }),
        el('span', { textContent: ' Reposts' }),
      ]),
      el('span', {}, [
        el('strong', { textContent: formatNumber(post.like_count) }),
        el('span', { textContent: ' Likes' }),
      ]),
      el('span', {}, [
        el('strong', { textContent: formatNumber(post.reply_count) }),
        el('span', { textContent: ' Replies' }),
      ]),
      el('span', {}, [
        el('strong', { textContent: formatNumber(post.view_count || 0) }),
        el('span', { textContent: ' Views' }),
      ]),
    ]);

    // Actions
    const actions = el('div', { className: 'post-detail-actions' });

    let liked = false;
    let reposted = false;
    let bookmarked = false;

    const likeBtn = el('button', { className: 'post-action post-action-like' }, [
      el('span', { innerHTML: '<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>' }),
      el('span', { className: 'post-action-count', textContent: formatNumber(post.like_count) }),
    ]);

    const repostBtn = el('button', { className: 'post-action post-action-repost' }, [
      el('span', { innerHTML: '<svg viewBox="0 0 24 24"><path d="M17 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 13v2a4 4 0 0 1-4 4H3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
      el('span', { className: 'post-action-count', textContent: formatNumber(post.repost_count) }),
    ]);

    const bookmarkBtn = el('button', { className: 'post-action post-action-bookmark' }, [
      el('span', { innerHTML: '<svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
    ]);

    if (user) {
      likeBtn.addEventListener('click', async () => {
        liked = await toggleLike(post.id, user.id);
        likeBtn.classList.toggle('active', liked);
        likeBtn.querySelector('.post-action-count').textContent = formatNumber(post.like_count + (liked ? 1 : 0));
      });

      repostBtn.addEventListener('click', async () => {
        reposted = await toggleRepost(post.id, user.id);
        repostBtn.classList.toggle('active', reposted);
        repostBtn.querySelector('.post-action-count').textContent = formatNumber(post.repost_count + (reposted ? 1 : 0));
      });

      bookmarkBtn.addEventListener('click', async () => {
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
      });
    }

    const shareBtn = el('button', { className: 'post-action' }, [
      el('span', { innerHTML: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="16 6 12 2 8 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="2" x2="12" y2="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
    ]);

    shareBtn.addEventListener('click', async () => {
      const result = await sharePost(post.id, post.content);
      if (result === 'copied') {
        shareBtn.classList.add('active');
        setTimeout(() => shareBtn.classList.remove('active'), 1500);
      }
    });

    // Edit button (only for own posts within 15 min)
    if (user && user.id === post.user_id && canEditPost(post)) {
      const editBtn = el('button', { className: 'post-action' }, [
        el('span', { innerHTML: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }),
      ]);

      editBtn.addEventListener('click', async () => {
        const contentEl = postContent.querySelector('.post-detail-content');
        if (!contentEl) return;

        const textarea = el('textarea', {
          className: 'composer-textarea',
          value: post.content,
          style: { width: '100%', minHeight: '80px', padding: '12px', borderRadius: '12px', resize: 'vertical', marginTop: '12px' },
        });

        const btnRow = el('div', { style: { display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' } }, [
          el('button', {
            className: 'btn btn-outline btn-sm',
            textContent: 'Cancel',
            onClick: () => { textarea.remove(); btnRow.remove(); },
          }),
          el('button', {
            className: 'btn btn-primary btn-sm',
            textContent: 'Save',
            onClick: async () => {
              const newContent = textarea.value.trim();
              if (!newContent) return;
              try {
                await editPost(post.id, { content: newContent, edit_count: post.edit_count || 0 });
                contentEl.innerHTML = renderMarkdown(newContent);
                textarea.remove();
                btnRow.remove();
                editBtn.remove();
              } catch (err) {
                console.error('Failed to edit:', err);
              }
            },
          }),
        ]);

        contentEl.after(textarea, btnRow);
        textarea.focus();
      });

      actions.append(editBtn);
    }

    actions.append(repostBtn, likeBtn, bookmarkBtn, shareBtn);

    // Poll section
    const pollSection = el('div');
    try {
      const poll = await getPoll(postId);
      if (poll) {
        renderPollSection(pollSection, poll, user);
      }
    } catch (e) { /* no poll */ }

    // Comments
    const commentsSection = el('div', { className: 'comments-section' });

    container.append(header, postContent, pollSection, statsEl, actions, el('div', { className: 'divider' }), commentsSection);

    renderCommentSection(commentsSection, postId);

  } catch (err) {
    console.error('Failed to load post:', err);
    clearElement(container);
    container.appendChild(el('div', { className: 'error-message', textContent: 'Post not found' }));
  }
}

async function renderPollSection(container, poll, user) {
  const voted = user ? await hasVoted(poll.id, user.id) : false;
  const ended = poll.ends_at && new Date(poll.ends_at) < new Date();
  const canVote = user && !voted && !ended;

  const pollEl = el('div', { className: 'poll-container', style: { padding: '16px', borderBottom: '1px solid var(--border-color)' } });

  if (poll.question) {
    pollEl.appendChild(el('div', { className: 'poll-question', textContent: poll.question, style: { fontWeight: '700', marginBottom: '12px' } }));
  }

  const optionsList = el('div', { className: 'poll-options', style: { display: 'flex', flexDirection: 'column', gap: '8px' } });

  for (const option of poll.options) {
    const pct = poll.total_votes > 0 ? Math.round((option.vote_count / poll.total_votes) * 100) : 0;

    const optEl = el('div', { className: 'poll-option' }, [
      el('div', { className: 'poll-option-bar', style: { width: (voted || ended ? pct : 0) + '%', transition: 'width 0.5s ease' } }),
      el('div', { className: 'poll-option-content', style: { position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', padding: '10px 14px' } }, [
        el('span', { textContent: option.text }),
        (voted || ended) ? el('span', { textContent: pct + '%', style: { fontWeight: '700' } }) : null,
      ]),
    ]);

    if (canVote) {
      optEl.style.cursor = 'pointer';
      optEl.style.border = '1px solid var(--border-color)';
      optEl.style.borderRadius = '12px';
      optEl.style.transition = 'all 0.2s';
      optEl.addEventListener('click', async () => {
        await votePoll(poll.id, option.id, user.id);
        option.vote_count++;
        poll.total_votes++;
        renderPollSection(container, poll, user);
      });
      optEl.addEventListener('mouseenter', () => { optEl.style.borderColor = 'var(--accent)'; });
      optEl.addEventListener('mouseleave', () => { optEl.style.borderColor = 'var(--border-color)'; });
    } else {
      optEl.style.border = '1px solid var(--border-color)';
      optEl.style.borderRadius = '12px';
      optEl.style.background = 'var(--bg-secondary)';
    }

    optionsList.appendChild(optEl);
  }

  pollEl.appendChild(optionsList);

  const meta = el('div', { className: 'poll-meta', style: { marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)' } }, [
    el('span', { textContent: poll.total_votes + ' votes' }),
  ]);

  if (poll.ends_at) {
    const remaining = new Date(poll.ends_at) - new Date();
    if (remaining > 0) {
      const hours = Math.floor(remaining / 3600000);
      const mins = Math.floor((remaining % 3600000) / 60000);
      meta.appendChild(el('span', { textContent: ' · ' + (hours > 0 ? hours + 'h ' : '') + mins + 'm left' }));
    } else {
      meta.appendChild(el('span', { textContent: ' · Ended' }));
    }
  }

  pollEl.appendChild(meta);
  container.appendChild(pollEl);
}

export function cleanup() {}
