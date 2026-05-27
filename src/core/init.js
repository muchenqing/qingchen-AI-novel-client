/**
 * 渲染进程初始化入口模块
 * @description 按顺序加载所有模块、构建UI、初始化数据、启动服务
 *              本模块只负责编排初始化流程，不包含具体业务逻辑
 */

import { el } from '../utils/helper.js';
import { loadManuscripts } from '../utils/storage.js';
import { loadEditorContent, showWelcomeState, startAutoSave, initEditorArea, buildMainArea } from '../components/common/editorArea.js';
import { buildTitleBar } from '../components/common/titleBar.js';
import { buildSidebar, renderManuscriptList, initSidebar } from '../components/common/sidebar.js';
import { buildSettingsModal, initSettingPanel } from '../components/settingPanel/index.js';
import { buildAiPanel, initAiPanel } from '../components/aiPanel/index.js';
import { buildConfirmDialog } from '../components/common/confirmDialog.js';
import { initThemeControl, applyTheme } from '../components/themeControl/index.js';
import { initStatusBar, setStatus } from '../components/common/statusBar.js';
import { loadConfig, getConfig } from '../config/configManager.js';
import { initToast } from '../components/tips/toast.js';
import { initLoadingOverlay } from '../components/tips/loadingOverlay.js';
import { initErrorBoundary } from '../components/tips/errorBoundary.js';
import { buildConfigPanel, initConfigPanel } from '../components/configPanel/index.js';
import { buildThemeManager, initThemeManager } from '../components/themeManager/index.js';
import { buildShortcutPanel, initShortcutPanel } from '../components/shortcutSetting/index.js';
import { buildPluginMarket, initPluginMarket } from '../components/pluginMarket/index.js';
import { buildVersionHistory, initVersionHistory } from '../components/versionHistory/index.js';
import { buildSyncSetting, initSyncSetting } from '../components/syncSetting/index.js';
import { buildHelpCenter, initHelpCenter } from '../components/helpCenter/index.js';
import { buildCharacterLib, initCharacterLib } from '../components/characterLib/index.js';
import { matchShortcut, getDefaultShortcuts } from '../utils/shortcutUtil.js';
import { autoSaveRecoveryData, createBackup, BACKUP_INTERVAL } from '../utils/fileRecover.js';
import { getInstalledPlugins, enablePlugin } from '../plugin/pluginManager.js';
import { createSnapshot, cleanExpiredVersions } from '../document/versionControl.js';
import { createBackup as createVersionBackup, cleanExpiredBackups } from '../document/backup.js';
import { initSync } from '../sync/syncCore.js';
import { initFontSetting, buildFontSettingPanel } from '../components/setting/fontSetting.js';
import { buildMaterialLib, initMaterialLib } from '../components/materialLib/index.js';
import { buildBookManage, initBookManage } from '../components/bookManage/index.js';
import { buildDashboard, initDashboard } from '../components/dashboard/index.js';
import { initWordStats } from './wordStats.js';
import { getBook } from './bookProject.js';
import aiAdapter from '../api/ai/aiAdapter.js';
import { saveEditorState, loadEditorState, restoreCursorPosition } from '../components/editor/editorState.js';
import bus from '../event/bus.js';
import appState from './appState.js';

function buildFontSettingModal() {
  var overlay = el('div', { className: 'modal-overlay', id: 'font-setting-overlay' });
  var panel = buildFontSettingPanel();
  var card = el('div', { className: 'modal-card modal-card-settings' },
    el('div', { className: 'modal-header' },
      el('h3', { className: 'modal-title' }, '排版设置'),
    ),
    el('div', { className: 'modal-body' }, panel),
    el('div', { className: 'modal-footer' },
      el('button', { className: 'btn btn-ghost', onclick: function () { overlay.classList.remove('open'); } }, '关闭'),
    ),
  );
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) overlay.classList.remove('open');
  });
  card.addEventListener('click', function (e) { e.stopPropagation(); });
  overlay.appendChild(card);
  bus.on('modal:open-font-setting', function () {
    overlay.classList.add('open');
  });
  return overlay;
}

function buildUI() {
  var app = document.getElementById('app');
  app.innerHTML = '';

  var shell = el('div', { className: 'app-shell' });
  shell.appendChild(buildTitleBar());

  var body = el('div', { className: 'app-body' });
  body.appendChild(buildSidebar());
  body.appendChild(buildMainArea());
  body.appendChild(buildAiPanel());

  shell.appendChild(body);
  app.appendChild(shell);

  document.body.appendChild(buildSettingsModal());
  document.body.appendChild(buildConfirmDialog());
  document.body.appendChild(buildConfigPanel());
  document.body.appendChild(buildThemeManager());
  document.body.appendChild(buildShortcutPanel());
  document.body.appendChild(buildPluginMarket());
  document.body.appendChild(buildVersionHistory());
  document.body.appendChild(buildSyncSetting());
  document.body.appendChild(buildHelpCenter());
  document.body.appendChild(buildFontSettingModal());
  document.body.appendChild(buildCharacterLib());
  document.body.appendChild(buildMaterialLib());
  document.body.appendChild(buildBookManage());
  document.body.appendChild(buildDashboard());
}

export function init() {
  aiAdapter.init();

  loadConfig();

  var cfg = getConfig();
  if (cfg && cfg.ai) {
    appState.setCurrentAiProvider(cfg.ai.currentProvider || 'openai');
    appState.setAiGlobalParams(cfg.ai.parameters || {});
    appState.setEditorConfig(cfg.editor || {});
    appState.setExportConfig(cfg.export || {});
    appState.setFeatureSwitches(cfg.features || {});
    appState.setCurrentTheme(cfg.theme ? cfg.theme.current : 'mint');
  }

  var savedShortcuts = null;
  try {
    var raw = localStorage.getItem('qingchen-shortcuts');
    savedShortcuts = raw ? JSON.parse(raw) : null;
  } catch (e) { /* ignore */ }
  var finalShortcuts = savedShortcuts || (cfg && cfg.shortcuts) || getDefaultShortcuts();
  appState.setShortcuts(finalShortcuts);

  buildUI();

  var savedTheme = appState.getCurrentTheme();
  if (savedTheme) {
    applyTheme(savedTheme);
  }

  initThemeControl();
  initStatusBar();
  initSidebar();
  initEditorArea();
  initSettingPanel();
  initAiPanel();

  initToast();
  initLoadingOverlay();
  initErrorBoundary();
  initConfigPanel();
  initThemeManager();
  initShortcutPanel();
  initPluginMarket();
  initVersionHistory();
  initSyncSetting();
  initHelpCenter();
  initCharacterLib();
  initMaterialLib();
  initBookManage();
  initDashboard();
  initWordStats();

  setupManuscriptSwitchSave();
  setupNetworkDetection();
  setupConfigurableShortcuts();
  setupRecoveryBackup();
  setupPhase4Features();
  setupZenMode();
  setupWindowPin();
  initFontSetting();

  loadManuscripts();
  var manuscripts = appState.getManuscripts();
  var lastDocId = null;
  try {
    lastDocId = localStorage.getItem('qingchen-last-document');
  } catch (e) { /* ignore */ }

  if (lastDocId) {
    var found = false;
    for (var i = 0; i < manuscripts.length; i++) {
      if (manuscripts[i].id === lastDocId) {
        found = true;
        break;
      }
    }
    if (found) {
      appState.setCurrentManuscriptId(lastDocId);
    }
  }

  if (!appState.getCurrentManuscriptId()) {
    if (manuscripts.length === 0) {
      var ms = appState.createManuscript();
      appState.setCurrentManuscriptId(ms.id);
    } else {
      appState.setCurrentManuscriptId(manuscripts[0].id);
    }
  }

  renderManuscriptList();
  loadEditorContent(appState.getCurrentManuscriptId());
  restoreEditorCursor();

  var currentMs = appState.getManuscript(appState.getCurrentManuscriptId());
  if (manuscripts.length === 1 && !currentMs.content) {
    showWelcomeState();
  }

  startAutoSave();
  setStatus('就绪');

  bus.on('manuscript:switched', function (id) {
    try { localStorage.setItem('qingchen-last-document', id); } catch (e) { /* ignore */ }
  });

  bus.on('config:imported', function (newCfg) {
    if (newCfg && newCfg.ai) {
      appState.setAppConfig(newCfg);
      appState.setCurrentAiProvider(newCfg.ai.currentProvider || 'openai');
    }
  });

  bus.on('shortcuts:updated', function (newShortcuts) {
    appState.setShortcuts(newShortcuts);
  });
}

function setupManuscriptSwitchSave() {
  var previousManuscriptId = null;

  bus.on('manuscript:switched', function (newId) {
    if (previousManuscriptId && previousManuscriptId !== newId) {
      var editor = document.getElementById('editor');
      if (editor) {
        saveEditorState(previousManuscriptId, {
          cursorOffset: getCursorOffset(editor),
          scrollTop: editor.scrollTop || 0,
          lastEditTime: Date.now(),
        });
      }
    }
    previousManuscriptId = newId;

    setTimeout(function () {
      restoreEditorCursor();
    }, 50);
  });
}

function getCursorOffset(editorEl) {
  var selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;

  var range = selection.getRangeAt(0);
  var preRange = document.createRange();
  preRange.selectNodeContents(editorEl);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
}

function restoreEditorCursor() {
  var currentId = appState.getCurrentManuscriptId();
  if (!currentId) return;

  var state = loadEditorState(currentId);
  if (!state) return;

  var editor = document.getElementById('editor');
  if (editor && state.scrollTop) {
    editor.scrollTop = state.scrollTop;
  }

  if (editor && typeof state.cursorOffset === 'number' && state.cursorOffset > 0) {
    restoreCursorPosition(editor, state.cursorOffset);
  }
}

function setupNetworkDetection() {
  var wasOnline = navigator.onLine !== false;
  window.addEventListener('online', function () {
    appState.setNetworkStatus(true, Date.now());
    if (!wasOnline) {
      bus.emit('tips:show', { type: 'success', message: '网络连接已恢复', duration: 3000 });
    }
    wasOnline = true;
    bus.emit('status:network-changed', true);
  });
  window.addEventListener('offline', function () {
    appState.setNetworkStatus(false, Date.now());
    wasOnline = false;
    bus.emit('tips:show', {
      type: 'warning',
      message: '网络连接已断开，AI 功能将暂时不可用',
      duration: 5000,
    });
    bus.emit('status:network-changed', false);
  });
  appState.setNetworkStatus(navigator.onLine !== false, Date.now());
}

function setupConfigurableShortcuts() {
  var defaultShortcuts = getDefaultShortcuts();
  document.addEventListener('keydown', function (e) {
    var shortcuts = appState.getShortcuts();
    if (!shortcuts || typeof shortcuts !== 'object') return;

    var keys = Object.keys(shortcuts);
    for (var i = 0; i < keys.length; i++) {
      var action = keys[i];
      var combo = shortcuts[action];
      if (!combo) continue;
      if (matchShortcut(e, combo)) {
        var isCustomBinding = combo !== defaultShortcuts[action];
        if (isCustomBinding) {
          var handled = handleShortcutAction(action, e);
          if (handled) return;
        }
      }
    }
  });
}

function handleShortcutAction(action, event) {
  switch (action) {
    case 'save':
      event.preventDefault();
      bus.emit('shortcut:save');
      return true;
    case 'newManuscript':
      event.preventDefault();
      bus.emit('manuscript:new');
      return true;
    case 'openAI':
      event.preventDefault();
      return true;
    case 'export':
      event.preventDefault();
      bus.emit('shortcut:export');
      return true;
    case 'toggleIndent':
      event.preventDefault();
      bus.emit('shortcut:toggle-indent');
      return true;
    case 'formatSelection':
      event.preventDefault();
      bus.emit('shortcut:format-selection');
      return true;
    case 'showWordCount':
      event.preventDefault();
      bus.emit('shortcut:show-word-count');
      return true;
    case 'bold':
      if (document.getElementById('editor') && document.getElementById('editor').contains(document.activeElement)) {
        event.preventDefault();
        document.execCommand('bold');
        return true;
      }
      return false;
    case 'italic':
      if (document.getElementById('editor') && document.getElementById('editor').contains(document.activeElement)) {
        event.preventDefault();
        document.execCommand('italic');
        return true;
      }
      return false;
    case 'openSettings':
      event.preventDefault();
      bus.emit('modal:open-settings');
      return true;
    default:
      return false;
  }
}

function setupRecoveryBackup() {
  setInterval(function () {
    var manuscripts = appState.getManuscripts();
    autoSaveRecoveryData(manuscripts);
  }, BACKUP_INTERVAL);

  bus.on('manuscript:switched', function (id) {
    var ms = appState.getManuscript(id);
    if (ms && ms.content) {
      createBackup(id, ms.content);
    }
  });
}

function setupPhase4Features() {
  var config = getConfig();
  var features = (config && config.features) || {};

  if (features.pluginSystem) {
    appState.setPluginStatus({ enabled: true });
    var plugins = getInstalledPlugins();
    var enabledCount = 0;
    for (var i = 0; i < plugins.length; i++) {
      if (plugins[i].enabled) {
        enablePlugin(plugins[i].id);
        enabledCount++;
      }
    }
    appState.setPluginStatus({ enabled: true, loaded: plugins, active: enabledCount });
  }

  if (features.versionControl) {
    appState.setVersionControlStatus({ enabled: true });
    var snapshotInterval = (config && config.versionControl && config.versionControl.autoSnapshotInterval) || 300000;
    setInterval(function () {
      var msId = appState.getCurrentManuscriptId();
      if (msId) {
        var ms = appState.getManuscript(msId);
        if (ms && ms.content) {
          createSnapshot(msId, ms.content, { tag: '自动快照' });
        }
      }
    }, snapshotInterval);
  }

  if (features.syncEnabled) {
    appState.setSyncStatus({ enabled: true });
    initSync();
  }

  var book = getBook();
  if (book) {
    appState.setBookProject(book);
  }

  if (features.versionControl) {
    setInterval(function () {
      var msId = appState.getCurrentManuscriptId();
      if (msId) {
        var ms = appState.getManuscript(msId);
        if (ms && ms.content) {
          createVersionBackup(msId, { type: 'auto' });
        }
      }
    }, 600000);

    setInterval(function () {
      cleanExpiredVersions(appState.getCurrentManuscriptId());
      cleanExpiredBackups();
    }, 3600000);
  }
}

function setupZenMode() {
  var ZEN_STORAGE_KEY = 'qingchen-zen-mode';

  function restoreZenState() {
    try {
      var saved = localStorage.getItem(ZEN_STORAGE_KEY);
      if (saved === 'true') {
        appState.setIsZenMode(true);
        document.body.classList.add('zen-mode');
        showZenExitBtn(true);
      }
    } catch (e) { /* ignore */ }
  }

  function persistZenState(isZen) {
    try {
      localStorage.setItem(ZEN_STORAGE_KEY, isZen ? 'true' : 'false');
    } catch (e) { /* ignore */ }
  }

  function showZenExitBtn(show) {
    var btn = document.getElementById('zen-exit-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'zen-exit-btn';
      btn.className = 'zen-exit-btn';
      btn.textContent = '退出极简模式';
      btn.addEventListener('click', function () {
        bus.emit('zen:toggle');
      });
      document.body.appendChild(btn);
    }
    btn.style.display = show ? '' : 'none';
  }

  function applyZenMode(isZen) {
    var sidebar = document.querySelector('.sidebar');
    var toolbar = document.querySelector('.toolbar');
    var editorWrapper = document.querySelector('.editor-wrapper');
    var mainArea = document.querySelector('.main-area');
    var aiPanel = document.querySelector('.ai-panel');

    if (isZen) {
      if (sidebar) sidebar.classList.add('zen-hidden');
      if (toolbar) toolbar.classList.add('zen-hidden');
      if (aiPanel) aiPanel.classList.add('zen-hidden');
      if (mainArea) mainArea.classList.add('zen-full');
      if (editorWrapper) {
        editorWrapper.style.marginLeft = '0';
        editorWrapper.style.padding = '40px';
      }
      document.body.classList.add('zen-mode');
      showZenExitBtn(true);
    } else {
      if (sidebar) sidebar.classList.remove('zen-hidden');
      if (toolbar) toolbar.classList.remove('zen-hidden');
      if (aiPanel) aiPanel.classList.remove('zen-hidden');
      if (mainArea) mainArea.classList.remove('zen-full');
      if (editorWrapper) {
        editorWrapper.style.marginLeft = '';
        editorWrapper.style.padding = '';
      }
      document.body.classList.remove('zen-mode');
      showZenExitBtn(false);
    }
  }

  bus.on('zen:toggle', function () {
    var isZen = appState.getIsZenMode();
    var nextZen = !isZen;
    appState.setIsZenMode(nextZen);
    applyZenMode(nextZen);
    persistZenState(nextZen);
    bus.emit('zen:changed', nextZen);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && appState.getIsZenMode()) {
      e.preventDefault();
      e.stopPropagation();
      bus.emit('zen:toggle');
    }
  });

  restoreZenState();
}

function setupWindowPin() {
  if (window.electronAPI && window.electronAPI.isWindowPinned) {
    window.electronAPI.isWindowPinned().then(function (pinned) {
      appState.setIsPinned(pinned);
    });
    window.electronAPI.onPinnedChange(function (pinned) {
      appState.setIsPinned(pinned);
      bus.emit('tips:show', {
        type: 'info',
        message: pinned ? '窗口已置顶' : '窗口已取消置顶',
        duration: 2000,
      });
    });
  }
  bus.on('window:pin-top', function () {
    if (window.electronAPI && window.electronAPI.pinWindowTop) {
      window.electronAPI.pinWindowTop();
    }
  });
}
