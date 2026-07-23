import { el, clearElement, showLoader } from '../utils/dom.js';
import { getCurrentUser } from '../state.js';
import { getUserLists, createList, getList, addToList, removeFromList, getListFeed } from '../services/lists.js';
import { renderPostCard, renderPostSkeleton } from '../components/post-card.js';
import { renderAvatar } from '../components/avatar.js';
import { searchUsers } from '../services/users.js';
import { openModal } from '../components/modal.js';

export async function render(container) {
  const user = getCurrentUser();
  if (!user) return;

  const header = el('div', { className: 'page-header' }, [
    el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
      el('h1', { className: 'page-header-title', textContent: 'Lists' }),
      el('button', {
        className: 'btn btn-primary btn-sm',
        textContent: 'New list',
        onClick: () => openCreateListModal(user, container),
      }),
    ]),
  ]);

  const listsContainer = el('div', { className: 'lists-container' });

  container.append(header, listsContainer);

  try {
    const lists = await getUserLists(user.id);
    clearElement(listsContainer);

    if (lists.length === 0) {
      listsContainer.appendChild(el('div', { className: 'empty-state' }, [
        el('h3', { textContent: 'No lists yet', style: { marginBottom: '8px' } }),
        el('p', { textContent: 'Create a list to organize people you follow and see their posts in one feed.' }),
      ]));
      return;
    }

    for (const list of lists) {
      const card = el('div', { className: 'list-card', style: {
        padding: '16px', borderBottom: '1px solid var(--border-color)',
        cursor: 'pointer', transition: 'background 0.15s',
      }}, [
        el('div', { style: { fontWeight: '700', fontSize: '16px', marginBottom: '4px' }, textContent: list.name }),
        list.description ? el('div', { style: { color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }, textContent: list.description }) : null,
        el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
          el('span', { style: { fontSize: '13px', color: 'var(--text-secondary)' }, textContent: list.is_private ? 'Private' : 'Public' }),
        ]),
      ]);

      card.addEventListener('click', () => openListDetail(user, list, container));
      card.addEventListener('mouseenter', () => { card.style.background = 'var(--bg-hover)'; });
      card.addEventListener('mouseleave', () => { card.style.background = ''; });

      listsContainer.appendChild(card);
    }
  } catch (err) {
    console.error('Failed to load lists:', err);
    listsContainer.appendChild(el('div', { className: 'error-message', textContent: 'Failed to load lists' }));
  }
}

async function openListDetail(user, list, container) {
  clearElement(container);

  const header = el('div', { className: 'page-header' }, [
    el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } }, [
      el('button', {
        className: 'btn-ghost',
        innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        onClick: () => render(container),
      }),
      el('h1', { className: 'page-header-title', textContent: list.name }),
    ]),
  ]);

  const memberSection = el('div', { style: { padding: '16px', borderBottom: '1px solid var(--border-color)' } });
  const addMemberBtn = el('button', {
    className: 'btn btn-outline btn-sm',
    textContent: 'Add member',
    onClick: () => openAddMemberModal(user, list, memberSection),
  });

  const postsContainer = el('div', { className: 'posts-container' });

  container.append(header, memberSection, addMemberBtn, postsContainer);
  showLoader(postsContainer);

  try {
    const fullList = await getList(list.id);

    // Render members
    memberSection.innerHTML = '';
    memberSection.appendChild(el('div', { style: { fontWeight: '700', marginBottom: '8px' }, textContent: 'Members' }));

    for (const member of fullList.members) {
      const profile = member.profiles;
      if (!profile) continue;
      const memberEl = el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' } }, [
        renderAvatar(profile, 'sm'),
        el('span', { style: { fontWeight: '500' }, textContent: profile.display_name }),
        el('span', { style: { color: 'var(--text-secondary)' }, textContent: '@' + profile.username }),
      ]);
      memberEl.addEventListener('click', () => {
        window.location.hash = '#/user/' + profile.username;
      });
      memberSection.appendChild(memberEl);
    }

    // Load feed
    const posts = await getListFeed(list.id);
    clearElement(postsContainer);

    if (posts.length === 0) {
      postsContainer.appendChild(el('div', { className: 'empty-state', textContent: 'No posts from list members yet' }));
      return;
    }

    posts.forEach(post => renderPostCard(postsContainer, post));
  } catch (err) {
    console.error('Failed to load list:', err);
    postsContainer.appendChild(el('div', { className: 'error-message', textContent: 'Failed to load list' }));
  }
}

function openCreateListModal(user, container) {
  const nameInput = el('input', { className: 'input', placeholder: 'List name' });
  const descInput = el('textarea', { className: 'settings-textarea', placeholder: 'Description (optional)', rows: '2' });
  const privateCheck = el('input', { type: 'checkbox', id: 'list-private' });

  const createBtn = el('button', {
    className: 'btn btn-primary',
    textContent: 'Create',
    onClick: async () => {
      const name = nameInput.value.trim();
      if (!name) return;
      try {
        const list = await createList(user.id, { name, description: descInput.value.trim(), isPrivate: privateCheck.checked });
        modal.close();
        render(container);
      } catch (err) {
        console.error('Failed to create list:', err);
      }
    },
  });

  const content = el('div', { className: 'settings-form' }, [
    el('div', { className: 'input-group' }, [el('label', { className: 'input-label', textContent: 'Name' }), nameInput]),
    el('div', { className: 'input-group' }, [el('label', { className: 'input-label', textContent: 'Description' }), descInput]),
    el('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' } }, [privateCheck, 'Private list']),
    createBtn,
  ]);

  const modal = openModal(content, { title: 'Create list' });
}

function openAddMemberModal(user, list, memberSection) {
  const searchInput = el('input', { className: 'input', placeholder: 'Search users...' });
  const resultsEl = el('div', { style: { maxHeight: '300px', overflowY: 'auto' } });

  searchInput.addEventListener('input', async () => {
    const q = searchInput.value.trim();
    if (!q) { resultsEl.innerHTML = ''; return; }

    const users = await searchUsers(q, { limit: 10 });
    resultsEl.innerHTML = '';
    for (const u of users) {
      const card = el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', cursor: 'pointer', borderRadius: '8px' } }, [
        renderAvatar(u, 'sm'),
        el('div', {}, [
          el('div', { style: { fontWeight: '500', fontSize: '14px' }, textContent: u.display_name }),
          el('div', { style: { color: 'var(--text-secondary)', fontSize: '13px' }, textContent: '@' + u.username }),
        ]),
      ]);
      card.addEventListener('click', async () => {
        try {
          await addToList(list.id, u.id);
          card.style.opacity = '0.5';
          card.style.pointerEvents = 'none';
        } catch (err) {
          console.error('Failed to add member:', err);
        }
      });
      card.addEventListener('mouseenter', () => { card.style.background = 'var(--bg-hover)'; });
      card.addEventListener('mouseleave', () => { card.style.background = ''; });
      resultsEl.appendChild(card);
    }
  });

  const content = el('div', { className: 'settings-form' }, [
    el('div', { className: 'input-group' }, [searchInput]),
    resultsEl,
  ]);

  openModal(content, { title: 'Add member' });
}

export function cleanup() {}
