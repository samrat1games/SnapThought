import { el } from '../utils/dom.js';

export function openModal(content, options = {}) {
  const overlay = el('div', { className: 'modal-overlay', onClick: (e) => {
    if (e.target === overlay) closeModal(overlay);
  }});

  const modal = el('div', { className: 'modal' }, [
    options.title ? el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } }, [
      el('h2', { textContent: options.title, style: { fontSize: '20px', fontWeight: '800' } }),
      el('button', {
        className: 'btn-ghost',
        textContent: '×',
        style: { fontSize: '20px' },
        onClick: () => closeModal(overlay),
      }),
    ]) : null,
    content,
  ].filter(Boolean));

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  return {
    close: () => closeModal(overlay),
    el: overlay,
  };
}

function closeModal(overlay) {
  overlay?.remove();
}
