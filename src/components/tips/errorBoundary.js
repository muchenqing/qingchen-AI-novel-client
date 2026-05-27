import { el } from '../../utils/helper.js';
import bus from '../../event/bus.js';

var overlay = null;
var msgEl = null;
var detailsEl = null;
var detailsWrap = null;
var footerEl = null;
var currentOptions = null;

var ERROR_CONFIG = {
  warning: { label: '⚠ 警告', borderColor: 'rgba(199, 155, 51, 0.3)', bgTint: 'rgba(199, 155, 51, 0.05)' },
  error: { label: '✕ 错误', borderColor: 'rgba(217, 83, 79, 0.3)', bgTint: 'rgba(217, 83, 79, 0.05)' },
  network: { label: '⛓ 网络异常', borderColor: 'rgba(180, 100, 50, 0.3)', bgTint: 'rgba(180, 100, 50, 0.05)' }
};

var NETWORK_GUIDANCE = [
  '请检查网络连接是否正常',
  '确认服务器地址是否正确',
  '如使用代理，请检查代理设置',
  '可尝试刷新页面后重试'
];

function ensureOverlay() {
  if (overlay) return overlay;

  msgEl = el('div', {
    id: 'error-boundary-message',
    style: 'font-size:14px;line-height:1.7;color:var(--text-primary);margin-bottom:12px;'
  });

  detailsWrap = el('div', {
    id: 'error-details-wrap',
    style: 'display:none;margin-bottom:16px;'
  });

  detailsEl = el('div', {
    id: 'error-boundary-details',
    style: 'font-size:12px;line-height:1.6;color:var(--text-secondary);background:var(--hover-bg);border:1px solid var(--border);border-radius:8px;padding:12px;max-height:200px;overflow-y:auto;white-space:pre-wrap;word-break:break-all;font-family:Consolas,Monaco,monospace;'
  });
  detailsWrap.appendChild(detailsEl);

  var titleEl = el('h3', {
    id: 'error-boundary-title',
    className: 'modal-title',
    style: 'display:flex;align-items:center;gap:8px;'
  });

  var headerEl = el('div', {
    className: 'modal-header',
    style: 'display:flex;align-items:center;justify-content:space-between;'
  }, titleEl);

  var bodyEl = el('div', { className: 'modal-body' }, msgEl, detailsWrap);

  footerEl = el('div', {
    id: 'error-boundary-footer',
    className: 'modal-footer'
  });

  var card = el('div', {
    className: 'modal-card',
    id: 'error-boundary-card',
    style: 'width:440px;'
  }, headerEl, bodyEl, footerEl);

  overlay = el('div', {
    id: 'error-boundary-overlay',
    className: 'modal-overlay'
  }, card);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) dismissError();
  });
  card.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  document.body.appendChild(overlay);
  return overlay;
}

function dismissError() {
  if (!overlay) return;
  overlay.classList.remove('open');
  if (currentOptions && typeof currentOptions.dismiss === 'function') {
    currentOptions.dismiss();
  }
  currentOptions = null;
}

function renderButtons(type) {
  footerEl.innerHTML = '';

  var btnClose = el('button', { className: 'modal-btn modal-btn-ghost' }, '关闭');
  btnClose.addEventListener('click', dismissError);
  footerEl.appendChild(btnClose);

  if (type === 'network') {
    var btnRetry = el('button', { className: 'modal-btn modal-btn-primary' }, '重试');
    btnRetry.addEventListener('click', function () {
      if (currentOptions && typeof currentOptions.retry === 'function') {
        currentOptions.retry();
      }
      dismissError();
    });
    footerEl.insertBefore(btnRetry, btnClose);
  } else if (currentOptions && typeof currentOptions.retry === 'function') {
    var btnRetry2 = el('button', { className: 'modal-btn modal-btn-primary' }, '重试');
    btnRetry2.addEventListener('click', function () {
      currentOptions.retry();
      dismissError();
    });
    footerEl.insertBefore(btnRetry2, btnClose);
  }
}

export function showError(message, details, options) {
  if (typeof details === 'object' && details !== null && !Array.isArray(details) && options === undefined) {
    options = details;
    details = null;
  }
  options = options || {};
  currentOptions = options;

  var type = options.type || 'error';
  var config = ERROR_CONFIG[type] || ERROR_CONFIG.error;

  var o = ensureOverlay();

  var titleEl = o.querySelector('#error-boundary-title');
  if (titleEl) {
    titleEl.textContent = '';
    titleEl.appendChild(document.createTextNode(config.label));
  }

  var card = o.querySelector('#error-boundary-card');
  if (card) {
    card.style.borderColor = config.borderColor;
    card.style.background = 'linear-gradient(135deg, var(--card-bg), ' + config.bgTint + ')';
  }

  if (type === 'network') {
    var guidanceHtml = '<div style="margin-top:8px;padding:10px 12px;background:var(--hover-bg);border-radius:6px;border:1px solid var(--border);">';
    guidanceHtml += '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px;">建议排查步骤：</div>';
    for (var i = 0; i < NETWORK_GUIDANCE.length; i++) {
      guidanceHtml += '<div style="font-size:12px;color:var(--text-secondary);line-height:1.8;">' + (i + 1) + '. ' + NETWORK_GUIDANCE[i] + '</div>';
    }
    guidanceHtml += '</div>';
    msgEl.innerHTML = '<div>' + message + '</div>' + guidanceHtml;
  } else {
    msgEl.textContent = message;
  }

  if (details && options.showDetails) {
    detailsEl.textContent = typeof details === 'string' ? details : JSON.stringify(details, null, 2);
    detailsWrap.style.display = 'block';
  } else {
    detailsWrap.style.display = 'none';
    detailsEl.textContent = '';
  }

  if (options.showDetails && details) {
    var btnToggle = el('button', { className: 'modal-btn modal-btn-ghost' }, '展开详情');
    btnToggle.addEventListener('click', function () {
      var visible = detailsWrap.style.display !== 'none';
      detailsWrap.style.display = visible ? 'none' : 'block';
      btnToggle.textContent = visible ? '展开详情' : '收起详情';
    });
    footerEl.insertBefore(btnToggle, footerEl.firstChild);
  }

  renderButtons(type);
  o.classList.add('open');
}

export function initErrorBoundary() {
  bus.on('error:show', function (payload) {
    var msg = payload.message || '发生未知错误';
    var details = payload.details || null;
    var opts = payload.options || {};
    if (payload.type) opts.type = payload.type;
    showError(msg, details, opts);
  });
}
