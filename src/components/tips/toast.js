import { el } from '../../utils/helper.js';
import bus from '../../event/bus.js';

var container = null;
var counter = 0;

var ICONS = {
  success: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm3.2 5.3-3.7 3.7a.5.5 0 0 1-.7 0L4.8 8a.5.5 0 1 1 .7-.7L6.8 8.9l3.3-3.3a.5.5 0 0 1 .7.7l-.6.4Z" fill="currentColor"/></svg>',
  error: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm2.7 4.3a.5.5 0 0 0-.7-.7L8 7.3 6 5.3a.5.5 0 0 0-.7.7L7.3 8 5.3 10a.5.5 0 0 0 .7.7L8 8.7l2 2a.5.5 0 0 0 .7-.7L8.7 8l2-2.7Z" fill="currentColor"/></svg>',
  warning: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm0 10.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM7.25 4.5a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-1.5 0v-3Z" fill="currentColor"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm-.75 3.5a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0ZM8 6a.5.5 0 0 0-.5.5V10a.5.5 0 0 0 1 0V6.5A.5.5 0 0 0 8 6Z" fill="currentColor"/></svg>'
};

var TYPE_COLORS = {
  success: { bg: 'rgba(74, 124, 107, 0.1)', color: '#4A7C6B', icon: '#4A7C6B', border: 'rgba(74, 124, 107, 0.2)' },
  error: { bg: 'rgba(217, 83, 79, 0.1)', color: '#D9534F', icon: '#D9534F', border: 'rgba(217, 83, 79, 0.2)' },
  warning: { bg: 'rgba(199, 155, 51, 0.1)', color: '#C79B33', icon: '#C79B33', border: 'rgba(199, 155, 51, 0.2)' },
  info: { bg: 'rgba(74, 124, 107, 0.08)', color: '#556B63', icon: '#556B63', border: 'rgba(85, 107, 99, 0.2)' }
};

function ensureContainer() {
  if (container) return container;
  container = el('div', {
    id: 'toast-container',
    style: 'position:fixed;top:16px;right:16px;z-index:2000;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:360px;'
  });
  document.body.appendChild(container);
  return container;
}

function removeToast(item) {
  if (!item || !item.parentNode) return;
  item.style.opacity = '0';
  item.style.transform = 'translateX(100%)';
  item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  setTimeout(function () {
    if (item.parentNode) item.parentNode.removeChild(item);
  }, 300);
}

export function showToast(options) {
  if (typeof options === 'string') {
    options = { message: options, type: 'info' };
  }

  var type = options.type || 'info';
  var message = options.message || '';
  var duration = typeof options.duration === 'number' ? options.duration : 3000;
  var colors = TYPE_COLORS[type] || TYPE_COLORS.info;

  var toastEl = el('div', {
    style: 'pointer-events:auto;display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:8px;border:1px solid ' + colors.border + ';background:' + colors.bg + ';color:' + colors.color + ';font-size:13px;line-height:1.5;box-shadow:0 4px 16px rgba(0,0,0,0.08);transform:translateX(100%);opacity:0;transition:opacity 0.3s ease, transform 0.3s ease;cursor:pointer;'
  });

  var iconWrap = el('span', {
    style: 'flex-shrink:0;display:flex;align-items:center;margin-top:1px;color:' + colors.icon + ';',
    innerHTML: ICONS[type] || ICONS.info
  });

  var textEl = el('span', { style: 'flex:1;word-break:break-word;color:' + colors.color + ';' }, message);

  var closeBtn = el('span', {
    style: 'flex-shrink:0;display:flex;align-items:center;cursor:pointer;opacity:0.5;transition:opacity 0.15s;padding:0 0 0 8px;',
    innerHTML: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3.5 3.5l5 5m0-5l-5 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>'
  });
  closeBtn.addEventListener('mouseenter', function () { closeBtn.style.opacity = '1'; });
  closeBtn.addEventListener('mouseleave', function () { closeBtn.style.opacity = '0.5'; });
  closeBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    removeToast(toastEl);
  });

  toastEl.appendChild(iconWrap);
  toastEl.appendChild(textEl);
  toastEl.appendChild(closeBtn);

  var c = ensureContainer();
  c.appendChild(toastEl);

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      toastEl.style.transform = 'translateX(0)';
      toastEl.style.opacity = '1';
    });
  });

  if (duration > 0) {
    setTimeout(function () {
      removeToast(toastEl);
    }, duration);
  }

  counter++;
  return counter;
}

export function initToast() {
  bus.on('tips:show', function (options) {
    showToast(options);
  });
}
