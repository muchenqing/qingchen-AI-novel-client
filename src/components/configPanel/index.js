import { el } from '../../utils/helper.js';
import {
  getConfig,
  setConfigValues,
  validateCurrentConfig,
} from '../../config/configManager.js';
import { exportToFile, importFromFile, resetToDefaults } from '../../config/importExport.js';
import { showConfirmDialog } from '../common/confirmDialog.js';
import appState from '../../core/appState.js';
import bus from '../../event/bus.js';

var currentTab = 'general';

function buildGeneralTab() {
  var indentCheck = el('input', { id: 'cp-editor-indent', type: 'checkbox' });
  var autoFormatCheck = el('input', { id: 'cp-editor-autoformat', type: 'checkbox' });
  var punctFixCheck = el('input', { id: 'cp-editor-punctfix', type: 'checkbox' });
  var fontSizeInput = el('input', { id: 'cp-editor-fontsize', className: 'modal-input', type: 'number', min: '12', max: '32', step: '1' });
  var lineHeightInput = el('input', { id: 'cp-editor-lineheight', className: 'modal-input', type: 'number', min: '1.0', max: '3.0', step: '0.1' });
  var autoSaveInput = el('input', { id: 'cp-editor-autosave', className: 'modal-input', type: 'number', min: '1000', max: '60000', step: '500' });
  var chunkSizeInput = el('input', { id: 'cp-editor-chunksize', className: 'modal-input', type: 'number', min: '1000', max: '20000', step: '500' });
  var debounceInput = el('input', { id: 'cp-editor-debounce', className: 'modal-input', type: 'number', min: '50', max: '2000', step: '50' });

  return el('div', { id: 'tab-general', className: 'settings-tab-content' },
    el('label', { className: 'modal-label' }, '排版设置'),
    el('div', { className: 'modal-checkbox-row' }, indentCheck, el('span', null, '首行缩进（2个全角空格）')),
    el('div', { className: 'modal-checkbox-row' }, autoFormatCheck, el('span', null, '自动格式化段落间距')),
    el('div', { className: 'modal-checkbox-row' }, punctFixCheck, el('span', null, '中英文标点自动修正')),
    el('label', { className: 'modal-label' }, '字体大小 (px)'),
    fontSizeInput,
    el('label', { className: 'modal-label' }, '行高'),
    lineHeightInput,
    el('label', { className: 'modal-label' }, '自动保存间隔 (ms)'),
    autoSaveInput,
    el('label', { className: 'modal-label' }, '分块大小 (字)'),
    chunkSizeInput,
    el('label', { className: 'modal-label' }, '防抖延迟 (ms)'),
    debounceInput,
  );
}

function buildAiTab() {
  var providerNames = [
    { id: 'openai', label: 'OpenAI' },
    { id: 'qwen', label: '\u901a\u4e49\u5343\u95ee' },
    { id: 'ernie', label: '\u6587\u5fc3\u4e00\u8a00' },
    { id: 'deepseek', label: 'DeepSeek' },
    { id: 'llama', label: 'Llama \u672c\u5730' },
    { id: 'custom', label: '\u81ea\u5b9a\u4e49 API' },
  ];

  var providerSelect = el('select', { id: 'cp-ai-provider', className: 'modal-input' });
  for (var i = 0; i < providerNames.length; i++) {
    providerSelect.appendChild(el('option', { value: providerNames[i].id }, providerNames[i].label));
  }

  var baseUrlInput = el('input', { id: 'cp-ai-baseurl', className: 'modal-input', type: 'text', placeholder: 'API \u57fa\u7840\u5730\u5740' });
  var apiKeyInput = el('input', { id: 'cp-ai-apikey', className: 'modal-input', type: 'password', placeholder: 'API \u5bc6\u94a5' });
  var modelInput = el('input', { id: 'cp-ai-model', className: 'modal-input', type: 'text', placeholder: '\u6a21\u578b\u540d\u79f0' });

  var tempValEl = el('span', { id: 'cp-ai-temp-val' });
  var tempSlider = el('input', { id: 'cp-ai-temperature', className: 'modal-input', type: 'range', min: '0', max: '2', step: '0.1' });
  tempSlider.addEventListener('input', function () {
    tempValEl.textContent = tempSlider.value;
  });

  var topPInput = el('input', { id: 'cp-ai-topp', className: 'modal-input', type: 'number', min: '0', max: '1', step: '0.05', placeholder: '\u7559\u7a7a\u9ed8\u8ba4' });
  var maxTokensInput = el('input', { id: 'cp-ai-maxtokens', className: 'modal-input', type: 'number', min: '1', max: '128000', step: '100' });
  var timeoutInput = el('input', { id: 'cp-ai-timeout', className: 'modal-input', type: 'number', min: '5000', max: '300000', step: '1000' });

  providerSelect.addEventListener('change', function () {
    var config = getConfig();
    var pCfg = config.ai && config.ai.providers && config.ai.providers[providerSelect.value];
    if (pCfg) {
      baseUrlInput.value = pCfg.baseUrl || '';
      apiKeyInput.value = pCfg.apiKey || '';
      modelInput.value = pCfg.model || '';
    }
  });

  return el('div', { id: 'tab-ai', className: 'settings-tab-content' },
    el('label', { className: 'modal-label' }, '\u6a21\u578b\u63d0\u4f9b\u5546'),
    providerSelect,
    el('label', { className: 'modal-label' }, 'API \u5730\u5740'),
    baseUrlInput,
    el('label', { className: 'modal-label' }, 'API \u5bc6\u94a5'),
    apiKeyInput,
    el('label', { className: 'modal-label' }, '\u6a21\u578b\u540d\u79f0'),
    modelInput,
    el('label', { className: 'modal-label' }, 'Temperature: ', tempValEl),
    tempSlider,
    el('label', { className: 'modal-label' }, 'Top P'),
    topPInput,
    el('label', { className: 'modal-label' }, '\u6700\u5927 Token \u6570'),
    maxTokensInput,
    el('label', { className: 'modal-label' }, '\u8d85\u65f6\u65f6\u95f4 (ms)'),
    timeoutInput,
  );
}

function buildExportTab() {
  var formatSelect = el('select', { id: 'cp-export-format', className: 'modal-input' });
  var formats = ['txt', 'md', 'epub', 'json'];
  var labels = '\u7eaf\u6587\u672c TXT|Markdown MD|EPUB \u7535\u5b50\u4e66|JSON \u7ed3\u6784\u5316'.split('|');
  for (var i = 0; i < formats.length; i++) {
    formatSelect.appendChild(el('option', { value: formats[i] }, labels[i]));
  }

  var tocCheck = el('input', { id: 'cp-export-toc', type: 'checkbox' });
  var cleanCheck = el('input', { id: 'cp-export-clean', type: 'checkbox' });

  return el('div', { id: 'tab-export', className: 'settings-tab-content' },
    el('label', { className: 'modal-label' }, '\u9ed8\u8ba4\u5bfc\u51fa\u683c\u5f0f'),
    formatSelect,
    el('label', { className: 'modal-label' }, '\u5bfc\u51fa\u9009\u9879'),
    el('div', { className: 'modal-checkbox-row' }, tocCheck, el('span', null, '\u81ea\u52a8\u751f\u6210\u76ee\u5f55')),
    el('div', { className: 'modal-checkbox-row' }, cleanCheck, el('span', null, '\u5bfc\u51fa\u524d\u81ea\u52a8\u6e05\u7406\u7a7a\u884c')),
  );
}

function buildFeaturesTab() {
  var ctxCheck = el('input', { id: 'cp-feature-context', type: 'checkbox' });
  var aiFeatCheck = el('input', { id: 'cp-feature-aiwrite', type: 'checkbox' });
  var editorFeatCheck = el('input', { id: 'cp-feature-editor', type: 'checkbox' });
  var exportFeatCheck = el('input', { id: 'cp-feature-export', type: 'checkbox' });
  var networkCheck = el('input', { id: 'cp-feature-network', type: 'checkbox' });
  var autoRecoverCheck = el('input', { id: 'cp-feature-recover', type: 'checkbox' });

  return el('div', { id: 'tab-features', className: 'settings-tab-content' },
    el('label', { className: 'modal-label' }, '\u529f\u80fd\u5f00\u5173'),
    el('div', { className: 'modal-checkbox-row' }, ctxCheck, el('span', null, 'AI \u4e0a\u4e0b\u6587\u8bb0\u5fc6')),
    el('div', { className: 'modal-checkbox-row' }, aiFeatCheck, el('span', null, 'AI \u5199\u4f5c\u4e13\u5c5e\u529f\u80fd')),
    el('div', { className: 'modal-checkbox-row' }, editorFeatCheck, el('span', null, '\u7f16\u8f91\u5668\u6392\u7248\u589e\u5f3a')),
    el('div', { className: 'modal-checkbox-row' }, exportFeatCheck, el('span', null, '\u591a\u683c\u5f0f\u5bfc\u51fa\u5f15\u64ce')),
    el('div', { className: 'modal-checkbox-row' }, networkCheck, el('span', null, '\u7f51\u7edc\u72b6\u6001\u68c0\u6d4b')),
    el('div', { className: 'modal-checkbox-row' }, autoRecoverCheck, el('span', null, '\u81ea\u52a8\u6062\u590d')),
  );
}

function buildAdvancedTab() {
  var errEl = el('div', { id: 'cp-validation-errors', className: 'modal-test-result', style: 'display:none' });

  var btnExport = el('button', { className: 'modal-btn modal-btn-secondary' }, '\u5bfc\u51fa\u914d\u7f6e');
  btnExport.addEventListener('click', function () { exportToFile(); });

  var btnImport = el('button', { className: 'modal-btn modal-btn-secondary' }, '\u5bfc\u5165\u914d\u7f6e');
  btnImport.addEventListener('click', async function () {
    var result = await importFromFile();
    if (result.success) {
      closeConfigPanel();
      loadAllToUI();
    }
  });

  var rememberSizeCheck = el('input', { id: 'cp-window-remembersize', type: 'checkbox' });
  var rememberPosCheck = el('input', { id: 'cp-window-rememberpos', type: 'checkbox' });
  var rememberDocCheck = el('input', { id: 'cp-window-rememberdoc', type: 'checkbox' });

  return el('div', { id: 'tab-advanced', className: 'settings-tab-content' },
    el('label', { className: 'modal-label' }, '\u7a97\u53e3\u8bbe\u7f6e'),
    el('div', { className: 'modal-checkbox-row' }, rememberSizeCheck, el('span', null, '\u8bb0\u5fc6\u7a97\u53e3\u5927\u5c0f')),
    el('div', { className: 'modal-checkbox-row' }, rememberPosCheck, el('span', null, '\u8bb0\u5fc6\u7a97\u53e3\u4f4d\u7f6e')),
    el('div', { className: 'modal-checkbox-row' }, rememberDocCheck, el('span', null, '\u8bb0\u5fc6\u4e0a\u6b21\u6253\u5f00\u7684\u4e66\u7a3f')),
    el('label', { className: 'modal-label' }, '\u914d\u7f6e\u7ba1\u7406'),
    el('div', { style: 'display:flex;gap:8px;margin-top:4px' }, btnExport, btnImport),
    errEl,
  );
}

function switchTab(tabName) {
  currentTab = tabName;
  var tabs = document.querySelectorAll('#config-panel-overlay .settings-tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle('active', tabs[i].dataset.tab === tabName);
  }
  var contents = document.querySelectorAll('#config-panel-overlay .settings-tab-content');
  for (var j = 0; j < contents.length; j++) {
    contents[j].style.display = contents[j].id === 'tab-' + tabName ? 'block' : 'none';
  }
}

function getVal(id) {
  var el = document.getElementById(id);
  return el ? el.value : '';
}

function getChecked(id) {
  var el = document.getElementById(id);
  return el ? el.checked : false;
}

function setVal(id, value) {
  var elem = document.getElementById(id);
  if (elem) elem.value = value;
}

function setChecked(id, value) {
  var elem = document.getElementById(id);
  if (elem) elem.checked = !!value;
}

function loadAllToUI() {
  var config = getConfig();

  setChecked('cp-editor-indent', config.editor && config.editor.indent);
  setChecked('cp-editor-autoformat', config.editor && config.editor.autoFormat);
  setChecked('cp-editor-punctfix', config.editor && config.editor.punctuationFix);
  setVal('cp-editor-fontsize', config.editor ? config.editor.fontSize : 15);
  setVal('cp-editor-lineheight', config.editor ? config.editor.lineHeight : 1.8);
  setVal('cp-editor-autosave', config.editor ? config.editor.autoSaveInterval : 5000);
  setVal('cp-editor-chunksize', config.editor ? config.editor.chunkSize : 5000);
  setVal('cp-editor-debounce', config.editor ? config.editor.debounceDelay : 300);

  var providerName = (config.ai && config.ai.currentProvider) || 'openai';
  var pCfg = (config.ai && config.ai.providers && config.ai.providers[providerName]) || {};
  setVal('cp-ai-provider', providerName);
  setVal('cp-ai-baseurl', pCfg.baseUrl || '');
  setVal('cp-ai-apikey', pCfg.apiKey || '');
  setVal('cp-ai-model', pCfg.model || '');
  var temp = config.ai && config.ai.parameters ? config.ai.parameters.temperature : 0.8;
  setVal('cp-ai-temperature', temp);
  var tempValEl = document.getElementById('cp-ai-temp-val');
  if (tempValEl) tempValEl.textContent = temp;
  var topP = config.ai && config.ai.parameters ? config.ai.parameters.topP : '';
  setVal('cp-ai-topp', topP !== null && topP !== undefined ? topP : '');
  setVal('cp-ai-maxtokens', config.ai && config.ai.parameters ? config.ai.parameters.maxTokens : 2000);
  setVal('cp-ai-timeout', config.ai && config.ai.parameters ? config.ai.parameters.timeout : 60000);

  setVal('cp-export-format', config.export ? config.export.defaultFormat : 'txt');
  setChecked('cp-export-toc', config.export ? config.export.includeToc : true);
  setChecked('cp-export-clean', config.export ? config.export.autoClean : true);

  var feat = config.features || {};
  setChecked('cp-feature-context', feat.contextMemory !== false);
  setChecked('cp-feature-aiwrite', feat.aiWriteFeatures !== false);
  setChecked('cp-feature-editor', feat.editorEnhance !== false);
  setChecked('cp-feature-export', feat.exportEngine !== false);
  setChecked('cp-feature-network', feat.networkCheck !== false);
  setChecked('cp-feature-recover', feat.autoRecover !== false);

  var win = config.window || {};
  setChecked('cp-window-remembersize', win.rememberSize !== false);
  setChecked('cp-window-rememberpos', win.rememberPosition !== false);
  setChecked('cp-window-rememberdoc', win.rememberLastDocument !== false);

  hideErrors();
}

function gatherValues() {
  var providerName = getVal('cp-ai-provider');
  var updates = {
    editor: {
      indent: getChecked('cp-editor-indent'),
      autoFormat: getChecked('cp-editor-autoformat'),
      punctuationFix: getChecked('cp-editor-punctfix'),
      fontSize: parseFloat(getVal('cp-editor-fontsize')) || 15,
      lineHeight: parseFloat(getVal('cp-editor-lineheight')) || 1.8,
      autoSaveInterval: parseInt(getVal('cp-editor-autosave'), 10) || 5000,
      chunkSize: parseInt(getVal('cp-editor-chunksize'), 10) || 5000,
      debounceDelay: parseInt(getVal('cp-editor-debounce'), 10) || 300,
    },
    ai: {
      currentProvider: providerName,
      providers: {},
      parameters: {
        temperature: parseFloat(getVal('cp-ai-temperature')) || 0.8,
        topP: getVal('cp-ai-topp') !== '' ? parseFloat(getVal('cp-ai-topp')) : null,
        maxTokens: parseInt(getVal('cp-ai-maxtokens'), 10) || 2000,
        timeout: parseInt(getVal('cp-ai-timeout'), 10) || 60000,
      },
    },
    export: {
      defaultFormat: getVal('cp-export-format'),
      includeToc: getChecked('cp-export-toc'),
      autoClean: getChecked('cp-export-clean'),
    },
    features: {
      contextMemory: getChecked('cp-feature-context'),
      aiWriteFeatures: getChecked('cp-feature-aiwrite'),
      editorEnhance: getChecked('cp-feature-editor'),
      exportEngine: getChecked('cp-feature-export'),
      networkCheck: getChecked('cp-feature-network'),
      autoRecover: getChecked('cp-feature-recover'),
    },
    window: {
      rememberSize: getChecked('cp-window-remembersize'),
      rememberPosition: getChecked('cp-window-rememberpos'),
      rememberLastDocument: getChecked('cp-window-rememberdoc'),
    },
  };

  var config = getConfig();
  var oldProviders = (config.ai && config.ai.providers) || {};
  var pKeys = Object.keys(oldProviders);
  for (var i = 0; i < pKeys.length; i++) {
    updates.ai.providers[pKeys[i]] = Object.assign({}, oldProviders[pKeys[i]]);
  }

  updates.ai.providers[providerName] = Object.assign({}, updates.ai.providers[providerName] || {}, {
    baseUrl: getVal('cp-ai-baseurl'),
    apiKey: getVal('cp-ai-apikey'),
    model: getVal('cp-ai-model'),
  });

  return updates;
}

function showErrors(errors) {
  var errEl = document.getElementById('cp-validation-errors');
  if (!errEl) return;
  if (!errors || errors.length === 0) {
    errEl.style.display = 'none';
    return;
  }
  errEl.style.display = 'block';
  errEl.className = 'modal-test-result error';
  errEl.textContent = errors.join('; ');
}

function hideErrors() {
  var errEl = document.getElementById('cp-validation-errors');
  if (errEl) {
    errEl.style.display = 'none';
    errEl.className = 'modal-test-result';
    errEl.textContent = '';
  }
}

function applyToAppState(config) {
  appState.setEditorConfig({
    indent: config.editor.indent,
    autoFormat: config.editor.autoFormat,
    punctuationFix: config.editor.punctuationFix,
  });

  appState.setExportConfig({
    defaultFormat: config.export.defaultFormat,
    includeToc: config.export.includeToc,
    autoClean: config.export.autoClean,
  });

  appState.setFeatureSwitches({
    contextMemory: config.features.contextMemory,
    aiWriteFeatures: config.features.aiWriteFeatures,
    editorEnhance: config.features.editorEnhance,
    exportEngine: config.features.exportEngine,
  });

  appState.setCurrentAiProvider(config.ai.currentProvider);

  if (config.theme && config.theme.current) {
    appState.setCurrentTheme(config.theme.current);
  }

  if (config.shortcuts) {
    appState.setShortcuts(config.shortcuts);
  }
}

function handleSave() {
  var updates = gatherValues();
  setConfigValues(updates);

  var errors = validateCurrentConfig();
  if (errors.length > 0) {
    showErrors(errors);
    return;
  }

  var config = getConfig();
  applyToAppState(config);
  bus.emit('status:set', '\u914d\u7f6e\u5df2\u4fdd\u5b58');
  bus.emit('config:saved', config);
  closeConfigPanel();
}

function handleReset() {
  showConfirmDialog('\u786e\u5b9a\u8981\u5c06\u6240\u6709\u914d\u7f6e\u91cd\u7f6e\u4e3a\u9ed8\u8ba4\u503c\u5417\uff1f\u6b64\u64cd\u4f5c\u4e0d\u53ef\u64a4\u9500\u3002', function () {
    var config = resetToDefaults();
    applyToAppState(config);
    loadAllToUI();
    bus.emit('status:set', '\u914d\u7f6e\u5df2\u91cd\u7f6e');
  });
}

function openConfigPanel() {
  var overlay = document.getElementById('config-panel-overlay');
  if (!overlay) return;
  loadAllToUI();
  switchTab('general');
  overlay.classList.add('open');
}

function closeConfigPanel() {
  var overlay = document.getElementById('config-panel-overlay');
  if (overlay) overlay.classList.remove('open');
}

export function buildConfigPanel() {
  var overlay = el('div', { className: 'modal-overlay', id: 'config-panel-overlay' });

  var tabs = el('div', { className: 'settings-tabs' });
  var tabData = [
    { key: 'general', label: '\u901a\u7528' },
    { key: 'ai', label: 'AI \u6a21\u578b' },
    { key: 'export', label: '\u5bfc\u51fa' },
    { key: 'features', label: '\u529f\u80fd' },
    { key: 'advanced', label: '\u9ad8\u7ea7' },
  ];
  for (var i = 0; i < tabData.length; i++) {
    var tab = el('button', {
      className: 'settings-tab' + (i === 0 ? ' active' : ''),
      dataset: { tab: tabData[i].key },
    }, tabData[i].label);
    tab.addEventListener('click', function () { switchTab(this.dataset.tab); });
    tabs.appendChild(tab);
  }

  var tabContent = el('div', { className: 'settings-tab-body' },
    buildGeneralTab(),
    buildAiTab(),
    buildExportTab(),
    buildFeaturesTab(),
    buildAdvancedTab(),
  );

  var btnClose = el('button', { className: 'modal-btn modal-btn-ghost' }, '\u5173\u95ed');
  btnClose.addEventListener('click', closeConfigPanel);

  var btnReset = el('button', { className: 'modal-btn modal-btn-ghost' }, '\u91cd\u7f6e');
  btnReset.addEventListener('click', handleReset);

  var btnSave = el('button', { className: 'modal-btn modal-btn-primary' }, '\u4fdd\u5b58');
  btnSave.addEventListener('click', handleSave);

  var card = el('div', { className: 'modal-card modal-card-settings' },
    el('div', { className: 'modal-header' },
      el('h3', { className: 'modal-title' }, '\u7edf\u4e00\u914d\u7f6e'),
    ),
    el('div', { className: 'modal-body' }, tabs, tabContent),
    el('div', { className: 'modal-footer' }, btnClose, btnReset, btnSave),
  );

  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeConfigPanel(); });
  card.addEventListener('click', function (e) { e.stopPropagation(); });
  overlay.appendChild(card);
  return overlay;
}

export function initConfigPanel() {
  bus.on('modal:open-config', openConfigPanel);
}
