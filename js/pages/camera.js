import { el, clearElement } from '../utils/dom.js';
import { getCurrentUser } from '../state.js';
import { uploadImage } from '../services/storage.js';
import { createShortV } from '../services/shortvs.js';

let stream = null;
let recorder = null;
let chunks = [];
let isRecording = false;
let facingMode = 'user';
let timerInterval = null;
let recordedBlob = null;

export async function render(container) {
  const user = getCurrentUser();
  if (!user) return;

  clearElement(container);
  recordedBlob = null;
  isRecording = false;

  // Full screen camera
  const view = el('div', { className: 'camera-view' });

  const video = el('video', {
    className: 'camera-live',
    autoplay: 'autoplay',
    playsinline: 'playsinline',
    muted: 'muted',
  });

  // Top bar
  const topBar = el('div', { className: 'cam-top' }, [
    el('button', { className: 'cam-close', innerHTML: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>', onClick: () => { stopCam(); window.location.hash = '#/shortvs'; } }),
  ]);

  // Bottom controls
  const bottom = el('div', { className: 'cam-bottom' });

  // Flip button
  const flipBtn = el('button', { className: 'cam-side-btn', innerHTML: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M20 7l-4-4v3H8a4 4 0 0 0 0 8h1M4 17l4 4v-3h8a4 4 0 0 0 0-8h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>', onClick: async () => {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    await startCam(video);
  }});

  // Record button
  const recBtn = el('button', { className: 'cam-record' }, [
    el('div', { className: 'cam-record-dot' }),
  ]);

  // Upload from gallery
  const galBtn = el('button', { className: 'cam-side-btn', innerHTML: '<svg viewBox="0 0 24 24" width="24" height="24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8.5" cy="8.5" r="1.5" fill="none" stroke="currentColor" stroke-width="2"/><polyline points="21 15 16 10 5 21" fill="none" stroke="currentColor" stroke-width="2"/></svg>', onClick: () => {
    const inp = el('input', { type: 'file', accept: 'video/*', style: { display: 'none' } });
    inp.addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      recordedBlob = f;
      showPreview(user);
      inp.remove();
    });
    document.body.appendChild(inp);
    inp.click();
  }});

  // Timer text
  const timerText = el('div', { className: 'cam-timer' });

  let startTime = 0;
  let timerUpdate = null;

  recBtn.addEventListener('click', () => {
    if (!isRecording) {
      // START recording
      chunks = [];
      try {
        recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      } catch(e) {
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        recordedBlob = new Blob(chunks, { type: 'video/webm' });
        showPreview(user);
      };

      recorder.start();
      isRecording = true;
      startTime = Date.now();
      recBtn.classList.add('recording');

      timerUpdate = setInterval(() => {
        const sec = Math.floor((Date.now() - startTime) / 1000);
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        timerText.textContent = `${m}:${s.toString().padStart(2, '0')}`;
      }, 200);

    } else {
      // STOP recording
      if (recorder && recorder.state === 'recording') {
        recorder.stop();
      }
      isRecording = false;
      recBtn.classList.remove('recording');
      clearInterval(timerUpdate);
      timerText.textContent = '';
    }
  });

  bottom.append(flipBtn, recBtn, galBtn);
  view.append(video, topBar, timerText, bottom);
  container.appendChild(view);

  // Start camera
  await startCam(video);
}

async function startCam(videoEl) {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
    });
    videoEl.srcObject = stream;
    await videoEl.play();
  } catch (err) {
    console.error('Camera error:', err);
    alert('Please allow camera access');
  }
}

function stopCam() {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  if (timerInterval) clearTimeout(timerInterval);
}

function showPreview(user) {
  if (!recordedBlob) return;

  const url = URL.createObjectURL(recordedBlob);

  const overlay = el('div', { className: 'cam-preview' });

  const vid = el('video', { src: url, controls: 'controls', playsinline: 'playsinline', autoplay: 'autoplay' });
  vid.style.cssText = 'width:100%;flex:1;object-fit:contain;background:#000';

  const caption = el('input', { type: 'text', placeholder: 'Write a caption...', className: 'cam-caption' });

  const btns = el('div', { className: 'cam-preview-btns' });

  const retakeBtn = el('button', { className: 'cam-retake', textContent: '✕ Retake', onClick: () => {
    overlay.remove();
    URL.revokeObjectURL(url);
    recordedBlob = null;
  }});

  const postBtn = el('button', { className: 'cam-post', textContent: 'Post', onClick: async () => {
    postBtn.disabled = true;
    postBtn.textContent = 'Posting...';
    try {
      const videoUrl = await uploadImage('shortvs', recordedBlob, user.id);
      await createShortV({ videoUrl, caption: caption.value.trim(), userId: user.id });
      overlay.remove();
      URL.revokeObjectURL(url);
      recordedBlob = null;
      stopCam();
      window.location.hash = '#/shortvs';
    } catch (err) {
      console.error(err);
      alert('Upload failed');
      postBtn.disabled = false;
      postBtn.textContent = 'Post';
    }
  }});

  btns.append(retakeBtn, postBtn);
  overlay.append(vid, caption, btns);
  document.body.appendChild(overlay);
}

export function cleanup() {
  stopCam();
  isRecording = false;
  recordedBlob = null;
  document.querySelectorAll('.cam-preview').forEach(e => e.remove());
}
