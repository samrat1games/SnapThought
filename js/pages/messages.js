import { el, clearElement, showLoader } from '../utils/dom.js';
import { getCurrentUser } from '../state.js';
import { getConversations, getMessages, sendMessage, markAsRead, getUnreadCount } from '../services/messages.js';
import { renderAvatar } from '../components/avatar.js';
import { timeAgo } from '../utils/time.js';

let pollInterval = null;
let currentPartnerId = null;

export async function render(container, params) {
  const user = getCurrentUser();
  if (!user) return;

  clearElement(container);
  stopPolling();

  const header = el('div', { className: 'page-header' }, [
    el('h1', { className: 'page-header-title', textContent: 'Messages' }),
  ]);

  if (params && params.partnerId) {
    // Chat view
    await renderChat(container, user, params.partnerId);
  } else {
    // Conversation list
    await renderConversationList(container, user);
  }

  // Insert header at top
  container.insertBefore(header, container.firstChild);
}

async function renderConversationList(container, user) {
  const list = el('div', { className: 'messages-list' });
  container.appendChild(list);
  showLoader(list);

  try {
    const conversations = await getConversations(user.id);
    clearElement(list);

    if (conversations.length === 0) {
      list.appendChild(el('div', { className: 'empty-state' }, [
        el('h3', { textContent: 'No messages yet', style: { marginBottom: '8px' } }),
        el('p', { textContent: 'Start a conversation by visiting a user\'s profile.' }),
      ]));
      return;
    }

    for (const conv of conversations) {
      const partner = conv.partner;
      if (!partner) continue;

      const item = el('div', { className: 'messages-conversation-item' + (conv.unread > 0 ? ' unread' : '') }, [
        renderAvatar(partner, 'md'),
        el('div', { className: 'messages-conv-info' }, [
          el('div', { className: 'messages-conv-top' }, [
            el('span', { className: 'messages-conv-name', textContent: partner.display_name }),
            el('span', { className: 'messages-conv-time', textContent: timeAgo(conv.lastMessage.created_at) }),
          ]),
          el('div', { className: 'messages-conv-preview', textContent: truncate(conv.lastMessage.content, 60) }),
        ]),
        conv.unread > 0 ? el('span', { className: 'messages-unread-badge', textContent: conv.unread }) : null,
      ].filter(Boolean));

      item.addEventListener('click', () => {
        window.location.hash = '#/messages/' + partner.username;
      });

      list.appendChild(item);
    }
  } catch (err) {
    console.error('Failed to load conversations:', err);
    clearElement(list);
    list.appendChild(el('div', { className: 'error-message', textContent: 'Failed to load messages' }));
  }
}

async function renderChat(container, user, partnerUsername) {
  // Find partner by username
  const { supabase } = await import('../supabase.js');
  const { data: partner } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', partnerUsername)
    .single();

  if (!partner) {
    container.appendChild(el('div', { className: 'error-message', textContent: 'User not found' }));
    return;
  }

  currentPartnerId = partner.id;

  // Back button + partner info header
  const chatHeader = el('div', { className: 'messages-chat-header' }, [
    el('button', {
      className: 'btn-ghost',
      innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      onClick: () => { window.location.hash = '#/messages'; },
    }),
    renderAvatar(partner, 'sm'),
    el('div', { className: 'messages-chat-partner-info' }, [
      el('span', { className: 'messages-chat-partner-name', textContent: partner.display_name }),
      el('span', { className: 'messages-chat-partner-handle', textContent: '@' + partner.username }),
    ]),
  ]);

  const messagesContainer = el('div', { className: 'messages-chat-body' });
  const inputArea = el('div', { className: 'messages-input-area' });
  const input = el('input', {
    className: 'messages-input',
    type: 'text',
    placeholder: 'Write a message...',
  });
  const sendBtn = el('button', {
    className: 'messages-send-btn',
    innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  });

  sendBtn.addEventListener('click', async () => {
    const text = input.value.trim();
    if (!text) return;
    try {
      const msg = await sendMessage(user.id, partner.id, text);
      appendMessage(messagesContainer, msg, user.id);
      input.value = '';
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendBtn.click();
  });

  inputArea.append(input, sendBtn);
  container.append(chatHeader, messagesContainer, inputArea);

  // Load messages
  showLoader(messagesContainer);
  try {
    const messages = await getMessages(user.id, partner.id);
    clearElement(messagesContainer);

    if (messages.length === 0) {
      messagesContainer.appendChild(el('div', { className: 'messages-empty-chat' }, [
        el('div', { className: 'messages-empty-avatar' }, [renderAvatar(partner, 'lg')]),
        el('h3', { textContent: partner.display_name }),
        el('p', { textContent: 'Start your conversation', style: { color: 'var(--text-secondary)' } }),
      ]));
    } else {
      for (const msg of messages) {
        appendMessage(messagesContainer, msg, user.id);
      }
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Mark as read
    await markAsRead(user.id, partner.id);
  } catch (err) {
    console.error('Failed to load messages:', err);
    clearElement(messagesContainer);
    messagesContainer.appendChild(el('div', { className: 'error-message', textContent: 'Failed to load messages' }));
  }

  // Poll for new messages
  startPolling(messagesContainer, user, partner);
}

function appendMessage(container, msg, currentUserId) {
  const isOwn = msg.sender_id === currentUserId;
  const bubble = el('div', { className: 'messages-bubble' + (isOwn ? ' own' : '') }, [
    el('div', { className: 'messages-bubble-content', textContent: msg.content }),
    el('div', { className: 'messages-bubble-time', textContent: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }),
  ]);
  container.appendChild(bubble);
}

function startPolling(container, user, partner) {
  stopPolling();
  let lastCount = container.querySelectorAll('.messages-bubble').length;

  pollInterval = setInterval(async () => {
    try {
      const messages = await getMessages(user.id, partner.id);
      if (messages.length > lastCount) {
        // New messages arrived
        for (const msg of messages.slice(lastCount)) {
          appendMessage(container, msg, user.id);
        }
        container.scrollTop = container.scrollHeight;
        lastCount = messages.length;
        await markAsRead(user.id, partner.id);
      }
    } catch (err) {
      // Silently ignore poll errors
    }
  }, 3000);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  currentPartnerId = null;
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

export function cleanup() {
  stopPolling();
}
