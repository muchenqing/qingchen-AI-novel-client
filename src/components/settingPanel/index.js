/**
 * 设置面板组件模块（增量升级）
 * @description 构建设置弹窗，包含AI模型管理、编辑器排版、导出配置三个标签页
 *              保持原有旧版AI设置完全兼容，新增功能通过标签页切换
 * @exports buildSettingsModal - 创建设置弹窗DOM结构
 * @exports openSettingsModal - 打开设置弹窗
 * @exports closeSettingsModal - 关闭设置弹窗
 * @exports initSettingPanel - 初始化设置面板事件监听
 */

import { el } from '../../utils/helper.js';
import { loadAiConfig, saveAiConfig } from '../../utils/storage.js';
import aiAdapter from '../../api/ai/aiAdapter.js';
import aiConfig from '../../api/ai/aiConfig.js';
import { testConnection } from '../../api/index.js';
import appState from '../../core/appState.js';
import bus from '../../event/bus.js';

var currentTab = 'ai-model';

function buildAiModelTab() {
  var providerNames = [
    { id: 'openai', label: 'OpenAI' },
    { id: 'qwen', label: '通义千问' },
    { id: 'ernie', label: '文心一言' },
    { id: 'deepseek', label: 'DeepSeek' },
    { id: 'llama', label: 'Llama 本地' },
    { id: 'custom', label: '自定义 API' },
  ];

  var providerSelect = el('select', { id: 'cfg-provider', className: 'modal-input' });
  for (var i = 0; i < providerNames.length; i++) {
    var opt = el('option', { value: providerNames[i].id }, providerNames[i].label);
    providerSelect.appendChild(opt);
  }

  var baseUrlInput = el('input', { id: 'cfg-base-url', className: 'modal-input', type: 'text', placeholder: 'API 基础地址' });
  var apiKeyInput = el('input', { id: 'cfg-api-key', className: 'modal-input', type: 'password', placeholder: 'API 密钥' });
  var modelInput = el('input', { id: 'cfg-model', className: 'modal-input', type: 'text', placeholder: '模型名称' });

  var tempLabel = el('label', { className: 'modal-label' }, 'Temperature: ', el('span', { id: 'cfg-temp-val' }, '0.8'));
  var tempSlider = el('input', { id: 'cfg-temperature', className: 'modal-input', type: 'range', min: '0', max: '2', step: '0.1', value: '0.8' });
  tempSlider.addEventListener('input', function () {
    var valEl = document.getElementById('cfg-temp-val');
    if (valEl) valEl.textContent = tempSlider.value;
  });

  var maxTokensInput = el('input', { id: 'cfg-max-tokens', className: 'modal-input', type: 'number', placeholder: '2000', value: '2000' });

  var testResult = el('div', { id: 'test-result', className: 'modal-test-result' });

  var btnTest = el('button', { className: 'modal-btn modal-btn-secondary' }, '测试连接');
  btnTest.addEventListener('click', function () { handleTestConnectionV2(testResult); });

  providerSelect.addEventListener('change', function () {
    var cfg = aiConfig.get();
    var pCfg = cfg.providers[providerSelect.value];
    if (pCfg) {
      baseUrlInput.value = pCfg.baseUrl || '';
      apiKeyInput.value = pCfg.apiKey || '';
      modelInput.value = pCfg.model || '';
    }
  });

  return el('div', { id: 'tab-ai-model', className: 'settings-tab-content' },
    el('label', { className: 'modal-label' }, '模型提供商'),
    providerSelect,
    el('label', { className: 'modal-label' }, 'API 地址'),
    baseUrlInput,
    el('label', { className: 'modal-label' }, 'API 密钥'),
    apiKeyInput,
    el('label', { className: 'modal-label' }, '模型名称'),
    modelInput,
    tempLabel,
    tempSlider,
    el('label', { className: 'modal-label' }, '最大 Token 数'),
    maxTokensInput,
    el('div', { style: 'margin-top:8px' }, btnTest),
    testResult,
  );
}

function buildEditorTab() {
  var indentCheck = el('input', { id: 'cfg-editor-indent', type: 'checkbox' });
  var autoFormatCheck = el('input', { id: 'cfg-editor-autoformat', type: 'checkbox' });
  var punctFixCheck = el('input', { id: 'cfg-editor-punctfix', type: 'checkbox' });

  return el('div', { id: 'tab-editor', className: 'settings-tab-content' },
    el('label', { className: 'modal-label' }, '排版设置'),
    el('div', { className: 'modal-checkbox-row' }, indentCheck, el('span', null, '首行缩进（2个全角空格）')),
    el('div', { className: 'modal-checkbox-row' }, autoFormatCheck, el('span', null, '自动格式化段落间距')),
    el('div', { className: 'modal-checkbox-row' }, punctFixCheck, el('span', null, '中英文标点自动修正')),
  );
}

function buildExportTab() {
  var formatSelect = el('select', { id: 'cfg-export-format', className: 'modal-input' });
  var formats = ['txt', 'md', 'epub', 'json'];
  var labels = ['纯文本 TXT', 'Markdown MD', 'EPUB 电子书', 'JSON 结构化'];
  for (var i = 0; i < formats.length; i++) {
    formatSelect.appendChild(el('option', { value: formats[i] }, labels[i]));
  }

  var tocCheck = el('input', { id: 'cfg-export-toc', type: 'checkbox', checked: 'checked' });
  var cleanCheck = el('input', { id: 'cfg-export-clean', type: 'checkbox', checked: 'checked' });

  return el('div', { id: 'tab-export', className: 'settings-tab-content' },
    el('label', { className: 'modal-label' }, '默认导出格式'),
    formatSelect,
    el('label', { className: 'modal-label' }, '导出选项'),
    el('div', { className: 'modal-checkbox-row' }, tocCheck, el('span', null, '自动生成目录')),
    el('div', { className: 'modal-checkbox-row' }, cleanCheck, el('span', null, '导出前自动清理空行')),
  );
}

function buildFeaturesTab() {
  var ctxCheck = el('input', { id: 'cfg-switch-context', type: 'checkbox', checked: 'checked' });
  var aiFeatCheck = el('input', { id: 'cfg-switch-aifeatures', type: 'checkbox', checked: 'checked' });
  var editorFeatCheck = el('input', { id: 'cfg-switch-editor', type: 'checkbox', checked: 'checked' });
  var exportFeatCheck = el('input', { id: 'cfg-switch-export', type: 'checkbox', checked: 'checked' });

  return el('div', { id: 'tab-features', className: 'settings-tab-content' },
    el('label', { className: 'modal-label' }, '功能开关'),
    el('div', { className: 'modal-checkbox-row' }, ctxCheck, el('span', null, 'AI 上下文记忆')),
    el('div', { className: 'modal-checkbox-row' }, aiFeatCheck, el('span', null, 'AI 写作专属功能')),
    el('div', { className: 'modal-checkbox-row' }, editorFeatCheck, el('span', null, '编辑器排版增强')),
    el('div', { className: 'modal-checkbox-row' }, exportFeatCheck, el('span', null, '多格式导出引擎')),
  );
}

function switchTab(tabName) {
  currentTab = tabName;
  var tabs = document.querySelectorAll('.settings-tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle('active', tabs[i].dataset.tab === tabName);
  }
  var contents = document.querySelectorAll('.settings-tab-content');
  for (var j = 0; j < contents.length; j++) {
    contents[j].style.display = contents[j].id === 'tab-' + tabName ? 'block' : 'none';
  }
}

export function buildSettingsModal() {
  var overlay = el('div', { className: 'modal-overlay', id: 'settings-overlay' });

  var tabs = el('div', { className: 'settings-tabs' });
  var tabData = [
    { key: 'ai-model', label: 'AI 模型' },
    { key: 'editor', label: '编辑器' },
    { key: 'export', label: '导出' },
    { key: 'features', label: '功能开关' },
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
    buildAiModelTab(),
    buildEditorTab(),
    buildExportTab(),
    buildFeaturesTab(),
  );

  var btnClose = el('button', { className: 'modal-btn modal-btn-ghost' }, '关闭');
  btnClose.addEventListener('click', closeSettingsModal);

  var btnSave = el('button', { className: 'modal-btn modal-btn-primary' }, '保存');
  btnSave.addEventListener('click', handleSaveAll);

  var card = el('div', { className: 'modal-card modal-card-settings' },
    el('div', { className: 'modal-header' },
      el('h3', { className: 'modal-title' }, '\u8bbe\u7f6e'),
    ),
    el('div', { className: 'modal-body' }, tabs, tabContent),
    el('div', { className: 'modal-footer' }, btnClose, btnSave),
  );

  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeSettingsModal(); });
  card.addEventListener('click', function (e) { e.stopPropagation(); });
  overlay.appendChild(card);
  return overlay;
}

export function openSettingsModal() {
  var overlay = document.getElementById('settings-overlay');
  if (!overlay) return;
  loadSettingsToUI();
  switchTab('ai-model');
  overlay.classList.add('open');
}

function closeSettingsModal() {
  var overlay = document.getElementById('settings-overlay');
  if (overlay) overlay.classList.remove('open');
}

function loadSettingsToUI() {
  var cfg = aiConfig.get();
  var providerName = cfg.currentProvider || 'openai';
  var pCfg = cfg.providers[providerName] || {};

  var providerEl = document.getElementById('cfg-provider');
  if (providerEl) providerEl.value = providerName;
  var baseUrlEl = document.getElementById('cfg-base-url');
  if (baseUrlEl) baseUrlEl.value = pCfg.baseUrl || '';
  var apiKeyEl = document.getElementById('cfg-api-key');
  if (apiKeyEl) apiKeyEl.value = pCfg.apiKey || '';
  var modelEl = document.getElementById('cfg-model');
  if (modelEl) modelEl.value = pCfg.model || '';
  var tempEl = document.getElementById('cfg-temperature');
  if (tempEl) tempEl.value = cfg.parameters.temperature || 0.8;
  var tempVal = document.getElementById('cfg-temp-val');
  if (tempVal) tempVal.textContent = cfg.parameters.temperature || 0.8;
  var maxTokensEl = document.getElementById('cfg-max-tokens');
  if (maxTokensEl) maxTokensEl.value = cfg.parameters.maxTokens || 2000;

  var eCfg = appState.getEditorConfig();
  var indentEl = document.getElementById('cfg-editor-indent');
  if (indentEl) indentEl.checked = !!eCfg.indent;
  var autoFmtEl = document.getElementById('cfg-editor-autoformat');
  if (autoFmtEl) autoFmtEl.checked = !!eCfg.autoFormat;
  var punctEl = document.getElementById('cfg-editor-punctfix');
  if (punctEl) punctEl.checked = !!eCfg.punctuationFix;

  var exCfg = appState.getExportConfig();
  var fmtEl = document.getElementById('cfg-export-format');
  if (fmtEl) fmtEl.value = exCfg.defaultFormat || 'txt';
  var tocEl = document.getElementById('cfg-export-toc');
  if (tocEl) tocEl.checked = exCfg.includeToc !== false;
  var cleanEl = document.getElementById('cfg-export-clean');
  if (cleanEl) cleanEl.checked = exCfg.autoClean !== false;

  var sw = appState.getFeatureSwitches();
  var ctxEl = document.getElementById('cfg-switch-context');
  if (ctxEl) ctxEl.checked = sw.contextMemory !== false;
  var aiEl = document.getElementById('cfg-switch-aifeatures');
  if (aiEl) aiEl.checked = sw.aiWriteFeatures !== false;
  var edEl = document.getElementById('cfg-switch-editor');
  if (edEl) edEl.checked = sw.editorEnhance !== false;
  var exEl = document.getElementById('cfg-switch-export');
  if (exEl) exEl.checked = sw.exportEngine !== false;

  var testResult = document.getElementById('test-result');
  if (testResult) { testResult.textContent = ''; testResult.className = 'modal-test-result'; }
}

function handleSaveAll() {
  var providerName = (document.getElementById('cfg-provider') || {}).value || 'openai';
  var baseUrl = (document.getElementById('cfg-base-url') || {}).value || '';
  var apiKey = (document.getElementById('cfg-api-key') || {}).value || '';
  var model = (document.getElementById('cfg-model') || {}).value || '';
  var temperature = parseFloat((document.getElementById('cfg-temperature') || {}).value) || 0.8;
  var maxTokens = parseInt((document.getElementById('cfg-max-tokens') || {}).value, 10) || 2000;

  aiConfig.setProviderConfig(providerName, { baseUrl: baseUrl, apiKey: apiKey, model: model });
  aiConfig.setCurrentProvider(providerName);
  aiConfig.setParameters({ temperature: temperature, maxTokens: maxTokens });

  saveAiConfig({ apiUrl: baseUrl, apiKey: apiKey, model: model });

  appState.setEditorConfig({
    indent: !!(document.getElementById('cfg-editor-indent') || {}).checked,
    autoFormat: !!(document.getElementById('cfg-editor-autoformat') || {}).checked,
    punctuationFix: !!(document.getElementById('cfg-editor-punctfix') || {}).checked,
  });

  appState.setExportConfig({
    defaultFormat: (document.getElementById('cfg-export-format') || {}).value || 'txt',
    includeToc: !!(document.getElementById('cfg-export-toc') || {}).checked,
    autoClean: !!(document.getElementById('cfg-export-clean') || {}).checked,
  });

  appState.setFeatureSwitches({
    contextMemory: !!(document.getElementById('cfg-switch-context') || {}).checked,
    aiWriteFeatures: !!(document.getElementById('cfg-switch-aifeatures') || {}).checked,
    editorEnhance: !!(document.getElementById('cfg-switch-editor') || {}).checked,
    exportEngine: !!(document.getElementById('cfg-switch-export') || {}).checked,
  });

  bus.emit('status:set', '\u8bbe\u7f6e\u5df2\u4fdd\u5b58');
  closeSettingsModal();
}

async function handleTestConnectionV2(resultEl) {
  if (!resultEl) return;
  var providerName = (document.getElementById('cfg-provider') || {}).value || 'openai';
  var baseUrl = (document.getElementById('cfg-base-url') || {}).value || '';
  var apiKey = (document.getElementById('cfg-api-key') || {}).value || '';
  var model = (document.getElementById('cfg-model') || {}).value || '';

  if (!apiKey && providerName !== 'llama') {
    resultEl.textContent = '\u8bf7\u586b\u5199 API \u5bc6\u94a5';
    resultEl.className = 'modal-test-result error';
    return;
  }

  resultEl.textContent = '\u6b63\u5728\u6d4b\u8bd5\u8fde\u63a5\u2026';
  resultEl.className = 'modal-test-result';

  try {
    aiConfig.setProviderConfig(providerName, { baseUrl: baseUrl, apiKey: apiKey, model: model });
    aiConfig.setCurrentProvider(providerName);
    var result = await aiAdapter.testConnection(providerName);
    resultEl.textContent = result.message + (result.latency ? ' (' + result.latency + 'ms)' : '');
    resultEl.className = result.success ? 'modal-test-result success' : 'modal-test-result error';
  } catch (err) {
    try {
      var fallback = await testConnection(baseUrl, apiKey, model);
      resultEl.textContent = fallback.message;
      resultEl.className = fallback.success ? 'modal-test-result success' : 'modal-test-result error';
    } catch (err2) {
      resultEl.textContent = '\u2717 \u8fde\u63a5\u9519\u8bef: ' + err2.message;
      resultEl.className = 'modal-test-result error';
    }
  }
}

export function initSettingPanel() {
  bus.on('modal:open-settings', openSettingsModal);
}
