/**
 * Groups Page
 */

import { getCurrentUserId, getUser } from '../supabase.js';
import { GroupsService } from '../services/groups.js';
import { createGroupCard } from '../components/group-card.js';
import { el, clearElement } from '../utils/dom.js';

export async function render(container, params = {}) {
  const currentUserId = await getCurrentUserId();
  
  clearElement(container);
  
  container.appendChild(el('div', { className: 'groups-page' }, [
    el('div', { className: 'groups-header' }, [
      el('h1', { textContent: 'Groups' }),
      el('div', { className: 'groups-actions' }, [
        el('input', {
          type: 'text',
          id: 'groupSearch',
          placeholder: 'Search groups...',
          className: 'input input-search',
          onInput: function(e) { loadGroups(e.target.value); }
        }),
        ...(currentUserId ? [
          el('button', {
            className: 'btn btn-primary',
            id: 'createGroupBtn',
            textContent: '+ Create Group',
            onClick: showCreateDialog
          })
        ] : [])
      ])
    ]),
    el('div', { id: 'groupsList', className: 'groups-grid' }, [
      el('div', { className: 'loading', textContent: 'Loading groups...' })
    ])
  ]));

  // Load groups
  await loadGroups();
}

async function loadGroups(searchQuery = '') {
  const container = document.getElementById('groupsList');
  if (!container) return;
  
  try {
    const { data: groups } = await GroupsService.getGroups(20, 0, searchQuery);
    
    if (!groups || groups.length === 0) {
      container.innerHTML = '<p class="empty-state">No groups found. Be the first to create one!</p>';
      return;
    }

    clearElement(container);
    groups.forEach(group => {
      const card = createGroupCard(group, async () => {
        await GroupsService.joinGroup(group.id);
        alert('Joined group!');
      });
      container.appendChild(card);
    });
  } catch (error) {
    container.innerHTML = `<p class="error">Error loading groups: ${error.message}</p>`;
  }
}

async function showCreateDialog() {
  const dialog = el('div', { className: 'modal-overlay' }, [
    el('div', { className: 'modal-content' }, [
      el('div', { className: 'modal-header' }, [
        el('h2', { textContent: 'Create a New Group' }),
        el('button', { className: 'modal-close', textContent: '×', onClick: function() { this.closest('.modal-overlay').remove(); } })
      ]),
      el('form', { id: 'createGroupForm', className: 'form', onSubmit: async function(e) {
        e.preventDefault();

        const name = this.querySelector('#groupName').value;
        const description = this.querySelector('#groupDesc').value;
        const isPrivate = this.querySelector('#groupPrivate').checked;
        const rules = this.querySelector('#groupRules').value;

        try {
          const group = await GroupsService.createGroup(name, description, isPrivate);
          if (rules) {
            await GroupsService.updateGroup(group.id, { rules });
          }

          dialog.remove();
          alert('Group created successfully!');
          window.location.hash = `#/group/${group.id}`;
        } catch (error) {
          alert(`Error: ${error.message}`);
        }
      } }, [
        el('div', { className: 'form-group' }, [
          el('label', { htmlFor: 'groupName', textContent: 'Group Name *' }),
          el('input', { type: 'text', id: 'groupName', required: true, placeholder: 'e.g., Foodies Unite', className: 'input-search' })
        ]),
        el('div', { className: 'form-group' }, [
          el('label', { htmlFor: 'groupDesc', textContent: 'Description' }),
          el('textarea', { id: 'groupDesc', placeholder: 'What\'s this group about?', className: 'input-search', rows: 4 })
        ]),
        el('div', { className: 'form-group' }, [
          el('label', { }, [
            el('input', { type: 'checkbox', id: 'groupPrivate' }),
            el('span', { textContent: ' Make this group private' })
          ])
        ]),
        el('div', { className: 'form-group' }, [
          el('label', { htmlFor: 'groupRules', textContent: 'Rules' }),
          el('textarea', { id: 'groupRules', placeholder: 'Group rules...', className: 'input-search', rows: 3 })
        ]),
        el('div', { className: 'modal-actions' }, [
          el('button', { type: 'button', className: 'btn btn-secondary', textContent: 'Cancel', onClick: function() { dialog.remove(); } }),
          el('button', { type: 'submit', className: 'btn btn-primary', textContent: 'Create Group' })
        ])
      ])
    ])
  ]);

  document.body.appendChild(dialog);
}
