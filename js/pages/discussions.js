import { el, clearElement, showLoader } from '../utils/dom.js';
import { getCurrentUser } from '../state.js';
import { getDiscussions, searchDiscussions, createDiscussion, joinDiscussion, leaveDiscussion, isMember, getDiscussionPosts } from '../services/discussions.js';
import { renderPostCard } from '../components/post-card.js';
import { openModal } from '../components/modal.js';
import { getFollowers, getFollowing } from '../services/follows.js';
import { getConversations, getMessages, sendMessage, markAsRead } from '../services/messages.js';
import { renderAvatar } from '../components/avatar.js';
import { timeAgo } from '../utils/time.js';
import { getTopNews, searchNews } from '../services/news.js';

let currentTab = 'discussion';
let container = null;

export async function render(c, params) {
  const user = getCurrentUser();
  if (!user) return;

  container = c;
  clearElement(container);

  // Tabs header
  const tabs = el('div', { className: 'discussions-tabs' }, [
    el('button', { className: 'discussions-tab', dataset: { tab: 'friends' }, textContent: 'Friends' }),
    el('button', { className: 'discussions-tab active', dataset: { tab: 'discussion' }, textContent: 'Discussion' }),
    el('button', { className: 'discussions-tab', dataset: { tab: 'news' }, textContent: 'News' }),
    el('button', { className: 'discussions-tab', dataset: { tab: 'messages' }, textContent: 'Messages' }),
  ]);

  const contentArea = el('div', { id: 'discussions-content' });

  container.append(tabs, contentArea);

  // Tab click handler
  tabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.discussions-tab');
    if (!tab) return;
    tabs.querySelectorAll('.discussions-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    renderTab(user);
  });

  renderTab(user);
}

async function renderTab(user) {
  const contentArea = document.getElementById('discussions-content');
  if (!contentArea) return;
  clearElement(contentArea);

  if (currentTab === 'friends') {
    renderFriendsTab(contentArea, user);
  } else if (currentTab === 'discussion') {
    renderDiscussionTab(contentArea, user);
  } else if (currentTab === 'news') {
    renderNewsTab(contentArea, user);
  } else if (currentTab === 'messages') {
    renderMessagesTab(contentArea, user);
  }
}

// ===== FRIENDS TAB =====
async function renderFriendsTab(contentArea, user) {
  showLoader(contentArea);

  try {
    const [followers, following] = await Promise.all([
      getFollowers(user.id),
      getFollowing(user.id),
    ]);

    // Friends = users who you follow AND who follow you back
    const followingIds = new Set(following.map(f => f.id));
    const friends = followers.filter(f => followingIds.has(f.id));

    clearElement(contentArea);

    if (friends.length === 0) {
      contentArea.appendChild(el('div', { className: 'empty-state', style: { padding: '32px 16px' } }, [
        el('div', { textContent: 'No friends yet', style: { fontSize: '16px', fontWeight: '600', marginBottom: '8px' } }),
        el('div', { textContent: 'Follow people and they follow you back to become friends', style: { fontSize: '14px', color: 'var(--text-secondary)' } }),
      ]));
      return;
    }

    const list = el('div', { className: 'friends-list' });
    for (const friend of friends) {
      list.appendChild(renderFriendCard(friend, user));
    }
    contentArea.appendChild(list);
  } catch (err) {
    console.error('Failed to load friends:', err);
    clearElement(contentArea);
    contentArea.appendChild(el('div', { className: 'error-message', textContent: 'Failed to load friends' }));
  }
}

function renderFriendCard(friend, user) {
  const card = el('div', { className: 'friend-card' }, [
    el('a', { href: '#/user/' + friend.username, className: 'friend-card-avatar' }, [
      friend.avatar_url
        ? el('img', { src: friend.avatar_url, alt: friend.display_name })
        : el('div', { className: 'shortvs-avatar-placeholder', textContent: (friend.display_name?.[0] || 'U') }),
    ]),
    el('div', { className: 'friend-card-info' }, [
      el('div', { className: 'friend-card-name', textContent: friend.display_name }),
      el('div', { className: 'friend-card-handle', textContent: '@' + friend.username }),
    ]),
    el('button', {
      className: 'friend-card-msg-btn',
      innerHTML: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        openChat(user, friend);
      },
    }),
  ]);

  return card;
}

// ===== DISCUSSION TAB =====
async function renderDiscussionTab(contentArea, user) {
  const header = el('div', { style: { padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
    el('h2', { textContent: 'Discussions', style: { fontSize: '18px', fontWeight: '700' } }),
    el('button', {
      className: 'btn btn-primary btn-sm',
      textContent: '+ New',
      onClick: () => openCreateDiscussion(user),
    }),
  ]);

  const searchInput = el('input', {
    className: 'input',
    placeholder: 'Search discussions...',
    style: { margin: '0 16px 12px', width: 'calc(100% - 32px)' },
  });

  const subTabs = el('div', { className: 'discussions-subtabs' }, [
    el('button', { className: 'discussions-subtab active', dataset: { tab: 'all' }, textContent: 'All' }),
    el('button', { className: 'discussions-subtab', dataset: { tab: 'mine' }, textContent: 'My Discussions' }),
  ]);

  const list = el('div', { id: 'discussion-list' });

  contentArea.append(header, searchInput, subTabs, list);

  let discussions = await getDiscussions();
  renderList(discussions);

  searchInput.addEventListener('input', async () => {
    const q = searchInput.value.trim();
    if (q) {
      discussions = await searchDiscussions(q);
    } else {
      discussions = await getDiscussions();
    }
    filterAndRender(discussions, user);
  });

  subTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.discussions-subtab');
    if (!tab) return;
    subTabs.querySelectorAll('.discussions-subtab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    filterAndRender(discussions, user);
  });
}

function filterAndRender(discussions, user) {
  const activeTab = document.querySelector('.discussions-subtab.active');
  const tabType = activeTab?.dataset?.tab || 'all';
  let filtered = discussions;
  if (tabType === 'mine') {
    filtered = discussions.filter(d => d.creator_id === user.id);
  }
  renderList(filtered);
}

function renderList(discussions) {
  const list = document.getElementById('discussion-list');
  if (!list) return;
  list.innerHTML = '';

  if (!discussions.length) {
    list.appendChild(el('div', { className: 'empty-state', textContent: 'No discussions found' }));
    return;
  }

  for (const d of discussions) {
    const card = el('div', {
      className: 'user-card',
      style: { cursor: 'pointer' },
      onClick: () => { window.location.hash = '#/discussion/' + d.name; },
    }, [
      el('div', { style: { width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', color: '#fff', flexShrink: '0' }, textContent: d.name[0].toUpperCase() }),
      el('div', { className: 'user-card-info' }, [
        el('div', { className: 'user-card-name', textContent: 's/' + d.name }),
        el('div', { className: 'user-card-handle', textContent: d.title }),
      ]),
      el('div', { style: { fontSize: '12px', color: 'var(--text-secondary)' }, textContent: d.member_count + ' members' }),
    ]);
    list.appendChild(card);
  }
}

// ===== NEWS TAB =====
async function renderNewsTab(contentArea, user) {
  showLoader(contentArea);

  const header = el('div', { style: { padding: '12px 16px' } }, [
    el('h2', { textContent: 'News', style: { fontSize: '18px', fontWeight: '700', marginBottom: '12px' } }),
  ]);

  const searchInput = el('input', {
    className: 'input',
    placeholder: 'Search news...',
    style: { margin: '0 16px 12px', width: 'calc(100% - 32px)' },
  });

  const newsList = el('div', { id: 'news-list' });

  contentArea.append(header, searchInput, newsList);

  let searchTimeout = null;

  async function loadNews(query) {
    showLoader(newsList);
    const articles = query ? await searchNews(query) : await getTopNews();
    clearElement(newsList);

    if (articles.length === 0) {
      newsList.appendChild(el('div', { className: 'empty-state', style: { padding: '32px 16px' } }, [
        el('div', { textContent: 'No news found', style: { fontSize: '16px', fontWeight: '600' } }),
      ]));
      return;
    }

    for (const article of articles) {
      const card = el('a', {
        href: article.url,
        target: '_blank',
        rel: 'noopener',
        style: {
          display: 'block', padding: '12px 16px', borderBottom: '1px solid var(--border-color)',
          textDecoration: 'none', color: 'inherit', transition: 'background 0.15s',
        },
      }, [
        el('div', { style: { display: 'flex', gap: '12px' } }, [
          article.image ? el('img', {
            src: article.image,
            style: { width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', flexShrink: '0' },
          }) : null,
          el('div', { style: { flex: '1', minWidth: '0' } }, [
            el('div', { style: { fontSize: '15px', fontWeight: '600', marginBottom: '4px', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }, textContent: article.title }),
            article.description ? el('div', { style: { fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }, textContent: article.description }) : null,
            el('div', { style: { fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '6px', display: 'flex', gap: '8px' } }, [
              el('span', { textContent: article.source }),
              el('span', { textContent: article.publishedAt ? timeAgo(article.publishedAt) : '' }),
            ]),
          ]),
        ]),
      ]);

      card.addEventListener('mouseenter', () => { card.style.background = 'var(--bg-hover)'; });
      card.addEventListener('mouseleave', () => { card.style.background = ''; });

      newsList.appendChild(card);
    }
  }

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      loadNews(searchInput.value.trim());
    }, 400);
  });

  loadNews('');
}

// ===== MESSAGES TAB =====
async function renderMessagesTab(contentArea, user) {
  showLoader(contentArea);

  try {
    const conversations = await getConversations(user.id);
    clearElement(contentArea);

    if (conversations.length === 0) {
      contentArea.appendChild(el('div', { className: 'empty-state', style: { padding: '32px 16px' } }, [
        el('div', { textContent: 'No messages yet', style: { fontSize: '16px', fontWeight: '600', marginBottom: '8px' } }),
        el('div', { textContent: 'Go to Friends tab and click the message icon to start chatting', style: { fontSize: '14px', color: 'var(--text-secondary)' } }),
      ]));
      return;
    }

    const list = el('div', { className: 'conversations-list' });
    for (const conv of conversations) {
      list.appendChild(renderConversationItem(conv, user));
    }
    contentArea.appendChild(list);
  } catch (err) {
    console.error('Failed to load conversations:', err);
    clearElement(contentArea);
    contentArea.appendChild(el('div', { className: 'error-message', textContent: 'Failed to load messages' }));
  }
}

function renderConversationItem(conv, user) {
  const partner = conv.partner;
  if (!partner) return null;

  const item = el('div', {
    className: 'conversation-item' + (conv.unread > 0 ? ' unread' : ''),
    onClick: () => openChat(user, partner),
  }, [
    el('div', { className: 'conversation-avatar' }, [
      partner.avatar_url
        ? el('img', { src: partner.avatar_url, alt: partner.display_name })
        : el('div', { className: 'shortvs-avatar-placeholder', textContent: (partner.display_name?.[0] || 'U') }),
    ]),
    el('div', { className: 'conversation-info' }, [
      el('div', { className: 'conversation-header' }, [
        el('span', { className: 'conversation-name', textContent: partner.display_name }),
        el('span', { className: 'conversation-time', textContent: timeAgo(conv.lastMessage.created_at) }),
      ]),
      el('div', { className: 'conversation-preview', textContent: conv.lastMessage.content }),
    ]),
    conv.unread > 0 ? el('div', { className: 'conversation-badge', textContent: conv.unread }) : null,
  ]);

  return item;
}

// ===== CHAT =====
function openChat(currentUser, partner) {
  const overlay = el('div', { className: 'chat-overlay' });
  const chatWindow = el('div', { className: 'chat-window' });

  // Header
  const header = el('div', { className: 'chat-header' }, [
    el('button', {
      className: 'chat-back-btn',
      innerHTML: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>',
      onClick: () => overlay.remove(),
    }),
    el('a', { href: '#/user/' + partner.username, className: 'chat-partner' }, [
      el('div', { className: 'chat-partner-avatar' }, [
        partner.avatar_url
          ? el('img', { src: partner.avatar_url, alt: partner.display_name })
          : el('div', { className: 'shortvs-avatar-placeholder small', textContent: (partner.display_name?.[0] || 'U') }),
      ]),
      el('div', { className: 'chat-partner-name', textContent: partner.display_name }),
    ]),
  ]);

  // Messages area
  const messagesArea = el('div', { className: 'chat-messages' });

  // Input area
  const inputArea = el('div', { className: 'chat-input-area' });
  const input = el('input', { className: 'chat-input', placeholder: 'Type a message...', type: 'text' });
  const sendBtn = el('button', {
    className: 'chat-send-btn',
    innerHTML: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
  });

  const doSend = async () => {
    const text = input.value.trim();
    if (!text) return;
    try {
      const msg = await sendMessage(currentUser.id, partner.id, text);
      messagesArea.appendChild(renderChatMessage(msg, currentUser.id));
      input.value = '';
      messagesArea.scrollTop = messagesArea.scrollHeight;
    } catch (err) {
      console.error('Failed to send:', err);
    }
  };

  sendBtn.addEventListener('click', doSend);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSend();
  });

  inputArea.append(input, sendBtn);
  chatWindow.append(header, messagesArea, inputArea);
  overlay.appendChild(chatWindow);
  document.body.appendChild(overlay);

  // Load messages
  getMessages(currentUser.id, partner.id).then(messages => {
    messages.forEach(msg => messagesArea.appendChild(renderChatMessage(msg, currentUser.id)));
    messagesArea.scrollTop = messagesArea.scrollHeight;
    markAsRead(currentUser.id, partner.id);
  });
}

function renderChatMessage(msg, currentUserId) {
  const isMine = msg.sender_id === currentUserId;
  return el('div', { className: 'chat-message' + (isMine ? ' mine' : '') }, [
    !isMine ? el('div', { className: 'chat-msg-avatar' }, [
      msg.profiles?.avatar_url
        ? el('img', { src: msg.profiles.avatar_url, alt: '' })
        : el('div', { className: 'shortvs-avatar-placeholder small', textContent: (msg.profiles?.display_name?.[0] || 'U') }),
    ]) : null,
    el('div', { className: 'chat-msg-bubble' }, [
      el('div', { className: 'chat-msg-text', textContent: msg.content }),
      el('div', { className: 'chat-msg-time', textContent: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }),
    ]),
  ]);
}

// ===== CREATE DISCUSSION =====
function openCreateDiscussion(user) {
  const nameInput = el('input', { className: 'input', placeholder: 'Name (e.g. how_to_get_verify)' });
  const titleInput = el('input', { className: 'input', placeholder: 'Title (e.g. How to get verified)' });
  const descInput = el('textarea', { className: 'settings-textarea', placeholder: 'Description...', rows: '3' });
  const errorDiv = el('div', { className: 'auth-error', style: { display: 'none' } });

  const submitBtn = el('button', {
    className: 'btn btn-primary',
    textContent: 'Create',
    onClick: async () => {
      const name = nameInput.value.trim();
      const title = titleInput.value.trim();
      if (!name || !title) { errorDiv.textContent = 'Name and title required'; errorDiv.style.display = 'block'; return; }
      submitBtn.disabled = true;
      try {
        await createDiscussion({ name, title, description: descInput.value.trim(), creatorId: user.id });
        modal.close();
        window.location.hash = '#/discussion/' + name;
      } catch (err) {
        errorDiv.textContent = err.message || 'Failed to create';
        errorDiv.style.display = 'block';
      }
      submitBtn.disabled = false;
    },
  });

  const content = el('div', { className: 'settings-form' }, [
    el('div', { className: 'input-group' }, [el('label', { className: 'input-label', textContent: 'Name' }), nameInput]),
    el('div', { className: 'input-group' }, [el('label', { className: 'input-label', textContent: 'Title' }), titleInput]),
    el('div', { className: 'input-group' }, [el('label', { className: 'input-label', textContent: 'Description' }), descInput]),
    errorDiv,
    submitBtn,
  ]);

  const modal = openModal(content, { title: 'Create Discussion' });
}

export function cleanup() {
  container = null;
}
