/**
 * Live Streams Page — with real camera/screen streaming
 */

import { getCurrentUserId } from '../supabase.js';
import { LiveStreamingService, getCameraStream, getScreenStream, getDevices, stopBroadcast } from '../services/live-streaming.js';
import { createLiveCard } from '../components/live-card.js';
import { el, clearElement } from '../utils/dom.js';

let localVideoStream = null;

export async function render(container, params = {}) {
  const currentUserId = await getCurrentUserId();

  clearElement(container);

  container.appendChild(el('div', { className: 'live-page' }, [
    el('div', { className: 'live-header' }, [
      el('h1', { textContent: 'Live Streams' }),
      ...(currentUserId ? [
        el('button', {
          className: 'btn btn-primary',
          id: 'goLiveBtn',
          textContent: 'Go Live',
          onClick: () => showGoLiveDialog(currentUserId),
        })
      ] : [])
    ]),
    el('div', { id: 'liveStreams', className: 'live-grid' }, [
      el('div', { className: 'loading', textContent: 'Loading live streams...' })
    ])
  ]));

  await loadStreams();
}

async function loadStreams() {
  const container = document.getElementById('liveStreams');
  if (!container) return;

  try {
    const { data: streams } = await LiveStreamingService.getActiveStreams();
    if (!streams || streams.length === 0) {
      container.innerHTML = '<p class="empty-state">No active streams right now. Be the first to go live!</p>';
      return;
    }
    clearElement(container);
    streams.forEach(stream => {
      container.appendChild(createLiveCard(stream));
    });
  } catch (error) {
    container.innerHTML = `<p class="error">Error loading streams: ${error.message}</p>`;
  }
}

async function showGoLiveDialog(userId) {
  // Check if camera is available
  let hasCamera = false;
  let hasMic = false;
  try {
    const devices = await getDevices();
    hasCamera = devices.cameras.length > 0;
    hasMic = devices.microphones.length > 0;
  } catch (e) {
    // Permissions not yet granted
  }

  const dialog = el('div', { className: 'password-modal-overlay', id: 'goLiveDialog' });
  const errorDiv = el('div', { className: 'auth-error', style: { display: 'none', marginBottom: '12px' } });

  const titleInput = el('input', { className: 'input', placeholder: 'Stream title', style: { marginBottom: '8px' } });
  const descInput = el('input', { className: 'input', placeholder: 'Description (optional)', style: { marginBottom: '12px' } });

  // Source selection
  let selectedSource = 'camera';
  const sourceBtns = el('div', { style: { display: 'flex', gap: '8px', marginBottom: '16px' } });

  const cameraBtn = el('button', {
    className: 'btn',
    textContent: '📷 Camera',
    style: {
      flex: 1, padding: '12px', borderRadius: '10px', fontWeight: '600', fontSize: '14px',
      border: '2px solid var(--accent)', background: 'var(--accent-bg)', color: 'var(--text-primary)', cursor: 'pointer',
    },
    onClick: () => {
      selectedSource = 'camera';
      cameraBtn.style.borderColor = 'var(--accent)';
      cameraBtn.style.background = 'var(--accent-bg)';
      screenBtn.style.borderColor = 'var(--border-color)';
      screenBtn.style.background = 'var(--bg-secondary)';
    },
  });

  const screenBtn = el('button', {
    className: 'btn',
    textContent: '🖥️ Screen',
    style: {
      flex: 1, padding: '12px', borderRadius: '10px', fontWeight: '600', fontSize: '14px',
      border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer',
    },
    onClick: () => {
      selectedSource = 'screen';
      screenBtn.style.borderColor = 'var(--accent)';
      screenBtn.style.background = 'var(--accent-bg)';
      cameraBtn.style.borderColor = 'var(--border-color)';
      cameraBtn.style.background = 'var(--bg-secondary)';
    },
  });

  sourceBtns.append(cameraBtn, screenBtn);

  // Preview video
  const previewVideo = el('video', {
    autoplay: 'autoplay', muted: 'muted', playsinline: 'playsinline',
    style: { width: '100%', borderRadius: '12px', background: '#000', maxHeight: '200px', objectFit: 'cover', display: 'none' },
  });

  // Start button
  const startBtn = el('button', {
    className: 'btn-confirm',
    textContent: 'Start Live Stream',
    style: {
      background: '#ef4444', color: 'white', padding: '14px 24px',
      fontSize: '16px', fontWeight: '700', borderRadius: '10px', width: '100%',
      border: 'none', cursor: 'pointer', marginTop: '8px',
    },
    onClick: async () => {
      const title = titleInput.value.trim();
      if (!title) { errorDiv.textContent = 'Enter a stream title'; errorDiv.style.display = 'block'; return; }

      startBtn.disabled = true;
      startBtn.textContent = 'Starting...';
      errorDiv.style.display = 'none';

      try {
        // Get media stream
        let stream;
        if (selectedSource === 'camera') {
          stream = await getCameraStream();
        } else {
          stream = await getScreenStream();
        }

        // Create stream in DB
        const dbStream = await LiveStreamingService.startLiveStream(title, descInput.value.trim());

        // Start WebRTC broadcast
        const { startBroadcast } = await import('../services/live-streaming.js');
        await startBroadcast(dbStream.id, stream);

        dialog.remove();
        window.location.hash = `#/live/${dbStream.id}`;
      } catch (err) {
        errorDiv.textContent = err.message || 'Failed to start stream';
        errorDiv.style.display = 'block';
        startBtn.disabled = false;
        startBtn.textContent = 'Start Live Stream';
      }
    },
  });

  // Preview camera on open
  setTimeout(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      localVideoStream = stream;
      previewVideo.srcObject = stream;
      previewVideo.style.display = 'block';
    } catch (e) {
      // Camera not available, that's OK
    }
  }, 100);

  dialog.appendChild(el('div', { className: 'password-modal', style: { maxWidth: '480px' } }, [
    el('h2', { textContent: 'Go Live' }),
    el('p', { textContent: 'Choose your source and start streaming.' }),
    titleInput,
    descInput,
    el('div', { textContent: 'Stream source:', style: { fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-secondary)' } }),
    sourceBtns,
    previewVideo,
    errorDiv,
    startBtn,
    el('button', {
      className: 'btn btn-outline',
      textContent: 'Cancel',
      style: { width: '100%', marginTop: '8px' },
      onClick: () => {
        if (localVideoStream) {
          localVideoStream.getTracks().forEach(t => t.stop());
          localVideoStream = null;
        }
        dialog.remove();
      },
    }),
  ]));

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      if (localVideoStream) {
        localVideoStream.getTracks().forEach(t => t.stop());
        localVideoStream = null;
      }
      dialog.remove();
    }
  });

  document.body.appendChild(dialog);
  titleInput.focus();
}
