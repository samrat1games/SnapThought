import { el, clearElement, showLoader } from '../utils/dom.js';
import { getCurrentUser } from '../state.js';
import { supabase } from '../supabase.js';
import { renderPostCard } from '../components/post-card.js';
import { openModal } from '../components/modal.js';

export async function render(container) {
  const user = getCurrentUser();
  if (!user) return;

  const header = el('div', { className: 'page-header' }, [
    el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
      el('h1', { className: 'page-header-title', textContent: 'Bookmarks' }),
      el('button', {
        className: 'btn btn-outline btn-sm',
        textContent: 'New folder',
        onClick: () => openCreateFolderModal(user, container),
      }),
    ]),
  ]);

  const foldersContainer = el('div', { style: { padding: '8px 16px', display: 'flex', gap: '8px', overflowX: 'auto', borderBottom: '1px solid var(--border-color)' } });
  const postsContainer = el('div', { className: 'posts-container' });

  container.append(header, foldersContainer, postsContainer);

  // Load folders
  const { data: folders } = await supabase
    .from('bookmark_folders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at');

  let activeFolderId = null;

  // "All" tab
  const allTab = el('button', {
    className: 'btn btn-primary btn-sm',
    textContent: 'All',
    onClick: () => {
      activeFolderId = null;
      updateActiveTab();
      loadBookmarks(user.id, null, postsContainer);
    },
  });
  foldersContainer.appendChild(allTab);

  // Folder tabs
  const folderTabs = [];
  for (const folder of (folders || [])) {
    const tab = el('button', {
      className: 'btn btn-outline btn-sm',
      textContent: folder.name,
      onClick: () => {
        activeFolderId = folder.id;
        updateActiveTab();
        loadBookmarks(user.id, folder.id, postsContainer);
      },
    });
    folderTabs.push({ tab, folderId: folder.id });
    foldersContainer.appendChild(tab);
  }

  function updateActiveTab() {
    allTab.className = activeFolderId === null ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
    for (const { tab, folderId } of folderTabs) {
      tab.className = folderId === activeFolderId ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';
    }
  }

  // Load initial bookmarks
  loadBookmarks(user.id, null, postsContainer);
}

async function loadBookmarks(userId, folderId, container) {
  showLoader(container);

  try {
    let query = supabase
      .from('bookmarks')
      .select('post:post_id(*, profiles:user_id(*)), note, folder_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (folderId) {
      query = query.eq('folder_id', folderId);
    }

    const { data: bookmarks, error } = await query;
    if (error) throw error;

    clearElement(container);

    const posts = (bookmarks || [])
      .map(b => ({ ...b.post, _bookmarkNote: b.note }))
      .filter(p => p && p.post_type === 'original');

    if (posts.length === 0) {
      container.appendChild(el('div', { className: 'empty-state', textContent: 'No bookmarks yet' }));
      return;
    }

    posts.forEach(post => renderPostCard(container, post));
  } catch (err) {
    console.error('Failed to load bookmarks:', err);
    clearElement(container);
    container.appendChild(el('div', { className: 'error-message', textContent: 'Failed to load bookmarks' }));
  }
}

function openCreateFolderModal(user, container) {
  const nameInput = el('input', { className: 'input', placeholder: 'Folder name' });

  const createBtn = el('button', {
    className: 'btn btn-primary',
    textContent: 'Create',
    onClick: async () => {
      const name = nameInput.value.trim();
      if (!name) return;
      await supabase.from('bookmark_folders').insert({ user_id: user.id, name });
      modal.close();
      render(container);
    },
  });

  const content = el('div', { className: 'settings-form' }, [
    el('div', { className: 'input-group' }, [el('label', { className: 'input-label', textContent: 'Folder name' }), nameInput]),
    createBtn,
  ]);

  const modal = openModal(content, { title: 'Create bookmark folder' });
}

export function cleanup() {}
