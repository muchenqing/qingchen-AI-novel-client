/**
 * AI 设置弹窗组件
 * @description 管理 AI 模型提供商、API 地址、密钥、模型参数
 */

import { el } from '../utils/helper.js';
import aiConfig from '../api/ai/aiConfig.js';
import aiAdapter from '../api/ai/aiAdapter.js';
import appState from '../core/appState.js';

var overlayEl = null;

var PROVIDERS = [
  { id: 'openai', label: 'OpenAI (GPT-4o)' },
  { id: 'qwen', label: '通义千问' },
  { id: 'ernie', label: '文心一言' },
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'llama', label: 'Llama (本地 Ollama)' },
  { id: 'custom', label: '自定义 API' },
];

function buildModal() {
  overlayEl = el('div', { className: 'modal-overlay', id: 'ai-settings-overlay' });

  /* 提供商选择 */
  var providerOptions = '';
  for (var i = 0; i < PROVIDERS.length; i++) {
    providerOptions += '<option value="' + PROVIDERS[i].id + '">' + PROVIDERS[i].label + '</option>';
  }

  var providerSelect = el('select', { className: 'input', id: 'ais-provider', innerHTML: providerOptions });

  var baseUrlInput = el('input', { className: 'input', id: 'ais-base-url', type: 'text', placeholder: 'API 基础地址' });
  var apiKeyInput = el('input', { className: 'input', id: 'ais-api-key', type: 'password', placeholder: 'API 密钥' });
  var modelInput = el('input', { className: 'input', id: 'ais-model', type: 'text', placeholder: '模型名称' });

  var tempLabel = el('label', { className: 'settings-label' },
    '创意度: ', el('span', { id: 'ais-temp-val' }, '0.8'),
  );
  var tempSlider = el('input', {
    className: 'input',
    id: 'ais-temperature',
    type: 'range',
    min: '0',
    max: '2',
    step: '0.1',
    value: '0.8',
  });

  tempSlider.addEventListener('input', function () {
    var valEl = document.getElementById('ais-temp-val');
    if (valEl) valEl.textContent = tempSlider.value;
  });

  var maxTokensInput = el('input', {
    className: 'input',
    id: 'ais-max-tokens',
    type: 'number',
    placeholder: '2000',
    value: '2000',
    min: '100',
    max: '8000',
    step: '100',
  });

  providerSelect.addEventListener('change', function () {
    var cfg = aiConfig.get();
    var pCfg = cfg.providers[providerSelect.value];
    if (pCfg) {
      baseUrlInput.value = pCfg.baseUrl || '';
      modelInput.value = pCfg.model || '';
    }
  });

  var testResult = el('div', { className: 'settings-test-result', id: 'ais-test-result' });

  var btnTest = el('button', { className: 'btn btn-secondary', id: 'ais-test-btn' }, '测试连接');
  btnTest.addEventListener('click', handleTestConnection);

  /* 设置标签页 */
  var tabBar = el('div', { className: 'settings-tab-bar' },
    el('button', { className: 'settings-tab active', id: 'ais-tab-ai', dataset: { target: 'ais-section-ai' } }, 'AI 模型'),
    el('button', { className: 'settings-tab', id: 'ais-tab-editor', dataset: { target: 'ais-section-editor' } }, '编辑器'),
  );

  tabBar.addEventListener('click', function (e) {
    if (!e.target.classList.contains('settings-tab')) return;
    var target = e.target.dataset.target;
    tabBar.querySelectorAll('.settings-tab').forEach(function (t) { t.classList.remove('active'); });
    e.target.classList.add('active');
    var sections = card.querySelectorAll('.settings-section');
    for (var s = 0; s < sections.length; s++) {
      sections[s].style.display = sections[s].id === target ? 'block' : 'none';
    }
  });

  var aiSection = el('div', { className: 'settings-section', id: 'ais-section-ai' },
    el('label', { className: 'settings-label' }, '模型提供商'),
    providerSelect,
    el('label', { className: 'settings-label' }, 'API 地址'),
    baseUrlInput,
    el('label', { className: 'settings-label' }, 'API 密钥'),
    apiKeyInput,
    el('label', { className: 'settings-label' }, '模型名称'),
    modelInput,
    tempLabel,
    tempSlider,
    el('label', { className: 'settings-label' }, '最大 Token 数'),
    maxTokensInput,
    el('div', { style: 'margin-top: 8px; display: flex; gap: 8px; align-items: center;' },
      btnTest,
      testResult,
    ),
  );

  var indentCheck = el('input', { id: 'ais-indent', type: 'checkbox' });
  var indentLabel = el('label', { className: 'settings-check-row' },
    indentCheck,
    el('span', null, '首行缩进（2个全角空格）'),
  );

  var editorSection = el('div', { className: 'settings-section', id: 'ais-section-editor', style: 'display: none;' },
    el('div', { className: 'settings-label' }, '排版设置'),
    indentLabel,
  );

  var btnClose = el('button', { className: 'btn btn-ghost' }, '取消');
  btnClose.addEventListener('click', closeModal);

  var btnSave = el('button', { className: 'btn btn-primary' }, '保存设置');
  btnSave.addEventListener('click', handleSave);

  var card = el('div', { className: 'modal-card', style: 'max-width: 520px; min-width: 420px;' },
    el('div', { className: 'modal-title', style: 'display: flex; align-items: center; gap: 8px;' },
      '\u2699 AI 设置',
    ),
    tabBar,
    aiSection,
    editorSection,
    el('div', { className: 'modal-footer' }, btnClose, btnSave),
  );

  overlayEl.appendChild(card);
  overlayEl.addEventListener('click', function (e) {
    if (e.target === overlayEl) closeModal();
  });

  return overlayEl;
}

function loadSettingsToUI() {
  var cfg = aiConfig.get();
  var providerName = cfg.currentProvider || 'openai';
  var pCfg = cfg.providers[providerName] || {};

  var providerEl = document.getElementById('ais-provider');
  if (providerEl) providerEl.value = providerName;

  var baseUrlEl = document.getElementById('ais-base-url');
  if (baseUrlEl) baseUrlEl.value = pCfg.baseUrl || '';

  var apiKeyEl = document.getElementById('ais-api-key');
  if (apiKeyEl) apiKeyEl.value = pCfg.apiKey || '';

  var modelEl = document.getElementById('ais-model');
  if (modelEl) modelEl.value = pCfg.model || '';

  var tempEl = document.getElementById('ais-temperature');
  var tempVal = document.getElementById('ais-temp-val');
  if (tempEl) {
    tempEl.value = cfg.parameters.temperature || 0.8;
    if (tempVal) tempVal.textContent = cfg.parameters.temperature || 0.8;
  }

  var maxTokensEl = document.getElementById('ais-max-tokens');
  if (maxTokensEl) maxTokensEl.value = cfg.parameters.maxTokens || 2000;

  var eCfg = appState.getEditorConfig();
  var indentEl = document.getElementById('ais-indent');
  if (indentEl) indentEl.checked = !!eCfg.indent;

  var testResult = document.getElementById('ais-test-result');
  if (testResult) { testResult.textContent = ''; testResult.className = 'settings-test-result'; }

  /* 重置标签页 */
  var tabBar = document.querySelector('#ai-settings-overlay .settings-tab-bar');
  if (tabBar) {
    var tabs = tabBar.querySelectorAll('.settings-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', i === 0);
    }
  }
  var sections = document.querySelectorAll('#ai-settings-overlay .settings-section');
  for (var j = 0; j < sections.length; j++) {
    sections[j].style.display = j === 0 ? 'block' : 'none';
  }
}

export function openSettingsModal() {
  if (!overlayEl) return;
  loadSettingsToUI();
  overlayEl.classList.add('open');
}

function closeModal() {
  if (overlayEl) overlayEl.classList.remove('open');
}

function handleSave() {
  var providerName = document.getElementById('ais-provider').value || 'openai';
  var baseUrl = document.getElementById('ais-base-url').value || '';
  var apiKey = document.getElementById('ais-api-key').value || '';
  var model = document.getElementById('ais-model').value || '';
  var temperature = parseFloat(document.getElementById('ais-temperature').value) || 0.8;
  var maxTokens = parseInt(document.getElementById('ais-max-tokens').value, 10) || 2000;

  aiConfig.setProviderConfig(providerName, { baseUrl: baseUrl, apiKey: apiKey, model: model });
  aiConfig.setCurrentProvider(providerName);
  aiConfig.setParameters({ temperature: temperature, maxTokens: maxTokens });

  appState.setCurrentAiProvider(providerName);
  appState.setAiGlobalParams({ temperature: temperature, maxTokens: maxTokens });
  appState.setEditorConfig({
    indent: !!document.getElementById('ais-indent').checked,
  });

  closeModal();
  showToast('success', 'AI 设置已保存');
}

async function handleTestConnection() {
  var resultEl = document.getElementById('ais-test-result');
  if (!resultEl) return;

  var providerName = document.getElementById('ais-provider').value || 'openai';
  var baseUrl = document.getElementById('ais-base-url').value || '';
  var apiKey = document.getElementById('ais-api-key').value || '';
  var model = document.getElementById('ais-model').value || '';

  if (!apiKey && providerName !== 'llama') {
    resultEl.textContent = '请填写 API 密钥';
    resultEl.className = 'settings-test-result error';
    return;
  }

  resultEl.textContent = '测试中...';
  resultEl.className = 'settings-test-result';

  try {
    aiConfig.setProviderConfig(providerName, { baseUrl: baseUrl, apiKey: apiKey, model: model });
    aiConfig.setCurrentProvider(providerName);
    var result = await aiAdapter.testConnection(providerName);
    resultEl.textContent = result.message + (result.latency ? ' (' + result.latency + 'ms)' : '');
    resultEl.className = result.success ? 'settings-test-result success' : 'settings-test-result error';
  } catch (err) {
    resultEl.textContent = '连接错误: ' + (err.message || '未知错误');
    resultEl.className = 'settings-test-result error';
  }
}

function showToast(type, message) {
  var container = document.querySelector('.toast-container');
  if (!container) {
    container = el('div', { className: 'toast-container' });
    document.body.appendChild(container);
  }
  var toast = el('div', { className: 'toast toast-' + type }, message);
  container.appendChild(toast);
  setTimeout(function () {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 2500);
}

export function buildAiSettingsModal() {
  var modal = buildModal();
  document.body.appendChild(modal);
  return modal;
}
