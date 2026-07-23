import { el, clearElement } from '../utils/dom.js';
import { getCurrentUser, setCurrentUser } from '../state.js';
import { updateProfile } from '../services/users.js';
import { uploadImage } from '../services/storage.js';
import { renderAvatar } from '../components/avatar.js';
import { supabase } from '../supabase.js';
import { signOut } from '../auth.js';
import { setLanguage, getLanguage, getLanguages, t } from '../i18n.js';

function canChangeUsername(user) {
  if (!user.username_changed_at) return true;
  return (Date.now() - new Date(user.username_changed_at).getTime()) / 86400000 >= 7;
}

// Toggle switch
function toggle(key, defaultVal) {
  const isOn = (localStorage.getItem(key) ?? String(defaultVal)) === 'true';
  const btn = el('button', { style: { width: '48px', height: '28px', borderRadius: '14px', border: 'none', cursor: 'pointer', background: isOn ? 'var(--accent)' : 'var(--bg-tertiary)', position: 'relative', transition: 'background 0.2s', flexShrink: '0' },
    onClick: () => { const on = btn.style.background !== 'var(--accent)'; btn.style.background = on ? 'var(--accent)' : 'var(--bg-tertiary)'; dot.style.left = on ? '22px' : '2px'; localStorage.setItem(key, String(on)); }
  });
  const dot = el('div', { style: { width: '22px', height: '22px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: isOn ? '22px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' } });
  btn.appendChild(dot);
  return btn;
}

// Section header
function sectionTitle(text) {
  return el('div', { style: { padding: '20px 16px 8px', fontSize: '13px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' } }, [el('span', { textContent: text })]);
}

// Settings row item
function settingsItem(title, subtitle, right, onClick) {
  const item = el('div', { style: { display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border-color)', cursor: onClick ? 'pointer' : 'default', gap: '12px' } }, [
    el('div', { style: { flex: 1, minWidth: 0 } }, [
      el('div', { textContent: title, style: { fontSize: '15px', fontWeight: '500', color: 'var(--text-primary)' } }),
      subtitle ? el('div', { textContent: subtitle, style: { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }) : null,
    ].filter(Boolean)),
    right || el('span', { textContent: '\u203A', style: { fontSize: '18px', color: 'var(--text-tertiary)', flexShrink: '0' } }),
  ]);
  if (onClick) item.addEventListener('click', onClick);
  return item;
}

export async function render(container) {
  const user = getCurrentUser();
  if (!user) return;
  clearElement(container);

  // Header
  container.appendChild(el('div', { style: { display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-color)', gap: '12px', position: 'sticky', top: '0', background: 'var(--bg-primary)', zIndex: '10' } }, [
    el('a', { href: '#/', innerHTML: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>', style: { color: 'var(--text-primary)', textDecoration: 'none', flexShrink: '0' } }),
    el('h1', { textContent: t('settings'), style: { fontSize: '20px', fontWeight: '700', margin: 0 } }),
  ]));

  const list = el('div');

  // === YOU ===
  list.appendChild(sectionTitle('You'));
  list.appendChild(settingsItem(user.display_name, '@' + user.username, null, () => navigateTo('account')));
  list.appendChild(settingsItem('Profile', 'Edit name, bio, avatar', null, () => navigateTo('account')));

  // === BASIC ===
  list.appendChild(sectionTitle('Basic'));
  list.appendChild(settingsItem('Appearance', localStorage.getItem('snapthought-theme') || 'dark', null, () => navigateTo('appearance')));
  list.appendChild(settingsItem('Language', getLanguages().find(l => l.code === getLanguage())?.name || getLanguage(), null, () => navigateTo('language')));
  list.appendChild(settingsItem('Notifications', null, toggle('snapthought-push-notifications', true)));
  list.appendChild(settingsItem('Sounds', null, toggle('snapthought-message-sounds', true)));

  // === PRIVACY ===
  list.appendChild(sectionTitle('Privacy & Security'));
  list.appendChild(settingsItem('Privacy & Data', 'Blocked users, muted, export', null, () => navigateTo('privacy')));
  list.appendChild(settingsItem('Blocked Users', null, null, () => navigateTo('privacy')));
  list.appendChild(settingsItem('Export Data', 'Download your data', null, () => { window.location.hash = '#/export'; }));
  list.appendChild(settingsItem('Request Verification', user.is_verified ? '\u2705 Verified' : 'Get a blue checkmark', null, () => navigateTo('verify')));

  // === MONETIZATION ===
  list.appendChild(sectionTitle('Creator'));
  list.appendChild(settingsItem('Monetization', 'Earn from your content', null, () => { window.location.hash = '#/earnings'; }));
  list.appendChild(settingsItem('Referral Program', 'Invite friends', null, () => navigateTo('referrals')));

  // === ADVANCED ===
  list.appendChild(sectionTitle('Advanced'));
  list.appendChild(settingsItem('PWA & Cache', 'Install, cache, updates', null, () => navigateTo('pwa')));
  list.appendChild(settingsItem('Media & Data', 'Autoplay, quality, data saving', null, () => navigateTo('media')));
  list.appendChild(settingsItem('Support', 'Help and feedback', null, () => navigateTo('support')));

  // === ABOUT ===
  list.appendChild(sectionTitle('About'));
  list.appendChild(settingsItem('SnapThought', 'Version 1.7 (Build #2026.07.23)', null, null));
  list.appendChild(settingsItem('Privacy Policy', null, null, () => alert('Privacy policy coming soon.')));
  list.appendChild(settingsItem('Terms of Service', null, null, () => alert('Terms coming soon.')));

  // === ACCOUNT ===
  list.appendChild(sectionTitle('Account'));
  list.appendChild(settingsItem('Sign Out', null, el('span', { textContent: t('logout'), style: { color: 'var(--danger)', fontSize: '14px', fontWeight: '600', flexShrink: '0' } }), async () => { await signOut(); window.location.hash = '#/login'; }));

  container.appendChild(list);
}

// Navigation to sub-pages
function navigateTo(page) {
  const user = getCurrentUser();
  const container = document.getElementById('main-content') || document.querySelector('#settings-content')?.parentElement;
  if (!container) return;
  clearElement(container);

  // Back header
  container.appendChild(el('div', { style: { display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-color)', gap: '12px', position: 'sticky', top: '0', background: 'var(--bg-primary)', zIndex: '10' } }, [
    el('button', { innerHTML: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>', style: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '4px', flexShrink: '0' }, onClick: () => render(container) }),
    el('h1', { textContent: pageTitle(page), style: { fontSize: '20px', fontWeight: '700', margin: 0 } }),
  ]));

  const content = el('div');
  container.appendChild(content);

  if (page === 'account') subAccount(content, user);
  else if (page === 'appearance') subAppearance(content, user);
  else if (page === 'language') subLanguage(content, user);
  else if (page === 'privacy') subPrivacy(content, user);
  else if (page === 'verify') subVerify(content, user);
  else if (page === 'referrals') subReferrals(content, user);
  else if (page === 'pwa') subPWA(content, user);
  else if (page === 'media') subMedia(content, user);
  else if (page === 'support') subSupport(content, user);
}

function pageTitle(page) {
  const titles = { account: 'Profile', appearance: 'Appearance', language: 'Language', privacy: 'Privacy & Data', verify: 'Verification', referrals: 'Referral Program', pwa: 'PWA & Cache', media: 'Media & Data', support: 'Support' };
  return titles[page] || 'Settings';
}

// === SUB-PAGES ===

function subAccount(container, user) {
  let newAvatarUrl = user.avatar_url;
  let newCoverUrl = user.cover_url;
  const avatarPreview = renderAvatar(user, 'xl');
  const avatarInput = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
  avatarInput.addEventListener('change', async (e) => { if (e.target.files[0]) { newAvatarUrl = await uploadImage('avatars', e.target.files[0], user.id); avatarPreview.replaceWith(renderAvatar({ ...user, avatar_url: newAvatarUrl }, 'xl')); } });

  const coverPreview = user.cover_url ? el('img', { className: 'profile-banner', src: user.cover_url }) : el('div', { className: 'profile-banner' });
  const coverInput = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
  coverInput.addEventListener('change', async (e) => { if (e.target.files[0]) { newCoverUrl = await uploadImage('covers', e.target.files[0], user.id); coverPreview.replaceWith(el('img', { className: 'profile-banner', src: newCoverUrl })); } });

  const nameInput = el('input', { className: 'input', value: user.display_name });
  const bioInput = el('textarea', { className: 'settings-textarea', value: user.bio, rows: '3' });
  const websiteInput = el('input', { className: 'input', value: user.website, placeholder: 'https://...' });
  const canChange = canChangeUsername(user);
  const usernameInput = el('input', { className: 'input', value: user.username });
  if (!canChange) { usernameInput.disabled = true; usernameInput.style.opacity = '0.5'; }
  const errorDiv = el('div', { className: 'auth-error', style: { display: 'none' } });

  const saveBtn = el('button', { className: 'btn btn-primary btn-lg', textContent: t('save'), onClick: async () => {
    saveBtn.disabled = true; saveBtn.textContent = '...'; errorDiv.style.display = 'none';
    try {
      const updates = { display_name: nameInput.value.trim(), bio: bioInput.value.trim(), website: websiteInput.value.trim(), avatar_url: newAvatarUrl, cover_url: newCoverUrl };
      const newU = usernameInput.value.trim();
      if (newU !== user.username) {
        if (!canChange) { errorDiv.textContent = 'Once every 7 days'; errorDiv.style.display = 'block'; saveBtn.disabled = false; saveBtn.textContent = t('save'); return; }
        const { data: taken } = await supabase.from('profiles').select('id').eq('username', newU).neq('id', user.id).maybeSingle();
        if (taken) { errorDiv.textContent = 'Username taken'; errorDiv.style.display = 'block'; saveBtn.disabled = false; saveBtn.textContent = t('save'); return; }
        updates.username = newU; updates.username_changed_at = new Date().toISOString();
      }
      const updated = await updateProfile(user.id, updates); setCurrentUser(updated);
      saveBtn.textContent = 'Saved!'; setTimeout(() => saveBtn.textContent = t('save'), 2000);
    } catch (err) { errorDiv.textContent = t('error'); errorDiv.style.display = 'block'; }
    saveBtn.disabled = false;
  }});

  container.appendChild(el('div', { className: 'settings-form' }, [
    el('div', { className: 'settings-cover-section' }, [el('div', { className: 'settings-cover-upload', onClick: () => coverInput.click() }, [coverPreview, el('div', { className: 'settings-cover-overlay', textContent: 'Change cover' }), coverInput])]),
    el('div', { className: 'settings-avatar-section' }, [
      el('div', { className: 'settings-avatar-upload', onClick: () => avatarInput.click() }, [avatarPreview, el('div', { className: 'settings-avatar-overlay', textContent: 'Change avatar' }), avatarInput]),
      el('div', {}, [el('div', { textContent: user.display_name, style: { fontWeight: '700', fontSize: '18px' } }), el('div', { textContent: '@' + user.username, style: { color: 'var(--text-secondary)' } })]),
    ]),
    el('div', { className: 'input-group' }, [el('label', { className: 'input-label', textContent: 'Display name' }), nameInput]),
    el('div', { className: 'input-group' }, [el('label', { className: 'input-label', textContent: 'Username' }), usernameInput]),
    el('div', { className: 'input-group' }, [el('label', { className: 'input-label', textContent: 'Bio' }), bioInput, el('div', { className: 'char-counter', textContent: bioInput.value.length + '/160' })]),
    el('div', { className: 'input-group' }, [el('label', { className: 'input-label', textContent: 'Website' }), websiteInput]),
    errorDiv, saveBtn,
  ]));
  bioInput.addEventListener('input', () => { const c = container.querySelector('.char-counter'); if (c) c.textContent = bioInput.value.length + '/160'; });
}

function subAppearance(container, user) {
  const saved = localStorage.getItem('snapthought-theme') || 'dark';
  const themes = [{ v: 'dark', l: t('dark'), i: '\uD83C\uDF19' }, { v: 'light', l: t('light'), i: '\u2600\uFE0F' }, { v: 'amoled', l: 'AMOLED', i: '\u2B50' }, { v: 'system', l: 'System', i: '\uD83D\uDCBB' }];
  const list = el('div');
  for (const th of themes) list.appendChild(settingsItem(th.i + ' ' + th.l, saved === th.v ? 'Active' : null, saved === th.v ? el('span', { innerHTML: '\u2713', style: { color: 'var(--accent)', fontWeight: '700', fontSize: '16px' } }) : null, () => { localStorage.setItem('snapthought-theme', th.v); document.documentElement.setAttribute('data-theme', th.v); subAppearance(container, user); }));

  list.appendChild(sectionTitle('Font'));
  const savedFont = localStorage.getItem('snapthought-font') || 'medium';
  const fonts = [{ v: 'small', l: 'Small' }, { v: 'medium', l: 'Standard' }, { v: 'large', l: 'Large' }];
  for (const fo of fonts) list.appendChild(settingsItem(fo.l, savedFont === fo.v ? 'Active' : null, savedFont === fo.v ? el('span', { innerHTML: '\u2713', style: { color: 'var(--accent)', fontWeight: '700', fontSize: '16px' } }) : null, () => { localStorage.setItem('snapthought-font', fo.v); document.documentElement.style.fontSize = fo.v === 'small' ? '14px' : fo.v === 'large' ? '18px' : '16px'; subAppearance(container, user); }));

  list.appendChild(sectionTitle('Accessibility'));
  list.appendChild(settingsItem('Reduce motion', 'Disable animations', toggle('snapthought-reduce-motion', false)));

  container.appendChild(list);
}

function subLanguage(container, user) {
  const cl = getLanguage();
  const langs = getLanguages();
  const list = el('div');
  for (const l of langs) list.appendChild(settingsItem(l.flag + ' ' + l.name, l.code.toUpperCase(), cl === l.code ? el('span', { innerHTML: '\u2713', style: { color: 'var(--accent)', fontWeight: '700', fontSize: '16px' } }) : null, () => { setLanguage(l.code); subLanguage(container, user); }));
  container.appendChild(list);
}

function subPrivacy(container, user) {
  const list = el('div');

  list.appendChild(sectionTitle('Blocked Users'));
  import('../services/blocks.js').then(async ({ getBlockedUsers }) => {
    const blocked = await getBlockedUsers(user.id);
    if (blocked.length === 0) list.appendChild(settingsItem('No blocked users', null, null, null));
    for (const u of blocked) {
      const item = settingsItem(u.display_name, '@' + u.username, el('button', { className: 'btn btn-outline btn-sm', textContent: t('unblock'), onClick: async (e) => { e.stopPropagation(); const { unblockUser } = await import('../services/blocks.js'); await unblockUser(user.id, u.id); item.remove(); } }), null);
      list.appendChild(item);
    }
  });

  list.appendChild(sectionTitle('Muted Users'));
  import('../services/blocks.js').then(async ({ getMutedUsers }) => {
    const muted = await getMutedUsers(user.id);
    if (muted.length === 0) list.appendChild(settingsItem('No muted users', null, null, null));
    for (const u of muted) {
      const item = settingsItem(u.display_name, '@' + u.username, el('button', { className: 'btn btn-outline btn-sm', textContent: t('unmute'), onClick: async (e) => { e.stopPropagation(); const { unmuteUser } = await import('../services/blocks.js'); await unmuteUser(user.id, u.id); item.remove(); } }), null);
      list.appendChild(item);
    }
  });

  list.appendChild(sectionTitle('Data'));
  list.appendChild(settingsItem('Export Data', 'Download JSON/CSV', null, () => { window.location.hash = '#/export'; }));

  container.appendChild(list);
}

function subVerify(container, user) {
  if (user.is_verified) {
    container.appendChild(el('div', { style: { textAlign: 'center', padding: '48px 24px' } }, [
      el('div', { innerHTML: '<svg viewBox="0 0 24 24" width="56" height="56" style="margin:0 auto 16px;display:block"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" fill="none" stroke="var(--accent)" stroke-width="2"/><polyline points="22 4 12 14.01 9 11.01" fill="none" stroke="var(--accent)" stroke-width="2"/></svg>' }),
      el('h2', { textContent: 'Verified!', style: { marginBottom: '8px' } }),
      el('p', { textContent: 'Your account has a blue checkmark.', style: { color: 'var(--text-secondary)' } }),
    ]));
    return;
  }
  const reason = el('textarea', { className: 'settings-textarea', placeholder: 'Why should you be verified?', rows: '4' });
  const btn = el('button', { className: 'btn btn-primary btn-lg', textContent: t('submitRequest'), onClick: async () => {
    if (!reason.value.trim()) return; btn.disabled = true; btn.textContent = '...';
    await supabase.from('notifications').insert({ user_id: user.id, actor_id: user.id, type: 'mention', is_read: false });
    btn.textContent = t('requestSubmitted');
    setTimeout(() => { btn.textContent = t('submitRequest'); btn.disabled = false; }, 3000);
  }});
  container.appendChild(el('div', { style: { padding: '24px 16px' } }, [
    el('p', { textContent: t('verifyDesc'), style: { color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' } }),
    el('div', { className: 'input-group', style: { marginBottom: '16px' } }, [el('label', { className: 'input-label', textContent: t('whyVerify') }), reason]),
    btn,
  ]));
}

async function subReferrals(container, user) {
  const { getOrCreateReferralCode, getReferralStats } = await import('../services/referrals.js');
  const stats = await getReferralStats(user.id);
  if (!stats.code) { await getOrCreateReferralCode(user.id); stats.code = await getOrCreateReferralCode(user.id); }
  const url = window.location.origin + window.location.pathname + '?ref=' + stats.code;
  const copyBtn = el('button', { className: 'btn btn-primary', textContent: t('copyLink'), style: { width: '100%' }, onClick: async () => { await navigator.clipboard.writeText(url); copyBtn.textContent = t('copied'); setTimeout(() => copyBtn.textContent = t('copyLink'), 2000); } });
  container.appendChild(el('div', { style: { padding: '24px 16px' } }, [
    el('p', { textContent: t('referralsDesc'), style: { color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' } }),
    el('div', { style: { padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', textAlign: 'center', marginBottom: '12px' } }, [
      el('div', { textContent: stats.code, style: { fontSize: '24px', fontWeight: '700', fontFamily: 'monospace', color: 'var(--accent)', letterSpacing: '4px' } }),
    ]),
    el('div', { textContent: stats.referralCount + ' referrals', style: { textAlign: 'center', marginBottom: '16px', color: 'var(--text-secondary)' } }),
    copyBtn,
  ]));
}

function subPWA(container) {
  const list = el('div');

  list.appendChild(sectionTitle('Install'));
  const installBtn = window.deferredPrompt
    ? el('button', { className: 'btn btn-primary btn-sm', textContent: 'Install App', onClick: async () => { window.deferredPrompt.prompt(); window.deferredPrompt = null; } })
    : window.matchMedia('(display-mode: standalone)').matches
      ? el('span', { textContent: '\u2705 Installed', style: { color: '#10b981', fontWeight: '600' } })
      : el('span', { textContent: 'Use browser menu', style: { color: 'var(--text-secondary)' } });
  list.appendChild(settingsItem('App Installation', null, installBtn));

  list.appendChild(sectionTitle('Cache'));
  const cacheInfo = el('span', { textContent: '...', style: { fontSize: '13px', color: 'var(--text-secondary)' } });
  if ('caches' in window) caches.keys().then(ks => { let n = 0; Promise.all(ks.map(k => caches.open(k).then(c => c.keys().then(r => { n += r.length; })))).then(() => cacheInfo.textContent = n + ' items'); });
  list.appendChild(settingsItem('Cache Size', null, cacheInfo));
  list.appendChild(settingsItem('Clear Cache', 'Reset Service Worker', el('button', { className: 'btn btn-outline btn-sm', textContent: 'Clear', onClick: async () => { if ('caches' in window) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } cacheInfo.textContent = '0 items'; } })));

  list.appendChild(sectionTitle('Updates'));
  list.appendChild(settingsItem('Offline Posts', 'Save for offline', toggle('snapthought-offline-posts', true)));
  list.appendChild(settingsItem('Force Update', 'Refresh Service Worker', el('button', { className: 'btn btn-outline btn-sm', textContent: 'Update', onClick: () => { if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js?v=' + Date.now()); alert('Updated!'); } })));

  container.appendChild(list);
}

function subMedia(container) {
  const list = el('div');
  list.appendChild(sectionTitle('Data'));
  list.appendChild(settingsItem('Data Saving', 'Compress media', toggle('snapthought-data-saving', false)));
  list.appendChild(settingsItem('Autoplay Video', 'Play in feed', toggle('snapthought-autoplay-video', true)));
  list.appendChild(settingsItem('High Quality Photos', 'Original quality', toggle('snapthought-hq-photos', false)));
  container.appendChild(list);
}

function subSupport(container, user) {
  const subj = el('input', { className: 'input', placeholder: 'Subject' });
  const msg = el('textarea', { className: 'settings-textarea', placeholder: 'Your message...', rows: '4' });
  const btn = el('button', { className: 'btn btn-primary', textContent: t('sendQuestion'), onClick: async () => {
    if (!msg.value.trim()) return; btn.disabled = true; btn.textContent = '...';
    await supabase.from('questions').insert({ user_id: user.id, subject: subj.value.trim(), message: msg.value.trim() });
    subj.value = ''; msg.value = ''; btn.textContent = t('sent');
    setTimeout(() => { btn.textContent = t('sendQuestion'); btn.disabled = false; }, 3000);
  }});
  container.appendChild(el('div', { style: { padding: '24px 16px' } }, [
    el('div', { className: 'input-group', style: { marginBottom: '12px' } }, [el('label', { className: 'input-label', textContent: t('subject') }), subj]),
    el('div', { className: 'input-group', style: { marginBottom: '16px' } }, [el('label', { className: 'input-label', textContent: t('message') }), msg]),
    btn,
  ]));
}

export function cleanup() {}
