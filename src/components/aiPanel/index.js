import { el } from '../../utils/helper.js';
import { aiContinue, aiOutline, aiPolish, aiWritingFeatures } from '../../api/index.js';
import appState from '../../core/appState.js';
import bus from '../../event/bus.js';
import { buildStyleLearnPanel, initStyleLearnPanel } from './styleLearnPanel.js';
import { buildPromptTemplatePanel, initPromptTemplatePanel } from './promptTemplate.js';
import { buildAiDramaTool, initAiDramaTool } from './aiDramaTool.js';

var currentAiAbortController = null;
var panelEl = null;

function renderAiResult() {
  var container = document.getElementById('ai-panel-result');
  if (!container) return;
  container.innerHTML = '';
  var result = appState.getAiCurrentResult();
  if (result) {
    container.appendChild(el('div', { className: 'ai-panel-result-content' }, result));
  }
}

function updateLoadingState(loading) {
  var loadingEl = document.getElementById('ai-panel-loading');
  var genBtn = document.getElementById('ai-panel-btn-generate');
  if (loadingEl) loadingEl.style.display = loading ? 'flex' : 'none';
  if (genBtn) genBtn.disabled = loading;
}

async function handleAiGenerate() {
  if (appState.getAiIsLoading()) return;
  var sourceArea = document.getElementById('ai-panel-source');
  var text = ((sourceArea && sourceArea.value) || '').trim();
  if (!text) {
    var editor = document.getElementById('editor');
    text = (editor && editor.innerText) || '';
  }
  if (!text) {
    bus.emit('tips:show', { type: 'warning', message: '请输入或粘贴需要AI处理的内容', duration: 3000 });
    return;
  }

  appState.setAiIsLoading(true);
  updateLoadingState(true);
  appState.setAiCurrentResult('');
  renderAiResult();

  currentAiAbortController = new AbortController();
  try {
    var fn;
    var currentAiTab = appState.getCurrentAiTab();
    if (currentAiTab === 'continue') fn = aiContinue;
    else if (currentAiTab === 'outline') fn = aiOutline;
    else fn = aiPolish;

    var result = await fn(text);
    appState.pushAiUndo(result);
    appState.setAiCurrentResult(result);
    renderAiResult();
    bus.emit('tips:show', { type: 'success', message: 'AI 生成完成', duration: 2000 });
  } catch (err) {
    var errMsg = '生成失败: ' + err.message;
    if (err.message && (err.message.indexOf('Failed to fetch') !== -1 || err.message.indexOf('NetworkError') !== -1 || err.message.indexOf('网络') !== -1)) {
      errMsg = '网络连接异常，请检查网络后重试';
      bus.emit('tips:show', { type: 'error', message: '网络连接异常，AI 功能暂时不可用', duration: 5000 });
    }
    appState.setAiCurrentResult(errMsg);
    renderAiResult();
    bus.emit('tips:show', { type: 'error', message: errMsg, duration: 4000 });
  } finally {
    currentAiAbortController = null;
    appState.setAiIsLoading(false);
    updateLoadingState(false);
  }
}

function handleAiApply() {
  var result = appState.getAiCurrentResult();
  if (!result) {
    bus.emit('tips:show', { type: 'warning', message: '没有可应用的内容', duration: 2000 });
    return;
  }
  bus.emit('editor:apply-content', result);
  bus.emit('tips:show', { type: 'success', message: '已应用到编辑器', duration: 2000 });
}

function handleAiUndo() {
  var content = appState.aiUndo();
  if (content !== null) {
    appState.setAiCurrentResult(content);
    renderAiResult();
    bus.emit('tips:show', { type: 'info', message: '已撤销', duration: 1500 });
  } else {
    bus.emit('tips:show', { type: 'info', message: '没有可撤销的内容', duration: 1500 });
  }
}

function handleAiRedo() {
  var content = appState.aiRedo();
  if (content !== null) {
    appState.setAiCurrentResult(content);
    renderAiResult();
    bus.emit('tips:show', { type: 'info', message: '已恢复', duration: 1500 });
  } else {
    bus.emit('tips:show', { type: 'info', message: '没有可恢复的内容', duration: 1500 });
  }
}

function handleAiPause() {
  if (currentAiAbortController) {
    currentAiAbortController.abort();
    currentAiAbortController = null;
  }
  appState.setAiIsLoading(false);
  updateLoadingState(false);
  bus.emit('tips:show', { type: 'info', message: 'AI 已停止', duration: 1500 });
}

async function handleWritingFeature(featureFn) {
  if (appState.getAiIsLoading()) return;
  var sourceArea = document.getElementById('ai-panel-source');
  var text = ((sourceArea && sourceArea.value) || '').trim();
  if (!text) {
    var editor = document.getElementById('editor');
    text = (editor && editor.innerText) || '';
  }
  if (!text) {
    bus.emit('tips:show', { type: 'warning', message: '请输入内容', duration: 3000 });
    return;
  }

  appState.setAiIsLoading(true);
  updateLoadingState(true);
  appState.setAiCurrentResult('');
  renderAiResult();

  currentAiAbortController = new AbortController();
  try {
    var result = await featureFn(text);
    appState.pushAiUndo(result);
    appState.setAiCurrentResult(result);
    renderAiResult();
    bus.emit('tips:show', { type: 'success', message: 'AI 生成完成', duration: 2000 });
  } catch (err) {
    var errMsg = '生成失败: ' + err.message;
    if (err.message && (err.message.indexOf('Failed to fetch') !== -1 || err.message.indexOf('NetworkError') !== -1 || err.message.indexOf('网络') !== -1)) {
      errMsg = '网络连接异常，请检查网络后重试';
      bus.emit('tips:show', { type: 'error', message: '网络连接异常，AI 功能暂时不可用', duration: 5000 });
    }
    appState.setAiCurrentResult(errMsg);
    renderAiResult();
    bus.emit('tips:show', { type: 'error', message: errMsg, duration: 4000 });
  } finally {
    currentAiAbortController = null;
    appState.setAiIsLoading(false);
    updateLoadingState(false);
  }
}

function switchAiTab(tabKey) {
  appState.setCurrentAiTab(tabKey);

  var tabs = panelEl.querySelectorAll('.ai-panel-tab');
  for (var t = 0; t < tabs.length; t++) {
    tabs[t].classList.toggle('active', tabs[t].dataset.key === tabKey);
  }

  var isSpecialTab = (tabKey === 'styleLearn' || tabKey === 'promptLib' || tabKey === 'dramaTool');
  var sourceArea = document.getElementById('ai-panel-source');
  var featureSection = document.getElementById('ai-panel-features');
  var styleLearnSection = document.getElementById('ai-panel-style-learn');
  var promptSection = document.getElementById('ai-panel-prompt-templates');
  var dramaSection = document.getElementById('ai-panel-drama-tool');
  var paramCard = document.getElementById('ai-panel-param-card');

  if (styleLearnSection) styleLearnSection.style.display = tabKey === 'styleLearn' ? 'block' : 'none';
  if (promptSection) promptSection.style.display = tabKey === 'promptLib' ? 'block' : 'none';
  if (dramaSection) dramaSection.style.display = tabKey === 'dramaTool' ? 'block' : 'none';
  if (featureSection) featureSection.style.display = isSpecialTab ? 'none' : '';
  if (sourceArea) sourceArea.style.display = isSpecialTab ? 'none' : '';
  if (paramCard) paramCard.style.display = isSpecialTab ? 'none' : '';

  appState.setAiCurrentResult('');
  renderAiResult();
}

function persistAiParams() {
  try {
    var provider = document.getElementById('ai-panel-provider');
    var tempEl = document.getElementById('ai-panel-temperature');
    var maxTokensEl = document.getElementById('ai-panel-max-tokens');
    var promptEl = document.getElementById('ai-panel-custom-prompt');

    if (provider) appState.setCurrentAiProvider(provider.value);
    var params = {};
    if (tempEl) params.temperature = parseFloat(tempEl.value) || 0.8;
    if (maxTokensEl) params.maxTokens = parseInt(maxTokensEl.value) || 2000;
    appState.setAiGlobalParams(params);

    var config = {
      provider: appState.getCurrentAiProvider(),
      params: appState.getAiGlobalParams(),
      customPrompt: promptEl ? promptEl.value : '',
    };
    localStorage.setItem('qingchen-ai-panel-config', JSON.stringify(config));
  } catch (e) { /* ignore */ }
}

function loadPersistedAiConfig() {
  try {
    var raw = localStorage.getItem('qingchen-ai-panel-config');
    if (!raw) return;
    var config = JSON.parse(raw);
    if (config.provider) {
      appState.setCurrentAiProvider(config.provider);
      var providerEl = document.getElementById('ai-panel-provider');
      if (providerEl) providerEl.value = config.provider;
    }
    if (config.params) {
      appState.setAiGlobalParams(config.params);
      var tempEl = document.getElementById('ai-panel-temperature');
      var maxTokensEl = document.getElementById('ai-panel-max-tokens');
      if (tempEl && config.params.temperature !== undefined) {
        tempEl.value = config.params.temperature;
        var tempVal = document.getElementById('ai-panel-temp-value');
        if (tempVal) tempVal.textContent = config.params.temperature;
      }
      if (maxTokensEl && config.params.maxTokens !== undefined) {
        maxTokensEl.value = config.params.maxTokens;
      }
    }
    if (config.customPrompt) {
      var promptEl = document.getElementById('ai-panel-custom-prompt');
      if (promptEl) promptEl.value = config.customPrompt;
    }
  } catch (e) { /* ignore */ }
}

export function buildAiPanel() {
  var providers = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'qwen', label: '通义千问' },
    { value: 'ernie', label: '文心一言' },
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'llama', label: 'Llama (Ollama)' },
    { value: 'custom', label: '自定义' },
  ];

  var providerOptions = providers.map(function (p) {
    return '<option value="' + p.value + '">' + p.label + '</option>';
  }).join('');

  var header = el('div', { className: 'ai-panel-header' },
    el('span', { className: 'ai-panel-title' }, '\u2726 AI 助手'),
    el('button', { className: 'ai-panel-toggle', title: '收起/展开', innerHTML: '\u25C0' }),
  );

  var tabs = el('div', { className: 'ai-panel-tabs' });
  var tabData = [
    { key: 'continue', label: '续写' },
    { key: 'outline', label: '大纲' },
    { key: 'polish', label: '润色' },
  ];
  tabData.forEach(function (tab, i) {
    var btn = el('button', {
      className: 'ai-panel-tab' + (i === 0 ? ' active' : ''),
      dataset: { key: tab.key },
    }, tab.label);
    btn.addEventListener('click', function () { switchAiTab(tab.key); });
    tabs.appendChild(btn);
  });

  var specialTabs = el('div', { className: 'ai-panel-tabs' });
  var specialTabData = [
    { key: 'styleLearn', label: '风格' },
    { key: 'promptLib', label: '提示词' },
    { key: 'dramaTool', label: '剧情' },
  ];
  specialTabData.forEach(function (tab) {
    var btn = el('button', {
      className: 'ai-panel-tab',
      dataset: { key: tab.key },
    }, tab.label);
    btn.addEventListener('click', function () { switchAiTab(tab.key); });
    specialTabs.appendChild(btn);
  });

  var paramCard = el('div', { className: 'ai-panel-card', id: 'ai-panel-param-card' },
    el('div', { className: 'ai-panel-card-header' }, '参数设置'),
    el('label', { className: 'ai-panel-label' }, '模型'),
    el('select', {
      className: 'ai-panel-select',
      id: 'ai-panel-provider',
      innerHTML: providerOptions,
    }),
    el('label', { className: 'ai-panel-label' }, '创意度'),
    el('div', { className: 'ai-panel-slider-row' },
      el('input', {
        className: 'ai-panel-slider',
        type: 'range',
        id: 'ai-panel-temperature',
        min: '0',
        max: '1.5',
        step: '0.1',
        value: '0.8',
      }),
      el('span', { className: 'ai-panel-slider-value', id: 'ai-panel-temp-value' }, '0.8'),
    ),
    el('label', { className: 'ai-panel-label' }, '最大长度'),
    el('input', {
      className: 'ai-panel-input',
      type: 'number',
      id: 'ai-panel-max-tokens',
      value: '2000',
      min: '100',
      max: '8000',
      step: '100',
    }),
    el('label', { className: 'ai-panel-label' }, '自定义指令'),
    el('textarea', {
      className: 'ai-panel-textarea',
      id: 'ai-panel-custom-prompt',
      placeholder: '可选：对AI的全局指令...',
      rows: '2',
    }),
  );

  var tempSlider = paramCard.querySelector('#ai-panel-temperature');
  if (tempSlider) {
    tempSlider.addEventListener('input', function () {
      var val = document.getElementById('ai-panel-temp-value');
      if (val) val.textContent = this.value;
      persistAiParams();
    });
  }

  var providerSelect = paramCard.querySelector('#ai-panel-provider');
  if (providerSelect) {
    providerSelect.addEventListener('change', persistAiParams);
  }
  var maxTokensInput = paramCard.querySelector('#ai-panel-max-tokens');
  if (maxTokensInput) {
    maxTokensInput.addEventListener('change', persistAiParams);
  }
  var customPromptEl = paramCard.querySelector('#ai-panel-custom-prompt');
  if (customPromptEl) {
    customPromptEl.addEventListener('input', persistAiParams);
  }

  var featureData = [
    { key: 'characterDesign', label: '人物设定', fn: aiWritingFeatures.characterDesign },
    { key: 'worldBuilding', label: '世界观', fn: aiWritingFeatures.worldBuilding },
    { key: 'conflictGenerator', label: '冲突生成', fn: aiWritingFeatures.conflictGenerator },
    { key: 'chapterSummary', label: '章节总结', fn: aiWritingFeatures.chapterSummary },
    { key: 'styleImitation', label: '文风模仿', fn: aiWritingFeatures.styleImitation },
    { key: 'dialoguePolish', label: '对话优化', fn: aiWritingFeatures.dialoguePolish },
    { key: 'expandParagraph', label: '段落扩写', fn: aiWritingFeatures.expandParagraph },
    { key: 'condenseParagraph', label: '精简缩写', fn: aiWritingFeatures.condenseParagraph },
    { key: 'generateTitle', label: '标题生成', fn: aiWritingFeatures.generateTitle },
  ];

  var featureGrid = el('div', { className: 'ai-panel-feature-grid' });
  for (var f = 0; f < featureData.length; f++) {
    (function (feat) {
      var featBtn = el('button', { className: 'ai-panel-feature-btn', title: feat.label }, feat.label);
      featBtn.addEventListener('click', function () {
        handleWritingFeature(feat.fn);
      });
      featureGrid.appendChild(featBtn);
    })(featureData[f]);
  }

  var featureSection = el('div', { className: 'ai-panel-card', id: 'ai-panel-features' },
    el('div', { className: 'ai-panel-card-header' }, '小说功能'),
    featureGrid,
  );

  var styleLearnSection = el('div', { id: 'ai-panel-style-learn' });
  styleLearnSection.style.display = 'none';

  var promptSection = el('div', { id: 'ai-panel-prompt-templates' });
  promptSection.style.display = 'none';

  var dramaSection = el('div', { id: 'ai-panel-drama-tool' });
  dramaSection.style.display = 'none';

  var sourceArea = el('textarea', {
    className: 'ai-panel-source',
    id: 'ai-panel-source',
    placeholder: '粘贴或输入内容...\n（留空使用编辑器全部内容）',
    rows: '3',
  });

  var loadingEl = el('div', { className: 'ai-panel-loading', id: 'ai-panel-loading' },
    el('div', { className: 'ai-panel-loading-spinner' }),
    el('span', null, '思考中...'),
  );
  loadingEl.style.display = 'none';

  var resultContainer = el('div', { className: 'ai-panel-result', id: 'ai-panel-result' });

  var body = el('div', { className: 'ai-panel-body' },
    tabs,
    specialTabs,
    paramCard,
    featureSection,
    styleLearnSection,
    promptSection,
    dramaSection,
    sourceArea,
    loadingEl,
    resultContainer,
  );

  var footer = el('div', { className: 'ai-panel-footer' },
    el('button', { className: 'btn btn-primary', id: 'ai-panel-btn-generate' }, '生成'),
    el('button', { className: 'btn btn-secondary', title: '停止' }, '停止'),
    el('button', { className: 'btn btn-secondary', title: '应用到编辑器' }, '应用'),
  );

  var genBtn = footer.querySelector('#ai-panel-btn-generate');
  if (genBtn) genBtn.addEventListener('click', handleAiGenerate);
  var stopBtn = footer.querySelectorAll('.btn-secondary')[0];
  if (stopBtn) stopBtn.addEventListener('click', handleAiPause);
  var applyBtn = footer.querySelectorAll('.btn-secondary')[1];
  if (applyBtn) applyBtn.addEventListener('click', handleAiApply);

  panelEl = el('aside', { className: 'ai-panel', id: 'ai-panel' });
  panelEl.appendChild(header);
  panelEl.appendChild(body);
  panelEl.appendChild(footer);

  var toggleBtn = header.querySelector('.ai-panel-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      panelEl.classList.toggle('collapsed');
      var icon = panelEl.classList.contains('collapsed') ? '\u25B6' : '\u25C0';
      toggleBtn.innerHTML = icon;
    });
  }

  var undoRedoBar = el('div', { className: 'ai-panel-tabs', style: 'margin-top: 4px;' },
    el('button', { className: 'ai-panel-tab' }, '撤销'),
    el('button', { className: 'ai-panel-tab' }, '恢复'),
    el('button', { className: 'ai-panel-tab' }, '复制'),
  );
  var redoBtns = undoRedoBar.querySelectorAll('.ai-panel-tab');
  redoBtns[0].addEventListener('click', handleAiUndo);
  redoBtns[1].addEventListener('click', handleAiRedo);
  redoBtns[2].addEventListener('click', function () {
    var result = appState.getAiCurrentResult();
    if (result) {
      navigator.clipboard.writeText(result);
      bus.emit('tips:show', { type: 'success', message: '已复制到剪贴板', duration: 2000 });
    }
  });
  body.appendChild(undoRedoBar);

  return panelEl;
}

export function initAiPanel() {
  initStyleLearnPanel();
  initPromptTemplatePanel();
  initAiDramaTool();

  loadPersistedAiConfig();

  var editor = document.getElementById('editor');
  var sourceArea = document.getElementById('ai-panel-source');
  if (sourceArea && editor) {
    sourceArea.value = '';
  }
}
