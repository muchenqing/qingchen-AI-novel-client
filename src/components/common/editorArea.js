/**
 * 编辑器区域组件模块
 * @description 构建编辑器主体区域，包含工具栏、标题输入、内容编辑区、状态栏
 *              管理编辑器的输入、粘贴、格式化、自动保存、快捷键等交互逻辑
 * @exports buildMainArea - 创建编辑器区域DOM结构
 * @exports loadEditorContent - 加载指定书稿内容到编辑器
 * @exports showWelcomeState - 显示欢迎页面
 * @exports hideWelcomeState - 隐藏欢迎页面
 * @exports startAutoSave - 启动自动保存定时器
 * @exports handleEditorInput - 处理编辑器内容输入事件
 */

import { el } from '../../utils/helper.js';
import { countWords } from '../../utils/format.js';
import appState from '../../core/appState.js';
import bus from '../../event/bus.js';
import {
  toggleIndentation,
  formatChapterHeadings,
  formatParagraphSpacing,
  cleanEditorContent,
  normalizePunctuationInEditor,
} from '../editor/formatting.js';
import { getDetailedWordCount, getSelectedText, replaceSelectedText, formatText } from '../editor/writingAssistant.js';
import { saveEditorState } from '../editor/editorState.js';
import { exportManuscript } from '../../core/export/exportEngine.js';
import { parseChapters } from '../../utils/chapterParser.js';
import { debounce } from '../../utils/performance.js';
import { initAutoSave, manualSave, setDirty } from '../../utils/autoSave.js';
import { handlePasteEvent } from '../../utils/formatClean.js';
import { initFloatTool } from '../editor/floatTool.js';

function execFormat(command, value) {
  var editor = document.getElementById('editor');
  if (!editor) return;
  editor.focus();
  if (command === 'formatBlock') {
    document.execCommand('formatBlock', false, value);
  } else {
    document.execCommand(command, false, value || null);
  }
}

function buildToolbar() {
  function makeBtn(label, title, onClick) {
    var b = el('button', { className: 'toolbar-btn', title: title }, label);
    b.addEventListener('click', onClick);
    return b;
  }

  var btnBold = makeBtn('B', '加粗 (Ctrl+B)', function () { execFormat('bold'); });
  btnBold.style.fontWeight = '700';
  var btnItalic = makeBtn('I', '斜体 (Ctrl+I)', function () { execFormat('italic'); });
  btnItalic.style.fontStyle = 'italic';
  var btnHeading = makeBtn('H', '标题', function () { execFormat('formatBlock', 'h2'); });
  var separator = el('span', { className: 'toolbar-separator' });
  var btnAi = makeBtn('\u2726 AI', 'AI 助手', function () {
    var sourceArea = document.getElementById('ai-panel-source');
    var editor = document.getElementById('editor');
    if (sourceArea && editor) {
      sourceArea.value = (editor.innerText || '').slice(0, 5000);
    }
  });
  btnAi.className = 'toolbar-btn toolbar-btn-ai';

  var sep2 = el('span', { className: 'toolbar-separator' });

  var btnIndent = makeBtn('\u2194', '首行缩进切换', function () {
    var editor = document.getElementById('editor');
    var cfg = appState.getEditorConfig();
    var newIndent = !cfg.indent;
    appState.setEditorConfig({ indent: newIndent });
    toggleIndentation(editor, newIndent);
    bus.emit('status:set', newIndent ? '已启用首行缩进' : '已关闭首行缩进');
  });
  btnIndent.title = '首行缩进 (Ctrl+Shift+I)';

  var btnChapterFmt = makeBtn('\u25A0', '章节标题格式化', function () {
    var editor = document.getElementById('editor');
    formatChapterHeadings(editor);
    bus.emit('status:set', '章节标题已格式化');
  });

  var btnSpacing = makeBtn('\u2261', '段落间距规范化', function () {
    var editor = document.getElementById('editor');
    formatParagraphSpacing(editor);
    bus.emit('status:set', '段落间距已规范化');
  });

  var btnClean = makeBtn('\u2716', '清理空行', function () {
    var editor = document.getElementById('editor');
    cleanEditorContent(editor);
    handleEditorInput();
    bus.emit('status:set', '内容已清理');
  });

  var btnPunct = makeBtn('\u3002', '标点修正', function () {
    var editor = document.getElementById('editor');
    normalizePunctuationInEditor(editor);
    handleEditorInput();
    bus.emit('status:set', '标点已修正');
  });

  var sep3 = el('span', { className: 'toolbar-separator' });

  var btnExport = makeBtn('\u2193', '导出文档', function () {
    handleExportManuscript();
  });
  btnExport.title = '导出 (Ctrl+Shift+E)';

  var toolbar = el('div', { className: 'toolbar', id: 'toolbar' });
  toolbar.appendChild(btnBold);
  toolbar.appendChild(btnItalic);
  toolbar.appendChild(btnHeading);
  toolbar.appendChild(separator);
  toolbar.appendChild(btnAi);
  toolbar.appendChild(sep2);
  toolbar.appendChild(btnIndent);
  toolbar.appendChild(btnChapterFmt);
  toolbar.appendChild(btnSpacing);
  toolbar.appendChild(btnClean);
  toolbar.appendChild(btnPunct);
  toolbar.appendChild(sep3);
  toolbar.appendChild(btnExport);
  return toolbar;
}

export function handleEditorInput() {
  var currentManuscriptId = appState.getCurrentManuscriptId();
  if (!currentManuscriptId) return;
  var editor = document.getElementById('editor');
  var content = editor.innerText || '';
  var wc = countWords(content);
  var excerpt = content.slice(0, 120).replace(/\n/g, ' ');
  appState.updateManuscript(currentManuscriptId, { content: content, excerpt: excerpt, wordCount: wc });
  updateWordCountDisplay(wc);

  var detail = getDetailedWordCount(content);
  updateDetailedWordCount(detail);

  bus.emit('manuscript:list-changed');
  bus.emit('editor:content-changed');
}

var debouncedEditorInput = debounce(handleEditorInput, 300);

function handleEditorPaste(e) {
  var cleaned = handlePasteEvent(e);
  if (cleaned !== null) {
    e.preventDefault();
    document.execCommand('insertText', false, cleaned);
  }
}

function updateWordCountDisplay(count) {
  var wcEl = document.getElementById('word-count');
  if (wcEl) wcEl.textContent = '字数: ' + count;
}

function updateDetailedWordCount(detail) {
  var detailEl = document.getElementById('word-count-detail');
  if (detailEl && detail) {
    detailEl.textContent = '中:' + detail.chinese + ' 英:' + detail.english + ' 段:' + detail.paragraphs;
  }
}

function handleExportManuscript() {
  var currentManuscriptId = appState.getCurrentManuscriptId();
  if (!currentManuscriptId) {
    bus.emit('status:set', '没有可导出的书稿');
    return;
  }
  var ms = appState.getManuscript(currentManuscriptId);
  if (!ms || !ms.content) {
    bus.emit('status:set', '书稿内容为空');
    return;
  }

  var exCfg = appState.getExportConfig();
  var format = exCfg.defaultFormat || 'txt';
  var chapters = parseChapters(ms.content);
  var result = exportManuscript(format, chapters, {
    title: ms.title,
    includeToc: exCfg.includeToc,
  });

  if (result.success) {
    if (window.electronAPI && window.electronAPI.exportFile) {
      window.electronAPI.exportFile(result.filename, result.content, result.mimeType).then(function (ok) {
        bus.emit('status:set', ok ? '导出成功: ' + result.filename : '导出取消');
      }).catch(function () {
        bus.emit('status:set', '导出失败');
      });
    } else {
      var blob = new Blob([result.content], { type: result.mimeType });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(a.href);
      bus.emit('status:set', '导出成功: ' + result.filename);
    }
  } else {
    bus.emit('status:set', result.error || '导出失败');
  }
}

export function loadEditorContent(id) {
  var editor = document.getElementById('editor');
  var titleInput = document.getElementById('manuscript-title');
  var ms = appState.getManuscript(id);
  if (!editor || !titleInput || !ms) return;

  editor.innerHTML = ms.content || '';
  titleInput.value = ms.title || '';
  updateWordCountDisplay(ms.wordCount || 0);
}

export function showWelcomeState() {
  var editor = document.getElementById('editor');
  if (!editor) return;
  editor.innerHTML = '';
  editor.classList.add('welcome');
  editor.appendChild(el('div', { className: 'welcome-content' },
    el('h2', null, '欢迎使用 卿辰 Mercey'),
    el('p', null, '一款专为小说创作者设计的本地写作客户端'),
    el('p', { className: 'welcome-hint' }, '点击左侧「新建书稿」开始创作，或选择已有书稿继续写作'),
  ));
}

export function hideWelcomeState() {
  var editor = document.getElementById('editor');
  if (editor) editor.classList.remove('welcome');
}

export function startAutoSave() {
  initAutoSave();
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function (e) {
    var ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && e.key === 's') {
      e.preventDefault();
      var currentManuscriptId = appState.getCurrentManuscriptId();
      if (currentManuscriptId) {
        var editor = document.getElementById('editor');
        if (editor) {
          var content = editor.innerText || '';
          appState.updateManuscript(currentManuscriptId, {
            content: content,
            excerpt: content.slice(0, 120).replace(/\n/g, ' '),
            wordCount: countWords(content),
          });
          bus.emit('manuscript:list-changed');
          bus.emit('status:set', '已保存');
        }
      }
    }

    if (ctrl && e.key === 'n') {
      e.preventDefault();
      bus.emit('manuscript:new');
    }

    if (ctrl && e.key === 'b') {
      var ed = document.getElementById('editor');
      if (ed && ed.contains(document.activeElement)) {
        e.preventDefault();
        execFormat('bold');
      }
    }

    if (ctrl && e.key === 'i') {
      var ed2 = document.getElementById('editor');
      if (ed2 && ed2.contains(document.activeElement)) {
        e.preventDefault();
        execFormat('italic');
      }
    }

    if (ctrl && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      handleExportManuscript();
    }

    if (ctrl && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      var editorEl = document.getElementById('editor');
      var cfg = appState.getEditorConfig();
      var newIndent = !cfg.indent;
      appState.setEditorConfig({ indent: newIndent });
      toggleIndentation(editorEl, newIndent);
      bus.emit('status:set', newIndent ? '已启用首行缩进' : '已关闭首行缩进');
    }

    if (ctrl && e.shiftKey && e.key === 'F') {
      var ed3 = document.getElementById('editor');
      if (ed3 && ed3.contains(document.activeElement)) {
        e.preventDefault();
        var selected = getSelectedText();
        if (selected) {
          var eCfg = appState.getEditorConfig();
          var formatted = formatText(selected, {
            indent: eCfg.indent,
            spacing: true,
            punctuation: eCfg.punctuationFix,
          });
          replaceSelectedText(formatted);
          handleEditorInput();
          bus.emit('status:set', '选区已格式化');
        }
      }
    }

    if (ctrl && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      var editorEl2 = document.getElementById('editor');
      var detail = getDetailedWordCount(editorEl2 ? editorEl2.innerText || '' : '');
      var msg = '总计:' + detail.total + ' 中文:' + detail.chinese + ' 英文:' + detail.english + ' 段落:' + detail.paragraphs;
      bus.emit('status:set', msg);
    }
  });
}

function handleMenuActions() {
  if (!window.electronAPI) return;
  window.electronAPI.onMenuAction && window.electronAPI.onMenuAction(function (action) {
    if (action === 'new-manuscript') {
      bus.emit('manuscript:new');
    } else if (action === 'save') {
      var currentManuscriptId = appState.getCurrentManuscriptId();
      if (currentManuscriptId) {
        var editor = document.getElementById('editor');
        if (editor) {
          var content = editor.innerText || '';
          appState.updateManuscript(currentManuscriptId, {
            content: content,
            excerpt: content.slice(0, 120).replace(/\n/g, ' '),
            wordCount: countWords(content),
          });
          bus.emit('manuscript:list-changed');
          bus.emit('status:set', '已保存');
        }
      }
    } else if (action === 'open-ai') {
      var srcArea = document.getElementById('ai-panel-source');
      var ed = document.getElementById('editor');
      if (srcArea && ed) {
        srcArea.value = (ed.innerText || '').slice(0, 5000);
      }
    } else if (action === 'export') {
      handleExportManuscript();
    } else if (action === 'settings') {
      bus.emit('modal:open-settings');
    }
  });
}

export function buildMainArea() {
  var toolbar = buildToolbar();

  var editorArea = el('div', { className: 'editor-area' });
  var editorWrapper = el('div', { className: 'editor-wrapper' });
  var titleInput = el('input', {
    id: 'manuscript-title',
    className: 'editor-title-input',
    placeholder: '书稿标题',
    type: 'text',
  });
  titleInput.addEventListener('input', function (e) {
    var currentManuscriptId = appState.getCurrentManuscriptId();
    if (!currentManuscriptId) return;
    appState.updateManuscript(currentManuscriptId, { title: e.target.value || '未命名书稿' });
    bus.emit('manuscript:list-changed');
  });

  var editor = el('div', {
    id: 'editor',
    className: 'editor-content',
    contentEditable: 'true',
    'data-placeholder': '开始创作你的故事\u2026',
  });
  editor.addEventListener('input', debouncedEditorInput);
  editor.addEventListener('paste', handleEditorPaste);

  editorWrapper.appendChild(titleInput);
  editorWrapper.appendChild(editor);
  editorArea.appendChild(editorWrapper);

  var statusLeft = el('div', { className: 'status-left' },
    el('span', { id: 'status-message' }, '就绪'),
    el('span', { className: 'status-section' },
      el('span', { className: 'status-dot saved', id: 'status-save-dot' }),
      el('span', { id: 'status-save-text' }, '已保存'),
    ),
  );

  var statusCenter = el('div', { className: 'status-center' },
    el('span', { className: 'status-section' },
      el('span', { id: 'status-chapter-name' }, ''),
    ),
  );

  var statusRight = el('div', { className: 'status-right' },
    el('span', { className: 'word-count-detail', id: 'word-count-detail' }),
    el('span', { className: 'word-count', id: 'word-count' }, '0 字'),
    el('span', { className: 'status-section' },
      el('span', { className: 'status-dot online', id: 'status-network-dot' }),
      el('span', { id: 'status-network-text' }, '在线'),
    ),
  );

  var statusBar = el('footer', { className: 'status-bar' },
    statusLeft,
    statusCenter,
    statusRight,
  );

  var main = el('main', { className: 'main-area', id: 'main-area' });
  main.appendChild(toolbar);
  main.appendChild(editorArea);
  main.appendChild(statusBar);
  return main;
}

function setupShortcutBusListeners() {
  bus.on('shortcut:save', function () {
    var currentManuscriptId = appState.getCurrentManuscriptId();
    if (currentManuscriptId) {
      var editor = document.getElementById('editor');
      if (editor) {
        var content = editor.innerText || '';
        appState.updateManuscript(currentManuscriptId, {
          content: content,
          excerpt: content.slice(0, 120).replace(/\n/g, ' '),
          wordCount: countWords(content),
        });
        bus.emit('manuscript:list-changed');
        bus.emit('status:set', '已保存');
      }
    }
  });

  bus.on('shortcut:export', function () {
    handleExportManuscript();
  });

  bus.on('shortcut:toggle-indent', function () {
    var editorEl = document.getElementById('editor');
    var cfg = appState.getEditorConfig();
    var newIndent = !cfg.indent;
    appState.setEditorConfig({ indent: newIndent });
    toggleIndentation(editorEl, newIndent);
    bus.emit('status:set', newIndent ? '已启用首行缩进' : '已关闭首行缩进');
  });

  bus.on('shortcut:format-selection', function () {
    var ed = document.getElementById('editor');
    if (ed && ed.contains(document.activeElement)) {
      var selected = getSelectedText();
      if (selected) {
        var eCfg = appState.getEditorConfig();
        var formatted = formatText(selected, {
          indent: eCfg.indent,
          spacing: true,
          punctuation: eCfg.punctuationFix,
        });
        replaceSelectedText(formatted);
        handleEditorInput();
        bus.emit('status:set', '选区已格式化');
      }
    }
  });

  bus.on('shortcut:show-word-count', function () {
    var editorEl = document.getElementById('editor');
    var detail = getDetailedWordCount(editorEl ? editorEl.innerText || '' : '');
    var msg = '总计:' + detail.total + ' 中文:' + detail.chinese + ' 英文:' + detail.english + ' 段落:' + detail.paragraphs;
    bus.emit('status:set', msg);
  });
}

function setupFloatToolListeners() {
  bus.on('floattool:polish', function (text) {
    appState.setCurrentAiTab('polish');
    var sourceArea = document.getElementById('ai-panel-source');
    if (sourceArea) sourceArea.value = text;
    bus.emit('tips:show', { type: 'info', message: '已填入内容，点击「生成」开始润色', duration: 3000 });
  });
  bus.on('floattool:expand', function (text) {
    appState.setCurrentAiTab('continue');
    var sourceArea = document.getElementById('ai-panel-source');
    if (sourceArea) sourceArea.value = text;
    bus.emit('tips:show', { type: 'info', message: '已填入内容，点击「生成」开始续写', duration: 3000 });
  });
  bus.on('floattool:condense', function (text) {
    appState.setCurrentAiTab('polish');
    var sourceArea = document.getElementById('ai-panel-source');
    if (sourceArea) sourceArea.value = text;
    bus.emit('tips:show', { type: 'info', message: '已填入内容，点击「生成」开始精简', duration: 3000 });
  });
  bus.on('floattool:rewrite', function (text) {
    appState.setCurrentAiTab('continue');
    var sourceArea = document.getElementById('ai-panel-source');
    if (sourceArea) sourceArea.value = text;
    bus.emit('tips:show', { type: 'info', message: '已填入内容，点击「生成」开始改写', duration: 3000 });
  });
}

export function initEditorArea() {
  bus.on('manuscript:switched', loadEditorContent);
  bus.on('editor:hide-welcome', hideWelcomeState);
  bus.on('editor:show-welcome', showWelcomeState);
  bus.on('editor:focus-title', function () {
    var titleInput = document.getElementById('manuscript-title');
    if (titleInput) {
      titleInput.focus();
      titleInput.select();
    }
  });
  bus.on('editor:apply-content', function (content) {
    var editor = document.getElementById('editor');
    if (!editor) return;

    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
      var range = sel.getRangeAt(0);
      range.deleteContents();
      var temp = document.createElement('div');
      temp.innerHTML = content.replace(/\n/g, '<br>');
      var frag = document.createDocumentFragment();
      var lastNode;
      while (temp.firstChild) {
        lastNode = frag.appendChild(temp.firstChild);
      }
      range.insertNode(frag);
      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } else {
      editor.focus();
      document.execCommand('insertText', false, content);
    }

    handleEditorInput();
  });

  setupKeyboardShortcuts();
  handleMenuActions();
  setupShortcutBusListeners();
  setupFloatToolListeners();
  initFloatTool();
}
