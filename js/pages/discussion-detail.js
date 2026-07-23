import { el, clearElement, showLoader } from '../utils/dom.js';
import { getCurrentUser } from '../state.js';
import { getDiscussion, joinDiscussion, leaveDiscussion, isMember, getDiscussionPosts } from '../services/discussions.js';
import { renderPostCard } from '../components/post-card.js';
import { openComposer } from '../components/post-composer.js';

export async function render(container, params) {
  const user = getCurrentUser();
  if (!user) return;
  const name = params.name;

  clearElement(container);
  showLoader(container);

  try {
    const discussion = await getDiscussion(name);
    const member = await isMember(discussion.id, user.id);
    const posts = await getDiscussionPosts(discussion.id);

    clearElement(container);

    const header = el('div', { className: 'page-header' }, [
      el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
        el('div', {}, [
          el('h1', { className: 'page-header-title', textContent: 's/' + discussion.name }),
          discussion.description ? el('p', { style: { fontSize: '13px', color: 'var(--text-secondary)' }, textContent: discussion.description }) : null,
        ]),
      ]),
    ]);

    const actions = el('div', { style: { padding: '12px 16px', display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)' } }, [
      el('span', { style: { fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '32px' }, textContent: discussion.member_count + ' members' }),
    ]);

    if (member) {
      actions.appendChild(el('button', {
        className: 'btn btn-primary btn-sm',
        textContent: '+ Post',
        onClick: () => {
          window.dispatchEvent(new CustomEvent('open-composer'));
        },
      }));
      actions.appendChild(el('button', {
        className: 'btn btn-outline btn-sm',
        textContent: 'Leave',
        onClick: async () => {
          await leaveDiscussion(discussion.id, user.id);
          render(container, params);
        },
      }));
    } else {
      actions.appendChild(el('button', {
        className: 'btn btn-primary btn-sm',
        textContent: 'Join',
        onClick: async () => {
          await joinDiscussion(discussion.id, user.id);
          render(container, params);
        },
      }));
    }

    const postsContainer = el('div', { className: 'posts-container' });

    container.append(header, actions, postsContainer);

    if (posts.length === 0) {
      postsContainer.appendChild(el('div', { className: 'empty-state', textContent: 'No posts yet. Be the first!' }));
    } else {
      for (const post of posts) {
        renderPostCard(postsContainer, post);
      }
    }
  } catch (err) {
    console.error('Failed to load discussion:', err);
    clearElement(container);
    container.appendChild(el('div', { className: 'error-message', textContent: 'Discussion not found' }));
  }
}

export function cleanup() {}
