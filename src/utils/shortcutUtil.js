var MODIFIER_KEYS = ['Ctrl', 'Shift', 'Alt', 'Meta'];
var MODIFIER_MAP = {
  Ctrl: 'ctrlKey',
  Shift: 'shiftKey',
  Alt: 'altKey',
  Meta: 'metaKey',
};

var SPECIAL_KEY_NAMES = {
  ' ': 'Space',
  'ArrowUp': '↑',
  'ArrowDown': '↓',
  'ArrowLeft': '←',
  'ArrowRight': '→',
  'Escape': 'Esc',
  'Enter': 'Enter',
  'Backspace': 'Backspace',
  'Delete': 'Delete',
  'Tab': 'Tab',
};

var REVERSE_KEY_MAP = {
  'Space': ' ',
  'Esc': 'Escape',
};

var CONTROLLED_OPERATIONS = {
  save: { label: '保存', category: '文件' },
  newManuscript: { label: '新建书稿', category: '文件' },
  export: { label: '导出文档', category: '文件' },
  openAI: { label: '打开 AI 助手', category: 'AI' },
  toggleIndent: { label: '切换首行缩进', category: '编辑器' },
  formatSelection: { label: '格式化选区', category: '编辑器' },
  showWordCount: { label: '显示字数统计', category: '编辑器' },
  bold: { label: '加粗', category: '编辑器' },
  italic: { label: '斜体', category: '编辑器' },
  openSettings: { label: '打开设置', category: '通用' },
  closeWindow: { label: '关闭窗口', category: '窗口' },
};

function parseShortcutString(shortcut) {
  if (!shortcut || typeof shortcut !== 'string') return null;
  var parts = shortcut.split('+').map(function (s) { return s.trim(); });
  var modifiers = [];
  var mainKey = null;
  for (var i = 0; i < parts.length; i++) {
    if (MODIFIER_KEYS.indexOf(parts[i]) !== -1) {
      modifiers.push(parts[i]);
    } else {
      mainKey = parts[i];
    }
  }
  if (!mainKey) return null;
  return {
    modifiers: modifiers.sort(function (a, b) {
      return MODIFIER_KEYS.indexOf(a) - MODIFIER_KEYS.indexOf(b);
    }),
    key: mainKey,
    original: shortcut,
  };
}

function shortcutToString(parsed) {
  if (!parsed) return '';
  var parts = parsed.modifiers.concat([parsed.key]);
  return parts.join('+');
}

function matchShortcut(event, shortcutStr) {
  var parsed = parseShortcutString(shortcutStr);
  if (!parsed) return false;
  var ctrlMatch = parsed.modifiers.indexOf('Ctrl') !== -1 ? event.ctrlKey : !event.ctrlKey;
  var shiftMatch = parsed.modifiers.indexOf('Shift') !== -1 ? event.shiftKey : !event.shiftKey;
  var altMatch = parsed.modifiers.indexOf('Alt') !== -1 ? event.altKey : !event.altKey;
  var metaMatch = parsed.modifiers.indexOf('Meta') !== -1 ? event.metaKey : !event.metaKey;
  if (!ctrlMatch || !shiftMatch || !altMatch || !metaMatch) return false;
  var expectedKey = REVERSE_KEY_MAP[parsed.key] || parsed.key;
  return event.key === expectedKey || event.code === 'Key' + parsed.key;
}

function eventToShortcutString(event) {
  var parts = [];
  if (event.ctrlKey) parts.push('Ctrl');
  if (event.shiftKey) parts.push('Shift');
  if (event.altKey) parts.push('Alt');
  if (event.metaKey) parts.push('Meta');
  var keyName = SPECIAL_KEY_NAMES[event.key] || event.key;
  if (MODIFIER_KEYS.indexOf(keyName) === -1) {
    parts.push(keyName.length === 1 ? keyName.toUpperCase() : keyName);
  }
  if (parts.length <= 1 && MODIFIER_KEYS.indexOf(parts[0]) !== -1) return '';
  return parts.join('+');
}

function detectConflicts(shortcuts) {
  var conflicts = [];
  var usedCombos = {};
  var keys = Object.keys(shortcuts);
  for (var i = 0; i < keys.length; i++) {
    var combo = shortcuts[keys[i]];
    if (!combo) continue;
    var parsed = parseShortcutString(combo);
    if (!parsed) continue;
    var normalized = shortcutToString(parsed);
    if (usedCombos[normalized]) {
      var existing = usedCombos[normalized];
      if (existing.indexOf(keys[i]) === -1) existing.push(keys[i]);
    } else {
      usedCombos[normalized] = [keys[i]];
    }
  }
  var comboKeys = Object.keys(usedCombos);
  for (var j = 0; j < comboKeys.length; j++) {
    var ops = usedCombos[comboKeys[j]];
    if (ops.length > 1) {
      conflicts.push({
        shortcut: comboKeys[j],
        operations: ops,
        labels: ops.map(function (op) {
          return CONTROLLED_OPERATIONS[op] ? CONTROLLED_OPERATIONS[op].label : op;
        }),
      });
    }
  }
  return conflicts;
}

function getDefaultShortcuts() {
  return {
    save: 'Ctrl+S',
    newManuscript: 'Ctrl+N',
    openAI: 'Ctrl+Shift+A',
    export: 'Ctrl+Shift+E',
    toggleIndent: 'Ctrl+Shift+I',
    formatSelection: 'Ctrl+Shift+F',
    showWordCount: 'Ctrl+Shift+D',
    bold: 'Ctrl+B',
    italic: 'Ctrl+I',
    openSettings: 'Ctrl+,',
    closeWindow: 'Alt+F4',
  };
}

function formatShortcutDisplay(shortcut) {
  if (!shortcut) return '';
  var parsed = parseShortcutString(shortcut);
  if (!parsed) return shortcut;
  var parts = parsed.modifiers.map(function (m) {
    if (m === 'Ctrl') return 'Ctrl';
    if (m === 'Shift') return 'Shift';
    if (m === 'Alt') return 'Alt';
    if (m === 'Meta') return 'Cmd';
    return m;
  });
  var keyDisplay = parsed.key;
  if (SPECIAL_KEY_NAMES[parsed.key]) {
    keyDisplay = SPECIAL_KEY_NAMES[parsed.key];
  }
  parts.push(keyDisplay);
  return parts.join(' + ');
}

export {
  parseShortcutString,
  shortcutToString,
  matchShortcut,
  eventToShortcutString,
  detectConflicts,
  getDefaultShortcuts,
  formatShortcutDisplay,
  CONTROLLED_OPERATIONS,
  MODIFIER_KEYS,
  SPECIAL_KEY_NAMES,
};
