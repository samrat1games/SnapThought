export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

export function el(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);

  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') element.className = v;
    else if (k === 'innerHTML') element.innerHTML = v;
    else if (k === 'textContent') element.textContent = v;
    else if (k === 'dataset') Object.assign(element.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') {
      element.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'style' && typeof v === 'object') {
      Object.assign(element.style, v);
    } else {
      element.setAttribute(k, v);
    }
  }

  for (const child of (Array.isArray(children) ? children : [children])) {
    if (child == null || child === false) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  }

  return element;
}

export function clearElement(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

export function showLoader(container) {
  const loader = el('div', { className: 'loader' }, [
    el('div', { className: 'spinner' })
  ]);
  container.appendChild(loader);
  return loader;
}

export function showError(container, message) {
  container.appendChild(
    el('div', { className: 'error-message', textContent: message })
  );
}

export function showEmpty(container, message) {
  container.appendChild(
    el('div', { className: 'empty-state', textContent: message })
  );
}
