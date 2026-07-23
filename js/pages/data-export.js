import { el, clearElement } from '../utils/dom.js';
import { getCurrentUser } from '../state.js';
import { exportUserData, downloadExport, exportAsCSV } from '../services/data-export.js';

export async function render(container) {
  const user = getCurrentUser();
  if (!user) return;

  const header = el('div', { className: 'page-header' }, [
    el('h1', { className: 'page-header-title', textContent: 'Data Export' }),
  ]);

  const statusEl = el('div', { style: { padding: '16px' } });

  const exportJsonBtn = el('button', {
    className: 'btn btn-primary btn-lg',
    textContent: 'Export as JSON',
    style: { width: '100%' },
    onClick: async () => {
      exportJsonBtn.disabled = true;
      exportJsonBtn.textContent = 'Exporting...';
      statusEl.innerHTML = '';

      try {
        const data = await exportUserData(user.id);
        downloadExport(data);
        statusEl.appendChild(el('div', { style: { color: 'var(--success)', padding: '12px', textAlign: 'center' }, textContent: 'JSON export downloaded!' }));
      } catch (err) {
        console.error('Export failed:', err);
        statusEl.appendChild(el('div', { className: 'error-message', textContent: 'Export failed' }));
      }

      exportJsonBtn.disabled = false;
      exportJsonBtn.textContent = 'Export as JSON';
    },
  });

  const exportCsvBtn = el('button', {
    className: 'btn btn-outline btn-lg',
    textContent: 'Export posts as CSV',
    style: { width: '100%' },
    onClick: async () => {
      exportCsvBtn.disabled = true;
      exportCsvBtn.textContent = 'Exporting...';
      statusEl.innerHTML = '';

      try {
        const data = await exportUserData(user.id);
        exportAsCSV(data.posts);
        statusEl.appendChild(el('div', { style: { color: 'var(--success)', padding: '12px', textAlign: 'center' }, textContent: 'CSV export downloaded!' }));
      } catch (err) {
        console.error('Export failed:', err);
        statusEl.appendChild(el('div', { className: 'error-message', textContent: 'Export failed' }));
      }

      exportCsvBtn.disabled = false;
      exportCsvBtn.textContent = 'Export posts as CSV';
    },
  });

  container.append(
    header,
    el('div', { className: 'settings-form' }, [
      el('h3', { textContent: 'Download your data', style: { fontSize: '18px', fontWeight: '700', marginBottom: '8px' } }),
      el('p', { textContent: 'Export your profile, posts, likes, follows, bookmarks, and replies.', style: { color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' } }),
      exportJsonBtn,
      exportCsvBtn,
      statusEl,
    ])
  );
}

export function cleanup() {}
