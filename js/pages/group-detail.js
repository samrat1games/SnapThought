/**
 * Group Detail Page
 */

import { getCurrentUserId } from '../supabase.js';
import { GroupsService } from '../services/groups.js';
import { createGroupSidebar } from '../components/group-card.js';
import { renderPostCard } from '../components/post-card.js';
import { el, clearElement } from '../utils/dom.js';

export async function render(container, params = {}) {
  const groupId = params.groupId;
  if (!groupId) return;

  const currentUserId = await getCurrentUserId();

  clearElement(container);

  container.appendChild(el('div', { className: 'group-detail-page' }, [
    el('div', { className: 'group-detail__container' }, [
      el('div', { className: 'group-detail__main' }, [
        el('div', { className: 'group-detail__header', id: 'groupHeader' }, [
          el('div', { className: 'loading', textContent: 'Loading group...' })
        ]),
        el('div', { className: 'group-detail__tabs', id: 'groupTabs' }, [
          el('button', { className: 'tab tab--active', dataset: { tab: 'posts' }, textContent: 'Posts' }),
          el('button', { className: 'tab', dataset: { tab: 'members' }, textContent: 'Members' }),
          el('button', { className: 'tab', dataset: { tab: 'rules' }, textContent: 'Rules' })
        ]),
        el('div', { className: 'group-detail__content' }, [
          el('div', { className: 'tab-content tab-content--active', id: 'postsTab' }, [
            el('div', { id: 'groupPosts', className: 'posts-feed' }, [
              el('div', { className: 'loading', textContent: 'Loading posts...' })
            ])
          ]),
          el('div', { className: 'tab-content', id: 'membersTab' }, [
            el('div', { id: 'groupMembers', className: 'members-list' }, [
              el('div', { className: 'loading', textContent: 'Loading members...' })
            ])
          ]),
          el('div', { className: 'tab-content', id: 'rulesTab' }, [
            el('div', { id: 'groupRules', className: 'rules-section' }, [
              el('div', { className: 'loading', textContent: 'Loading rules...' })
            ])
          ])
        ])
      ]),
      el('div', { className: 'group-detail__sidebar', id: 'groupSidebar' }, [
        el('div', { className: 'loading', textContent: 'Loading...' })
      ])
    ])
  ]));

  // Load data
  await loadGroupData(groupId);
  await loadGroupPosts(groupId);
  await loadGroupMembers(groupId);

  // Setup tabs
  setupTabs();
}

async function loadGroupData(groupId) {
  try {
    const group = await GroupsService.getGroup(groupId);
    const header = document.getElementById('groupHeader');
    const sidebar = document.getElementById('groupSidebar');
    const currentUserId = await getCurrentUserId();

    if (header) {
      clearElement(header);
      header.appendChild(el('div', { className: 'group-detail__info' }, [
        ...(group.cover_url ? [el('img', { src: group.cover_url, alt: group.name, className: 'group-detail__cover' })] : []),
        el('h1', { textContent: `${group.name}${group.is_verified ? ' ✓' : ''}` }),
        el('p', { textContent: group.description }),
        el('div', { className: 'group-detail__meta' }, [
          el('span', { textContent: `👥 ${group.members_count} members` }),
          el('span', { textContent: group.is_private ? '🔒 Private' : '🌐 Public' })
        ])
      ]));

      const isMember = await GroupsService.isMemberOfGroup(groupId, currentUserId);
      if (!isMember && currentUserId) {
        const joinBtn = el('button', {
          className: 'btn btn-primary',
          textContent: 'Join Group',
          onClick: async function() {
            await GroupsService.joinGroup(groupId);
            alert('Joined!');
            window.location.reload();
          }
        });
        header.appendChild(joinBtn);
      }
    }

    const { data: members } = await GroupsService.getGroupMembers(groupId, 5);
    if (sidebar) {
      clearElement(sidebar);
      const sidebarContent = createGroupSidebar(group, members);
      sidebar.appendChild(sidebarContent);
    }
  } catch (error) {
    const header = document.getElementById('groupHeader');
    if (header) header.innerHTML = `<p class="error">Error loading group: ${error.message}</p>`;
  }
}

async function loadGroupPosts(groupId) {
  try {
    const posts = await GroupsService.getGroupPosts(groupId);
    const container = document.getElementById('groupPosts');
    if (!container) return;

    if (!posts || posts.length === 0) {
      container.innerHTML = '<p class="empty-state">No posts yet</p>';
      return;
    }

    clearElement(container);
    posts.forEach(post => {
      renderPostCard(container, post);
    });
  } catch (error) {
    const container = document.getElementById('groupPosts');
    if (container) container.innerHTML = `<p class="error">Error: ${error.message}</p>`;
  }
}

async function loadGroupMembers(groupId) {
  try {
    const { data: members } = await GroupsService.getGroupMembers(groupId);
    const container = document.getElementById('groupMembers');
    if (!container) return;

    if (!members || members.length === 0) {
      container.innerHTML = '<p class="empty-state">No members yet</p>';
      return;
    }

    clearElement(container);
    members.forEach(member => {
      const item = el('div', { className: 'member-item' }, [
        el('img', { src: member.avatar_url || '/assets/default-avatar.png', alt: member.username, className: 'member-item__avatar' }),
        el('div', { className: 'member-item__info' }, [
          el('h4', { textContent: `${member.display_name}${member.is_verified ? ' ✓' : ''}` }),
          el('p', { textContent: `@${member.username}` })
        ])
      ]);
      container.appendChild(item);
    });
  } catch (error) {
    const container = document.getElementById('groupMembers');
    if (container) container.innerHTML = `<p class="error">Error: ${error.message}</p>`;
  }
}

function setupTabs() {
  const tabs = document.querySelectorAll('#groupTabs .tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('tab--active'));
      contents.forEach(c => c.classList.remove('tab-content--active'));

      tab.classList.add('tab--active');
      const tabName = tab.dataset.tab;
      const tabElement = document.querySelector(`#${tabName}Tab`);
      if (tabElement) tabElement.classList.add('tab-content--active');
    });
  });
}
