/**
 * 小说编辑页组件
 * @description 三栏布局：左侧章节面板 + 中央编辑器 + 右侧AI助手
 */

import { el } from '../utils/helper.js';
import appState from '../core/appState.js';
import bus from '../event/bus.js';
import aiConfig from '../api/ai/aiConfig.js';
import aiAdapter from '../api/ai/aiAdapter.js';
import { aiContinue, aiOutline, aiPolish, aiWritingFeatures } from '../api/index.js';
import { detectChapterSplit } from '../utils/chapterParser.js';
import { parseCharacters, extractNamesFromText } from '../utils/characterParser.js';

var pageEl = null;
var autoSaveTimer = null;
var autoSyncTimer = null;
var currentAiAbortController = null;
var draggingChapterId = null;
var pendingSplitChapters = null;
var activeSyncPanel = null;

/* ==================== 顶部导航 ==================== */
function buildPageHeader() {
  var backBtn = el('button', { className: 'page-header-back', id: 'editor-back-btn' },
    '\u2190 返回',
  );
  backBtn.addEventListener('click', function () {
    saveCurrentContent();
    bus.emit('page:navigate', 'home');
  });

  var titleInput = el('input', {
    className: 'page-header-novel-title',
    id: 'editor-novel-title',
    type: 'text',
    value: '',
  });
  titleInput.addEventListener('input', function () {
    var novelId = appState.getCurrentNovelId();
    if (novelId) appState.renameNovel(novelId, this.value);
  });

  var saveDot = el('span', { className: 'save-status-dot', id: 'editor-save-dot' });
  var saveText = el('span', { id: 'editor-save-text' }, '已保存');
  var saveStatus = el('div', { className: 'save-status' }, saveDot, saveText);

  var wordCount = el('div', { className: 'word-count-display', id: 'editor-word-count' }, '0 字');

  var center = el('div', { className: 'page-header-center' }, saveStatus, wordCount);

  var zenBtn = el('button', { className: 'btn-icon', title: '全屏写作模式', id: 'editor-zen-btn' }, '\u29FA');
  zenBtn.addEventListener('click', function () {
    bus.emit('zen:toggle');
  });

  var aiToggleBtn = el('button', { className: 'btn-icon', title: '展开/收起AI助手', id: 'editor-ai-toggle' }, '\u2726');
  aiToggleBtn.addEventListener('click', function () {
    var panel = document.getElementById('ai-assistant-panel');
    if (panel) panel.classList.toggle('collapsed');
  });

  var chapterToggleBtn = el('button', { className: 'btn-icon', title: '展开/收起章节面板', id: 'editor-chapter-toggle' }, '\u2630');
  chapterToggleBtn.addEventListener('click', function () {
    var panel = document.getElementById('chapter-panel');
    if (panel) panel.classList.toggle('collapsed');
  });

  var settingsBtn = el('button', {
    className: 'btn-icon',
    title: 'AI 设置',
    style: 'font-size: 15px;',
    onclick: function () { bus.emit('modal:open-settings'); },
  }, '\u2699');

  var right = el('div', { className: 'page-header-right' },
    chapterToggleBtn,
    aiToggleBtn,
    settingsBtn,
    zenBtn,
  );

  return el('header', { className: 'page-header', id: 'editor-header' },
    el('div', { className: 'page-header-left' }, backBtn, titleInput),
    center,
    right,
  );
}

/* ==================== 章节面板 ==================== */
function buildChapterPanel() {
  var header = el('div', { className: 'chapter-panel-header' },
    el('span', { className: 'chapter-panel-title' }, '章节'),
    el('button', {
      className: 'chapter-toggle-btn',
      title: '收起',
      onclick: function () {
        document.getElementById('chapter-panel').classList.toggle('collapsed');
      },
    }, '\u25C0'),
  );

  var list = el('div', { className: 'chapter-list', id: 'chapter-list' });

  var addBtn = el('button', { className: 'btn btn-secondary', style: 'width: 100%;', onclick: handleAddChapter },
    '+ 新增章节',
  );

  var footer = el('div', { className: 'chapter-panel-footer' }, addBtn);

  return el('aside', { className: 'chapter-panel', id: 'chapter-panel' }, header, list, footer);
}

function buildChapterItem(chapter, isActive) {
  var dragHandle = el('span', { className: 'chapter-item-drag', draggable: 'true' }, '\u2261');
  var order = el('span', { className: 'chapter-item-order' }, (chapter.order + 1));
  var title = el('span', { className: 'chapter-item-title', title: chapter.title }, chapter.title);

  var renameBtn = el('button', {
    className: 'chapter-item-action-btn',
    title: '重命名',
    onclick: function (e) {
      e.stopPropagation();
      showChapterRenameModal(chapter.id);
    },
  }, '\u270F');

  var deleteBtn = el('button', {
    className: 'chapter-item-action-btn',
    title: '删除',
    onclick: function (e) {
      e.stopPropagation();
      showChapterDeleteConfirm(chapter.id);
    },
  }, '\u2715');

  var actions = el('div', { className: 'chapter-item-actions' }, renameBtn, deleteBtn);
  var item = el('div', {
    className: 'chapter-item' + (isActive ? ' active' : ''),
    dataset: { chapterId: chapter.id },
  }, dragHandle, order, title, actions);

  item.addEventListener('click', function () {
    switchToChapter(chapter.id);
  });

  /* 拖拽排序 */
  dragHandle.addEventListener('dragstart', function (e) {
    draggingChapterId = chapter.id;
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  dragHandle.addEventListener('dragend', function () {
    item.classList.remove('dragging');
    draggingChapterId = null;
    var allItems = document.querySelectorAll('#chapter-list .chapter-item');
    for (var i = 0; i < allItems.length; i++) {
      allItems[i].classList.remove('drag-over');
    }
  });

  item.addEventListener('dragover', function (e) {
    e.preventDefault();
    if (draggingChapterId && draggingChapterId !== chapter.id) {
      item.classList.add('drag-over');
    }
  });

  item.addEventListener('dragleave', function () {
    item.classList.remove('drag-over');
  });

  item.addEventListener('drop', function (e) {
    e.preventDefault();
    item.classList.remove('drag-over');
    if (draggingChapterId && draggingChapterId !== chapter.id) {
      handleChapterReorder(draggingChapterId, chapter.id);
    }
  });

  return item;
}

function renderChapterList() {
  var listEl = document.getElementById('chapter-list');
  if (!listEl) return;

  var novelId = appState.getCurrentNovelId();
  var novel = appState.getNovel(novelId);
  if (!novel) return;

  var activeChapterId = appState.getCurrentChapterId();
  listEl.innerHTML = '';

  for (var i = 0; i < novel.chapters.length; i++) {
    var ch = novel.chapters[i];
    listEl.appendChild(buildChapterItem(ch, ch.id === activeChapterId));
  }
}

function switchToChapter(chapterId) {
  saveCurrentContent();
  appState.setCurrentChapterId(chapterId);
  loadChapterContent(chapterId);
  renderChapterList();
}

function loadChapterContent(chapterId) {
  var editor = document.getElementById('editor-content');
  var novelId = appState.getCurrentNovelId();
  var chapter = appState.getChapter(novelId, chapterId);
  if (!editor) return;

  if (chapter && chapter.content) {
    var html = chapter.content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    editor.innerHTML = html;
  } else {
    editor.innerHTML = '';
  }
  updateWordCount();
}

function saveCurrentContent() {
  var novelId = appState.getCurrentNovelId();
  var chapterId = appState.getCurrentChapterId();
  if (!novelId || !chapterId) return;

  var editor = document.getElementById('editor-content');
  if (!editor) return;

  var content = editor.innerText || '';
  appState.updateChapterContent(novelId, chapterId, content);
  setSaveStatus('已保存');
}

function handleAddChapter() {
  var novelId = appState.getCurrentNovelId();
  if (!novelId) return;

  var chapter = appState.addChapter(novelId);
  appState.setCurrentChapterId(chapter.id);
  loadChapterContent(chapter.id);
  renderChapterList();
  showToast('success', '已添加新章节');
}

function handleChapterReorder(fromChapterId, toChapterId) {
  var novelId = appState.getCurrentNovelId();
  var novel = appState.getNovel(novelId);
  if (!novel) return;

  var chapters = novel.chapters;
  var fromIndex = -1;
  var toIndex = -1;
  for (var i = 0; i < chapters.length; i++) {
    if (chapters[i].id === fromChapterId) fromIndex = i;
    if (chapters[i].id === toChapterId) toIndex = i;
  }

  if (fromIndex >= 0 && toIndex >= 0) {
    var removed = chapters.splice(fromIndex, 1)[0];
    chapters.splice(toIndex, 0, removed);
    /* 更新 order */
    for (var j = 0; j < chapters.length; j++) {
      chapters[j].order = j;
    }
    appState.reorderChapters(novelId, chapters.map(function (c) { return c.id; }));
    renderChapterList();
  }
}

function showChapterRenameModal(chapterId) {
  var novelId = appState.getCurrentNovelId();
  var chapter = appState.getChapter(novelId, chapterId);
  if (!chapter) return;

  var overlay = el('div', { className: 'modal-overlay open' });

  var card = el('div', { className: 'modal-card' },
    el('div', { className: 'modal-title' }, '重命名章节'),
    el('input', {
      className: 'input',
      id: 'chapter-rename-input',
      type: 'text',
      value: chapter.title,
    }),
    el('div', { className: 'modal-footer' },
      el('button', { className: 'btn btn-ghost', id: 'ch-rename-cancel' }, '取消'),
      el('button', { className: 'btn btn-primary', id: 'ch-rename-confirm' }, '确定'),
    ),
  );

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  var input = card.querySelector('#chapter-rename-input');
  input.focus();
  input.select();

  card.querySelector('#ch-rename-cancel').addEventListener('click', function () {
    document.body.removeChild(overlay);
  });

  card.querySelector('#ch-rename-confirm').addEventListener('click', function () {
    var newTitle = input.value.trim();
    if (newTitle) {
      appState.renameChapter(novelId, chapterId, newTitle);
      renderChapterList();
      showToast('success', '章节已重命名');
    }
    document.body.removeChild(overlay);
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') card.querySelector('#ch-rename-confirm').click();
    if (e.key === 'Escape') card.querySelector('#ch-rename-cancel').click();
  });

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

function showChapterDeleteConfirm(chapterId) {
  var novelId = appState.getCurrentNovelId();
  var novel = appState.getNovel(novelId);
  if (!novel || novel.chapters.length <= 1) {
    showToast('warning', '至少需要保留一个章节');
    return;
  }

  var chapter = appState.getChapter(novelId, chapterId);
  if (!chapter) return;

  var overlay = el('div', { className: 'modal-overlay open' });

  var card = el('div', { className: 'modal-card' },
    el('div', { className: 'modal-title' }, '删除章节'),
    el('p', { style: 'color: var(--text-secondary); line-height: 1.8;' },
      '确定要删除《' + chapter.title + '》吗？'),
    el('div', { className: 'modal-footer' },
      el('button', { className: 'btn btn-ghost', id: 'ch-delete-cancel' }, '取消'),
      el('button', { className: 'btn btn-danger', id: 'ch-delete-confirm', style: 'background: var(--danger); color: #fff;' }, '删除'),
    ),
  );

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  card.querySelector('#ch-delete-cancel').addEventListener('click', function () {
    document.body.removeChild(overlay);
  });

  card.querySelector('#ch-delete-confirm').addEventListener('click', function () {
    appState.deleteChapter(novelId, chapterId);
    var currentChId = appState.getCurrentChapterId();
    if (currentChId === chapterId) {
      var n = appState.getNovel(novelId);
      if (n && n.chapters.length > 0) {
        appState.setCurrentChapterId(n.chapters[0].id);
        loadChapterContent(n.chapters[0].id);
      }
    }
    renderChapterList();
    showToast('info', '章节已删除');
    document.body.removeChild(overlay);
  });

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

/* ==================== 编辑器 ==================== */
function buildEditorToolbar() {
  function makeBtn(label, title, cmd, value) {
    var b = el('button', { className: 'toolbar-btn', title: title }, label);
    b.addEventListener('click', function () { execFormatCommand(cmd, value); });
    return b;
  }

  var bold = makeBtn('B', '加粗 (Ctrl+B)', 'bold');
  bold.style.fontWeight = '700';

  var italic = makeBtn('I', '斜体 (Ctrl+I)', 'italic');
  italic.style.fontStyle = 'italic';

  var h2 = makeBtn('H2', '标题2', 'formatBlock', 'h2');
  var h3 = makeBtn('H3', '标题3', 'formatBlock', 'h3');

  var sep1 = el('span', { className: 'toolbar-separator' });

  var ol = makeBtn('\u2261', '有序列表', 'insertOrderedList');
  var ul = makeBtn('\u25CF', '无序列表', 'insertUnorderedList');

  var sep2 = el('span', { className: 'toolbar-separator' });

  var aiBtn = el('button', { className: 'toolbar-btn toolbar-btn-ai', title: '复制选区到AI面板' }, '\u2726 AI');
  aiBtn.addEventListener('click', function () {
    var editor = document.getElementById('editor-content');
    var promptArea = document.getElementById('ai-prompt-input');
    if (editor && promptArea) {
      promptArea.value = (editor.innerText || '').slice(0, 5000);
    }
  });

  var sep3 = el('span', { className: 'toolbar-separator' });

  var fullscreenBtn = makeBtn('\u29FA', '全屏写作', '');
  fullscreenBtn.addEventListener('click', function () {
    bus.emit('zen:toggle');
  });

  return el('div', { className: 'editor-toolbar', id: 'editor-toolbar' },
    bold, italic, h2, h3,
    sep1,
    ol, ul,
    sep2,
    aiBtn,
    sep3,
    fullscreenBtn,
    el('span', { style: 'flex: 1;' }),
    buildSyncHeaderButtons(),
  );
}

function execFormatCommand(cmd, value) {
  var editor = document.getElementById('editor-content');
  if (!editor) return;
  editor.focus();
  if (cmd === 'formatBlock') {
    document.execCommand('formatBlock', false, value);
  } else if (cmd) {
    document.execCommand(cmd, false, value || null);
  }
}

function buildEditorFooter() {
  var chapterWordCount = el('span', { id: 'editor-chapter-word-count' }, '本章: 0 字');
  var totalWordCount = el('span', { id: 'editor-total-word-count' }, '总计: 0 字');
  return el('div', { className: 'editor-footer' }, chapterWordCount, totalWordCount);
}

function buildEditorArea() {
  var toolbar = buildEditorToolbar();

  var editor = el('div', {
    id: 'editor-content',
    className: 'editor-content',
    contentEditable: 'true',
    'data-placeholder': '开始创作你的故事\u2026',
  });

  editor.addEventListener('input', function () {
    handleEditorContentChanged();
  });

  editor.addEventListener('paste', function (e) {
    e.preventDefault();
    var text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
    scheduleChapterDetection();
  });

  var wrapper = el('div', { className: 'editor-wrapper' }, editor);
  var footer = buildEditorFooter();

  return el('div', { className: 'editor-area' }, toolbar, wrapper, footer);
}

function handleEditorContentChanged() {
  var novelId = appState.getCurrentNovelId();
  var chapterId = appState.getCurrentChapterId();
  if (!novelId || !chapterId) return;

  var editor = document.getElementById('editor-content');
  if (!editor) return;

  var content = editor.innerText || '';
  appState.updateChapterContent(novelId, chapterId, content);
  updateWordCount();
  setSaveStatus('保存中...');
}

function updateWordCount() {
  var novelId = appState.getCurrentNovelId();
  var chapterId = appState.getCurrentChapterId();
  var chapter = appState.getChapter(novelId, chapterId);
  var novel = appState.getNovel(novelId);

  var chWc = document.getElementById('editor-chapter-word-count');
  var totalWc = document.getElementById('editor-total-word-count');
  var wcDisplay = document.getElementById('editor-word-count');

  if (chWc) chWc.textContent = '本章: ' + (chapter ? chapter.wordCount : 0) + ' 字';
  if (totalWc) totalWc.textContent = '总计: ' + (novel ? novel.wordCount : 0) + ' 字';
  if (wcDisplay) wcDisplay.textContent = (novel ? novel.wordCount : 0) + ' 字';
}

function setSaveStatus(status) {
  appState.setAutoSaveStatus(status);
  var dot = document.getElementById('editor-save-dot');
  var text = document.getElementById('editor-save-text');
  if (dot && text) {
    text.textContent = status;
    dot.className = 'save-status-dot';
    if (status === '保存中...') dot.classList.add('saving');
  }
}

/* ==================== AI 助手面板 ==================== */
function buildAiPanel() {
  var header = el('div', { className: 'ai-panel-header' },
    el('span', { className: 'ai-panel-title' }, '\u2726 AI 助手'),
    el('button', { className: 'ai-panel-toggle', title: '收起', onclick: function () {
      document.getElementById('ai-assistant-panel').classList.toggle('collapsed');
    }}, '\u25B6'),
  );

  /* 核心功能标签 */
  var coreTabs = el('div', { className: 'ai-panel-tabs' });
  var tabData = [
    { key: 'continue', label: '续写' },
    { key: 'outline', label: '大纲' },
    { key: 'polish', label: '润色' },
  ];
  for (var t = 0; t < tabData.length; t++) {
    (function (tab) {
      var btn = el('button', {
        className: 'ai-panel-tab' + (t === 0 ? ' active' : ''),
        dataset: { key: tab.key },
      }, tab.label);
      btn.addEventListener('click', function () {
        switchAiTab(tab.key);
      });
      coreTabs.appendChild(btn);
    })(tabData[t]);
  }

  /* 核心功能输入区 */
  var promptInput = el('textarea', {
    className: 'ai-prompt-input',
    id: 'ai-prompt-input',
    placeholder: '输入提示词，或复制编辑器内容到此处...\n留空则使用当前章节内容',
    rows: '3',
  });

  /* 加载状态 */
  var loadingEl = el('div', { className: 'ai-loading', id: 'ai-loading-indicator', style: 'display: none;' },
    el('div', { className: 'ai-loading-spinner' }),
    el('span', null, '思考中...'),
  );

  /* 结果预览 */
  var resultEl = el('div', { className: 'ai-result-container', id: 'ai-result-container' });

  /* 操作按钮 */
  var actionBar = el('div', { style: 'display: flex; gap: 6px;' },
    el('button', { className: 'btn btn-primary', id: 'ai-gen-btn', style: 'flex: 1;' }, '生成'),
    el('button', { className: 'btn btn-secondary', id: 'ai-stop-btn', onclick: handleAiPause }, '停止'),
    el('button', { className: 'btn btn-accent-outline', id: 'ai-apply-btn', onclick: handleAiApply }, '应用'),
  );

  var genBtn = actionBar.querySelector('#ai-gen-btn');
  genBtn.addEventListener('click', handleAiGenerate);

  /* 高级功能 */
  var advTitle = el('div', { className: 'ai-panel-section-title', style: 'margin-top: 4px;' }, '高级功能');

  var featureData = [
    { key: 'characterDesign', label: '人物设定', fn: aiWritingFeatures.characterDesign },
    { key: 'worldBuilding', label: '世界观', fn: aiWritingFeatures.worldBuilding },
    { key: 'conflictGenerator', label: '剧情生成', fn: aiWritingFeatures.conflictGenerator },
    { key: 'chapterSummary', label: '章节总结', fn: aiWritingFeatures.chapterSummary },
    { key: 'dialoguePolish', label: '对话优化', fn: aiWritingFeatures.dialoguePolish },
    { key: 'expandParagraph', label: '段落扩写', fn: aiWritingFeatures.expandParagraph },
  ];

  var featureGrid = el('div', { className: 'ai-feature-grid' });
  for (var f = 0; f < featureData.length; f++) {
    (function (feat) {
      var btn = el('button', { className: 'ai-feature-btn', title: feat.label }, feat.label);
      btn.addEventListener('click', function () {
        handleWritingFeature(feat.fn);
      });
      featureGrid.appendChild(btn);
    })(featureData[f]);
  }

  /* 操作按钮组 */
  var controlBar = el('div', { className: 'ai-panel-tabs', style: 'margin-top: 4px;' },
    el('button', { className: 'ai-panel-tab', id: 'ai-undo-btn', onclick: handleAiUndo }, '撤销'),
    el('button', { className: 'ai-panel-tab', id: 'ai-redo-btn', onclick: handleAiRedo }, '恢复'),
    el('button', { className: 'ai-panel-tab', id: 'ai-copy-btn', onclick: function () {
      var result = appState.getAiCurrentResult();
      if (result) {
        navigator.clipboard.writeText(result);
        showToast('success', '已复制到剪贴板');
      }
    } }, '复制'),
  );

  var body = el('div', { className: 'ai-panel-body' },
    coreTabs,
    promptInput,
    actionBar,
    loadingEl,
    resultEl,
    controlBar,
    advTitle,
    featureGrid,
  );

  return el('aside', { className: 'ai-assistant-panel', id: 'ai-assistant-panel' }, header, body);
}

function switchAiTab(tabKey) {
  appState.setCurrentAiTab(tabKey);
  var tabs = document.querySelectorAll('#ai-assistant-panel .ai-panel-tab');
  for (var t = 0; t < tabs.length; t++) {
    tabs[t].classList.toggle('active', tabs[t].dataset.key === tabKey);
  }
  appState.setAiCurrentResult('');
  renderAiResult();
}

function getSourceText() {
  var promptInput = document.getElementById('ai-prompt-input');
  var text = (promptInput && promptInput.value || '').trim();
  if (!text) {
    var editor = document.getElementById('editor-content');
    text = (editor && editor.innerText) || '';
  }
  return text;
}

function updateAiLoadingState(loading) {
  var loadingEl = document.getElementById('ai-loading-indicator');
  var genBtn = document.getElementById('ai-gen-btn');
  if (loadingEl) loadingEl.style.display = loading ? 'flex' : 'none';
  if (genBtn) genBtn.disabled = loading;
}

function renderAiResult() {
  var container = document.getElementById('ai-result-container');
  if (!container) return;
  var result = appState.getAiCurrentResult();
  if (result) {
    container.textContent = result;
  } else {
    container.textContent = '';
  }
}

async function handleAiGenerate() {
  if (appState.getAiIsLoading()) return;

  var text = getSourceText();
  if (!text) {
    showToast('warning', '请输入或粘贴需要AI处理的内容');
    return;
  }

  appState.setAiIsLoading(true);
  updateAiLoadingState(true);
  appState.setAiCurrentResult('');
  renderAiResult();

  currentAiAbortController = new AbortController();

  try {
    var fn;
    var tab = appState.getCurrentAiTab();
    if (tab === 'continue') fn = aiContinue;
    else if (tab === 'outline') fn = aiOutline;
    else fn = aiPolish;

    var result = await fn(text);
    appState.pushAiUndo(result);
    appState.setAiCurrentResult(result);
    appState.addAiHistory({ type: tab, time: Date.now(), text: text.slice(0, 80), result: result.slice(0, 100) });
    renderAiResult();
    showToast('success', 'AI 生成完成');
  } catch (err) {
    var errMsg = '生成失败: ' + (err.message || '未知错误');
    appState.setAiCurrentResult(errMsg);
    renderAiResult();
    showToast('error', errMsg);
  } finally {
    currentAiAbortController = null;
    appState.setAiIsLoading(false);
    updateAiLoadingState(false);
  }
}

function handleAiApply() {
  var result = appState.getAiCurrentResult();
  if (!result) {
    showToast('warning', '没有可应用的内容');
    return;
  }
  var editor = document.getElementById('editor-content');
  if (editor) {
    editor.focus();
    document.execCommand('insertText', false, '\n' + result + '\n');
    handleEditorContentChanged();
    showToast('success', '已应用到编辑器');
  }
}

function handleAiPause() {
  if (currentAiAbortController) {
    currentAiAbortController.abort();
    currentAiAbortController = null;
  }
  appState.setAiIsLoading(false);
  updateAiLoadingState(false);
  showToast('info', 'AI 已停止');
}

async function handleWritingFeature(featureFn) {
  if (appState.getAiIsLoading()) return;

  var text = getSourceText();
  if (!text) {
    showToast('warning', '请输入内容');
    return;
  }

  appState.setAiIsLoading(true);
  updateAiLoadingState(true);
  appState.setAiCurrentResult('');
  renderAiResult();

  currentAiAbortController = new AbortController();

  try {
    var result = await featureFn(text);
    appState.pushAiUndo(result);
    appState.setAiCurrentResult(result);
    appState.addAiHistory({ type: 'feature', time: Date.now(), text: text.slice(0, 80), result: result.slice(0, 100) });
    renderAiResult();
    showToast('success', 'AI 生成完成');
  } catch (err) {
    var errMsg = '生成失败: ' + (err.message || '未知错误');
    appState.setAiCurrentResult(errMsg);
    renderAiResult();
    showToast('error', errMsg);
  } finally {
    currentAiAbortController = null;
    appState.setAiIsLoading(false);
    updateAiLoadingState(false);
  }
}

function handleAiUndo() {
  var content = appState.aiUndo();
  if (content !== null) {
    appState.setAiCurrentResult(content);
    renderAiResult();
    showToast('info', '已撤销');
  } else {
    showToast('info', '没有可撤销的内容');
  }
}

function handleAiRedo() {
  var content = appState.aiRedo();
  if (content !== null) {
    appState.setAiCurrentResult(content);
    renderAiResult();
    showToast('info', '已恢复');
  } else {
    showToast('info', '没有可恢复的内容');
  }
}

/* ==================== 自动保存 ==================== */
function startAutoSave() {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  autoSaveTimer = setInterval(function () {
    saveCurrentContent();
    setSaveStatus('已保存');
  }, 30000);
}

/* ==================== Toast ==================== */
function showToast(type, message) {
  var container = document.querySelector('.toast-container');
  if (!container) {
    container = el('div', { className: 'toast-container' });
    document.body.appendChild(container);
  }
  var toast = el('div', { className: 'toast toast-' + type }, message);
  container.appendChild(toast);
  var duration = (type === 'error' || type === 'warning') ? 5000 : 2500;
  setTimeout(function () {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, duration);
}

/* ==================== 键盘快捷键 ==================== */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function (e) {
    var ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && e.key === 's') {
      e.preventDefault();
      saveCurrentContent();
      showToast('success', '已保存');
    }

    if (ctrl && e.key === 'b') {
      var ed = document.getElementById('editor-content');
      if (ed && ed.contains(document.activeElement)) {
        e.preventDefault();
        execFormatCommand('bold');
      }
    }

    if (ctrl && e.key === 'i') {
      var ed2 = document.getElementById('editor-content');
      if (ed2 && ed2.contains(document.activeElement)) {
        e.preventDefault();
        execFormatCommand('italic');
      }
    }
  });
}

/* ==================== 粘贴自动分章 ==================== */
var chapterDetectionTimer = null;

function scheduleChapterDetection() {
  if (chapterDetectionTimer) clearTimeout(chapterDetectionTimer);
  chapterDetectionTimer = setTimeout(function () {
    checkPastedContentForChapters();
  }, 600);
}

function checkPastedContentForChapters() {
  var editor = document.getElementById('editor-content');
  if (!editor) return;
  var text = editor.innerText || '';
  if (text.length < 800) return;

  var chapters = detectChapterSplit(text);
  if (!chapters || chapters.length <= 1) return;

  pendingSplitChapters = chapters;
  showSplitConfirmModal(chapters);
}

function showSplitConfirmModal(chapters) {
  var overlay = el('div', { className: 'modal-overlay open', id: 'split-modal' });

  var previewRows = '';
  for (var i = 0; i < chapters.length; i++) {
    var preview = chapters[i].content.slice(0, 60).replace(/\n/g, ' ');
    previewRows += '<div style="display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border-light); font-size: var(--font-size-sm);">' +
      '<span style="color: var(--accent); font-weight: 600; min-width: 40px;">#' + (i + 1) + '</span>' +
      '<span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary); font-weight: 500;">' + escapeHtml(chapters[i].title) + '</span>' +
      '<span style="color: var(--text-tertiary); font-size: var(--font-size-xs); white-space: nowrap;">' + (chapters[i].wordCount || 0) + ' 字</span>' +
      '</div>';
  }

  var previewHtml = '<div style="max-height: 240px; overflow-y: auto; margin-bottom: 8px;">' + previewRows + '</div>';

  var card = el('div', { className: 'modal-card', style: 'max-width: 480px;' },
    el('div', { className: 'modal-title' }, '\uD83D\uDCCB 检测到可拆分章节'),
    el('p', { style: 'color: var(--text-secondary); font-size: var(--font-size-sm); margin-bottom: var(--spacing-md); line-height: 1.8;' },
      '粘贴内容中共识别到 <strong style="color: var(--accent-dark);">' + chapters.length + ' 个</strong>章节（共 ' + formatTotalWords(chapters) + ' 字）。确认后系统将自动按照以下结构拆分为独立章节：'),
    el('div', { innerHTML: previewHtml }),
    el('div', { className: 'modal-footer' },
      el('button', { className: 'btn btn-ghost', id: 'split-cancel', onclick: function () {
        document.body.removeChild(overlay);
        pendingSplitChapters = null;
      } }, '暂不拆分'),
      el('button', { className: 'btn btn-primary', id: 'split-confirm', onclick: function () {
        confirmChapterSplit();
        document.body.removeChild(overlay);
      } }, '自动分章'),
    ),
  );

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
      pendingSplitChapters = null;
    }
  });
}

function confirmChapterSplit() {
  var chapters = pendingSplitChapters;
  if (!chapters || chapters.length <= 1) return;

  var chapterCount = chapters.length;
  var novelId = appState.getCurrentNovelId();
  var novel = appState.getNovel(novelId);
  if (!novel) return;

  var currentChapterId = appState.getCurrentChapterId();
  var currentChapter = appState.getChapter(novelId, currentChapterId);

  if (currentChapter) {
    appState.renameChapter(novelId, currentChapterId, chapters[0].title);
    appState.updateChapterContent(novelId, currentChapterId, chapters[0].content);
  }

  for (var i = 1; i < chapters.length; i++) {
    var newChapter = appState.addChapter(novelId, chapters[i].title);
    if (newChapter) {
      appState.updateChapterContent(novelId, newChapter.id, chapters[i].content);
    }
  }

  pendingSplitChapters = null;

  renderChapterList();
  loadChapterContent(currentChapterId);
  updateWordCount();
  showToast('success', '已自动拆分为 ' + chapterCount + ' 个章节');
}

function formatTotalWords(chapters) {
  var total = 0;
  for (var i = 0; i < chapters.length; i++) {
    total += chapters[i].wordCount || 0;
  }
  return total;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ==================== AI 自动同步 ==================== */
var SYNC_INTERVAL = 10000;

function isAiConfigured() {
  var cfg = aiConfig.get();
  if (!cfg) return false;
  var providerName = cfg.currentProvider || 'openai';
  var providers = cfg.providers || {};
  var pCfg = providers[providerName] || {};
  return !!(pCfg.apiKey && (pCfg.baseUrl || providerName === 'llama'));
}

function buildSyncHeaderButtons() {
  var container = el('div', { className: 'sync-header-btns' });

  var charBtn = el('button', {
    className: 'sync-header-btn',
    id: 'sync-btn-char',
    title: '人物设定',
  }, '\uD83D\uDC64 人物');
  charBtn.addEventListener('click', function () { toggleSyncPanel('characters'); });

  var worldBtn = el('button', {
    className: 'sync-header-btn',
    id: 'sync-btn-world',
    title: '世界观',
  }, '\uD83C\uDF0D 世界观');
  worldBtn.addEventListener('click', function () { toggleSyncPanel('worldBuilding'); });

  var summaryBtn = el('button', {
    className: 'sync-header-btn',
    id: 'sync-btn-summary',
    title: '章节总结',
  }, '\uD83D\uDCCB 摘要');
  summaryBtn.addEventListener('click', function () { toggleSyncPanel('chapterSummary'); });

  container.appendChild(charBtn);
  container.appendChild(worldBtn);
  container.appendChild(summaryBtn);

  return container;
}

function buildSyncPanels() {
  var overlay = el('div', { className: 'sync-panel-overlay', id: 'sync-panel-overlay' });

  function makePanel(panelId, title, contentId) {
    var header = el('div', { className: 'sync-panel-header' },
      el('span', { className: 'sync-panel-title' }, title),
      el('div', { style: 'display: flex; gap: 4px;' },
        el('button', { className: 'btn-icon', title: '手动刷新', style: 'font-size: 12px;', onclick: function () { manualSyncPanel(panelId); } }, '\uD83D\uDD04'),
        el('button', { className: 'btn-icon', title: '关闭', style: 'font-size: 14px;', onclick: closeSyncPanel }, '\u2715'),
      ),
    );

    var syncingBar = el('div', { className: 'sync-status-bar', id: 'sync-status-' + panelId, style: 'display: none;' },
      el('div', { className: 'ai-loading-spinner' }),
      el('span', null, 'AI 分析中...'),
    );

    var content = el('div', {
      className: 'sync-panel-content',
      id: contentId,
    });

    return el('div', {
      className: 'sync-panel-card',
      id: 'sync-panel-' + panelId,
      style: 'display: none;',
    }, header, syncingBar, content);
  }

  overlay.appendChild(makePanel('characters', '\uD83D\uDC64 人物设定', 'sync-content-characters'));
  overlay.appendChild(makePanel('worldBuilding', '\uD83C\uDF0D 世界观构建', 'sync-content-world'));
  overlay.appendChild(makePanel('chapterSummary', '\uD83D\uDCCB 章节摘要', 'sync-content-summary'));

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeSyncPanel();
  });

  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSyncPanel();
  });

  return overlay;
}

function toggleSyncPanel(panelKey) {
  if (activeSyncPanel === panelKey) {
    closeSyncPanel();
    return;
  }
  openSyncPanel(panelKey);
}

function openSyncPanel(panelKey) {
  var overlay = document.getElementById('sync-panel-overlay');
  if (!overlay) return;

  var panel = document.getElementById('sync-panel-' + panelKey);
  if (!panel) return;

  var allPanels = overlay.querySelectorAll('.sync-panel-card');
  for (var i = 0; i < allPanels.length; i++) {
    allPanels[i].style.display = 'none';
  }

  panel.style.display = '';
  overlay.classList.add('open');
  activeSyncPanel = panelKey;

  renderSyncContent(panelKey);
  highlightSyncButton(panelKey);
}

function closeSyncPanel() {
  var overlay = document.getElementById('sync-panel-overlay');
  if (overlay) overlay.classList.remove('open');
  activeSyncPanel = null;
  unhighlightAllSyncButtons();
}

function highlightSyncButton(panelKey) {
  unhighlightAllSyncButtons();
  var btn = document.getElementById('sync-btn-' + (panelKey === 'chapterSummary' ? 'summary' : panelKey === 'worldBuilding' ? 'world' : 'char'));
  if (btn) btn.classList.add('active');
}

function unhighlightAllSyncButtons() {
  var btns = document.querySelectorAll('.sync-header-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.remove('active');
  }
}

function renderSyncContent(panelKey) {
  if (panelKey === 'characters') {
    renderCharacterPanel();
    return;
  }

  var contentId = 'sync-content-';
  if (panelKey === 'worldBuilding') contentId += 'world';
  else contentId += 'summary';

  var el = document.getElementById(contentId);
  if (!el) return;

  /* 重置为普通内容区 */
  el.parentNode.classList.remove('has-char-list');

  var text = '';
  if (panelKey === 'worldBuilding') text = appState.getSyncWorldBuilding();
  else text = appState.getSyncChapterSummary();

  if (text) {
    el.innerHTML = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  } else {
    el.innerHTML = '<div class="sync-empty">暂无数据，等待 AI 自动分析或点击刷新按钮手动获取</div>';
  }
}

function getCharacterNameList(novelId, chapterId) {
  var storedProfiles = appState.getCharacterProfiles(novelId, chapterId);
  var names = Object.keys(storedProfiles);
  return { all: names };
}

function refreshExtractionFromAI() {
  var card = document.getElementById('sync-panel-characters');
  var novelId = appState.getCurrentNovelId();
  var chapterId = appState.getCurrentChapterId();
  if (!novelId || !chapterId) return;

  var editorText = getCurrentEditorText();
  if (!editorText || editorText.trim().length < 50) {
    showToast('warning', '正文内容不足，无法分析人物');
    return;
  }

  if (!isAiConfigured()) {
    showToast('warning', '请先配置 AI API');
    return;
  }

  var MAX_LEN = 6000;
  var inputText = editorText;
  if (inputText.length > MAX_LEN) {
    inputText = inputText.slice(0, MAX_LEN) + '\n…(后续内容省略)';
  }

  setSyncStatus('characters', true);
  showToast('info', 'AI 正在分析人物...');

  aiWritingFeatures.characterDesign(inputText).then(function (result) {
    setSyncStatus('characters', false);

    if (!result) {
      showToast('warning', 'AI 未返回有效结果，请重试');
      return;
    }

    var characters = parseCharacters(result);

    if (characters.length === 0) {
      var name = 'AI 分析结果';
      appState.ensureCharacterProfile(novelId, chapterId, name);
      appState.updateCharacterProfile(novelId, chapterId, name, '基础信息', result);
      if (card) card._activeCharIdx = 0;
      renderCharacterPanel();
      showToast('info', 'AI 已分析，请在编辑器中查看（未能自动拆分角色）');
      return;
    }

    for (var i = 0; i < characters.length; i++) {
      var ch = characters[i];
      appState.ensureCharacterProfile(novelId, chapterId, ch.name);

      var items = ch.items || [];
      var categories = appState.getCharCategories();

      for (var c = 0; c < categories.length; c++) {
        var cat = categories[c];
        var matchedContent = '';

        for (var it = 0; it < items.length; it++) {
          if (items[it].group === cat) {
            matchedContent += (matchedContent ? '\n' : '') + items[it].label + '：' + items[it].content;
          }
        }

        if (matchedContent) {
          appState.updateCharacterProfile(novelId, chapterId, ch.name, cat, matchedContent);
        }
      }

      if (!appState.getCharacterProfile(novelId, chapterId, ch.name)['基础信息'] || !appState.getCharacterProfile(novelId, chapterId, ch.name)['基础信息'].trim()) {
        appState.updateCharacterProfile(novelId, chapterId, ch.name, '基础信息', ch.detail || result);
      }
    }

    if (card) card._activeCharIdx = 0;
    renderCharacterPanel();
    showToast('success', '已生成 ' + characters.length + ' 个角色');
  }).catch(function (err) {
    setSyncStatus('characters', false);
    showToast('error', 'AI 请求失败: ' + (err.message || '网络错误'));
  });
}

function renderCharacterPanel() {
  var card = document.getElementById('sync-panel-characters');
  var contentEl = document.getElementById('sync-content-characters');
  if (!card || !contentEl) return;

  var novelId = appState.getCurrentNovelId();
  var chapterId = appState.getCurrentChapterId();

  if (!novelId || !chapterId) {
    card.classList.remove('has-char-list');
    card.style.maxWidth = '';
    contentEl.innerHTML = '<div class="sync-empty">请先打开小说和章节</div>';
    delete card._charLayoutBuilt;
    return;
  }

  var nameList = getCharacterNameList(novelId, chapterId);

  if (nameList.all.length === 0) {
    card.classList.remove('has-char-list');
    card.style.maxWidth = '';
    contentEl.innerHTML = '<div class="sync-empty">暂无角色数据，点击右上角「\uD83D\uDD04 AI 提取」让 AI 从正文中分析人物</div>';
    delete card._charLayoutBuilt;
    return;
  }

  card.classList.add('has-char-list');
  card.style.maxWidth = '720px';

  if (card._activeCharIdx === undefined || card._activeCharIdx >= nameList.all.length) {
    card._activeCharIdx = 0;
  }
  var activeIdx = card._activeCharIdx;
  var activeName = nameList.all[activeIdx];

  var categories = appState.getCharCategories();
  var charProfile = appState.getCharacterProfile(novelId, chapterId, activeName) || {};

  /* ===== 增量更新路径：DOM 已存在，只更新内容 ===== */
  if (card._charLayoutBuilt && contentEl.querySelector('.char-main-layout')) {
    incrementalCharUpdate(card, contentEl, nameList, activeIdx, activeName, categories, charProfile);
    return;
  }

  /* ===== 首次构建路径 ===== */
  var tabHtml = '<div class="char-tab-bar"><div class="char-tab-scroll">';
  for (var ti = 0; ti < nameList.all.length; ti++) {
    tabHtml += '<div class="char-tab' + (ti === activeIdx ? ' active' : '') + '" data-char-idx="' + ti + '" data-char-name="' + escapeHtml(nameList.all[ti]) + '">' +
      '<span class="char-tab-avatar">' + escapeHtml(nameList.all[ti].charAt(0)) + '</span>' +
      '<span class="char-tab-name">' + escapeHtml(nameList.all[ti]) + '</span>' +
      '</div>';
  }
  tabHtml += '</div>' +
    '<button class="char-tab-add-btn" title="AI 从正文分析人物">\uD83D\uDD04 AI 提取</button>' +
    '</div>';

  var navHtml = '';
  for (var ci = 0; ci < categories.length; ci++) {
    navHtml += '<div class="char-nav-item' + (ci === 0 ? ' active' : '') + '" data-cat-idx="' + ci + '">' +
      escapeHtml(categories[ci]) + '</div>';
  }

  var detailHtml = '';
  for (var di = 0; di < categories.length; di++) {
    var catContent = charProfile[categories[di]] || '';
    detailHtml += '<div class="char-detail-pane" id="char-detail-' + di + '" style="display: ' + (di === 0 ? 'flex' : 'none') + ';">' +
      '<div class="char-detail-topbar">' +
        '<span class="char-detail-title">' + escapeHtml(categories[di]) + '</span>' +
        '<div class="char-detail-actions">' +
          '<span class="char-word-count" id="char-wc-' + di + '">字数：' + countContentWords(catContent) + '</span>' +
          '<button class="btn btn-accent-outline char-action-btn" data-cat="' + di + '" data-action="generate">AI 生成</button>' +
          '<button class="btn btn-secondary char-action-btn" data-cat="' + di + '" data-action="save">保存</button>' +
          '<button class="btn btn-ghost char-action-btn" data-cat="' + di + '" data-action="refresh">刷新</button>' +
        '</div>' +
      '</div>' +
      '<textarea class="char-content-editor" id="char-editor-' + di + '" data-cat="' + di + '">' + escapeHtml(catContent) + '</textarea>' +
    '</div>';
  }

  contentEl.innerHTML =
    tabHtml +
    '<div class="char-main-layout">' +
      '<div class="char-nav-panel">' + navHtml + '</div>' +
      '<div class="char-content-panel">' + detailHtml + '</div>' +
    '</div>';

  bindCharPanelEvents(card, contentEl, categories);

  /* 实时追踪滚动位置 */
  if (!card._scrollStore) card._scrollStore = {};
  var contentPanel = contentEl.querySelector('.char-content-panel');
  if (contentPanel) {
    contentPanel.addEventListener('scroll', function () {
      var curName = card._prevCharName;
      if (!curName) return;
      if (!card._scrollStore[curName]) card._scrollStore[curName] = {};
      card._scrollStore[curName]._raw = this.scrollTop;
      var h = this.scrollHeight;
      var ch = this.clientHeight;
      if (h > ch && h - ch > 0) {
        card._scrollStore[curName]._ratio = this.scrollTop / (h - ch);
      }
    });
  }

  card._charLayoutBuilt = true;
  card._prevCharName = activeName;
}

function incrementalCharUpdate(card, contentEl, nameList, activeIdx, activeName, categories, charProfile) {
  /* 1. 保存当前角色的滚动位置 */
  var contentPanel = contentEl.querySelector('.char-content-panel');
  var prevName = card._prevCharName;
  if (contentPanel && prevName) {
    if (!card._scrollStore) card._scrollStore = {};
    if (!card._scrollStore[prevName]) card._scrollStore[prevName] = {};
    card._scrollStore[prevName]._raw = contentPanel.scrollTop;
    var h = contentPanel.scrollHeight;
    var ch = contentPanel.clientHeight;
    if (h > ch && h - ch > 0) {
      card._scrollStore[prevName]._ratio = contentPanel.scrollTop / (h - ch);
    }
  }

  /* 2. 刷新顶部标签栏 */
  var tabScroll = contentEl.querySelector('.char-tab-scroll');
  if (tabScroll) {
    var tabHTML = '';
    for (var ti = 0; ti < nameList.all.length; ti++) {
      tabHTML += '<div class="char-tab' + (ti === activeIdx ? ' active' : '') + '" data-char-idx="' + ti + '" data-char-name="' + escapeHtml(nameList.all[ti]) + '">' +
        '<span class="char-tab-avatar">' + escapeHtml(nameList.all[ti].charAt(0)) + '</span>' +
        '<span class="char-tab-name">' + escapeHtml(nameList.all[ti]) + '</span>' +
        '</div>';
    }
    tabScroll.innerHTML = tabHTML;
    var tabs = tabScroll.querySelectorAll('.char-tab');
    for (var tb = 0; tb < tabs.length; tb++) {
      tabs[tb].addEventListener('click', function () {
        card._activeCharIdx = parseInt(this.dataset.charIdx);
        renderCharacterPanel();
      });
    }
  }

  /* 3. 刷新 textarea 内容 */
  for (var di = 0; di < categories.length; di++) {
    var editor = document.getElementById('char-editor-' + di);
    if (editor) {
      editor.value = charProfile[categories[di]] || '';
    }
    var wcEl = document.getElementById('char-wc-' + di);
    if (wcEl) {
      wcEl.textContent = '字数：' + countContentWords(charProfile[categories[di]] || '');
    }
  }

  /* 4. 恢复导航到第一项，显示第一个面板 */
  var navItems = contentEl.querySelectorAll('.char-nav-item');
  for (var nv = 0; nv < navItems.length; nv++) {
    navItems[nv].classList.toggle('active', nv === 0);
  }
  for (var pi = 0; pi < categories.length; pi++) {
    var pane = document.getElementById('char-detail-' + pi);
    if (pane) {
      pane.style.display = pi === 0 ? 'flex' : 'none';
    }
  }

  /* 5. 恢复新角色的滚动位置 */
  if (contentPanel) {
    var saved = card._scrollStore && card._scrollStore[activeName];
    if (saved) {
      contentPanel.offsetHeight;
      var h2 = contentPanel.scrollHeight;
      var ch2 = contentPanel.clientHeight;
      if (saved._ratio !== undefined && h2 > ch2 && h2 - ch2 > 0) {
        contentPanel.scrollTop = Math.round(saved._ratio * (h2 - ch2));
      } else if (saved._raw !== undefined && h2 > ch2 && h2 - ch2 > 0) {
        contentPanel.scrollTop = Math.min(saved._raw, h2 - ch2);
      }
    } else {
      contentPanel.scrollTop = 0;
    }
  }

  card._prevCharName = activeName;
}

function bindCharPanelEvents(card, contentEl, categories) {
  var tabs = contentEl.querySelectorAll('.char-tab');
  for (var tb = 0; tb < tabs.length; tb++) {
    tabs[tb].addEventListener('click', function () {
      card._activeCharIdx = parseInt(this.dataset.charIdx);
      renderCharacterPanel();
    });
  }

  var extractBtn = contentEl.querySelector('.char-tab-add-btn');
  if (extractBtn) {
    extractBtn.addEventListener('click', function () {
      refreshExtractionFromAI();
    });
  }

  var navItems = contentEl.querySelectorAll('.char-nav-item');
  for (var nv = 0; nv < navItems.length; nv++) {
    navItems[nv].addEventListener('click', function () {
      var catIdx = parseInt(this.dataset.catIdx);
      contentEl.querySelectorAll('.char-nav-item').forEach(function (el) { el.classList.remove('active'); });
      this.classList.add('active');
      contentEl.querySelectorAll('.char-detail-pane').forEach(function (el) { el.style.display = 'none'; });
      var pane = document.getElementById('char-detail-' + catIdx);
      if (pane) pane.style.display = 'flex';
    });
  }

  var actionBtns = contentEl.querySelectorAll('.char-action-btn');
  for (var ab = 0; ab < actionBtns.length; ab++) {
    actionBtns[ab].addEventListener('click', function () {
      var catIdx = parseInt(this.dataset.cat);
      var action = this.dataset.action;
      handleCharAction(catIdx, action);
    });
  }

  var editors = contentEl.querySelectorAll('.char-content-editor');
  for (var ed = 0; ed < editors.length; ed++) {
    editors[ed].addEventListener('input', function () {
      var catIdx = this.dataset.cat;
      var wcEl = document.getElementById('char-wc-' + catIdx);
      if (wcEl) {
        wcEl.textContent = '字数：' + countContentWords(this.value);
      }
    });
  }
}

function countContentWords(text) {
  if (!text) return 0;
  var cleaned = text.replace(/\s+/g, '');
  var chinese = cleaned.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
  var english = cleaned.match(/[a-zA-Z]+/g);
  return (chinese ? chinese.length : 0) + (english ? english.length : 0);
}

function handleCharAction(catIdx, action) {
  var editor = document.getElementById('char-editor-' + catIdx);
  if (!editor) return;

  var novelId = appState.getCurrentNovelId();
  var chapterId = appState.getCurrentChapterId();
  var categories = appState.getCharCategories();
  var category = categories[catIdx];

  var card = document.getElementById('sync-panel-characters');
  var nameList = getCharacterNameList(novelId, chapterId);
  var charName = (card && card._activeCharIdx !== undefined
    && card._activeCharIdx < nameList.all.length)
    ? nameList.all[card._activeCharIdx]
    : null;

  if (!charName) return;

  if (action === 'save') {
    appState.updateCharacterProfile(novelId, chapterId, charName, category, editor.value);
    showToast('success', '保存成功');
  } else if (action === 'refresh') {
    var profile = appState.getCharacterProfile(novelId, chapterId, charName);
    editor.value = (profile && profile[category]) || '';
    var wcEl = document.getElementById('char-wc-' + catIdx);
    if (wcEl) wcEl.textContent = '字数：' + countContentWords(editor.value);
    showToast('info', '已刷新');
  } else if (action === 'generate') {
    if (!isAiConfigured()) {
      showToast('warning', '请先配置 AI API');
      return;
    }
    showToast('info', 'AI 正在生成...');
    var editorText = getCurrentEditorText();
    var MAX_LEN = 5000;
    var inputText = editorText;
    if (inputText.length > MAX_LEN) {
      inputText = inputText.slice(0, MAX_LEN) + '\n…(后续省略)';
    }
    var prompt = '请根据以下小说正文，为角色「' + charName + '」详细描述其「' + category + '」方面的设定。\n' +
      '只输出该角色的' + category + '相关描述，不要输出其他角色的信息。\n\n正文内容：\n' + inputText;
    aiAdapter.unifiedRequest(prompt, { systemPrompt: '你是一位专业的小说写作助手，擅长分析角色设定。' }, {}).then(function (res) {
      if (res.code === 499) {
        showToast('warning', '请求超时或已取消');
        return;
      }
      if (res.code !== 200) {
        showToast('error', '生成失败: ' + (res.message || '未知错误'));
        return;
      }
      if (res.content) {
        editor.value = res.content;
        var wcEl = document.getElementById('char-wc-' + catIdx);
        if (wcEl) wcEl.textContent = '字数：' + countContentWords(res.content);
        showToast('success', '生成完成');
      } else {
        showToast('warning', 'AI 返回空内容，请重试');
      }
    }).catch(function (err) {
      showToast('error', 'AI 请求失败: ' + (err.message || '网络错误'));
    });
  }
}

function setSyncStatus(panelKey, show) {
  var bar = document.getElementById('sync-status-' + panelKey);
  if (bar) bar.style.display = show ? 'flex' : 'none';
}

async function manualSyncPanel(panelKey) {
  if (!isAiConfigured()) {
    showToast('warning', '请先配置 AI API');
    return;
  }
  if (panelKey === 'characters') {
    refreshExtractionFromAI();
    return;
  }
  setSyncStatus(panelKey, true);
  try {
    await syncOnePanel(panelKey);
    renderSyncContent(panelKey);
  } finally {
    setSyncStatus(panelKey, false);
  }
}

async function syncOnePanel(panelKey) {
  var text = getCurrentEditorText();
  if (!text || text.trim().length < 50) return;

  var result = '';
  try {
    if (panelKey === 'characters') {
      result = await aiWritingFeatures.characterDesign(text);
    } else if (panelKey === 'worldBuilding') {
      result = await aiWritingFeatures.worldBuilding(text);
    } else if (panelKey === 'chapterSummary') {
      result = await aiWritingFeatures.chapterSummary(text);
    }
  } catch (err) {
    showToast('error', '同步失败: ' + (err.message || '未知错误'));
    return;
  }

  if (!result) return;

  if (panelKey === 'characters') {
    appState.mergeSyncCharacters(result);
  } else if (panelKey === 'worldBuilding') {
    appState.mergeSyncWorldBuilding(result);
  } else {
    appState.setSyncChapterSummary(result);
  }
}

function getCurrentEditorText() {
  var editor = document.getElementById('editor-content');
  return editor ? editor.innerText || '' : '';
}

/* ===== 自动同步定时器 ===== */
function startAutoSync() {
  if (autoSyncTimer) return;
  autoSyncTimer = setInterval(function () {
    if (!isAiConfigured()) return;
    if (!appState.isSyncEnabled()) return;

    var text = getCurrentEditorText();
    if (!text || text.trim().length < 50) return;

    autoSyncCycle();
  }, SYNC_INTERVAL);
}

function stopAutoSync() {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
  }
}

var lastSyncedText = '';

async function autoSyncCycle() {
  var text = getCurrentEditorText().slice(0, 3000);
  if (!text || text === lastSyncedText) return;
  lastSyncedText = text;

  /* 轮流同步：每次只同步一个面板，减少 API 调用频率 */
  var now = Date.now();
  var lastTime = appState.getSyncLastTime() || 0;
  if (now - lastTime < 8000) return;
  appState.setSyncLastTime(now);

  /* 轮流同步：章节摘要 和 世界观（人物设定需手动触发 AI 提取） */
  var panelKeys = ['chapterSummary', 'worldBuilding'];
  var idx = Math.floor(now / SYNC_INTERVAL) % 2;

  try {
    await syncOnePanel(panelKeys[idx]);
    if (activeSyncPanel === panelKeys[idx] && document.getElementById('sync-panel-overlay').classList.contains('open')) {
      renderSyncContent(panelKeys[idx]);
    }
  } catch (e) {
    /* 静默失败，不打扰用户写作 */
  }
}

/* ==================== 页面构建与初始化 ==================== */
export function buildEditorPage() {
  var header = buildPageHeader();
  var chapterPanel = buildChapterPanel();
  var editorArea = buildEditorArea();
  var aiPanel = buildAiPanel();
  var syncPanels = buildSyncPanels();

  var bodyArea = el('div', { className: 'editor-body' }, chapterPanel, editorArea, aiPanel);

  pageEl = el('div', { className: 'page', id: 'editor-page' },
    header,
    bodyArea,
    syncPanels,
  );

  return pageEl;
}

export function initEditorPage() {
  setupKeyboardShortcuts();
  startAutoSave();
  startAutoSync();
}

export function loadNovelIntoEditor(novelId) {
  saveCurrentContent();

  appState.setCurrentNovelId(novelId);
  var novel = appState.getNovel(novelId);
  if (!novel) return;

  var titleEl = document.getElementById('editor-novel-title');
  if (titleEl) titleEl.value = novel.title;

  if (novel.chapters.length === 0) {
    appState.addChapter(novelId, '第一章');
  }

  var chapterId = appState.getCurrentChapterId();
  if (!chapterId || !appState.getChapter(novelId, chapterId)) {
    chapterId = novel.chapters[0].id;
    appState.setCurrentChapterId(chapterId);
  }

  loadChapterContent(chapterId);
  renderChapterList();
  updateWordCount();
}

export function refreshEditorPage() {
  var novelId = appState.getCurrentNovelId();
  if (novelId) {
    var novel = appState.getNovel(novelId);
    var titleEl = document.getElementById('editor-novel-title');
    if (titleEl && novel) titleEl.value = novel.title;
    updateWordCount();
    renderChapterList();
  }
}
