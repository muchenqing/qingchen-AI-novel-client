import { el } from '../../utils/helper.js';
import bus from '../../event/bus.js';

var toolbar = null;
var pendingHide = null;

function getSelectionInfo() {
  var sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  var text = sel.toString().trim();
  if (text.length === 0) return null;
  var range = sel.getRangeAt(0);
  var rect = range.getBoundingClientRect();
  var editor = document.getElementById('editor');
  if (!editor || !editor.contains(range.commonAncestorContainer)) return null;
  return { text: text, rect: rect };
}

function positionToolbar(rect) {
  var toolbarHeight = toolbar.offsetHeight || 36;
  var toolbarWidth = toolbar.offsetWidth || 260;
  var gap = 8;
  var vpWidth = window.innerWidth;
  var vpHeight = window.innerHeight;

  var left = rect.left + (rect.width - toolbarWidth) / 2;
  var top = rect.top - toolbarHeight - gap;

  if (top < 0) {
    top = rect.bottom + gap;
  }

  if (left < 4) {
    left = 4;
  } else if (left + toolbarWidth > vpWidth - 4) {
    left = vpWidth - toolbarWidth - 4;
  }

  if (top + toolbarHeight > vpHeight - 4) {
    top = vpHeight - toolbarHeight - 4;
  }

  toolbar.style.left = left + 'px';
  toolbar.style.top = top + 'px';
}

function showToolbar() {
  if (pendingHide) {
    clearTimeout(pendingHide);
    pendingHide = null;
  }
  toolbar.style.display = 'flex';
}

function hideToolbar() {
  toolbar.style.display = 'none';
}

function handleHide() {
  pendingHide = setTimeout(function () {
    hideToolbar();
    pendingHide = null;
  }, 0);
}

function handleEditorMouseUp(e) {
  var info = getSelectionInfo();
  if (!info) {
    handleHide();
    return;
  }
  showToolbar();
  positionToolbar(info.rect);
}

function getSelectedText() {
  var sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return '';
  return sel.toString();
}

function handleInsertParagraph() {
  var sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  var range = sel.getRangeAt(0);
  var editor = document.getElementById('editor');
  if (!editor || !editor.contains(range.commonAncestorContainer)) return;

  var br = document.createElement('br');
  range.collapse(false);
  range.insertNode(br);
  range.setStartAfter(br);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);

  hideToolbar();
}

function handleBold() {
  document.execCommand('bold', false, null);
  hideToolbar();
}

function handleAction(action) {
  return function () {
    var text = getSelectedText();
    if (text.length === 0) return;
    bus.emit(action, text);
    hideToolbar();
  };
}

function handleDocumentMouseDown(e) {
  if (toolbar && toolbar.contains(e.target)) return;
  var editor = document.getElementById('editor');
  if (editor && editor.contains(e.target)) return;
  hideToolbar();
}

function buildToolbar() {
  var actions = [
    { label: '润色', event: 'floattool:polish' },
    { label: '扩写', event: 'floattool:expand' },
    { label: '精简', event: 'floattool:condense' },
    { label: '改写', event: 'floattool:rewrite' },
  ];

  var btns = [];
  for (var i = 0; i < actions.length; i++) {
    btns.push(
      el('button', { className: 'float-tool-btn', type: 'button' }, actions[i].label)
    );
  }

  btns.push(el('span', { className: 'float-tool-separator' }));

  btns.push(el('button', { className: 'float-tool-btn', type: 'button' }, '加粗'));
  btns.push(el('button', { className: 'float-tool-btn', type: 'button' }, '分段'));

  var frag = document.createDocumentFragment();
  for (var j = 0; j < btns.length; j++) {
    frag.appendChild(btns[j]);
  }

  var container = el('div', { className: 'float-tool' }, frag);
  container.style.display = 'none';

  return container;
}

function bindEvents() {
  var editor = document.getElementById('editor');
  if (editor) {
    editor.addEventListener('mouseup', handleEditorMouseUp);
  }

  toolbar.addEventListener('mousedown', function (e) {
    e.preventDefault();
  });

  toolbar.addEventListener('mouseup', function (e) {
    e.stopPropagation();
    var target = e.target;
    if (!target.classList.contains('float-tool-btn')) return;

    var text = target.textContent || '';
    var idx = -1;
    var labels = ['润色', '扩写', '精简', '改写'];
    for (var i = 0; i < labels.length; i++) {
      if (text === labels[i]) {
        idx = i;
        break;
      }
    }

    var events = ['floattool:polish', 'floattool:expand', 'floattool:condense', 'floattool:rewrite'];
    if (idx >= 0) {
      handleAction(events[idx])();
      return;
    }

    if (text === '加粗') {
      handleBold();
      return;
    }

    if (text === '分段') {
      handleInsertParagraph();
    }
  });

  document.addEventListener('mousedown', handleDocumentMouseDown);
}

export function initFloatTool() {
  if (toolbar) return;
  toolbar = buildToolbar();
  document.body.appendChild(toolbar);
  bindEvents();
}
