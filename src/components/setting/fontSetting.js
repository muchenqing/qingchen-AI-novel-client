import { el } from '../../utils/helper.js';
import appState from '../../core/appState.js';
import bus from '../../event/bus.js';

var STORAGE_KEY = 'qingchen-font-config';
var PRESETS_KEY = 'qingchen-layout-presets';
var MAX_PRESETS = 10;

var DEFAULT_FONT_CONFIG = {
  fontFamily: 'Noto Serif SC, serif',
  fontSize: 15,
  lineHeight: 1.8,
  letterSpacing: 0,
  marginTop: 60,
  marginLeft: 'auto',
  marginRight: 'auto',
  maxWidth: 720,
  paragraphSpacing: 16,
  firstLineIndent: true,
};

function loadFontConfig() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return Object.assign({}, DEFAULT_FONT_CONFIG, JSON.parse(raw));
  } catch (e) { /* ignore */ }
  return Object.assign({}, DEFAULT_FONT_CONFIG);
}

function saveFontConfig(cfg) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (e) { /* ignore */ }
}

function applyFontConfig(cfg) {
  var editor = document.getElementById('editor');
  if (!editor) return;

  var wrapper = editor.closest('.editor-wrapper') || editor.parentElement;
  if (wrapper) {
    wrapper.style.maxWidth = (cfg.maxWidth || 720) + 'px';
    wrapper.style.marginTop = (cfg.marginTop || 60) + 'px';
    wrapper.style.marginLeft = cfg.marginLeft || 'auto';
    wrapper.style.marginRight = cfg.marginRight || 'auto';
  }

  editor.style.fontFamily = cfg.fontFamily || DEFAULT_FONT_CONFIG.fontFamily;
  editor.style.fontSize = (cfg.fontSize || 15) + 'px';
  editor.style.lineHeight = cfg.lineHeight || 1.8;
  editor.style.letterSpacing = (cfg.letterSpacing || 0) + 'px';
}

function loadPresets() {
  try {
    var raw = localStorage.getItem(PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function savePresets(presets) {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch (e) { /* ignore */ }
}

function savePreset(name, config) {
  var presets = loadPresets();
  if (presets.length >= MAX_PRESETS) {
    return { success: false, errors: ['排版预设已达上限 (' + MAX_PRESETS + ')'] };
  }
  var preset = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name,
    config: Object.assign({}, config),
    createdAt: Date.now(),
  };
  presets.push(preset);
  savePresets(presets);
  return { success: true, preset: preset };
}

function deletePreset(presetId) {
  var presets = loadPresets();
  presets = presets.filter(function (p) { return p.id !== presetId; });
  savePresets(presets);
}

function applyPreset(presetId) {
  var presets = loadPresets();
  for (var i = 0; i < presets.length; i++) {
    if (presets[i].id === presetId) {
      var cfg = presets[i].config;
      saveFontConfig(cfg);
      applyFontConfig(cfg);
      return cfg;
    }
  }
  return null;
}

function buildFontSettingPanel() {
  var cfg = loadFontConfig();

  var fontFamilies = [
    'Noto Serif SC, serif',
    'Noto Sans SC, sans-serif',
    'Source Han Serif SC, serif',
    'Source Han Sans SC, sans-serif',
    'SimSun, serif',
    'Microsoft YaHei, sans-serif',
    'FangSong, serif',
    'KaiTi, serif',
    'system-ui, sans-serif',
  ];

  var fontSelect = el('select', { className: 'modal-input', id: 'font-family-select' });
  for (var f = 0; f < fontFamilies.length; f++) {
    var opt = el('option', { value: fontFamilies[f] }, fontFamilies[f].split(',')[0]);
    if (fontFamilies[f] === cfg.fontFamily) opt.selected = true;
    fontSelect.appendChild(opt);
  }
  fontSelect.addEventListener('change', function () {
    cfg.fontFamily = fontSelect.value;
    saveFontConfig(cfg);
    applyFontConfig(cfg);
  });

  var sizeInput = el('input', { className: 'modal-input', type: 'range', min: '12', max: '24', step: '1', value: String(cfg.fontSize) });
  var sizeLabel = el('span', { id: 'font-size-val' }, String(cfg.fontSize) + 'px');
  sizeInput.addEventListener('input', function () {
    cfg.fontSize = parseInt(sizeInput.value, 10);
    sizeLabel.textContent = cfg.fontSize + 'px';
    saveFontConfig(cfg);
    applyFontConfig(cfg);
  });

  var lhInput = el('input', { className: 'modal-input', type: 'range', min: '1.0', max: '3.0', step: '0.1', value: String(cfg.lineHeight) });
  var lhLabel = el('span', { id: 'font-lh-val' }, String(cfg.lineHeight));
  lhInput.addEventListener('input', function () {
    cfg.lineHeight = parseFloat(lhInput.value);
    lhLabel.textContent = cfg.lineHeight.toFixed(1);
    saveFontConfig(cfg);
    applyFontConfig(cfg);
  });

  var lsInput = el('input', { className: 'modal-input', type: 'range', min: '0', max: '5', step: '0.5', value: String(cfg.letterSpacing) });
  var lsLabel = el('span', { id: 'font-ls-val' }, String(cfg.letterSpacing) + 'px');
  lsInput.addEventListener('input', function () {
    cfg.letterSpacing = parseFloat(lsInput.value);
    lsLabel.textContent = cfg.letterSpacing + 'px';
    saveFontConfig(cfg);
    applyFontConfig(cfg);
  });

  var widthInput = el('input', { className: 'modal-input', type: 'range', min: '500', max: '1200', step: '10', value: String(cfg.maxWidth) });
  var widthLabel = el('span', { id: 'font-width-val' }, String(cfg.maxWidth) + 'px');
  widthInput.addEventListener('input', function () {
    cfg.maxWidth = parseInt(widthInput.value, 10);
    widthLabel.textContent = cfg.maxWidth + 'px';
    saveFontConfig(cfg);
    applyFontConfig(cfg);
  });

  var marginTopInput = el('input', { className: 'modal-input', type: 'range', min: '0', max: '200', step: '10', value: String(cfg.marginTop) });
  var marginTopLabel = el('span', { id: 'font-mt-val' }, String(cfg.marginTop) + 'px');
  marginTopInput.addEventListener('input', function () {
    cfg.marginTop = parseInt(marginTopInput.value, 10);
    marginTopLabel.textContent = cfg.marginTop + 'px';
    saveFontConfig(cfg);
    applyFontConfig(cfg);
  });

  var presetNameInput = el('input', { className: 'modal-input', type: 'text', placeholder: '预设名称', id: 'preset-name-input' });
  var btnSavePreset = el('button', { className: 'modal-btn modal-btn-secondary' }, '保存当前为预设');
  btnSavePreset.addEventListener('click', function () {
    var name = presetNameInput.value.trim();
    if (!name) {
      bus.emit('tips:show', { type: 'warning', message: '请输入预设名称' });
      return;
    }
    var result = savePreset(name, cfg);
    if (result.success) {
      presetNameInput.value = '';
      renderPresetList();
      bus.emit('tips:show', { type: 'success', message: '预设已保存' });
    } else {
      bus.emit('tips:show', { type: 'error', message: result.errors[0] });
    }
  });

  var presetList = el('div', { className: 'preset-list', id: 'layout-preset-list' });

  var btnReset = el('button', { className: 'modal-btn modal-btn-ghost' }, '恢复默认');
  btnReset.addEventListener('click', function () {
    cfg = Object.assign({}, DEFAULT_FONT_CONFIG);
    saveFontConfig(cfg);
    applyFontConfig(cfg);
    bus.emit('tips:show', { type: 'info', message: '已恢复默认排版' });
  });

  function renderPresetList() {
    presetList.innerHTML = '';
    var presets = loadPresets();
    if (presets.length === 0) {
      presetList.appendChild(el('div', { className: 'preset-empty' }, '暂无排版预设'));
      return;
    }
    for (var i = 0; i < presets.length; i++) {
      (function (p) {
        var row = el('div', { className: 'preset-item' },
          el('span', { className: 'preset-item-name' }, p.name),
          el('span', { className: 'preset-item-meta' }, p.config.fontSize + 'px / ' + p.config.lineHeight),
        );
        var btnApply = el('button', { className: 'preset-btn' }, '应用');
        btnApply.addEventListener('click', function () {
          cfg = Object.assign({}, p.config);
          saveFontConfig(cfg);
          applyFontConfig(cfg);
          bus.emit('tips:show', { type: 'success', message: '已应用预设: ' + p.name });
        });
        var btnDel = el('button', { className: 'preset-btn preset-btn-danger' }, '删除');
        btnDel.addEventListener('click', function () {
          deletePreset(p.id);
          renderPresetList();
        });
        row.appendChild(btnApply);
        row.appendChild(btnDel);
        presetList.appendChild(row);
      })(presets[i]);
    }
  }

  renderPresetList();

  return el('div', { className: 'font-setting-panel' },
    el('div', { className: 'font-setting-row' },
      el('label', { className: 'font-setting-label' }, '字体'),
      fontSelect,
    ),
    el('div', { className: 'font-setting-row' },
      el('label', { className: 'font-setting-label' }, '字号'),
      sizeInput, sizeLabel,
    ),
    el('div', { className: 'font-setting-row' },
      el('label', { className: 'font-setting-label' }, '行间距'),
      lhInput, lhLabel,
    ),
    el('div', { className: 'font-setting-row' },
      el('label', { className: 'font-setting-label' }, '字间距'),
      lsInput, lsLabel,
    ),
    el('div', { className: 'font-setting-row' },
      el('label', { className: 'font-setting-label' }, '最大宽度'),
      widthInput, widthLabel,
    ),
    el('div', { className: 'font-setting-row' },
      el('label', { className: 'font-setting-label' }, '顶部间距'),
      marginTopInput, marginTopLabel,
    ),
    el('div', { className: 'font-setting-separator' }),
    el('div', { className: 'font-setting-row' },
      presetNameInput,
      btnSavePreset,
    ),
    presetList,
    el('div', { className: 'font-setting-row' },
      btnReset,
    ),
  );
}

function initFontSetting() {
  var cfg = loadFontConfig();
  applyFontConfig(cfg);
}

export {
  buildFontSettingPanel,
  initFontSetting,
  loadFontConfig,
  saveFontConfig,
  applyFontConfig,
  DEFAULT_FONT_CONFIG,
};
