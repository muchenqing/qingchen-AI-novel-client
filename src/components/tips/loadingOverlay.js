import { el } from '../../utils/helper.js';
import bus from '../../event/bus.js';

var overlay = null;
var messageEl = null;
var typeEl = null;
var showCount = 0;

var SPINNER_STYLE = 'width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:tipSpin 0.8s linear infinite;';

var DOTS_KEYFRAMES = '<style>@keyframes tipDotPulse{0%,80%,100%{opacity:0.3;transform:scale(0.6)}40%{opacity:1;transform:scale(1)}}</style>';

function ensureOverlay() {
  if (overlay) return overlay;

  var styleTag = document.createElement('style');
  styleTag.textContent = '@keyframes tipSpin{to{transform:rotate(360deg)}}@keyframes tipBarSlide{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}@keyframes tipFadeIn{from{opacity:0}to{opacity:1}}';
  document.head.appendChild(styleTag);

  typeEl = el('div', { id: 'loading-type', style: 'display:flex;align-items:center;justify-content:center;margin-bottom:12px;' });

  messageEl = el('div', {
    id: 'loading-message',
    style: 'font-size:13px;color:var(--text-secondary);text-align:center;'
  });

  var inner = el('div', {
    style: 'display:flex;flex-direction:column;align-items:center;justify-content:center;'
  }, typeEl, messageEl);

  overlay = el('div', {
    id: 'loading-overlay',
    className: 'modal-overlay',
    style: 'z-index:1500;pointer-events:none;'
  }, el('div', {
    style: 'background:var(--card-bg);border-radius:12px;border:1px solid var(--border);padding:32px 40px;box-shadow:0 12px 40px rgba(0,0,0,0.1);display:flex;flex-direction:column;align-items:center;pointer-events:auto;'
  }, inner));

  document.body.appendChild(overlay);
  return overlay;
}

function createSpinner() {
  return el('div', { style: SPINNER_STYLE });
}

function createDots() {
  var dots = [];
  for (var i = 0; i < 3; i++) {
    var dot = el('span', {
      style: 'width:8px;height:8px;border-radius:50%;background:var(--accent);display:inline-block;margin:0 4px;animation:tipDotPulse 1.2s ease-in-out infinite;' + 'animation-delay:' + (i * 0.2) + 's;'
    });
    dots.push(dot);
  }
  return el('div', { style: 'display:flex;align-items:center;justify-content:center;gap:4px;height:32px;' }, dots[0], dots[1], dots[2]);
}

function createBar() {
  var track = el('div', {
    style: 'width:120px;height:4px;border-radius:2px;background:var(--border);overflow:hidden;'
  });
  var bar = el('div', {
    style: 'width:50%;height:100%;background:var(--accent);border-radius:2px;animation:tipBarSlide 1.2s ease-in-out infinite;'
  });
  track.appendChild(bar);
  return el('div', { style: 'display:flex;align-items:center;justify-content:center;height:32px;' }, track);
}

function renderType(type) {
  typeEl.innerHTML = '';
  if (type === 'dots') {
    typeEl.appendChild(createDots());
  } else if (type === 'bar') {
    typeEl.appendChild(createBar());
  } else {
    typeEl.appendChild(createSpinner());
  }
}

export function showLoading(message, type) {
  var o = ensureOverlay();
  messageEl.textContent = message || '';
  renderType(type || 'spinner');

  showCount++;
  o.style.transition = 'opacity 0.2s';
  o.classList.add('open');
}

export function hideLoading() {
  if (showCount > 0) showCount--;
  if (showCount > 0) return;
  if (!overlay) return;
  overlay.classList.remove('open');
}

export function initLoadingOverlay() {
  bus.on('loading:show', function (message, type) {
    showLoading(message, type);
  });
  bus.on('loading:hide', function () {
    hideLoading();
  });
}
