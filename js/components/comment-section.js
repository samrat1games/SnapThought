import { el, clearElement } from '../utils/dom.js';
import { getComments, addComment } from '../services/posts.js';
import { getCurrentUser } from '../state.js';
import { renderAvatar } from './avatar.js';
import { timeAgo } from '../utils/time.js';
import { toggleCommentLike, isCommentLiked, getCommentLikeCount } from '../services/comment-likes.js';
import { formatNumber } from '../utils/time.js';
import { supabase } from '../supabase.js';

export async function renderCommentSection(container, postId) {
  clearElement(container);

  const user = getCurrentUser();

  const inputWrapper = el('div', { className: 'comment-input-wrapper' });

  if (user) {
    const textarea = el('textarea', {
      className: 'comment-input',
      placeholder: 'Post your reply',
      rows: '1',
    });

    const submitBtn = el('button', {
      className: 'btn btn-primary btn-sm',
      textContent: 'Reply',
      onClick: async () => {
        const content = textarea.value.trim();
        if (!content) return;
        try {
          await addComment(postId, user.id, content);
          textarea.value = '';
          await renderCommentSection(container, postId);
        } catch (err) {
          console.error('Failed to add comment:', err);
        }
      },
    });

    textarea.addEventListener('input', () => {
      submitBtn.disabled = !textarea.value.trim();
    });

    inputWrapper.append(
      renderAvatar(user, 'sm'),
      textarea,
      submitBtn
    );
  }

  container.appendChild(inputWrapper);

  try {
    const comments = await getComments(postId);

    if (comments.length === 0) {
      container.appendChild(el('div', {
        className: 'empty-state',
        textContent: 'No replies yet. Be the first!',
      }));
      return;
    }

    // Build threaded structure: group comments by reply_to
    const topLevel = [];
    const repliesMap = new Map();

    for (const comment of comments) {
      if (comment.reply_to && comment.reply_to !== postId) {
        // This is a reply to another comment
        if (!repliesMap.has(comment.reply_to)) {
          repliesMap.set(comment.reply_to, []);
        }
        repliesMap.get(comment.reply_to).push(comment);
      } else {
        topLevel.push(comment);
      }
    }

    for (const comment of topLevel) {
      const commentEl = renderCommentItem(comment, user, postId, repliesMap, container);
      container.appendChild(commentEl);

      // Render nested replies
      const replies = repliesMap.get(comment.id) || [];
      for (const reply of replies) {
        const replyEl = renderCommentItem(reply, user, postId, repliesMap, container, true);
        container.appendChild(replyEl);
      }
    }
  } catch (err) {
    console.error('Failed to load comments:', err);
    container.appendChild(el('div', { className: 'error-message', textContent: 'Failed to load comments' }));
  }
}

function renderCommentItem(comment, user, postId, repliesMap, container, isNested = false) {
  const profile = comment.profiles;

  const commentEl = el('div', { className: 'comment-item' + (isNested ? ' comment-nested' : '') }, [
    el('div', { className: 'post-card-avatar' }, [renderAvatar(profile, 'md')]),
    el('div', { className: 'comment-body' }, [
      el('div', { className: 'comment-header' }, [
        el('span', { className: 'comment-name', textContent: profile.display_name }),
        el('span', { className: 'comment-handle', textContent: '@' + profile.username }),
        el('span', { className: 'comment-time', textContent: '· ' + timeAgo(comment.created_at) }),
      ]),
      el('div', { className: 'comment-content', textContent: comment.content }),
      el('div', { className: 'comment-actions' }, [
        // Like button
        createLikeButton(comment, user),
        // Reply button
        createReplyButton(comment, user, postId, container),
        // Edit button (own comments only)
        ...(user && user.id === comment.user_id ? [createEditButton(comment, container, postId)] : []),
      ]),
    ]),
  ]);

  commentEl.querySelector('.post-card-avatar')?.addEventListener('click', () => {
    window.location.hash = `#/user/${profile.username}`;
  });

  return commentEl;
}

function createLikeButton(comment, user) {
  let liked = false;
  let likeCount = 0;

  const btn = el('button', { className: 'comment-action-btn' }, [
    el('span', { innerHTML: '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>' }),
    el('span', { className: 'comment-action-count' }),
  ]);

  if (user) {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      liked = await toggleCommentLike(comment.id, user.id);
      likeCount += liked ? 1 : -1;
      btn.classList.toggle('active', liked);
      const countEl = btn.querySelector('.comment-action-count');
      if (countEl) countEl.textContent = likeCount > 0 ? formatNumber(likeCount) : '';
    });
  }

  // Load initial state
  getCommentLikeCount(comment.id).then(count => {
    likeCount = count;
    const countEl = btn.querySelector('.comment-action-count');
    if (countEl && count > 0) countEl.textContent = formatNumber(count);
  });

  if (user) {
    isCommentLiked(comment.id, user.id).then(l => {
      liked = l;
      btn.classList.toggle('active', liked);
    });
  }

  return btn;
}

function createReplyButton(comment, user, postId, container) {
  const btn = el('button', { className: 'comment-action-btn', textContent: 'Reply' });

  if (user) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Remove any existing inline reply
      container.querySelectorAll('.comment-inline-reply').forEach(el => el.remove());

      const replyArea = el('div', { className: 'comment-inline-reply' }, [
        el('input', {
          className: 'comment-reply-input',
          type: 'text',
          placeholder: 'Write a reply...',
        }),
        el('button', {
          className: 'btn btn-primary btn-sm',
          textContent: 'Reply',
        }),
      ]);

      const input = replyArea.querySelector('input');
      const submitBtn = replyArea.querySelector('button');

      submitBtn.addEventListener('click', async () => {
        const content = input.value.trim();
        if (!content) return;
        try {
          await addComment(postId, user.id, content, comment.id);
          replyArea.remove();
          await renderCommentSection(container, postId);
        } catch (err) {
          console.error('Failed to reply:', err);
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitBtn.click();
        if (e.key === 'Escape') replyArea.remove();
      });

      // Insert after the comment actions
      const body = container.querySelector(`[data-comment-id="${comment.id}"] .comment-body`) ||
                   comment.closest('.comment-body');
      if (body) {
        body.appendChild(replyArea);
      } else {
        // Fallback: insert after the comment element
        const commentNode = Array.from(container.children).find(child =>
          child.querySelector && child.querySelector('.comment-content')?.textContent === comment.content
        );
        if (commentNode) commentNode.after(replyArea);
      }
      input.focus();
    });
  }

  return btn;
}

function createEditButton(comment, container, postId) {
  const btn = el('button', { className: 'comment-action-btn', textContent: 'Edit' });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Remove any existing inline edit
    container.querySelectorAll('.comment-inline-edit').forEach(el => el.remove());

    const editArea = el('div', { className: 'comment-inline-edit' }, [
      el('input', {
        className: 'comment-reply-input',
        type: 'text',
        value: comment.content,
      }),
      el('div', { style: { display: 'flex', gap: '8px' } }, [
        el('button', {
          className: 'btn btn-outline btn-sm',
          textContent: 'Cancel',
        }),
        el('button', {
          className: 'btn btn-primary btn-sm',
          textContent: 'Save',
        }),
      ]),
    ]);

    const input = editArea.querySelector('input');
    const cancelBtn = editArea.querySelector('.btn-outline');
    const saveBtn = editArea.querySelector('.btn-primary');

    cancelBtn.addEventListener('click', () => editArea.remove());

    saveBtn.addEventListener('click', async () => {
      const newContent = input.value.trim();
      if (!newContent || newContent === comment.content) {
        editArea.remove();
        return;
      }
      try {
        await supabase.from('posts').update({ content: newContent }).eq('id', comment.id);
        editArea.remove();
        await renderCommentSection(container, postId);
      } catch (err) {
        console.error('Failed to edit comment:', err);
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveBtn.click();
      if (e.key === 'Escape') editArea.remove();
    });

    // Insert after the comment content
    const commentNode = Array.from(container.children).find(child =>
      child.querySelector && child.querySelector('.comment-content')?.textContent === comment.content
    );
    if (commentNode) {
      const body = commentNode.querySelector('.comment-body');
      if (body) body.appendChild(editArea);
    }
    input.focus();
    input.select();
  });

  return btn;
}
