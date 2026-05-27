import { el } from '../../utils/helper.js';
import appState from '../../core/appState.js';
import bus from '../../event/bus.js';
import {
  CONTROLLED_OPERATIONS,
  getDefaultShortcuts,
  formatShortcutDisplay,
  eventToShortcutString,
  detectConflicts,
} from '../../utils/shortcutUtil.js';

var CATEGORIES = ['文件', 'AI', '编辑器', '通用', '窗口'];
var STORAGE_KEY = 'qingchen-shortcuts';

var editingShortcuts = {};
var recordingOp = null;
var recordHandler = null;

function loadShortcutsFromStorage() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var saved = JSON.parse(raw);
      var defaults = getDefaultShortcuts();
      var merged = {};
      var keys = Object.keys(defaults);
      for (var i = 0; i < keys.length; i++) {
        merged[keys[i]] = saved[keys[i]] || defaults[keys[i]];
      }
      return merged;
    }
  } catch (e) {}
  return getDefaultShortcuts();
}

function saveShortcutsToStorage(shortcuts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
  } catch (e) {}
}

function groupByCategory() {
  var groups = {};
  for (var i = 0; i < CATEGORIES.length; i++) {
    groups[CATEGORIES[i]] = [];
  }
  var ops = Object.keys(CONTROLLED_OPERATIONS);
  for (var j = 0; j < ops.length; j++) {
    var op = ops[j];
    var cat = CONTROLLED_OPERATIONS[op].category;
    if (groups[cat]) {
      groups[cat].push(op);
    }
  }
  return groups;
}

function renderShortcutRows(container) {
  container.innerHTML = '';
  var groups = groupByCategory();
  var conflicts = detectConflicts(editingShortcuts);
  var conflictMap = {};
  for (var c = 0; c < conflicts.length; c++) {
    var ops = conflicts[c].operations;
    for (var k = 0; k < ops.length; k++) {
      conflictMap[ops[k]] = conflicts[c];
    }
  }

  for (var g = 0; g < CATEGORIES.length; g++) {
    var cat = CATEGORIES[g];
    var ops = groups[cat];
    if (!ops || ops.length === 0) continue;

    container.appendChild(el('div', { className: 'shortcut-category-label' }, cat));

    for (var i = 0; i < ops.length; i++) {
      (function (op) {
        var info = CONTROLLED_OPERATIONS[op];
        var shortcut = editingShortcuts[op] || '';
        var isRecording = recordingOp === op;
        var hasConflict = !!conflictMap[op];

        var displayText = isRecording
          ? el('span', { className: 'shortcut-display shortcut-recording' }, '按下快捷键…')
          : el('span', { className: 'shortcut-display' }, shortcut ? formatShortcutDisplay(shortcut) : '无');

        if (hasConflict && !isRecording) {
          displayText.classList.add('shortcut-conflict');
        }

        var recordBtn = el('button', {
          className: 'modal-btn modal-btn-secondary shortcut-record-btn',
        }, isRecording ? '取消' : '录入');

        recordBtn.addEventListener('click', function () {
          if (isRecording) {
            stopRecording();
            renderShortcutRows(container);
            return;
          }
          startRecording(op, container);
        });

        var clearBtn = null;
        if (shortcut && !isRecording) {
          clearBtn = el('button', {
            className: 'modal-btn modal-btn-ghost shortcut-clear-btn',
          }, '清除');
          clearBtn.addEventListener('click', function () {
            editingShortcuts[op] = '';
            renderShortcutRows(container);
          });
        }

        var conflictHint = null;
        if (hasConflict && !isRecording) {
          var conflicting = conflictMap[op];
          conflictHint = el('div', { className: 'shortcut-conflict-hint' },
            '与 ' + conflicting.labels.join('、') + ' 冲突'
          );
        }

        var row = el('div', { className: 'shortcut-row' },
          el('div', { className: 'shortcut-info' },
            el('span', { className: 'shortcut-label' }, info.label),
            displayText,
            conflictHint,
          ),
          el('div', { className: 'shortcut-actions' }, recordBtn, clearBtn),
        );

        container.appendChild(row);
      })(ops[i]);
    }
  }
}

function startRecording(op, container) {
  recordingOp = op;
  renderShortcutRows(container);

  recordHandler = function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      stopRecording();
      renderShortcutRows(container);
      return;
    }

    var shortcut = eventToShortcutString(e);
    if (!shortcut) return;

    editingShortcuts[op] = shortcut;
    recordingOp = null;
    stopRecording();
    renderShortcutRows(container);
  };

  document.addEventListener('keydown', recordHandler, true);
}

function stopRecording() {
  recordingOp = null;
  if (recordHandler) {
    document.removeEventListener('keydown', recordHandler, true);
    recordHandler = null;
  }
}

function openShortcutPanel() {
  editingShortcuts = loadShortcutsFromStorage();
  var overlay = document.getElementById('shortcut-panel-overlay');
  if (!overlay) return;

  var body = document.getElementById('shortcut-panel-body');
  if (body) renderShortcutRows(body);

  var warningEl = document.getElementById('shortcut-panel-warning');
  if (warningEl) warningEl.textContent = '';

  appState.setUiPreferences({ shortcutPanelOpen: true });
  overlay.classList.add('open');
}

function closeShortcutPanel() {
  stopRecording();
  var overlay = document.getElementById('shortcut-panel-overlay');
  if (overlay) overlay.classList.remove('open');
  appState.setUiPreferences({ shortcutPanelOpen: false });
}

function handleResetAll() {
  editingShortcuts = getDefaultShortcuts();
  var body = document.getElementById('shortcut-panel-body');
  if (body) renderShortcutRows(body);
  var warningEl = document.getElementById('shortcut-panel-warning');
  if (warningEl) warningEl.textContent = '';
}

function handleSave() {
  var conflicts = detectConflicts(editingShortcuts);
  var warningEl = document.getElementById('shortcut-panel-warning');

  if (conflicts.length > 0) {
    if (warningEl) {
      var msgs = [];
      for (var i = 0; i < conflicts.length; i++) {
        msgs.push(conflicts[i].labels.join('、') + ' 共用 ' + formatShortcutDisplay(conflicts[i].shortcut));
      }
      warningEl.textContent = '存在冲突：' + msgs.join('；');
    }
    return;
  }

  if (warningEl) warningEl.textContent = '';

  var keys = Object.keys(editingShortcuts);
  for (var j = 0; j < keys.length; j++) {
    appState.setShortcut(keys[j], editingShortcuts[keys[j]]);
  }
  appState.setShortcuts(editingShortcuts);
  saveShortcutsToStorage(editingShortcuts);

  bus.emit('shortcuts:updated', editingShortcuts);
  bus.emit('status:set', '快捷键设置已保存');
  closeShortcutPanel();
}

export function buildShortcutPanel() {
  var overlay = el('div', { className: 'modal-overlay', id: 'shortcut-panel-overlay' });

  var body = el('div', { id: 'shortcut-panel-body' });
  var warningEl = el('div', { className: 'shortcut-panel-warning', id: 'shortcut-panel-warning' });

  var btnReset = el('button', { className: 'modal-btn modal-btn-ghost' }, '恢复默认');
  btnReset.addEventListener('click', handleResetAll);

  var btnClose = el('button', { className: 'modal-btn modal-btn-ghost' }, '关闭');
  btnClose.addEventListener('click', closeShortcutPanel);

  var btnSave = el('button', { className: 'modal-btn modal-btn-primary' }, '保存');
  btnSave.addEventListener('click', handleSave);

  var card = el('div', { className: 'modal-card modal-card-shortcuts' },
    el('div', { className: 'modal-header' },
      el('h3', { className: 'modal-title' }, '快捷键设置'),
    ),
    el('div', { className: 'modal-body' }, body, warningEl),
    el('div', { className: 'modal-footer' }, btnReset, btnClose, btnSave),
  );

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeShortcutPanel();
  });
  card.addEventListener('click', function (e) { e.stopPropagation(); });
  overlay.appendChild(card);

  return overlay;
}

export function initShortcutPanel() {
  bus.on('modal:open-shortcuts', openShortcutPanel);
}
