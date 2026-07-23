import { el, clearElement, showLoader } from '../utils/dom.js';
import { getCurrentUser } from '../state.js';
import { supabase } from '../supabase.js';

let me = null;
let users = [];
let currentTab = 'users';

export async function render(container) {
  const user = getCurrentUser();
  if (!user) return;

  // Check admin
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile || (!profile.is_admin && profile.role !== 'mod' && profile.role !== 'mod+')) {
    clearElement(container);
    container.appendChild(el('div', { style: { textAlign: 'center', padding: '80px 24px' } }, [
      el('h2', { textContent: 'Access Denied', style: { marginBottom: '12px' } }),
      el('p', { textContent: 'Only admins can access this panel.', style: { color: 'var(--text-secondary)', marginBottom: '20px' } }),
      el('a', { href: '#/', className: 'btn btn-primary', textContent: 'Go Back' }),
    ]));
    return;
  }

  me = profile;
  clearElement(container);

  // Load data
  const { data: allUsers } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  users = allUsers || [];

  let pendingReports = 0;
  try {
    const { getReports } = await import('../services/reports.js');
    const reports = await getReports({ status: 'pending', limit: 100 });
    pendingReports = reports.length;
  } catch (e) { /* ignore */ }

  // Header
  const header = el('div', { className: 'page-header' }, [
    el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
      el('h1', { className: 'page-header-title', textContent: 'Admin Panel' }),
      el('a', { href: '#/', className: 'btn btn-outline btn-sm', textContent: 'Back' }),
    ]),
  ]);

  // Stats
  const stats = el('div', { className: 'admin-stats' });
  const statsData = [
    { label: 'Users', value: users.length },
    { label: 'Admins', value: users.filter(u => u.is_admin).length },
    { label: 'Mods', value: users.filter(u => u.role === 'mod' || u.role === 'mod+').length },
    { label: 'Verified', value: users.filter(u => u.is_verified).length },
    { label: 'Best', value: users.filter(u => u.is_best).length },
    { label: 'Banned', value: users.filter(u => u.is_banned).length },
    { label: 'Reports', value: pendingReports },
  ];
  for (const s of statsData) {
    stats.appendChild(el('div', { className: 'admin-stat' }, [
      el('div', { className: 'admin-stat-num', textContent: s.value }),
      el('div', { className: 'admin-stat-label', textContent: s.label }),
    ]));
  }

  // Tabs
  const tabs = el('div', { className: 'admin-tabs' }, [
    el('button', { className: 'admin-tab active', textContent: 'Users', onClick: () => { currentTab = 'users'; renderTab(content); tabs.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active')); tabs.children[0].classList.add('active'); } }),
    el('button', { className: 'admin-tab', textContent: 'Reports', onClick: () => { currentTab = 'reports'; renderTab(content); tabs.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active')); tabs.children[1].classList.add('active'); } }),
    el('button', { className: 'admin-tab', textContent: 'Support', onClick: () => { currentTab = 'support'; renderTab(content); tabs.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active')); tabs.children[2].classList.add('active'); } }),
    el('button', { className: 'admin-tab', textContent: 'Audit Log', onClick: () => { currentTab = 'audit'; renderTab(content); tabs.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active')); tabs.children[3].classList.add('active'); } }),
  ]);

  const content = el('div', { id: 'admin-content' });

  container.append(header, stats, tabs, content);
  renderTab(content);
}

function renderTab(container) {
  clearElement(container);
  if (currentTab === 'users') renderUsersTab(container);
  else if (currentTab === 'reports') renderReportsTab(container);
  else if (currentTab === 'support') renderSupportTab(container);
  else if (currentTab === 'audit') renderAuditTab(container);
}

// ===== USERS TAB =====
function renderUsersTab(container) {
  const search = el('input', { className: 'input', placeholder: 'Search users...', style: { marginBottom: '12px' } });
  const list = el('div', { id: 'admin-user-list' });

  container.append(search, list);
  renderUserList(list, users);

  search.addEventListener('input', () => {
    const q = search.value.toLowerCase();
    const filtered = q ? users.filter(u => u.username.toLowerCase().includes(q) || u.display_name.toLowerCase().includes(q)) : users;
    renderUserList(list, filtered);
  });
}

function renderUserList(container, list) {
  container.innerHTML = '';
  if (!list.length) {
    container.appendChild(el('div', { style: { textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }, textContent: 'No users found' }));
    return;
  }

  for (const u of list) {
    const isSelf = u.id === me.id;

    const row = el('div', { className: 'admin-user-row' }, [
      el('div', { className: 'admin-user-avatar' }, [
        u.avatar_url ? el('img', { src: u.avatar_url, alt: '' }) : el('div', { className: 'admin-user-noavatar', textContent: (u.display_name?.[0] || 'U') }),
      ]),
      el('div', { className: 'admin-user-info' }, [
        el('div', { className: 'admin-user-name' }, [
          document.createTextNode(u.display_name + ' '),
          ...getBadgeElements(u),
        ]),
        el('div', { className: 'admin-user-handle', innerHTML: '@' + esc(u.username) + (u.is_banned ? ' <span style="color:var(--danger)">(Banned)</span>' : '') }),
      ]),
    ]);

    if (!isSelf) {
      const actions = el('div', { className: 'admin-user-actions' });

      // Role select
      const roleSelect = el('select', { className: 'admin-role-select' }, [
        el('option', { value: 'user', textContent: 'User', selected: u.role === 'user' && !u.is_admin }),
        el('option', { value: 'mod', textContent: 'Mod', selected: u.role === 'mod' }),
        el('option', { value: 'mod+', textContent: 'Mod+', selected: u.role === 'mod+' }),
      ]);
      roleSelect.addEventListener('change', async () => {
        const { error } = await supabase.from('profiles').update({ role: roleSelect.value }).eq('id', u.id);
        if (error) { alert('Failed: ' + error.message); return; }
        const { logAuditAction } = await import('../services/audit.js');
        await logAuditAction(me.id, `changed role to ${roleSelect.value}`, u.id);
        await refreshUsers();
        renderTab(document.getElementById('admin-content'));
      });
      actions.appendChild(roleSelect);

      // Verify badge
      actions.appendChild(makeBtn(u.is_verified ? 'Unverify' : 'Verify', u.is_verified, async () => {
        const { error } = await supabase.from('profiles').update({ is_verified: !u.is_verified }).eq('id', u.id);
        if (error) { alert('Failed: ' + error.message); return; }
        const { logAuditAction } = await import('../services/audit.js');
        await logAuditAction(me.id, u.is_verified ? 'unverified' : 'verified', u.id);
        await refreshUsers();
        renderTab(document.getElementById('admin-content'));
      }));

      // Best badge
      actions.appendChild(makeBtn(u.is_best ? 'Unbest' : 'Best', u.is_best, async () => {
        const { error } = await supabase.from('profiles').update({ is_best: !u.is_best }).eq('id', u.id);
        if (error) { alert('Failed: ' + error.message); return; }
        const { logAuditAction } = await import('../services/audit.js');
        await logAuditAction(me.id, u.is_best ? 'removed best badge' : 'added best badge', u.id);
        await refreshUsers();
        renderTab(document.getElementById('admin-content'));
      }));

      // Dev badge
      actions.appendChild(makeBtn(u.is_admin ? 'Rem Dev' : 'Dev', u.is_admin, async () => {
        if (!u.is_admin && !confirm('Make this user a Developer?')) return;
        const { error } = await supabase.from('profiles').update({ is_admin: !u.is_admin }).eq('id', u.id);
        if (error) { alert('Failed: ' + error.message); return; }
        const { logAuditAction } = await import('../services/audit.js');
        await logAuditAction(me.id, u.is_admin ? 'removed developer' : 'made developer', u.id);
        await refreshUsers();
        renderTab(document.getElementById('admin-content'));
      }));

      // Ban
      actions.appendChild(makeBtn(u.is_banned ? 'Unban' : 'Ban', u.is_banned, async () => {
        if (!u.is_banned && !confirm('Ban this user?')) return;
        const { error } = await supabase.from('profiles').update({ is_banned: !u.is_banned }).eq('id', u.id);
        if (error) { alert('Failed: ' + error.message); return; }
        const { logAuditAction } = await import('../services/audit.js');
        await logAuditAction(me.id, u.is_banned ? 'unbanned' : 'banned', u.id);
        await refreshUsers();
        renderTab(document.getElementById('admin-content'));
      }, true));

      row.appendChild(actions);
    } else {
      row.appendChild(el('div', { className: 'admin-user-actions' }, [
        el('span', { style: { color: 'var(--text-tertiary)', fontSize: '12px' }, textContent: 'You' }),
      ]));
    }

    container.appendChild(row);
  }
}

async function refreshUsers() {
  const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  users = data || [];
}

function makeBtn(text, active, onClick, danger = false) {
  const btn = el('button', {
    className: 'admin-action-btn' + (active ? ' active' : '') + (danger ? ' danger' : ''),
    textContent: text,
  });
  btn.addEventListener('click', onClick);
  return btn;
}

function getBadgeElements(u) {
  const badges = [];
  if (u.is_admin) badges.push(el('span', { className: 'badge badge-admin', textContent: 'DEV' }));
  else if (u.role === 'mod+') badges.push(el('span', { className: 'badge badge-modplus', textContent: 'MOD+' }));
  else if (u.role === 'mod') badges.push(el('span', { className: 'badge badge-mod', textContent: 'MOD' }));
  if (u.is_verified) badges.push(el('span', { className: 'badge badge-verified', textContent: '✓' }));
  if (u.is_best) badges.push(el('span', { className: 'badge badge-best', textContent: '★' }));
  return badges;
}

// ===== SUPPORT TAB =====
async function renderSupportTab(container) {
  const { data: questions } = await supabase.from('questions').select('*, profiles:user_id(username, display_name, avatar_url)').order('created_at', { ascending: false });
  const list = questions || [];

  if (!list.length) {
    container.appendChild(el('div', { style: { textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }, textContent: 'No support tickets' }));
    return;
  }

  for (const q of list) {
    const profile = q.profiles;
    const card = el('div', { className: 'admin-question-card' }, [
      el('div', { className: 'admin-question-header' }, [
        el('div', { className: 'admin-question-title', textContent: q.subject || 'No subject' }),
        el('span', { className: 'admin-question-status ' + q.status, textContent: q.status }),
      ]),
      el('div', { className: 'admin-question-meta', textContent: `From: ${profile?.display_name || '?'} (@${profile?.username || '?'}) - ${new Date(q.created_at).toLocaleString()}` }),
      el('div', { className: 'admin-question-body', textContent: q.message }),
    ]);

    // Replies container
    const repliesContainer = el('div', { className: 'admin-replies' });
    card.appendChild(repliesContainer);

    // Load replies
    const { data: replies } = await supabase.from('question_replies').select('*, profiles:user_id(username, display_name)').eq('question_id', q.id).order('created_at');
    if (replies) {
      for (const r of replies) {
        repliesContainer.appendChild(el('div', { className: 'admin-reply' }, [
          el('strong', { textContent: r.profiles?.display_name || '?' }),
          document.createTextNode(': ' + r.message),
        ]));
      }
    }

    // Reply input
    const replyInput = el('input', { className: 'input', placeholder: 'Reply...', style: { flex: '1' } });
    const replyBtn = el('button', { className: 'btn btn-primary btn-sm', textContent: 'Reply' });
    replyBtn.addEventListener('click', async () => {
      const msg = replyInput.value.trim();
      if (!msg) return;
      await supabase.from('question_replies').insert({ question_id: q.id, user_id: me.id, message: msg });
      // Send notification to question author
      if (q.user_id !== me.id) {
        await supabase.from('notifications').insert({
          user_id: q.user_id,
          actor_id: me.id,
          type: 'comment',
          is_read: false,
        });
      }
      replyInput.value = '';
      repliesContainer.appendChild(el('div', { className: 'admin-reply' }, [
        el('strong', { textContent: me.display_name }),
        document.createTextNode(': ' + msg),
      ]));
    });

    const replyRow = el('div', { className: 'admin-reply-row' }, [replyInput, replyBtn]);

    // Close/Reopen
    if (q.status === 'open') {
      const closeBtn = el('button', { className: 'btn btn-outline btn-sm', textContent: 'Close' });
      closeBtn.addEventListener('click', async () => {
        await supabase.from('questions').update({ status: 'closed' }).eq('id', q.id);
        q.status = 'closed';
        renderTab(document.getElementById('admin-content'));
      });
      replyRow.appendChild(closeBtn);
    }

    card.appendChild(replyRow);
    container.appendChild(card);
  }
}

// ===== REPORTS TAB =====
async function renderReportsTab(container) {
  const { getReports } = await import('../services/reports.js');
  let reports = [];

  try {
    reports = await getReports({ status: 'pending', limit: 50 });
  } catch (err) {
    console.error('Failed to load reports:', err);
    container.appendChild(el('div', { className: 'error-message', textContent: 'Failed to load reports' }));
    return;
  }

  if (!reports.length) {
    container.appendChild(el('div', { style: { textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }, textContent: 'No pending reports' }));
    return;
  }

  for (const report of reports) {
    const reporter = report.reporter;
    const reportedPost = report.post;
    const reportedUser = report.reported_user;

    const card = el('div', { className: 'admin-question-card' }, [
      el('div', { className: 'admin-question-header' }, [
        el('div', { className: 'admin-question-title', textContent: 'Report' }),
        el('span', { className: 'admin-question-status open', textContent: report.status }),
      ]),
      el('div', { className: 'admin-question-meta', textContent: `Reported by: ${reporter?.display_name || '?'} (@${reporter?.username || '?'}) - ${new Date(report.created_at).toLocaleString()}` }),
      el('div', { className: 'admin-question-body', textContent: 'Reason: ' + report.reason }),
    ]);

    if (reportedPost) {
      card.appendChild(el('div', { style: { padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '8px', marginTop: '8px', fontSize: '13px' } }, [
        el('div', { style: { color: 'var(--text-secondary)', marginBottom: '4px' }, textContent: 'Reported post:' }),
        el('div', { textContent: reportedPost.content?.substring(0, 200) || '(no content)' }),
      ]));
    }

    if (reportedUser) {
      card.appendChild(el('div', { style: { padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '8px', marginTop: '8px', fontSize: '13px' } }, [
        el('div', { style: { color: 'var(--text-secondary)' }, textContent: `Reported user: ${reportedUser.display_name} (@${reportedUser.username})` }),
      ]));
    }

    const actions = el('div', { style: { display: 'flex', gap: '8px', marginTop: '12px' } });

    // Dismiss button
    const dismissBtn = el('button', { className: 'btn btn-outline btn-sm', textContent: 'Dismiss' });
    dismissBtn.addEventListener('click', async () => {
      const { updateReportStatus } = await import('../services/reports.js');
      await updateReportStatus(report.id, 'dismissed');
      card.remove();
    });
    actions.appendChild(dismissBtn);

    // Delete post button (if it's a post report)
    if (report.post_id) {
      const deletePostBtn = el('button', { className: 'btn btn-outline btn-sm', textContent: 'Delete Post', style: { color: 'var(--danger)', borderColor: 'var(--danger)' } });
      deletePostBtn.addEventListener('click', async () => {
        if (!confirm('Delete this post?')) return;
        const { deletePost } = await import('../services/posts.js');
        const { updateReportStatus } = await import('../services/reports.js');
        await deletePost(report.post_id);
        await updateReportStatus(report.id, 'resolved');
        card.remove();
      });
      actions.appendChild(deletePostBtn);
    }

    // Ban user button (if it's a user report)
    if (report.user_id) {
      const banBtn = el('button', { className: 'btn btn-outline btn-sm danger', textContent: 'Ban User' });
      banBtn.addEventListener('click', async () => {
        if (!confirm('Ban this user?')) return;
        await supabase.from('profiles').update({ is_banned: true }).eq('id', report.user_id);
        const { updateReportStatus } = await import('../services/reports.js');
        const { logAuditAction } = await import('../services/audit.js');
        await updateReportStatus(report.id, 'resolved');
        await logAuditAction(me.id, 'banned (via report)', report.user_id);
        await refreshUsers();
        card.remove();
      });
      actions.appendChild(banBtn);
    }

    card.appendChild(actions);
    container.appendChild(card);
  }
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

async function renderAuditTab(container) {
  const { getAuditLogs } = await import('../services/audit.js');
  const logs = await getAuditLogs({ limit: 50 });

  if (logs.length === 0) {
    container.appendChild(el('div', { style: { textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }, textContent: 'No audit logs yet' }));
    return;
  }

  for (const log of logs) {
    const admin = log.profiles;
    const target = log.target_profiles;
    const row = el('div', { style: { padding: '12px 16px', borderBottom: '1px solid var(--border-color)' } }, [
      el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
        el('div', {}, [
          el('strong', { textContent: admin?.display_name || 'Admin' }),
          document.createTextNode(' ' + log.action + ' '),
          target ? el('strong', { textContent: target.display_name || target.username }) : null,
        ]),
        el('span', { style: { fontSize: '12px', color: 'var(--text-tertiary)' }, textContent: new Date(log.created_at).toLocaleString() }),
      ]),
      log.details ? el('div', { style: { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }, textContent: log.details }) : null,
    ]);
    container.appendChild(row);
  }
}

export function cleanup() {}
