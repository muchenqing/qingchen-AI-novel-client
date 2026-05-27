/**
 * 侧边栏组件模块
 * @description 构建侧边栏UI，包含书稿搜索、书稿列表、新建按钮、主题切换、设置入口
 *              负责书稿的创建、删除、切换、搜索等交互逻辑
 * @exports buildSidebar - 创建侧边栏DOM结构并绑定事件
 * @exports renderManuscriptList - 渲染书稿列表，根据搜索关键词过滤
 * @exports handleNewManuscript - 创建新书稿并切换
 * @exports handleDeleteManuscript - 删除指定书稿（弹出确认对话框）
 * @exports switchManuscript - 切换当前书稿并加载内容
 */

import { el } from '../../utils/helper.js';
import { formatDate } from '../../utils/format.js';
import { THEMES } from '../../utils/storage.js';
import appState from '../../core/appState.js';
import { showConfirmDialog } from './confirmDialog.js';
import bus from '../../event/bus.js';

export function renderManuscriptList() {
  var container = document.getElementById('manuscript-list');
  if (!container) return;
  container.innerHTML = '';

  var manuscripts = appState.getManuscripts();
  var searchQuery = appState.getSearchQuery();
  var currentManuscriptId = appState.getCurrentManuscriptId();

  var filtered = manuscripts.filter(function (m) {
    return searchQuery ? m.title.toLowerCase().indexOf(searchQuery) !== -1 : true;
  });

  if (filtered.length === 0) {
    container.appendChild(el('div', { className: 'sidebar-empty' }, searchQuery ? '没有匹配的书稿' : '暂无书稿'));
    return;
  }

  filtered.forEach(function (ms) {
    var isActive = ms.id === currentManuscriptId;
    var item = el('div', {
      className: 'sidebar-item' + (isActive ? ' active' : ''),
      dataset: { id: ms.id },
    });

    var title = el('div', { className: 'sidebar-item-title' }, ms.title);
    var meta = el('div', { className: 'sidebar-item-meta' }, ms.wordCount + '字 \u00b7 ' + formatDate(ms.updatedAt));
    var deleteBtn = el('button', { className: 'sidebar-item-delete', title: '删除', innerHTML: '\u2715' });
    deleteBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      handleDeleteManuscript(ms.id);
    });

    item.appendChild(title);
    item.appendChild(meta);
    item.appendChild(deleteBtn);
    item.addEventListener('click', function () { switchManuscript(ms.id); });
    container.appendChild(item);
  });
}

export function switchManuscript(id) {
  appState.setCurrentManuscriptId(id);
  bus.emit('manuscript:switched', id);
  renderManuscriptList();
  bus.emit('editor:hide-welcome');
}

export function handleNewManuscript() {
  var ms = appState.createManuscript();
  renderManuscriptList();
  switchManuscript(ms.id);
  bus.emit('editor:focus-title');
}

export function handleDeleteManuscript(id) {
  var ms = appState.getManuscript(id);
  if (!ms) return;
  showConfirmDialog('确定删除书稿「' + ms.title + '」吗？此操作不可撤销。', function () {
    appState.deleteManuscript(id);
    renderManuscriptList();
    if (appState.getCurrentManuscriptId() === null || appState.getManuscripts().length === 0) {
      var newMs = appState.createManuscript();
      renderManuscriptList();
      switchManuscript(newMs.id);
    } else {
      switchManuscript(appState.getCurrentManuscriptId());
    }
  });
}

export function buildSidebar() {
  var searchInput = el('input', {
    className: 'sidebar-search',
    placeholder: '搜索书稿\u2026',
    type: 'text',
  });
  searchInput.addEventListener('input', function (e) {
    appState.setSearchQuery(e.target.value.trim().toLowerCase());
    renderManuscriptList();
  });

  var listContainer = el('div', { className: 'sidebar-list', id: 'manuscript-list' });

  var btnNew = el('button', { className: 'sidebar-btn-new', id: 'btn-new-manuscript' }, '+ 新建书稿');
  btnNew.addEventListener('click', handleNewManuscript);

  var footer = el('div', { className: 'sidebar-footer' });
  var themeBar = el('div', { className: 'theme-bar' });
  THEMES.forEach(function (t) {
    var btn = el('button', { className: 'theme-btn', dataset: { theme: t }, title: t });
    btn.addEventListener('click', function () {
      bus.emit('theme:apply', t);
    });
    themeBar.appendChild(btn);
  });

  var footerActions = el('div', { className: 'sidebar-footer-actions' });

  var btnThemeManager = el('button', { className: 'sidebar-btn-action', id: 'btn-theme-manager', title: '主题管理' }, '\u25c9');
  btnThemeManager.addEventListener('click', function () {
    bus.emit('modal:open-theme-manager');
  });

  var btnShortcuts = el('button', { className: 'sidebar-btn-action', id: 'btn-shortcuts', title: '快捷键设置' }, '\u2328');
  btnShortcuts.addEventListener('click', function () {
    bus.emit('modal:open-shortcuts');
  });

  var btnConfig = el('button', { className: 'sidebar-btn-action', id: 'btn-config-panel', title: '配置中心' }, '\u2630');
  btnConfig.addEventListener('click', function () {
    bus.emit('modal:open-config');
  });

  var btnVersionHistory = el('button', { className: 'sidebar-btn-action', id: 'btn-version-history', title: '版本管理' }, '\u29d6');
  btnVersionHistory.addEventListener('click', function () {
    bus.emit('modal:open-version-history');
  });

  var btnPluginMarket = el('button', { className: 'sidebar-btn-action', id: 'btn-plugin-market', title: '插件管理' }, '\u2b1a');
  btnPluginMarket.addEventListener('click', function () {
    bus.emit('modal:open-plugin-market');
  });

  var btnSyncSetting = el('button', { className: 'sidebar-btn-action', id: 'btn-sync-setting', title: '同步设置' }, '\u21c5');
  btnSyncSetting.addEventListener('click', function () {
    bus.emit('modal:open-sync-setting');
  });

  var btnHelp = el('button', { className: 'sidebar-btn-action', id: 'btn-help-center', title: '帮助中心' }, '\u2370');
  btnHelp.addEventListener('click', function () {
    bus.emit('modal:open-help');
  });

  var btnZenMode = el('button', { className: 'sidebar-btn-action', id: 'btn-zen-mode', title: '极简模式 (Ctrl+Shift+Z)' }, '\u2715');
  btnZenMode.addEventListener('click', function () {
    bus.emit('zen:toggle');
  });

  var btnPinTop = el('button', { className: 'sidebar-btn-action', id: 'btn-pin-top', title: '窗口置顶' }, '\u2b06');
  btnPinTop.addEventListener('click', function () {
    bus.emit('window:pin-top');
  });

  var btnFontSetting = el('button', { className: 'sidebar-btn-action', id: 'btn-font-setting', title: '排版设置' }, '\u2588');
  btnFontSetting.addEventListener('click', function () {
    bus.emit('modal:open-font-setting');
  });

  var btnBookManage = el('button', { className: 'sidebar-btn-action', id: 'btn-book-manage', title: '书籍管理' }, '\u2263');
  btnBookManage.addEventListener('click', function () {
    bus.emit('modal:open-book-manage');
  });

  var btnCharacterLib = el('button', { className: 'sidebar-btn-action', id: 'btn-character-lib', title: '人物卡' }, '\u263a');
  btnCharacterLib.addEventListener('click', function () {
    bus.emit('modal:open-character-lib');
  });

  var btnMaterialLib = el('button', { className: 'sidebar-btn-action', id: 'btn-material-lib', title: '素材库' }, '\u2606');
  btnMaterialLib.addEventListener('click', function () {
    bus.emit('modal:open-material-lib');
  });

  var btnDashboard = el('button', { className: 'sidebar-btn-action', id: 'btn-dashboard', title: '数据统计' }, '\u25a3');
  btnDashboard.addEventListener('click', function () {
    bus.emit('modal:open-dashboard');
  });

  var btnSettings = el('button', { className: 'sidebar-btn-settings', id: 'btn-settings', title: 'AI 设置' }, '\u2699');
  btnSettings.addEventListener('click', function () {
    bus.emit('modal:open-settings');
  });

  footerActions.appendChild(btnThemeManager);
  footerActions.appendChild(btnShortcuts);
  footerActions.appendChild(btnConfig);
  footerActions.appendChild(btnVersionHistory);
  footerActions.appendChild(btnPluginMarket);
  footerActions.appendChild(btnSyncSetting);
  footerActions.appendChild(btnHelp);
  footerActions.appendChild(btnZenMode);
  footerActions.appendChild(btnPinTop);
  footerActions.appendChild(btnFontSetting);
  footerActions.appendChild(btnBookManage);
  footerActions.appendChild(btnCharacterLib);
  footerActions.appendChild(btnMaterialLib);
  footerActions.appendChild(btnDashboard);

  footer.appendChild(themeBar);
  footer.appendChild(footerActions);
  footer.appendChild(btnSettings);

  var sidebar = el('aside', { className: 'sidebar', id: 'sidebar' });
  sidebar.appendChild(searchInput);
  sidebar.appendChild(listContainer);
  sidebar.appendChild(btnNew);
  sidebar.appendChild(footer);
  return sidebar;
}

export function initSidebar() {
  bus.on('manuscript:list-changed', renderManuscriptList);

  var btnZen = document.getElementById('btn-zen-mode');
  if (btnZen) {
    function syncZenBtn() {
      var isZen = appState.getIsZenMode();
      btnZen.classList.toggle('active', isZen);
      btnZen.title = isZen ? '退出极简模式 (ESC)' : '极简模式 (Ctrl+Shift+Z)';
    }
    syncZenBtn();
    bus.on('zen:changed', syncZenBtn);
  }
}
