import { el } from '../../utils/helper.js';
import { getInstalledPlugins, installPlugin, uninstallPlugin, enablePlugin, disablePlugin, getPluginStats } from '../../plugin/pluginManager.js';
import { parseManifest } from '../../plugin/pluginManifest.js';
import appState from '../../core/appState.js';
import bus from '../../event/bus.js';

var statsEl = null;
var listEl = null;

function openPluginMarket() {
  var overlay = document.getElementById('plugin-market-overlay');
  if (!overlay) return;
  refreshPluginList();
  overlay.classList.add('open');
}

function closePluginMarket() {
  var overlay = document.getElementById('plugin-market-overlay');
  if (overlay) overlay.classList.remove('open');
}

function refreshPluginList() {
  var plugins = getInstalledPlugins();
  var stats = getPluginStats();

  if (statsEl) {
    statsEl.textContent = '\u5171 ' + stats.total + ' \u4e2a\u63d2\u4ef6\uff0c\u5df2\u542f\u7528 ' + stats.enabled + ' \u4e2a\uff0c\u5df2\u505c\u7528 ' + stats.disabled + ' \u4e2a';
  }

  if (!listEl) return;
  listEl.innerHTML = '';

  if (plugins.length === 0) {
    listEl.appendChild(el('div', { className: 'pm-empty' }, '\u6682\u65e0\u5df2\u5b89\u88c5\u63d2\u4ef6'));
    return;
  }

  for (var i = 0; i < plugins.length; i++) {
    listEl.appendChild(buildPluginRow(plugins[i]));
  }
}

function buildPluginRow(plugin) {
  var toggleCheck = el('input', { type: 'checkbox', className: 'pm-toggle' });
  toggleCheck.checked = !!plugin.enabled;
  toggleCheck.addEventListener('change', function () {
    if (toggleCheck.checked) {
      enablePlugin(plugin.id);
    } else {
      disablePlugin(plugin.id);
    }
    refreshPluginList();
    bus.emit('status:set', plugin.name + ' \u5df2' + (toggleCheck.checked ? '\u542f\u7528' : '\u505c\u7528'));
  });

  var btnUninstall = el('button', { className: 'modal-btn modal-btn-danger pm-btn-uninstall' }, '\u5378\u8f7d');
  btnUninstall.addEventListener('click', function () {
    uninstallPlugin(plugin.id);
    refreshPluginList();
    bus.emit('status:set', plugin.name + ' \u5df2\u5378\u8f7d');
  });

  var infoEl = el('div', { className: 'pm-info' },
    el('div', { className: 'pm-name' }, plugin.name),
    el('div', { className: 'pm-meta' },
      'v' + plugin.version + (plugin.author ? ' \u00b7 ' + plugin.author : ''),
    ),
    el('div', { className: 'pm-desc' }, plugin.description || ''),
  );

  var actionsEl = el('div', { className: 'pm-actions' }, toggleCheck, btnUninstall);

  return el('div', { className: 'pm-row' }, infoEl, actionsEl);
}

function handleInstallClick() {
  bus.emit('tips:show', { type: 'info', message: '\u8bf7\u901a\u8fc7\u6587\u4ef6\u83dc\u5355\u5b89\u88c5\u63d2\u4ef6' });
}

export function buildPluginMarket() {
  var overlay = el('div', { className: 'modal-overlay', id: 'plugin-market-overlay' });

  statsEl = el('div', { className: 'pm-stats' });

  listEl = el('div', { className: 'pm-list' });

  var btnInstall = el('button', { className: 'modal-btn modal-btn-primary' }, '\u5b89\u88c5\u63d2\u4ef6');
  btnInstall.addEventListener('click', handleInstallClick);

  var btnClose = el('button', { className: 'modal-btn modal-btn-ghost' }, '\u5173\u95ed');
  btnClose.addEventListener('click', closePluginMarket);

  var card = el('div', { className: 'modal-card modal-card-plugins' },
    el('div', { className: 'modal-header' },
      el('h3', { className: 'modal-title' }, '\u63d2\u4ef6\u5e02\u573a'),
    ),
    el('div', { className: 'modal-body' }, statsEl, listEl),
    el('div', { className: 'modal-footer' }, btnClose, btnInstall),
  );

  overlay.addEventListener('click', function (e) { if (e.target === overlay) closePluginMarket(); });
  card.addEventListener('click', function (e) { e.stopPropagation(); });
  overlay.appendChild(card);
  return overlay;
}

export function initPluginMarket() {
  bus.on('modal:open-plugin-market', openPluginMarket);
}
