import { el } from '../../utils/helper.js';
import { loadTheme, saveTheme, THEMES } from '../../utils/storage.js';
import appState from '../../core/appState.js';
import bus from '../../event/bus.js';
import {
  BUILTIN_THEMES,
  EXTENDED_TEMPLATES,
  createThemeCSS,
  exportThemeJSON,
  importThemeJSON,
} from './templates.js';

var VARIABLE_META = [
  { key: '--bg-main', label: '主背景', type: 'color' },
  { key: '--bg-titlebar', label: '标题栏背景', type: 'color' },
  { key: '--bg-sidebar', label: '侧边栏背景', type: 'color' },
  { key: '--border', label: '边框', type: 'color' },
  { key: '--text-primary', label: '主文字', type: 'color' },
  { key: '--text-secondary', label: '次文字', type: 'color' },
  { key: '--accent', label: '强调色', type: 'color' },
  { key: '--accent-hover', label: '强调色悬停', type: 'color' },
  { key: '--danger', label: '危险色', type: 'color' },
  { key: '--card-bg', label: '卡片背景', type: 'color' },
  { key: '--hover-bg', label: '悬停背景', type: 'text' },
];

var customStyleTag = null;
var currentTheme = loadTheme();

function hexToRgba(hex, alpha) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}

function parseHoverBg(val) {
  var m = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  var r = ('0' + parseInt(m[1]).toString(16)).slice(-2);
  var g = ('0' + parseInt(m[2]).toString(16)).slice(-2);
  var b = ('0' + parseInt(m[3]).toString(16)).slice(-2);
  return '#' + r + g + b;
}

function getCustomDefaults() {
  return {
    '--bg-main': '#F0F7F4',
    '--bg-titlebar': '#E6F2ED',
    '--bg-sidebar': '#E6F2ED',
    '--border': '#D0E6DF',
    '--text-primary': '#2A3D36',
    '--text-secondary': '#556B63',
    '--accent': '#4A7C6B',
    '--accent-hover': '#335C4E',
    '--danger': '#D9534F',
    '--card-bg': '#ffffff',
    '--hover-bg': 'rgba(74, 124, 107, 0.08)',
  };
}

function getCustomTheme() {
  try {
    var raw = localStorage.getItem('qingchen-custom-theme');
    return raw ? JSON.parse(raw) : getCustomDefaults();
  } catch (e) {
    return getCustomDefaults();
  }
}

function saveCustomTheme(vars) {
  try {
    localStorage.setItem('qingchen-custom-theme', JSON.stringify(vars));
  } catch (e) {
    console.error('[ThemeManager] 保存自定义主题失败:', e);
  }
}

function getCurrentVars() {
  if (BUILTIN_THEMES[currentTheme]) {
    return BUILTIN_THEMES[currentTheme];
  }
  var custom = getCustomTheme();
  return custom;
}

function applyCustomStyle(vars) {
  if (!customStyleTag) {
    customStyleTag = document.createElement('style');
    customStyleTag.id = 'theme-custom-style';
    document.head.appendChild(customStyleTag);
  }
  customStyleTag.textContent = createThemeCSS('custom', vars);
}

function removeCustomStyle() {
  if (customStyleTag) {
    customStyleTag.textContent = '';
  }
}

function updateHighlight() {
  var allBtns = document.querySelectorAll('.theme-mgr-swatch, .theme-mgr-ext-btn');
  for (var i = 0; i < allBtns.length; i++) {
    allBtns[i].classList.remove('active');
  }
  var activeId = 'swatch-' + currentTheme;
  var activeBtn = document.getElementById(activeId);
  if (activeBtn) activeBtn.classList.add('active');
}

function applyTheme(name) {
  currentTheme = name;
  saveTheme(name);
  appState.setCurrentTheme(name);
  removeCustomStyle();
  bus.emit('theme:apply', name);
  updateHighlight();
}

function applyExtendedTheme(template) {
  currentTheme = 'custom';
  saveTheme('custom');
  appState.setCurrentTheme('custom');
  var vars = template.variables;
  saveCustomTheme(vars);
  applyCustomStyle(vars);
  document.body.className = 'theme-custom';
  bus.emit('theme:apply', 'custom');
  updateHighlight();
  bus.emit('status:set', '已应用主题: ' + template.label);
}

function syncPickersToVars(vars) {
  for (var i = 0; i < VARIABLE_META.length; i++) {
    var meta = VARIABLE_META[i];
    var picker = document.getElementById('tm-picker-' + meta.key);
    if (!picker) continue;
    if (meta.type === 'color') {
      var hex = parseHoverBg(vars[meta.key]) || vars[meta.key];
      picker.value = hex;
    } else {
      picker.value = vars[meta.key] || '';
    }
  }
}

function readPickersAsVars() {
  var vars = {};
  for (var i = 0; i < VARIABLE_META.length; i++) {
    var meta = VARIABLE_META[i];
    var picker = document.getElementById('tm-picker-' + meta.key);
    if (!picker) continue;
    if (meta.type === 'color') {
      vars[meta.key] = picker.value;
    } else {
      vars[meta.key] = picker.value || 'rgba(0, 0, 0, 0.08)';
    }
  }
  return vars;
}

function buildPreviewBox() {
  var box = el('div', { id: 'tm-preview-box', className: 'tm-preview-box' },
    el('div', { className: 'tm-preview-titlebar' },
      el('span', { className: 'tm-preview-title' }, '标题栏预览'),
    ),
    el('div', { className: 'tm-preview-body' },
      el('div', { className: 'tm-preview-sidebar' },
        el('span', null, '侧边栏'),
      ),
      el('div', { className: 'tm-preview-content' },
        el('p', { className: 'tm-preview-text-primary' }, '主文字内容预览'),
        el('p', { className: 'tm-preview-text-secondary' }, '次要文字内容预览'),
        el('div', { className: 'tm-preview-card' },
          el('span', null, '卡片区域'),
        ),
        el('button', { className: 'tm-preview-btn' }, '强调按钮'),
      ),
    ),
  );
  return box;
}

function applyPreviewVars(vars) {
  var box = document.getElementById('tm-preview-box');
  if (!box) return;
  box.style.setProperty('--bg-main', vars['--bg-main']);
  box.style.setProperty('--bg-titlebar', vars['--bg-titlebar']);
  box.style.setProperty('--bg-sidebar', vars['--bg-sidebar']);
  box.style.setProperty('--border', vars['--border']);
  box.style.setProperty('--text-primary', vars['--text-primary']);
  box.style.setProperty('--text-secondary', vars['--text-secondary']);
  box.style.setProperty('--accent', vars['--accent']);
  box.style.setProperty('--accent-hover', vars['--accent-hover']);
  box.style.setProperty('--danger', vars['--danger']);
  box.style.setProperty('--card-bg', vars['--card-bg']);
  box.style.setProperty('--hover-bg', vars['--hover-bg']);
}

function buildBuiltInSection() {
  var grid = el('div', { className: 'tm-grid' });
  var names = THEMES;
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var vars = BUILTIN_THEMES[name];
    var swatch = el('div', {
      className: 'theme-mgr-swatch',
      id: 'swatch-' + name,
      dataset: { theme: name },
    },
      el('div', { className: 'tm-swatch-colors' },
        el('span', { className: 'tm-dot', style: 'background:' + vars['--accent'] }),
        el('span', { className: 'tm-dot', style: 'background:' + vars['--bg-main'] }),
        el('span', { className: 'tm-dot', style: 'background:' + vars['--text-primary'] }),
        el('span', { className: 'tm-dot', style: 'background:' + vars['--border'] }),
      ),
      el('span', { className: 'tm-swatch-label' }, name),
    );
    swatch.addEventListener('click', (function (n) {
      return function () { applyTheme(n); };
    })(name));
    grid.appendChild(swatch);
  }
  return grid;
}

function buildExtendedSection() {
  var grid = el('div', { className: 'tm-grid' });
  for (var i = 0; i < EXTENDED_TEMPLATES.length; i++) {
    var tpl = EXTENDED_TEMPLATES[i];
    var vars = tpl.variables;
    var card = el('div', { className: 'theme-mgr-ext-card' },
      el('div', { className: 'tm-swatch-colors' },
        el('span', { className: 'tm-dot', style: 'background:' + vars['--accent'] }),
        el('span', { className: 'tm-dot', style: 'background:' + vars['--bg-main'] }),
        el('span', { className: 'tm-dot', style: 'background:' + vars['--text-primary'] }),
        el('span', { className: 'tm-dot', style: 'background:' + vars['--border'] }),
      ),
      el('span', { className: 'tm-ext-label' }, tpl.label),
    );
    var btn = el('button', { className: 'theme-mgr-ext-btn' }, '应用');
    btn.addEventListener('click', (function (t) {
      return function () { applyExtendedTheme(t); };
    })(tpl));
    card.appendChild(btn);
    grid.appendChild(card);
  }
  return grid;
}

function buildCustomSection() {
  var container = el('div', { className: 'tm-custom-section' });
  var row = el('div', { className: 'tm-picker-grid' });

  for (var i = 0; i < VARIABLE_META.length; i++) {
    var meta = VARIABLE_META[i];
    var field = el('div', { className: 'tm-picker-field' },
      el('label', { className: 'tm-picker-label' }, meta.label),
    );
    var input;
    if (meta.type === 'color') {
      input = el('input', {
        type: 'color',
        id: 'tm-picker-' + meta.key,
        className: 'tm-color-input',
      });
    } else {
      input = el('input', {
        type: 'text',
        id: 'tm-picker-' + meta.key,
        className: 'modal-input tm-text-input',
        placeholder: 'rgba(r, g, b, a)',
      });
    }
    input.addEventListener('input', function () {
      var vars = readPickersAsVars();
      applyPreviewVars(vars);
    });
    field.appendChild(input);
    row.appendChild(field);
  }

  container.appendChild(row);

  var previewLabel = el('label', { className: 'modal-label', style: 'margin-top:16px' }, '实时预览');
  container.appendChild(previewLabel);
  container.appendChild(buildPreviewBox());

  return container;
}

function buildFooterButtons() {
  var btnGroup = el('div', { className: 'tm-footer-btns' });

  var btnApply = el('button', { className: 'modal-btn modal-btn-primary' }, '应用自定义');
  btnApply.addEventListener('click', function () {
    var vars = readPickersAsVars();
    saveCustomTheme(vars);
    applyCustomStyle(vars);
    currentTheme = 'custom';
    saveTheme('custom');
    appState.setCurrentTheme('custom');
    document.body.className = 'theme-custom';
    bus.emit('theme:apply', 'custom');
    updateHighlight();
    bus.emit('status:set', '自定义主题已应用');
  });
  btnGroup.appendChild(btnApply);

  var btnExport = el('button', { className: 'modal-btn modal-btn-secondary' }, '导出');
  btnExport.addEventListener('click', function () {
    var vars = readPickersAsVars();
    var json = exportThemeJSON('custom', vars);
    var textarea = document.getElementById('tm-import-textarea');
    if (textarea) textarea.value = json;
    bus.emit('status:set', '主题已导出到文本框');
  });
  btnGroup.appendChild(btnExport);

  var btnImport = el('button', { className: 'modal-btn modal-btn-secondary' }, '导入');
  btnImport.addEventListener('click', function () {
    var textarea = document.getElementById('tm-import-textarea');
    if (!textarea || !textarea.value.trim()) {
      bus.emit('status:set', '请先粘贴主题 JSON');
      return;
    }
    var result = importThemeJSON(textarea.value.trim());
    if (!result) {
      bus.emit('status:set', '主题 JSON 格式无效');
      return;
    }
    syncPickersToVars(result.variables);
    applyPreviewVars(result.variables);
    bus.emit('status:set', '主题已导入: ' + result.name);
  });
  btnGroup.appendChild(btnImport);

  return btnGroup;
}

function buildImportArea() {
  var textarea = el('textarea', {
    id: 'tm-import-textarea',
    className: 'tm-import-textarea',
    placeholder: '粘贴主题 JSON 以导入...',
    rows: '4',
  });
  return el('div', { className: 'tm-import-area' },
    el('label', { className: 'modal-label' }, '导入 / 导出'),
    textarea,
  );
}

export function buildThemeManager() {
  var overlay = el('div', { className: 'modal-overlay', id: 'theme-manager-overlay' });

  var header = el('div', { className: 'modal-header' },
    el('h3', { className: 'modal-title' }, '主题管理'),
  );

  var body = el('div', { className: 'modal-body' });

  var builtInTitle = el('label', { className: 'modal-label' }, '内置主题');
  body.appendChild(builtInTitle);
  body.appendChild(buildBuiltInSection());

  var extTitle = el('label', { className: 'modal-label', style: 'margin-top:16px' }, '扩展主题');
  body.appendChild(extTitle);
  body.appendChild(buildExtendedSection());

  var customTitle = el('label', { className: 'modal-label', style: 'margin-top:16px' }, '自定义主题');
  body.appendChild(customTitle);
  body.appendChild(buildCustomSection());

  body.appendChild(buildImportArea());

  var btnClose = el('button', { className: 'modal-btn modal-btn-ghost' }, '关闭');
  btnClose.addEventListener('click', closeThemeManager);

  var footer = el('div', { className: 'modal-footer' },
    btnClose,
    buildFooterButtons(),
  );

  var card = el('div', { className: 'modal-card modal-card-theme' },
    header,
    body,
    footer,
  );

  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeThemeManager(); });
  card.addEventListener('click', function (e) { e.stopPropagation(); });
  overlay.appendChild(card);

  return overlay;
}

function openThemeManager() {
  var overlay = document.getElementById('theme-manager-overlay');
  if (!overlay) return;
  currentTheme = loadTheme();
  syncPickersToVars(getCurrentVars());
  var vars = readPickersAsVars();
  applyPreviewVars(vars);
  updateHighlight();
  overlay.classList.add('open');
}

function closeThemeManager() {
  var overlay = document.getElementById('theme-manager-overlay');
  if (overlay) overlay.classList.remove('open');
}

export function initThemeManager() {
  bus.on('modal:open-theme-manager', openThemeManager);
}
