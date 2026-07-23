import { el } from '../utils/dom.js';
import { getCurrentUser } from '../state.js';
import { createPost } from '../services/posts.js';
import { uploadImage } from '../services/storage.js';
import { validateImageType, validateFileSize, previewImage } from '../utils/image.js';
import { renderAvatar } from './avatar.js';
import { getLocationString } from '../utils/geolocation.js';
import { saveDraft, getDrafts, deleteDraft } from '../services/drafts.js';
import { savePostHashtags } from '../services/hashtags.js';
import { createPoll } from '../services/polls.js';
import { canCreatePost, recordPostCreation } from '../utils/rate-limit.js';
import { searchGifs, getTrendingGifs } from '../services/giphy.js';

const IMAGE_FILTERS = [
  { name: 'Normal', css: 'none' },
  { name: 'Clarendon', css: 'contrast(1.2) saturate(1.35)' },
  { name: 'Gingham', css: 'brightness(1.05) hue-rotate(-10deg) saturate(0.8)' },
  { name: 'Moon', css: 'grayscale(1) contrast(1.1) brightness(1.1)' },
  { name: 'Lark', css: 'contrast(0.9) brightness(1.15) saturate(1.2)' },
  { name: 'Reyes', css: 'sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)' },
  { name: 'Juno', css: 'contrast(1.1) brightness(1.05) saturate(1.4) sepia(0.08)' },
  { name: 'Slumber', css: 'saturate(0.66) brightness(1.05) sepia(0.15)' },
  { name: 'Aden', css: 'hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)' },
  { name: 'Perpetua', css: 'saturate(1.25) contrast(1.1) brightness(1.05)' },
  { name: 'Valencia', css: 'contrast(1.08) brightness(1.08) sepia(0.08) saturate(1.2)' },
  { name: 'X-Pro', css: 'contrast(1.2) brightness(1.15) saturate(1.3) sepia(0.05)' },
];

let overlay = null;

export function openComposer(replyTo = null) {
  if (overlay) closeComposer();

  const user = getCurrentUser();
  if (!user) return;

  // If not a reply, show choice between Post and ShortV
  if (!replyTo) {
    showCreateChoice(user);
    return;
  }

  openPostComposer(user, replyTo);
}

function showCreateChoice(user) {
  overlay = el('div', { className: 'composer-overlay', onClick: (e) => {
    if (e.target === overlay) closeComposer();
  }}, [
    el('div', { className: 'composer-modal', style: { maxWidth: '340px' } }, [
      el('div', { className: 'composer-header' }, [
        el('h3', { textContent: 'Create', style: { fontSize: '16px', fontWeight: '700' } }),
        el('button', { className: 'composer-close', textContent: '\u00D7', onClick: closeComposer }),
      ]),
      el('div', { style: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' } }, [
        el('button', {
          style: {
            display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            borderRadius: '12px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '15px', fontWeight: '600',
          },
          innerHTML: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M3 5.5C3 4.119 4.119 3 5.5 3h13C19.881 3 21 4.119 21 5.5v13c0 1.381-1.119 2.5-2.5 2.5h-13C4.119 21 3 19.881 3 18.5v-13zM5.5 5c-.276 0-.5.224-.5.5v9.086l3-3 3 3 5-5 3 3V5.5c0-.276-.224-.5-.5-.5h-13zM19 15.414l-3-3-5 5-3-3-3 3V18.5c0 .276.224.5.5.5h13c.276 0 .5-.224.5-.5v-3.086zM9.75 7C8.784 7 8 7.784 8 8.75s.784 1.75 1.75 1.75 1.75-.784 1.75-1.75S10.716 7 9.75 7z"/></svg> Post',
          onClick: () => { closeComposer(); openPostComposer(user); },
        }),
        el('button', {
          style: {
            display: 'flex', alignItems: 'center', gap: '12px', padding: '16px',
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            borderRadius: '12px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '15px', fontWeight: '600',
          },
          innerHTML: '<svg viewBox="0 0 24 24" width="24" height="24"><polygon points="5 3 19 12 5 21 5 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> ShortV',
          onClick: () => { closeComposer(); window.location.hash = '#/camera'; },
        }),
      ]),
    ]),
  ]);

  document.body.appendChild(overlay);
}

function openPostComposer(user, replyTo = null) {
  let mediaFile = null;
  let mediaUrl = '';
  let mediaType = 'none';
  let locationData = null;
  let showPoll = false;
  let pollOptions = ['', ''];
  let selectedImages = [];

  let selectedFilter = 'none';

  const textarea = el('textarea', {
    className: 'composer-textarea',
    placeholder: replyTo ? 'Post your reply' : "What's happening?",
    onInput: () => updateCharCount(),
  });

  const charCount = el('span', { className: 'char-counter', textContent: '0/280' });

  const locationPreview = el('div', { className: 'composer-location', style: { display: 'none', padding: '8px 16px', fontSize: '14px', color: 'var(--accent)', alignItems: 'center', gap: '6px' } });

  const pollSection = el('div', { className: 'composer-poll', style: { display: 'none', padding: '12px 16px', borderTop: '1px solid var(--border-color)' } });
  const pollOptionsContainer = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' } });

  function renderPollOptions() {
    pollOptionsContainer.innerHTML = '';
    pollOptions.forEach((opt, i) => {
      const input = el('input', {
        className: 'input',
        placeholder: `Option ${i + 1}`,
        value: opt,
        style: { fontSize: '14px', padding: '8px 12px' },
      });
      input.addEventListener('input', () => { pollOptions[i] = input.value; });
      const row = el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, [input]);
      if (pollOptions.length > 2) {
        const removeBtn = el('button', {
          textContent: '\u00D7',
          style: { background: 'none', color: 'var(--danger)', fontSize: '18px', cursor: 'pointer', padding: '4px' },
          onClick: () => { pollOptions.splice(i, 1); renderPollOptions(); },
        });
        row.appendChild(removeBtn);
      }
      pollOptionsContainer.appendChild(row);
    });
  }
  renderPollOptions();

  const addOptionBtn = el('button', {
    className: 'btn btn-outline btn-sm',
    textContent: '+ Add option',
    style: { alignSelf: 'flex-start' },
    onClick: () => {
      if (pollOptions.length < 6) {
        pollOptions.push('');
        renderPollOptions();
      }
    },
  });

  pollSection.append(el('div', { style: { fontWeight: '600', marginBottom: '8px', fontSize: '14px' }, textContent: 'Poll options' }), pollOptionsContainer, addOptionBtn);

  const mediaPreview = el('div', { className: 'composer-preview', style: { display: 'none' } });
  const previewMedia = el('div');
  const removeBtn = el('button', {
    className: 'composer-preview-remove',
    textContent: '\u00D7',
    onClick: () => {
      mediaFile = null;
      mediaUrl = '';
      mediaType = 'none';
      mediaPreview.style.display = 'none';
      previewMedia.innerHTML = '';
      fileInput.value = '';
      videoInput.value = '';
    },
  });
  mediaPreview.append(previewMedia, removeBtn);

  const filterBar = el('div', { className: 'composer-filter-bar', style: { display: 'none', padding: '8px 16px', overflowX: 'auto', whiteSpace: 'nowrap', borderTop: '1px solid var(--border-color)' } });

  function renderFilterBar() {
    filterBar.innerHTML = '';
    for (const f of IMAGE_FILTERS) {
      const btn = el('button', {
        className: 'filter-chip' + (selectedFilter === f.css ? ' active' : ''),
        textContent: f.name,
        style: {
          display: 'inline-block', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '600',
          border: '1px solid ' + (selectedFilter === f.css ? 'var(--accent)' : 'var(--border-color)'),
          background: selectedFilter === f.css ? 'var(--accent)' : 'var(--bg-secondary)',
          color: selectedFilter === f.css ? '#fff' : 'var(--text-primary)',
          cursor: 'pointer', marginRight: '6px', transition: 'all 0.15s',
        },
      });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedFilter = f.css;
        renderFilterBar();
        // Apply filter to preview image
        const img = previewMedia.querySelector('img');
        if (img) img.style.filter = f.css === 'none' ? '' : f.css;
      });
      filterBar.appendChild(btn);
    }
  }

  const fileInput = el('input', {
    type: 'file',
    accept: 'image/jpeg,image/png,image/webp,image/gif',
    multiple: 'multiple',
    style: { display: 'none' },
    onChange: async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      for (const file of files) {
        if (!validateImageType(file)) return alert('Invalid image type');
        if (!validateFileSize(file, 10)) return alert('Image too large (max 10MB)');
      }
      if (files.length === 1) {
        // Single image
        mediaFile = files[0];
        mediaType = 'image';
        mediaUrl = await previewImage(files[0]);
        selectedImages = [mediaUrl];
        previewMedia.innerHTML = '';
        previewMedia.appendChild(el('img', { src: mediaUrl, style: { width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '12px' } }));
      } else {
        // Multiple images - carousel preview
        mediaFile = null;
        mediaType = 'image';
        selectedImages = [];
        previewMedia.innerHTML = '';
        const previewTrack = el('div', { className: 'carousel-preview-track', style: { display: 'flex', overflowX: 'auto', gap: '8px', scrollSnapType: 'x mandatory' } });
        for (const file of files) {
          const url = await previewImage(file);
          selectedImages.push(url);
          previewTrack.appendChild(el('div', { className: 'carousel-preview-slide', style: { flex: '0 0 100%', scrollSnapAlign: 'start' } }, [
            el('img', { src: url, style: { width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '12px' } }),
          ]));
        }
        previewMedia.appendChild(previewTrack);
        mediaFile = files; // Store all files
      }
      mediaPreview.style.display = 'block';
      selectedFilter = 'none';
      renderFilterBar();
      filterBar.style.display = 'block';
    },
  });

  const videoInput = el('input', {
    type: 'file',
    accept: 'video/mp4,video/webm,video/ogg',
    style: { display: 'none' },
    onChange: async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!validateFileSize(file, 50)) return alert('Video too large (max 50MB)');
      mediaFile = file;
      mediaType = 'video';
      const url = URL.createObjectURL(file);
      previewMedia.innerHTML = '';
      previewMedia.appendChild(el('video', { src: url, controls: 'controls', style: { width: '100%', maxHeight: '300px', borderRadius: '12px' } }));
      mediaPreview.style.display = 'block';
      filterBar.style.display = 'none';
    },
  });

  const postBtn = el('button', {
    className: 'btn btn-primary',
    textContent: replyTo ? 'Reply' : 'Post',
    onClick: async () => {
      const content = textarea.value.trim();
      if (!content && !mediaUrl && !mediaFile) return;

      // Rate limit check
      const rateCheck = canCreatePost();
      if (!rateCheck.allowed) {
        alert(`You're posting too fast. Please wait ${rateCheck.waitMinutes} minute(s).`);
        return;
      }

      postBtn.disabled = true;
      postBtn.textContent = 'Posting...';

      try {
        let uploadedUrl = '';
        let uploadedImages = [];
        if (mediaFile) {
          try {
            if (Array.isArray(mediaFile)) {
              // Multiple images
              for (const file of mediaFile) {
                let url;
                if (selectedFilter !== 'none') {
                  url = await uploadImageWithFilter('post-images', file, user.id, selectedFilter);
                } else {
                  url = await uploadImage('post-images', file, user.id);
                }
                uploadedImages.push(url);
              }
              uploadedUrl = uploadedImages[0];
            } else {
              if (selectedFilter !== 'none') {
                uploadedUrl = await uploadImageWithFilter('post-images', mediaFile, user.id, selectedFilter);
              } else {
                uploadedUrl = await uploadImage('post-images', mediaFile, user.id);
              }
            }
          } catch (uploadErr) {
            console.warn('Media upload failed:', uploadErr);
          }
        }

        if (!content && !uploadedUrl) {
          alert('Please write something or add media');
          return;
        }

        const newPost = await createPost({
          content,
          imageUrl: mediaType === 'image' && uploadedImages.length <= 1 ? uploadedUrl : '',
          videoUrl: mediaType === 'video' ? uploadedUrl : '',
          mediaType: uploadedUrl ? (mediaType === 'image' && uploadedImages.length > 1 ? 'images' : mediaType) : 'none',
          replyTo,
          postType: replyTo ? 'reply' : 'original',
          images: uploadedImages.length > 1 ? uploadedImages : [],
        });

        // Save hashtags
        if (content) {
          savePostHashtags(newPost.id, content);
        }

        // Create poll if enabled
        if (showPoll && !replyTo) {
          const validOptions = pollOptions.filter(o => o.trim());
          if (validOptions.length >= 2) {
            createPoll(newPost.id, { options: validOptions, endsIn: 1440 });
          }
        }

        closeComposer();
        recordPostCreation();
        window.dispatchEvent(new CustomEvent('post-created'));
      } catch (err) {
        console.error('Failed to create post:', err);
        alert('Failed to create post');
      } finally {
        postBtn.disabled = false;
        postBtn.textContent = replyTo ? 'Reply' : 'Post';
      }
    },
  });

  function updateCharCount() {
    const len = textarea.value.length;
    charCount.textContent = `${len}/280`;
    charCount.className = 'char-counter' + (len > 260 ? ' danger' : len > 240 ? ' warn' : '');
    postBtn.disabled = len === 0 && !mediaFile;
  }

  overlay = el('div', { className: 'composer-overlay', onClick: (e) => {
    if (e.target === overlay) {
      if (textarea.value.trim() || mediaFile) {
        if (confirm('Save as draft?')) {
          saveDraft(user.id, { content: textarea.value.trim(), mediaType });
        }
      }
      closeComposer();
    }
  }}, [
    el('div', { className: 'composer-modal' }, [
      el('div', { className: 'composer-header' }, [
        el('button', { className: 'composer-close', textContent: '\u00D7', onClick: closeComposer }),
      ]),
      el('div', { className: 'composer-body' }, [
        renderAvatar(user, 'md'),
        el('div', { className: 'composer-input-area' }, [textarea]),
      ]),
      locationPreview,
      pollSection,
      mediaPreview,
      filterBar,
      el('div', { className: 'composer-footer' }, [
        el('div', { className: 'composer-tools' }, [
          el('button', {
            className: 'composer-tool',
            innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 5.5C3 4.119 4.119 3 5.5 3h13C19.881 3 21 4.119 21 5.5v13c0 1.381-1.119 2.5-2.5 2.5h-13C4.119 21 3 19.881 3 18.5v-13zM5.5 5c-.276 0-.5.224-.5.5v9.086l3-3 3 3 5-5 3 3V5.5c0-.276-.224-.5-.5-.5h-13zM19 15.414l-3-3-5 5-3-3-3 3V18.5c0 .276.224.5.5.5h13c.276 0 .5-.224.5-.5v-3.086zM9.75 7C8.784 7 8 7.784 8 8.75s.784 1.75 1.75 1.75 1.75-.784 1.75-1.75S10.716 7 9.75 7z"/></svg>',
            title: 'Add image',
            onClick: () => fileInput.click(),
          }),
          el('button', {
            className: 'composer-tool',
            innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            title: 'Add video',
            onClick: () => videoInput.click(),
          }),
          el('button', {
            className: 'composer-tool',
            textContent: ':)',
            style: { fontSize: '18px', fontWeight: '700' },
            title: 'Add emoji',
            onClick: () => openEmojiPicker(textarea),
          }),
          el('button', {
            className: 'composer-tool',
            textContent: 'GIF',
            style: { fontSize: '13px', fontWeight: '800', letterSpacing: '-0.5px' },
            title: 'Add GIF',
            onClick: () => openGifPicker(textarea, mediaPreview, previewMedia, async (url) => {
              mediaUrl = url;
              mediaType = 'image';
              try {
                const res = await fetch(url);
                const blob = await res.blob();
                mediaFile = new File([blob], 'gif.gif', { type: 'image/gif' });
              } catch (e) {
                mediaFile = { name: 'gif', type: 'image/gif' };
              }
              mediaPreview.style.display = 'block';
            }),
          }),
          el('button', {
            className: 'composer-tool',
            innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="2"/><line x1="9" y1="3" x2="9" y2="21" stroke="currentColor" stroke-width="2"/></svg>',
            title: 'Add poll',
            onClick: () => {
              showPoll = !showPoll;
              pollSection.style.display = showPoll ? 'block' : 'none';
            },
          }),
          el('button', {
            className: 'composer-tool',
            innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
            title: 'Add location',
            onClick: async () => {
              if (locationData) {
                locationData = null;
                locationPreview.style.display = 'none';
                return;
              }
              locationPreview.style.display = 'flex';
              locationPreview.innerHTML = '<span>Finding location...</span>';
              const loc = await getLocationString();
              if (loc) {
                locationData = loc;
                locationPreview.innerHTML = '';
                locationPreview.appendChild(el('span', { innerHTML: '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>' }));
                locationPreview.appendChild(el('span', { textContent: loc.name }));
                locationPreview.appendChild(el('button', { textContent: '\u00D7', style: { marginLeft: 'auto', background: 'none', color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer' }, onClick: () => { locationData = null; locationPreview.style.display = 'none'; } }));
              } else {
                locationPreview.innerHTML = '<span style="color:var(--text-secondary)">Location unavailable</span>';
                setTimeout(() => { locationPreview.style.display = 'none'; }, 2000);
              }
            },
          }),
        ]),
        el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } }, [
          charCount,
          postBtn,
        ]),
      ]),
    ]),
  ]);

  document.body.appendChild(overlay);
  textarea.focus();
}

function openEmojiPicker(textarea) {
  const kaomoji = [
    // Happy
    ':)', ':D', ':DD', ':DDD', ':-)', ':-D', '=)', '=D', '=DD',
    ':>)', ':^)', 'XD', 'xD', 'XDDD', 'LOL', 'lol',
    // Sad
    ':(', ':-(', '=(', ';(', ';_;', ':c', ';;', 'T_T', 'T.T',
    'TT', 'qwq', '>_<', '>_<|||', 'orzz', 'TnT',
    // Laugh
    'XD', 'xp', 'xx', '^^', '^_^', '^____^', '^o^', '^0^',
    '>w<', '>///<', '///', 'XD~', 'haha', 'hehe', 'hihi',
    // Love
    '<3', '</3', '<33', '<333', '♡', '(♥)', ':kiss:', ':*',
    'UwU', 'OwO', 'uwu', 'owo', ':3', ':33', '=3', 'mwa',
    // Cool
    'B)', 'B-)', '8)', '8-)', '(cool)', '(sunglasses)', 'YOLO',
    '(ninja)', '(deal with it)', ':p', ':P', ';P', ';p', ':b',
    // Surprised
    ':O', ':o', ':0', 'O_O', 'o_o', 'O.O', '0_0', 'o_O',
    'O_o', ':O!', '!!', '?!', '?!?!', 'woah', 'omg', 'wow',
    // Angry
    '>:(', '>:(', '>_<', '>:-(', '>_>', '<_<', '!!!',
    '(angry)', '(angry)', ':@', '>:{', 'grr', 'hmph',
    // Confused
    ':|', '-_-', '-__-', '-____-', '-___-', ':/', ':\\',
    '._.', '..', '...', '?_?', 'hmm', 'huh', 'meh',
    // Other
    ':)', '._.', 'oof', 'bruh', 'lmao', 'rofl', 'smh',
    'f', 'rip', 'gg', 'ez', 'no u', 'same', 'mood',
    'tbh', 'imo', 'idk', 'idc', 'nvm', 'afk', 'jk',
    // Hands
    '(Y)', '(N)', '(ok)', '(clap)', '(clap)(clap)', '(fist)',
    '(thumbsup)', '(thumbsdown)', '(peace)', '(v)', '(wave)',
    '(hug)', '(handshake)', '(point)', '(shrug)', '¯\\_(ツ)_/¯',
    '(っ◕‿◕)っ', '(づ｡◕‿‿◕｡)づ', '┬┴┬┴┤(･_├┬┴┬┴',
    // Animals
    '(cat)', '(dog)', '(bunny)', '(bear)', '(fox)', '(panda)',
    '(owl)', '(fish)', '(snake)', '(dragon)', '(unicorn)',
    'ʕ•ᴥ•ʔ', '(•̤̀ᵕ•̤́و)ᵒᵏᵃʸ', '(ノ°▽°)ノ︵┻━┻',
    // Food
    '(coffee)', '(tea)', '(beer)', '(pizza)', '(cake)',
    '(cookie)', '(ice cream)', '(ramen)', '(sushi)',
    // Stars & Nature
    '(star)', '(sparkle)', '(sun)', '(moon)', '(rainbow)',
    '(flower)', '(rose)', '(fire)', '(water)', '(snow)',
    // Misc
    '(music)', '(note)', '(heart)', '(broken heart)',
    '(idea)', '(lightbulb)', '(brain)', '(eye)', '(lips)',
    '(phone)', '(computer)', '(game)', '(key)', '(lock)',
    '(clock)', '(gift)', '(balloon)', '(party)', '(confetti)',
  ];

  // Remove existing picker
  document.querySelectorAll('.emoji-picker-popup').forEach(e => e.remove());

  const picker = el('div', { className: 'emoji-picker-popup' });

  // Search
  const search = el('input', {
    type: 'text',
    placeholder: 'Search kaomoji...',
    className: 'emoji-search',
  });

  const grid = el('div', { className: 'emoji-grid' });

  function render(list) {
    grid.innerHTML = '';
    for (const k of list) {
      const btn = el('button', { textContent: k });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        textarea.value += k + ' ';
        textarea.focus();
      });
      grid.appendChild(btn);
    }
  }

  search.addEventListener('input', () => {
    const q = search.value.toLowerCase();
    render(q ? kaomoji.filter(k => k.toLowerCase().includes(q)) : kaomoji);
  });

  render(kaomoji);
  picker.append(search, grid);
  document.body.appendChild(picker);

  // Close on outside click
  setTimeout(() => {
    const close = (e) => {
      if (!picker.contains(e.target) && !e.target.closest('.composer-tool')) {
        picker.remove();
        document.removeEventListener('click', close);
      }
    };
    document.addEventListener('click', close);
  }, 10);
}

function openGifPicker(textarea, mediaPreview, previewMedia, onGifSelect) {
  document.querySelectorAll('.gif-picker-popup').forEach(e => e.remove());

  const picker = el('div', { className: 'gif-picker-popup', style: {
    position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
    width: '340px', maxHeight: '400px', background: 'var(--bg-primary)',
    borderRadius: '16px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)',
    zIndex: '1000', display: 'flex', flexDirection: 'column', overflow: 'hidden',
  }});

  const searchInput = el('input', {
    className: 'input',
    placeholder: 'Search GIFs...',
    style: { margin: '8px 8px 0', fontSize: '14px' },
  });

  const grid = el('div', { style: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px',
    overflowY: 'auto', flex: '1', maxHeight: '340px', padding: '0 8px 8px',
  }});

  let searchTimeout = null;
  let loading = false;

  async function loadGifs(query) {
    if (loading) return;
    loading = true;
    grid.innerHTML = '';

    const gifs = query ? await searchGifs(query, { limit: 18 }) : await getTrendingGifs({ limit: 18 });

    if (gifs.length === 0) {
      grid.appendChild(el('div', {
        style: { gridColumn: '1/-1', textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontSize: '14px' },
        textContent: 'No GIFs found',
      }));
    }

    for (const gif of gifs) {
      const item = el('div', {
        style: { cursor: 'pointer', borderRadius: '4px', overflow: 'hidden', aspectRatio: '1', background: 'var(--bg-secondary)' },
      }, [
        el('img', {
          src: gif.preview,
          loading: 'lazy',
          style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
        }),
      ]);

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        onGifSelect(gif.url);
        previewMedia.innerHTML = '';
        previewMedia.appendChild(el('img', {
          src: gif.url,
          style: { width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '12px' },
        }));
        picker.remove();
      });

      item.addEventListener('mouseenter', () => { item.style.opacity = '0.8'; });
      item.addEventListener('mouseleave', () => { item.style.opacity = '1'; });

      grid.appendChild(item);
    }

    loading = false;
  }

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadGifs(searchInput.value.trim()), 350);
  });

  picker.append(searchInput, grid);
  document.body.appendChild(picker);

  loadGifs('');
  searchInput.focus();

  setTimeout(() => {
    const closePicker = (e) => {
      if (!picker.contains(e.target) && !e.target.closest('.composer-tool')) {
        picker.remove();
        document.removeEventListener('click', closePicker);
      }
    };
    document.addEventListener('click', closePicker);
  }, 10);
}

function closeComposer() {
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
}

async function uploadImageWithFilter(bucket, file, userId, filterCss) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.filter = filterCss;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(async (blob) => {
        try {
          const filteredFile = new File([blob], file.name, { type: file.type });
          const result = await uploadImage(bucket, filteredFile, userId);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      }, file.type, 0.92);
    };
    img.onerror = () => reject(new Error('Failed to load image for filter'));
    img.src = url;
  });
}

export function initComposer() {
  window.addEventListener('open-composer', () => openComposer());
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeComposer();
  });
}
