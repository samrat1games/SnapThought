import { el } from '../utils/dom.js';

export function renderAvatar(user, size = 'md') {
  const sizeClass = `avatar-${size}`;

  if (user.avatar_url) {
    const img = el('img', {
      className: `avatar ${sizeClass}`,
      src: user.avatar_url,
      alt: user.display_name || user.username,
    });
    img.onerror = () => {
      img.replaceWith(createFallback(user, size));
    };
    return img;
  }

  return createFallback(user, size);
}

function createFallback(user, size) {
  const sizePx = {
    sm: 32, md: 40, lg: 48, xl: 80, '2xl': 134
  }[size] || 40;

  const initial = (user.display_name || user.username || '?')[0].toUpperCase();

  return el('div', {
    className: `avatar-fallback avatar-${size}`,
    style: { width: sizePx + 'px', height: sizePx + 'px', fontSize: (sizePx * 0.4) + 'px' },
    textContent: initial,
  });
}
