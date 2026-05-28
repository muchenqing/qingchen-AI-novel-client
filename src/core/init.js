/**
 * 渲染进程初始化入口模块
 * @description 双页面架构：首页(小说管理) + 编辑页(写作)
 *              负责页面构建、路由切换、数据加载、主题初始化
 */

import { buildHomePage, initHomePage, refreshHomePage } from '../pages/homePage.js';
import { buildEditorPage, initEditorPage, loadNovelIntoEditor } from '../pages/editorPage.js';
import { loadNovels, loadTheme } from '../utils/storage.js';
import { loadConfig, getConfig } from '../config/configManager.js';
import { applyTheme } from '../components/themeControl/index.js';
import { buildAiSettingsModal, openSettingsModal } from '../components/aiSettingsModal.js';
import aiAdapter from '../api/ai/aiAdapter.js';
import appState from './appState.js';
import bus from '../event/bus.js';

var currentPage = 'home';

function initApp() {
  var app = document.getElementById('app');
  app.innerHTML = '';

  var homePage = buildHomePage();
  var editorPage = buildEditorPage();

  app.appendChild(homePage);
  app.appendChild(editorPage);

  buildAiSettingsModal();

  initHomePage();
  initEditorPage();

  bus.on('page:navigate', function (page, novelId) {
    navigateTo(page, novelId);
  });

  bus.on('zen:toggle', function () {
    toggleZenMode();
  });

  bus.on('modal:open-settings', function () {
    openSettingsModal();
  });
}

function navigateTo(page, novelId) {
  var homePage = document.getElementById('home-page');
  var editorPage = document.getElementById('editor-page');

  if (!homePage || !editorPage) return;

  if (page === 'editor' && novelId) {
    try { localStorage.setItem('qingchen-last-novel', novelId); } catch (e) { /* ignore */ }

    homePage.classList.remove('active');
    editorPage.classList.add('active');
    currentPage = 'editor';

    loadNovelIntoEditor(novelId);
  } else if (page === 'home') {
    editorPage.classList.remove('active');
    homePage.classList.add('active');
    currentPage = 'home';

    refreshHomePage();
  }
}

function toggleZenMode() {
  var isZen = appState.getIsZenMode();
  var next = !isZen;
  appState.setIsZenMode(next);

  if (next) {
    document.body.classList.add('zen-mode');
    showZenExitBtn();
  } else {
    document.body.classList.remove('zen-mode');
    hideZenExitBtn();
  }

  bus.emit('zen:changed', next);

  try { localStorage.setItem('qingchen-zen-mode', next ? 'true' : 'false'); } catch (e) { /* ignore */ }
}

function showZenExitBtn() {
  var btn = document.getElementById('zen-exit-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'zen-exit-btn';
    btn.className = 'zen-exit-btn';
    btn.textContent = '退出全屏';
    btn.addEventListener('click', function () { bus.emit('zen:toggle'); });
    document.body.appendChild(btn);
  }
  btn.style.display = '';
}

function hideZenExitBtn() {
  var btn = document.getElementById('zen-exit-btn');
  if (btn) btn.style.display = 'none';
}

/* ==================== 应用启动 ==================== */
export function init() {
  /* 初始化 AI 适配器 */
  aiAdapter.init();

  /* 加载配置 */
  loadConfig();
  var cfg = getConfig();
  if (cfg && cfg.ai) {
    appState.setCurrentAiProvider(cfg.ai.currentProvider || 'openai');
    appState.setAiGlobalParams(cfg.ai.parameters || {});
    appState.setEditorConfig(cfg.editor || {});
  }

  /* 应用已保存的主题 */
  var savedTheme = loadTheme() || 'mint';
  appState.setCurrentTheme(savedTheme);
  applyTheme(savedTheme);

  /* 加载小说数据 */
  var novelList = loadNovels();
  appState.setNovels(novelList);

  /* 构建UI */
  initApp();

  /* 恢复上次打开的页面 */
  var lastNovelId = null;
  try { lastNovelId = localStorage.getItem('qingchen-last-novel'); } catch (e) { /* ignore */ }

  if (lastNovelId) {
    var found = false;
    for (var i = 0; i < novelList.length; i++) {
      if (novelList[i].id === lastNovelId) { found = true; break; }
    }
    if (found) {
      navigateTo('editor', lastNovelId);
      return;
    }
  }

  /* 默认显示首页 */
  document.getElementById('home-page').classList.add('active');

  /* 网络状态检测 */
  setupNetworkDetection();

  /* Zen 模式恢复 */
  restoreZenMode();

  /* 全局键盘 ESC 退出全屏 */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && appState.getIsZenMode()) {
      bus.emit('zen:toggle');
    }
  });
}

function setupNetworkDetection() {
  window.addEventListener('online', function () {
    appState.setNetworkStatus(true, Date.now());
  });
  window.addEventListener('offline', function () {
    appState.setNetworkStatus(false, Date.now());
  });
  appState.setNetworkStatus(navigator.onLine !== false, Date.now());
}

function restoreZenMode() {
  try {
    if (localStorage.getItem('qingchen-zen-mode') === 'true') {
      appState.setIsZenMode(true);
      document.body.classList.add('zen-mode');
      showZenExitBtn();
    }
  } catch (e) { /* ignore */ }
}
