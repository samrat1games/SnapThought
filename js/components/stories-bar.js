import { el } from '../utils/dom.js';
import { getCurrentUser } from '../state.js';
import { getActiveStories, getStoriesByUser, viewStory, hasViewedStory, createStory, deleteStory } from '../services/stories.js';
import { uploadImage } from '../services/storage.js';
import { renderAvatar } from './avatar.js';

export async function renderStoriesBar(container) {
  const user = getCurrentUser();
  if (!user) return;

  try {
    let stories;
    try {
      stories = await getActiveStories({ limit: 50 });
    } catch (tableErr) {
      if (tableErr.code === 'PGRST205' || String(tableErr.message || '').includes('Could not find the table')) {
        renderStoriesPlaceholder(container, user);
        return;
      }
      throw tableErr;
    }

    // Group by user
    const userStories = new Map();
    for (const story of stories) {
      const uid = story.user_id;
      if (!userStories.has(uid)) {
        userStories.set(uid, {
          profile: story.profiles,
          stories: [],
          viewed: false,
        });
      }
      userStories.get(uid).stories.push(story);
    }

    // Check viewed status for each user's stories
    for (const [uid, data] of userStories) {
      if (uid !== user.id && data.stories.length > 0) {
        data.viewed = await hasViewedStory(data.stories[0].id, user.id);
      }
      if (uid === user.id) {
        data.viewed = true; // Own stories don't show ring
      }
    }

    // Sort: unviewed first, then viewed
    const sorted = [...userStories.values()].sort((a, b) => {
      if (a.viewed === b.viewed) return 0;
      return a.viewed ? 1 : -1;
    });

    if (sorted.length === 0 && !user) return;

    const bar = el('div', { className: 'stories-bar' });

    // "Your story" - view if has stories, create if empty
    const myStories = userStories.get(user.id);
    const hasMyStories = myStories && myStories.stories.length > 0;

    const yourStory = el('div', { className: 'stories-item your-story' }, [
      el('div', { className: 'stories-avatar-wrapper' + (hasMyStories ? ' viewed' : '') }, [
        renderAvatar(user, 'md'),
        el('div', { className: 'stories-add-badge' }, [
          el('span', { textContent: hasMyStories ? '>' : '+', style: { fontSize: hasMyStories ? '14px' : '18px', fontWeight: '700', color: '#fff' } }),
        ]),
      ]),
      el('span', { className: 'stories-name', textContent: 'Your story' }),
    ]);

    yourStory.addEventListener('click', () => {
      if (hasMyStories) {
        openStoryViewer(myStories.stories, user);
      } else {
        openCreateStory(user);
      }
    });

    bar.appendChild(yourStory);

    // Other users' stories
    for (const data of sorted) {
      if (data.profile?.id === user.id) continue;
      const item = el('div', { className: 'stories-item' }, [
        el('div', { className: 'stories-avatar-wrapper' + (data.viewed ? ' viewed' : '') }, [
          renderAvatar(data.profile, 'md'),
        ]),
        el('span', { className: 'stories-name', textContent: data.profile?.display_name || 'User' }),
      ]);
      item.addEventListener('click', () => {
        openStoryViewer(data.stories, user);
      });
      bar.appendChild(item);
    }

    container.appendChild(bar);
  } catch (err) {
    console.error('Failed to load stories:', err);
  }
}

function renderStoriesPlaceholder(container, user) {
  const bar = el('div', { className: 'stories-bar' });
  const yourStory = el('div', { className: 'stories-item your-story', onClick: () => openCreateStory(user) }, [
    el('div', { className: 'stories-avatar-wrapper' }, [
      renderAvatar(user, 'md'),
      el('div', { className: 'stories-add-badge' }, [
        el('span', { textContent: '+', style: { fontSize: '18px', fontWeight: '700', color: '#fff' } }),
      ]),
    ]),
    el('span', { className: 'stories-name', textContent: 'Your story' }),
  ]);
  bar.appendChild(yourStory);
  container.appendChild(bar);
}

function openStoryViewer(stories, currentUser) {
  let currentIndex = 0;
  let timer = null;

  const overlay = el('div', { className: 'story-viewer-overlay' });
  const viewer = el('div', { className: 'story-viewer' });

  // Progress bar
  const progressBar = el('div', { className: 'story-progress-bar' });
  const progressSegments = el('div', { className: 'story-progress-segments' });
  for (let i = 0; i < stories.length; i++) {
    progressSegments.appendChild(el('div', { className: 'story-progress-segment' }));
  }
  progressBar.appendChild(progressSegments);

  // Content area
  const contentArea = el('div', { className: 'story-content' });

  // Header
  const header = el('div', { className: 'story-header' });

  // Close button
  const closeBtn = el('button', { className: 'story-close', innerHTML: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' });
  closeBtn.addEventListener('click', () => {
    clearInterval(timer);
    overlay.remove();
  });

  // Delete button (own stories)
  const deleteBtn = el('button', { className: 'story-delete', innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' });
  deleteBtn.style.display = stories[0]?.user_id === currentUser.id ? '' : 'none';
  deleteBtn.addEventListener('click', async () => {
    if (confirm('Delete this story?')) {
      await deleteStory(stories[currentIndex].id);
      stories.splice(currentIndex, 1);
      if (stories.length === 0) {
        overlay.remove();
      } else {
        currentIndex = Math.min(currentIndex, stories.length - 1);
        showStory();
      }
    }
  });

  header.append(progressBar, closeBtn, deleteBtn);

  // Navigation
  const prevArea = el('div', { className: 'story-nav story-nav-prev' });
  const nextArea = el('div', { className: 'story-nav story-nav-next' });

  prevArea.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      showStory();
    }
  });

  nextArea.addEventListener('click', () => {
    if (currentIndex < stories.length - 1) {
      currentIndex++;
      showStory();
    } else {
      clearInterval(timer);
      overlay.remove();
    }
  });

  viewer.append(header, contentArea, prevArea, nextArea);
  overlay.appendChild(viewer);
  document.body.appendChild(overlay);

  function showStory() {
    const story = stories[currentIndex];
    contentArea.innerHTML = '';

    // Update progress
    progressSegments.querySelectorAll('.story-progress-segment').forEach((seg, i) => {
      seg.classList.toggle('active', i === currentIndex);
      seg.classList.toggle('done', i < currentIndex);
    });

    // Media
    if (story.video_url) {
      const video = el('video', {
        src: story.video_url,
        autoplay: 'autoplay',
        playsinline: 'playsinline',
        className: 'story-media',
      });
      contentArea.appendChild(video);
    } else if (story.image_url) {
      contentArea.appendChild(el('img', { src: story.image_url, className: 'story-media' }));
    }

    // Caption
    if (story.caption) {
      contentArea.appendChild(el('div', { className: 'story-caption', textContent: story.caption }));
    }

    // Mark as viewed
    viewStory(story.id, currentUser.id);

    // Auto-advance
    clearInterval(timer);
    timer = setInterval(() => {
      if (currentIndex < stories.length - 1) {
        currentIndex++;
        showStory();
      } else {
        clearInterval(timer);
        overlay.remove();
      }
    }, 5000);
  }

  showStory();
}

function openCreateStory(user) {
  let storyFile = null;
  let storyType = 'image';

  const overlay = el('div', { className: 'composer-overlay', onClick: (e) => {
    if (e.target === overlay) overlay.remove();
  }});

  const modal = el('div', { className: 'composer-modal', style: { maxWidth: '400px' } }, [
    el('div', { className: 'composer-header' }, [
      el('h3', { textContent: 'Add to your story', style: { fontSize: '16px', fontWeight: '700' } }),
      el('button', { className: 'composer-close', textContent: '\u00D7', onClick: () => overlay.remove() }),
    ]),
  ]);

  const previewArea = el('div', { className: 'shortvs-create-preview', style: { minHeight: '180px' } }, [
    el('div', { className: 'shortvs-create-upload-hint', innerHTML: '<svg viewBox="0 0 24 24" width="48" height="48"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>' }),
    el('div', { textContent: 'Tap to select image', style: { color: 'var(--text-secondary)', fontSize: '14px' } }),
  ]);

  const fileInput = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    storyFile = file;
    const url = URL.createObjectURL(file);
    previewArea.innerHTML = '';
    previewArea.appendChild(el('img', { src: url, style: { width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '12px' } }));
  });

  previewArea.addEventListener('click', () => fileInput.click());

  const captionInput = el('input', { className: 'input', placeholder: 'Add a caption...', style: { marginTop: '12px' } });

  const postBtn = el('button', {
    className: 'btn btn-primary btn-lg',
    textContent: 'Share to story',
    style: { width: '100%', marginTop: '12px' },
    onClick: async () => {
      if (!storyFile) { alert('Select an image first'); return; }
      postBtn.disabled = true;
      postBtn.textContent = 'Sharing...';
      try {
        const imageUrl = await uploadImage('stories', storyFile, user.id);
        await createStory({ userId: user.id, imageUrl, caption: captionInput.value.trim() });
        overlay.remove();
        window.dispatchEvent(new CustomEvent('stories-updated'));
      } catch (err) {
        console.error('Failed to create story:', err);
        if (String(err.message || '').includes('Bucket not found')) {
          alert('Stories storage is not configured yet. Please ask an admin to set up the stories bucket.');
        } else {
          alert('Failed to share story');
        }
      }
      postBtn.disabled = false;
      postBtn.textContent = 'Share to story';
    },
  });

  const body = el('div', { style: { padding: '16px' } }, [
    previewArea, fileInput, captionInput, postBtn,
  ]);

  modal.appendChild(body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
