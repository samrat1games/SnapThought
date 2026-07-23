/**
 * Live Stream Detail Page — WebRTC broadcaster/viewer with camera, mic, screen
 */

import { getCurrentUserId } from '../supabase.js';
import {
  LiveStreamingService, startViewing, stopViewing, stopBroadcast,
  toggleMic, toggleCamera, shareScreen, getLocalStream, getScreenStreamActive,
} from '../services/live-streaming.js';
import { createLiveChat, createGiftPanel } from '../components/live-card.js';
import { el, clearElement } from '../utils/dom.js';

let messageInterval = null;
let currentStreamId = null;
let isOwner = false;
let viewerStream = null;

export async function render(container, params = {}) {
  currentStreamId = params.streamId;
  if (!currentStreamId) return;

  clearElement(container);

  const currentUserId = await getCurrentUserId();

  container.appendChild(el('div', { className: 'live-detail-page' }, [
    el('div', { className: 'live-detail__container' }, [
      el('div', { className: 'live-detail__main', id: 'liveMain' }, [
        el('div', { className: 'loading', textContent: 'Loading stream...' })
      ]),
      el('div', { className: 'live-detail__sidebar' }, [
        el('div', { id: 'liveChat', className: 'live-chat-container' }, [
          el('div', { className: 'loading', textContent: 'Loading chat...' })
        ]),
        el('div', { className: 'live-detail__actions', id: 'liveActions' })
      ])
    ])
  ]));

  await loadStreamData(currentStreamId, currentUserId);
  await loadChatData(currentStreamId);
  setupActions(currentStreamId, currentUserId);

  messageInterval = setInterval(() => loadChatData(currentStreamId), 3000);
}

async function loadStreamData(streamId, currentUserId) {
  try {
    const stream = await LiveStreamingService.getLiveStream(streamId);
    const container = document.getElementById('liveMain');
    if (!container) return;

    isOwner = currentUserId && stream.user_id === currentUserId;

    clearElement(container);

    if (isOwner) {
      // BROADCASTER view
      await renderBroadcasterView(container, stream, streamId);
    } else {
      // VIEWER view
      await renderViewerView(container, stream, streamId, currentUserId);
    }
  } catch (error) {
    const container = document.getElementById('liveMain');
    if (container) container.innerHTML = `<p class="error">Error loading stream: ${error.message}</p>`;
  }
}

async function renderBroadcasterView(container, stream, streamId) {
  const video = el('video', {
    autoplay: 'autoplay', muted: 'muted', playsinline: 'playsinline',
    style: { width: '100%', borderRadius: '12px', background: '#000', minHeight: '300px', objectFit: 'contain' },
  });

  const statusBadge = el('div', {
    style: {
      position: 'absolute', top: '12px', left: '12px', padding: '6px 14px',
      background: '#ef4444', color: 'white', borderRadius: '8px', fontSize: '13px',
      fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px',
    },
  }, [
    el('span', { style: { width: '8px', height: '8px', borderRadius: '50%', background: 'white', display: 'inline-block', animation: 'pulse 1.5s infinite' } }),
    el('span', { textContent: 'LIVE' }),
  ]);

  const titleEl = el('div', {
    style: { padding: '12px 0 0', fontSize: '18px', fontWeight: '700' },
    textContent: stream.title,
  });

  const videoWrapper = el('div', { style: { position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000' } }, [video, statusBadge]);

  // Controls
  const controls = el('div', {
    style: {
      display: 'flex', gap: '10px', padding: '12px 0', justifyContent: 'center', flexWrap: 'wrap',
    },
  });

  let micOn = true;
  let camOn = true;

  const micBtn = el('button', {
    className: 'btn',
    innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="19" x2="12" y2="23" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="8" y1="23" x2="16" y2="23" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    title: 'Toggle mic',
    style: { padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', color: 'var(--text-primary)' },
    onClick: () => {
      micOn = toggleMic();
      micBtn.style.background = micOn ? 'var(--bg-secondary)' : '#ef4444';
      micBtn.style.color = micOn ? 'var(--text-primary)' : 'white';
    },
  });

  const camBtn = el('button', {
    className: 'btn',
    innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M23 7l-7 5 7 5V7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    title: 'Toggle camera',
    style: { padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', color: 'var(--text-primary)' },
    onClick: () => {
      camOn = toggleCamera();
      camBtn.style.background = camOn ? 'var(--bg-secondary)' : '#ef4444';
      camBtn.style.color = camOn ? 'var(--text-primary)' : 'white';
    },
  });

  const screenBtn = el('button', {
    className: 'btn',
    innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="8" y1="21" x2="16" y2="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="17" x2="12" y2="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    title: 'Share screen',
    style: { padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', color: 'var(--text-primary)' },
    onClick: async () => {
      try {
        await shareScreen();
        screenBtn.style.background = '#6366f1';
        screenBtn.style.color = 'white';
      } catch (e) {
        console.error('Screen share failed:', e);
      }
    },
  });

  window.addEventListener('screen-share-stopped', () => {
    screenBtn.style.background = 'var(--bg-secondary)';
    screenBtn.style.color = 'var(--text-primary)';
  });

  const endBtn = el('button', {
    className: 'btn',
    textContent: 'End Stream',
    style: {
      padding: '10px 20px', borderRadius: '10px', border: 'none',
      background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: '700',
    },
    onClick: async () => {
      if (!confirm('End this stream?')) return;
      stopBroadcast();
      await LiveStreamingService.endLiveStream(streamId);
      window.location.hash = '#/live';
    },
  });

  controls.append(micBtn, camBtn, screenBtn, endBtn);

  container.append(videoWrapper, titleEl, controls);

  // Set video from local stream
  const localStream = getLocalStream();
  if (localStream) {
    video.srcObject = localStream;
  }
}

async function renderViewerView(container, stream, streamId, currentUserId) {
  const video = el('video', {
    autoplay: 'autoplay', playsinline: 'playsinline',
    style: { width: '100%', borderRadius: '12px', background: '#000', minHeight: '300px', objectFit: 'contain' },
  });

  const statusBadge = el('div', {
    style: {
      position: 'absolute', top: '12px', left: '12px', padding: '6px 14px',
      background: '#ef4444', color: 'white', borderRadius: '8px', fontSize: '13px',
      fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px',
    },
  }, [
    el('span', { style: { width: '8px', height: '8px', borderRadius: '50%', background: 'white', display: 'inline-block', animation: 'pulse 1.5s infinite' } }),
    el('span', { textContent: 'LIVE' }),
  ]);

  const titleEl = el('div', {
    style: { padding: '12px 0 0', fontSize: '18px', fontWeight: '700' },
    textContent: stream.title,
  });

  const videoWrapper = el('div', { style: { position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000' } }, [video, statusBadge]);

  container.append(videoWrapper, titleEl);

  // Start viewing via WebRTC
  if (currentUserId) {
    try {
      viewerStream = await startViewing(streamId, currentUserId);
      if (viewerStream) {
        video.srcObject = viewerStream;
      }
    } catch (e) {
      console.error('WebRTC viewing failed, stream may not be active yet:', e);
      // Show placeholder
      container.appendChild(el('div', {
        style: { padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' },
      }, [
        el('p', { textContent: 'Waiting for broadcaster to start...' }),
        el('p', { textContent: 'The stream will appear here once the broadcaster is live.', style: { fontSize: '13px' } }),
      ]));
    }
  }
}

function setupActions(streamId, currentUserId) {
  const actionsEl = document.getElementById('liveActions');
  if (!actionsEl) return;

  const likeBtn = el('button', {
    className: 'btn btn-icon',
    style: { flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '14px' },
    innerHTML: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    onClick: async () => {
      try {
        await LiveStreamingService.likeStream(streamId);
        likeBtn.style.color = '#ef4444';
      } catch (e) { /* ignore */ }
    },
  });

  const giftBtn = el('button', {
    className: 'btn btn-icon',
    style: { flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '14px' },
    innerHTML: '<svg viewBox="0 0 24 24" width="18" height="18"><polyline points="20 12 20 22 4 22 4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="2" y="7" width="20" height="5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="22" x2="12" y2="7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    onClick: () => {
      const sidebar = document.querySelector('.live-detail__sidebar');
      if (sidebar) sidebar.appendChild(createGiftPanel());
    },
  });

  const shareBtn = el('button', {
    className: 'btn btn-icon',
    style: { flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '14px' },
    innerHTML: '<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="18" cy="5" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="6" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="19" r="3" fill="none" stroke="currentColor" stroke-width="2"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    onClick: async () => {
      const url = `${window.location.origin}${window.location.pathname}#/live/${streamId}`;
      if (navigator.share) {
        await navigator.share({ title: 'Check out this live stream!', url });
      } else {
        await navigator.clipboard.writeText(url);
        shareBtn.style.color = '#10b981';
        setTimeout(() => shareBtn.style.color = '', 1500);
      }
    },
  });

  actionsEl.append(likeBtn, giftBtn, shareBtn);
}

async function loadChatData(streamId) {
  try {
    const messages = await LiveStreamingService.getStreamMessages(streamId);
    const container = document.getElementById('liveChat');
    if (!container) return;

    const chat = createLiveChat(messages);
    clearElement(container);
    container.appendChild(chat);

    const messagesDiv = container.querySelector('#liveMessages');
    if (messagesDiv) messagesDiv.scrollTop = messagesDiv.scrollHeight;

    const chatBtn = container.querySelector('#sendChatBtn');
    if (chatBtn) chatBtn.addEventListener('click', () => sendChatMessage(streamId));

    const chatInput = container.querySelector('#chatInput');
    if (chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(streamId); });
  } catch (error) {
    console.error('Error loading chat:', error);
  }
}

async function sendChatMessage(streamId) {
  const input = document.querySelector('#chatInput');
  if (!input || !input.value.trim()) return;
  try {
    await LiveStreamingService.sendChatMessage(streamId, input.value);
    input.value = '';
    await loadChatData(streamId);
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

export function cleanup() {
  if (messageInterval) clearInterval(messageInterval);
  messageInterval = null;
  currentStreamId = null;
  isOwner = false;
  stopViewing();
}
