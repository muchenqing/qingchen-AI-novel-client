var STORAGE_KEYS = {
  manuscripts: 'qingchen-manuscripts',
  theme: 'qingchen-theme',
  aiConfig: 'qingchen-ai-config',
};

var THEMES = ['mint', 'paper', 'fog', 'taro'];

var manuscripts = [];
var currentManuscriptId = null;
var autoSaveTimer = null;
var aiCurrentResult = '';
var aiIsLoading = false;
var searchQuery = '';
var currentAiTab = 'continue';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function countWords(text) {
  if (!text) return 0;
  var chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  var stripped = text.replace(/[\u4e00-\u9fff]/g, ' ');
  var english = stripped.split(/\s+/).filter(Boolean).length;
  return chinese + english;
}

function formatDate(ts) {
  var d = new Date(ts);
  var pad = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function el(tag, attrs) {
  var children = Array.prototype.slice.call(arguments, 2);
  var elem = document.createElement(tag);
  if (attrs) {
    var keys = Object.keys(attrs);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var v = attrs[k];
      if (k === 'className') {
        elem.className = v;
      } else if (k === 'dataset') {
        var dk = Object.keys(v);
        for (var j = 0; j < dk.length; j++) {
          elem.dataset[dk[j]] = v[dk[j]];
        }
      } else if (k.indexOf('on') === 0 && typeof v === 'function') {
        elem.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === 'innerHTML') {
        elem.innerHTML = v;
      } else {
        elem.setAttribute(k, v);
      }
    }
  }
  for (var ci = 0; ci < children.length; ci++) {
    var child = children[ci];
    if (child == null || child === false) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      elem.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      elem.appendChild(child);
    }
  }
  return elem;
}

function loadManuscripts() {
  try {
    var raw = localStorage.getItem(STORAGE_KEYS.manuscripts);
    manuscripts = raw ? JSON.parse(raw) : [];
  } catch (e) {
    manuscripts = [];
  }
}

function saveManuscripts() {
  localStorage.setItem(STORAGE_KEYS.manuscripts, JSON.stringify(manuscripts));
}

function getManuscript(id) {
  for (var i = 0; i < manuscripts.length; i++) {
    if (manuscripts[i].id === id) return manuscripts[i];
  }
  return null;
}

function createManuscript() {
  var ms = {
    id: generateId(),
    title: '未命名书稿',
    content: '',
    excerpt: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    wordCount: 0,
  };
  manuscripts.unshift(ms);
  saveManuscripts();
  return ms;
}

function deleteManuscript(id) {
  manuscripts = manuscripts.filter(function (m) { return m.id !== id; });
  saveManuscripts();
  if (currentManuscriptId === id) {
    currentManuscriptId = manuscripts.length > 0 ? manuscripts[0].id : null;
  }
}

function updateManuscript(id, fields) {
  var ms = getManuscript(id);
  if (!ms) return;
  var keys = Object.keys(fields);
  for (var i = 0; i < keys.length; i++) {
    ms[keys[i]] = fields[keys[i]];
  }
  ms.updatedAt = Date.now();
  saveManuscripts();
}

function loadTheme() {
  return localStorage.getItem(STORAGE_KEYS.theme) || 'mint';
}

function saveTheme(name) {
  localStorage.setItem(STORAGE_KEYS.theme, name);
}

function applyTheme(name) {
  document.body.className = 'theme-' + name;
  var btns = document.querySelectorAll('.theme-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('active', btns[i].dataset.theme === name);
  }
}

function loadAiConfig() {
  try {
    var raw = localStorage.getItem(STORAGE_KEYS.aiConfig);
    return raw ? JSON.parse(raw) : { apiUrl: 'https://api.openai.com', apiKey: '', model: 'gpt-4o' };
  } catch (e) {
    return { apiUrl: 'https://api.openai.com', apiKey: '', model: 'gpt-4o' };
  }
}

function saveAiConfig(cfg) {
  localStorage.setItem(STORAGE_KEYS.aiConfig, JSON.stringify(cfg));
}

async function aiRequest(prompt) {
  var cfg = loadAiConfig();
  var url = cfg.apiUrl.replace(/\/+$/, '') + '/v1/chat/completions';
  var res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + cfg.apiKey,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });
  if (!res.ok) {
    var errBody = await res.text();
    throw new Error('API 请求失败 (' + res.status + '): ' + errBody);
  }
  var data = await res.json();
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
}

function aiContinue(content) {
  return aiRequest('请续写以下内容，保持风格一致：\n\n' + content);
}

function aiOutline(content) {
  return aiRequest('请根据以下内容生成小说大纲：\n\n' + content);
}

function aiPolish(content) {
  return aiRequest('请润色以下内容，提升文学性：\n\n' + content);
}

function buildUI() {
  var app = document.getElementById('app');
  app.innerHTML = '';

  var shell = el('div', { className: 'app-shell' });
  shell.appendChild(buildTitleBar());

  var body = el('div', { className: 'app-body' });
  body.appendChild(buildSidebar());
  body.appendChild(buildMainArea());

  shell.appendChild(body);
  app.appendChild(shell);

  document.body.appendChild(buildSettingsModal());
  document.body.appendChild(buildAiModal());
  document.body.appendChild(buildConfirmDialog());
}

function buildTitleBar() {
  var btnMinimize = el('button', {
    id: 'btn-minimize',
    className: 'titlebar-btn',
    title: '最小化',
    innerHTML: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  });
  var btnMaximize = el('button', {
    id: 'btn-maximize',
    className: 'titlebar-btn',
    title: '最大化',
    innerHTML: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="1"/></svg>',
  });
  var btnClose = el('button', {
    id: 'btn-close',
    className: 'titlebar-btn titlebar-btn-close',
    title: '关闭',
    innerHTML: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
  });

  btnMinimize.addEventListener('click', function () { window.electronAPI && window.electronAPI.minimizeWindow(); });
  btnMaximize.addEventListener('click', function () { window.electronAPI && window.electronAPI.maximizeWindow(); });
  btnClose.addEventListener('click', function () { window.electronAPI && window.electronAPI.closeWindow(); });

  if (window.electronAPI) {
    window.electronAPI.onWindowMaximizedChange(function (maximized) {
      updateMaximizeIcon(maximized);
    });
    window.electronAPI.isWindowMaximized().then(updateMaximizeIcon).catch(function () {});
  }

  var dragRegion = el('div', { className: 'drag-region' },
    el('span', { className: 'titlebar-logo' }, '✦'),
    el('span', { className: 'titlebar-title' }, '卿辰'),
  );
  dragRegion.addEventListener('dblclick', function () { window.electronAPI && window.electronAPI.maximizeWindow(); });

  var controls = el('div', { className: 'titlebar-controls' }, btnMinimize, btnMaximize, btnClose);

  return el('header', { className: 'titlebar' }, dragRegion, controls);
}

function updateMaximizeIcon(maximized) {
  var btn = document.getElementById('btn-maximize');
  if (!btn) return;
  if (maximized) {
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="2" width="14" height="14" rx="1"/><rect x="2" y="8" width="14" height="14" rx="1"/></svg>';
    btn.title = '还原';
  } else {
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="1"/></svg>';
    btn.title = '最大化';
  }
}

function buildSidebar() {
  var searchInput = el('input', {
    className: 'sidebar-search',
    placeholder: '搜索书稿\u2026',
    type: 'text',
  });
  searchInput.addEventListener('input', function (e) {
    searchQuery = e.target.value.trim().toLowerCase();
    renderManuscriptList();
  });

  var listContainer = el('div', { className: 'sidebar-list', id: 'manuscript-list' });

  var btnNew = el('button', { className: 'sidebar-btn-new', id: 'btn-new-manuscript' }, '+ 新建书稿');
  btnNew.addEventListener('click', handleNewManuscript);

  var footer = el('div', { className: 'sidebar-footer' });
  var themeBar = el('div', { className: 'theme-bar' });
  THEMES.forEach(function (t) {
    var btn = el('button', { className: 'theme-btn', dataset: { theme: t }, title: t });
    btn.addEventListener('click', function () {
      saveTheme(t);
      applyTheme(t);
    });
    themeBar.appendChild(btn);
  });

  var btnSettings = el('button', { className: 'sidebar-btn-settings', id: 'btn-settings', title: 'AI 设置' }, '\u2699');
  btnSettings.addEventListener('click', openSettingsModal);

  footer.appendChild(themeBar);
  footer.appendChild(btnSettings);

  var sidebar = el('aside', { className: 'sidebar', id: 'sidebar' });
  sidebar.appendChild(searchInput);
  sidebar.appendChild(listContainer);
  sidebar.appendChild(btnNew);
  sidebar.appendChild(footer);
  return sidebar;
}

function renderManuscriptList() {
  var container = document.getElementById('manuscript-list');
  if (!container) return;
  container.innerHTML = '';

  var filtered = manuscripts.filter(function (m) {
    return searchQuery ? m.title.toLowerCase().indexOf(searchQuery) !== -1 : true;
  });

  if (filtered.length === 0) {
    container.appendChild(el('div', { className: 'sidebar-empty' }, searchQuery ? '没有匹配的书稿' : '暂无书稿'));
    return;
  }

  filtered.forEach(function (ms) {
    var isActive = ms.id === currentManuscriptId;
    var item = el('div', {
      className: 'sidebar-item' + (isActive ? ' active' : ''),
      dataset: { id: ms.id },
    });

    var title = el('div', { className: 'sidebar-item-title' }, ms.title);
    var meta = el('div', { className: 'sidebar-item-meta' }, ms.wordCount + '字 · ' + formatDate(ms.updatedAt));
    var deleteBtn = el('button', { className: 'sidebar-item-delete', title: '删除', innerHTML: '✕' });
    deleteBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      handleDeleteManuscript(ms.id);
    });

    item.appendChild(title);
    item.appendChild(meta);
    item.appendChild(deleteBtn);
    item.addEventListener('click', function () { switchManuscript(ms.id); });
    container.appendChild(item);
  });
}

function buildMainArea() {
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
    if (!currentManuscriptId) return;
    updateManuscript(currentManuscriptId, { title: e.target.value || '未命名书稿' });
    renderManuscriptList();
  });

  var editor = el('div', {
    id: 'editor',
    className: 'editor-content',
    contentEditable: 'true',
    'data-placeholder': '开始创作你的故事\u2026',
  });
  editor.addEventListener('input', handleEditorInput);
  editor.addEventListener('paste', handleEditorPaste);

  editorWrapper.appendChild(titleInput);
  editorWrapper.appendChild(editor);
  editorArea.appendChild(editorWrapper);

  var wordCountEl = el('div', { className: 'word-count', id: 'word-count' }, '字数: 0');
  var statusRight = el('div', { className: 'status-right' });
  statusRight.appendChild(wordCountEl);

  var statusBar = el('footer', { className: 'status-bar' },
    el('span', { className: 'status-left', id: 'status-message' }, '就绪'),
    statusRight,
  );

  var main = el('main', { className: 'main-area', id: 'main-area' });
  main.appendChild(toolbar);
  main.appendChild(editorArea);
  main.appendChild(statusBar);
  return main;
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
  var btnAi = makeBtn('\u2726 AI', 'AI 助手', openAiModal);
  btnAi.className = 'toolbar-btn toolbar-btn-ai';

  var toolbar = el('div', { className: 'toolbar', id: 'toolbar' });
  toolbar.appendChild(btnBold);
  toolbar.appendChild(btnItalic);
  toolbar.appendChild(btnHeading);
  toolbar.appendChild(separator);
  toolbar.appendChild(btnAi);
  return toolbar;
}

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

function handleEditorInput() {
  if (!currentManuscriptId) return;
  var editor = document.getElementById('editor');
  var content = editor.innerText || '';
  var wc = countWords(content);
  var excerpt = content.slice(0, 120).replace(/\n/g, ' ');
  updateManuscript(currentManuscriptId, { content: content, excerpt: excerpt, wordCount: wc });
  updateWordCountDisplay(wc);
  renderManuscriptList();
}

function handleEditorPaste(e) {
  e.preventDefault();
  var text = (e.clipboardData || window.clipboardData).getData('text/plain');
  document.execCommand('insertText', false, text);
}

function updateWordCountDisplay(count) {
  var el = document.getElementById('word-count');
  if (el) el.textContent = '字数: ' + count;
}

function loadEditorContent(id) {
  var editor = document.getElementById('editor');
  var titleInput = document.getElementById('manuscript-title');
  var ms = getManuscript(id);
  if (!editor || !titleInput || !ms) return;

  editor.innerHTML = ms.content || '';
  titleInput.value = ms.title || '';
  updateWordCountDisplay(ms.wordCount || 0);
}

function switchManuscript(id) {
  currentManuscriptId = id;
  loadEditorContent(id);
  renderManuscriptList();
  hideWelcomeState();
}

function handleNewManuscript() {
  var ms = createManuscript();
  renderManuscriptList();
  switchManuscript(ms.id);
  var titleInput = document.getElementById('manuscript-title');
  if (titleInput) {
    titleInput.focus();
    titleInput.select();
  }
}

function handleDeleteManuscript(id) {
  var ms = getManuscript(id);
  if (!ms) return;
  showConfirmDialog('确定删除书稿「' + ms.title + '」吗？此操作不可撤销。', function () {
    deleteManuscript(id);
    renderManuscriptList();
    if (currentManuscriptId === id) {
      if (manuscripts.length > 0) {
        switchManuscript(manuscripts[0].id);
      } else {
        var newMs = createManuscript();
        renderManuscriptList();
        switchManuscript(newMs.id);
      }
    }
  });
}

function startAutoSave() {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  autoSaveTimer = setInterval(function () {
    if (currentManuscriptId) {
      var editor = document.getElementById('editor');
      if (editor) {
        var content = editor.innerText || '';
        updateManuscript(currentManuscriptId, {
          content: content,
          excerpt: content.slice(0, 120).replace(/\n/g, ' '),
          wordCount: countWords(content),
        });
        renderManuscriptList();
        setStatus('已自动保存');
      }
    }
  }, 5000);
}

function setStatus(msg) {
  var el = document.getElementById('status-message');
  if (el) el.textContent = msg;
}

function buildSettingsModal() {
  var overlay = el('div', { className: 'modal-overlay', id: 'settings-overlay' });

  var apiUrlInput = el('input', {
    id: 'cfg-api-url',
    className: 'modal-input',
    type: 'text',
    placeholder: 'https://api.openai.com',
  });
  var apiKeyInput = el('input', {
    id: 'cfg-api-key',
    className: 'modal-input',
    type: 'password',
    placeholder: 'sk-...',
  });
  var modelInput = el('input', {
    id: 'cfg-model',
    className: 'modal-input',
    type: 'text',
    placeholder: 'gpt-4o',
  });

  var btnTest = el('button', { className: 'modal-btn modal-btn-secondary' }, '测试连接');
  btnTest.addEventListener('click', handleTestConnection);

  var btnClose = el('button', { className: 'modal-btn modal-btn-ghost' }, '关闭');
  btnClose.addEventListener('click', closeSettingsModal);

  var btnSave = el('button', { className: 'modal-btn modal-btn-primary' }, '保存');
  btnSave.addEventListener('click', function () {
    saveAiConfig({
      apiUrl: apiUrlInput.value.trim() || 'https://api.openai.com',
      apiKey: apiKeyInput.value.trim(),
      model: modelInput.value.trim() || 'gpt-4o',
    });
    setStatus('AI 设置已保存');
    closeSettingsModal();
  });

  var form = el('div', { className: 'modal-form' },
    el('label', { className: 'modal-label' }, 'API 地址',
      el('span', { className: 'modal-label-sub' }, '（兼容 OpenAI 接口）'),
    ),
    apiUrlInput,
    el('label', { className: 'modal-label' }, 'API 密钥'),
    apiKeyInput,
    el('label', { className: 'modal-label' }, '模型名称'),
    modelInput,
  );

  var testResult = el('div', { id: 'test-result', className: 'modal-test-result' });

  var body = el('div', { className: 'modal-body' }, form, testResult);
  var footer = el('div', { className: 'modal-footer' }, btnTest, btnClose, btnSave);

  var card = el('div', { className: 'modal-card modal-card-settings' },
    el('div', { className: 'modal-header' },
      el('h3', { className: 'modal-title' }, 'AI 设置'),
    ),
    body,
    footer,
  );

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeSettingsModal();
  });
  card.addEventListener('click', function (e) { e.stopPropagation(); });

  overlay.appendChild(card);
  return overlay;
}

function openSettingsModal() {
  var overlay = document.getElementById('settings-overlay');
  if (!overlay) return;
  var cfg = loadAiConfig();
  document.getElementById('cfg-api-url').value = cfg.apiUrl || '';
  document.getElementById('cfg-api-key').value = cfg.apiKey || '';
  document.getElementById('cfg-model').value = cfg.model || '';
  var testResult = document.getElementById('test-result');
  if (testResult) testResult.textContent = '';
  overlay.classList.add('open');
}

function closeSettingsModal() {
  var overlay = document.getElementById('settings-overlay');
  if (overlay) overlay.classList.remove('open');
}

async function handleTestConnection() {
  var resultEl = document.getElementById('test-result');
  if (!resultEl) return;
  var cfg = loadAiConfig();
  var apiUrl = (document.getElementById('cfg-api-url') || {}).value || '';
  apiUrl = apiUrl.trim() || cfg.apiUrl;
  var apiKey = (document.getElementById('cfg-api-key') || {}).value || '';
  apiKey = apiKey.trim() || cfg.apiKey;
  var model = (document.getElementById('cfg-model') || {}).value || '';
  model = model.trim() || cfg.model;

  if (!apiKey) {
    resultEl.textContent = '请填写 API 密钥';
    resultEl.className = 'modal-test-result error';
    return;
  }

  resultEl.textContent = '正在测试连接\u2026';
  resultEl.className = 'modal-test-result';

  try {
    var url = apiUrl.replace(/\/+$/, '') + '/v1/chat/completions';
    var res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 5,
      }),
    });
    if (res.ok) {
      resultEl.textContent = '\u2713 连接成功';
      resultEl.className = 'modal-test-result success';
    } else {
      var err = await res.text();
      resultEl.textContent = '\u2717 连接失败 (' + res.status + '): ' + err.slice(0, 100);
      resultEl.className = 'modal-test-result error';
    }
  } catch (err) {
    resultEl.textContent = '\u2717 连接错误: ' + err.message;
    resultEl.className = 'modal-test-result error';
  }
}

function buildAiModal() {
  var overlay = el('div', { className: 'modal-overlay', id: 'ai-overlay' });

  var tabData = [
    { key: 'continue', label: '续写', fn: aiContinue },
    { key: 'outline', label: '大纲生成', fn: aiOutline },
    { key: 'polish', label: '润色', fn: aiPolish },
  ];

  var tabContainer = el('div', { className: 'ai-tabs', id: 'ai-tabs' });
  tabData.forEach(function (tab, i) {
    var btn = el('button', {
      className: 'ai-tab' + (i === 0 ? ' active' : ''),
      dataset: { key: tab.key },
    }, tab.label);
    btn.addEventListener('click', function () {
      currentAiTab = tab.key;
      var tabs = tabContainer.querySelectorAll('.ai-tab');
      for (var t = 0; t < tabs.length; t++) {
        tabs[t].classList.toggle('active', tabs[t].dataset.key === tab.key);
      }
      aiCurrentResult = '';
      renderAiResult();
    });
    tabContainer.appendChild(btn);
  });

  var sourceArea = el('textarea', {
    id: 'ai-source',
    className: 'ai-source',
    placeholder: '粘贴或输入需要 AI 处理的内容\u2026\n（留空将使用编辑器全部内容）',
    rows: '6',
  });

  var resultContainer = el('div', { className: 'ai-result-wrap', id: 'ai-result' });

  var loadingEl = el('div', { className: 'ai-loading', id: 'ai-loading' },
    el('div', { className: 'ai-loading-spinner' }),
    el('span', null, 'AI 正在思考\u2026'),
  );
  loadingEl.style.display = 'none';

  var btnGenerate = el('button', { className: 'modal-btn modal-btn-primary', id: 'ai-btn-generate' }, '生成');
  btnGenerate.addEventListener('click', handleAiGenerate);

  var btnApply = el('button', { className: 'modal-btn modal-btn-primary' }, '应用到编辑器');
  btnApply.addEventListener('click', handleAiApply);

  var btnCopy = el('button', { className: 'modal-btn modal-btn-secondary' }, '复制');
  btnCopy.addEventListener('click', function () {
    if (aiCurrentResult) navigator.clipboard.writeText(aiCurrentResult);
  });

  var btnClose = el('button', { className: 'modal-btn modal-btn-ghost' }, '关闭');
  btnClose.addEventListener('click', closeAiModal);

  var footer = el('div', { className: 'modal-footer' }, btnGenerate, btnApply, btnCopy, btnClose);
  var body = el('div', { className: 'modal-body' }, tabContainer, sourceArea, loadingEl, resultContainer);

  var card = el('div', { className: 'modal-card modal-card-ai' },
    el('div', { className: 'modal-header' },
      el('h3', { className: 'modal-title' }, 'AI 创作助手'),
    ),
    body,
    footer,
  );

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeAiModal();
  });
  card.addEventListener('click', function (e) { e.stopPropagation(); });

  overlay.appendChild(card);
  return overlay;
}

function openAiModal() {
  var overlay = document.getElementById('ai-overlay');
  if (!overlay) return;
  var editor = document.getElementById('editor');
  var sourceArea = document.getElementById('ai-source');
  if (sourceArea && editor) {
    var text = editor.innerText || '';
    sourceArea.value = text.slice(0, 5000);
  }
  aiCurrentResult = '';
  aiIsLoading = false;
  renderAiResult();
  var loadingEl = document.getElementById('ai-loading');
  if (loadingEl) loadingEl.style.display = 'none';
  var genBtn = document.getElementById('ai-btn-generate');
  if (genBtn) genBtn.disabled = false;
  overlay.classList.add('open');
}

function closeAiModal() {
  var overlay = document.getElementById('ai-overlay');
  if (overlay) overlay.classList.remove('open');
  aiIsLoading = false;
}

function renderAiResult() {
  var container = document.getElementById('ai-result');
  if (!container) return;
  container.innerHTML = '';
  if (aiCurrentResult) {
    container.appendChild(el('div', { className: 'ai-result-content' }, aiCurrentResult));
  }
}

async function handleAiGenerate() {
  if (aiIsLoading) return;
  var sourceArea = document.getElementById('ai-source');
  var text = ((sourceArea && sourceArea.value) || '').trim();
  if (!text) {
    setStatus('请输入内容');
    return;
  }

  aiIsLoading = true;
  var loadingEl = document.getElementById('ai-loading');
  var genBtn = document.getElementById('ai-btn-generate');
  if (loadingEl) loadingEl.style.display = 'flex';
  if (genBtn) genBtn.disabled = true;
  aiCurrentResult = '';
  renderAiResult();

  try {
    var fn;
    if (currentAiTab === 'continue') fn = aiContinue;
    else if (currentAiTab === 'outline') fn = aiOutline;
    else fn = aiPolish;

    aiCurrentResult = await fn(text);
    renderAiResult();
    setStatus('AI 生成完成');
  } catch (err) {
    aiCurrentResult = '生成失败: ' + err.message;
    renderAiResult();
    setStatus('AI 生成失败');
  } finally {
    aiIsLoading = false;
    if (loadingEl) loadingEl.style.display = 'none';
    if (genBtn) genBtn.disabled = false;
  }
}

function handleAiApply() {
  if (!aiCurrentResult) return;
  var editor = document.getElementById('editor');
  if (!editor) return;

  var sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
    var range = sel.getRangeAt(0);
    range.deleteContents();
    var temp = document.createElement('div');
    temp.innerHTML = aiCurrentResult.replace(/\n/g, '<br>');
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
    document.execCommand('insertText', false, aiCurrentResult);
  }

  handleEditorInput();
  closeAiModal();
  setStatus('已应用 AI 结果');
}

function buildConfirmDialog() {
  var overlay = el('div', { className: 'modal-overlay', id: 'confirm-overlay' });
  var messageEl = el('p', { className: 'confirm-message', id: 'confirm-message' });
  var confirmCallback = null;

  var btnNo = el('button', { className: 'modal-btn modal-btn-ghost' }, '取消');
  btnNo.addEventListener('click', function () {
    overlay.classList.remove('open');
    confirmCallback = null;
  });

  var btnYes = el('button', { className: 'modal-btn modal-btn-danger' }, '确定');
  btnYes.addEventListener('click', function () {
    overlay.classList.remove('open');
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
  });

  var card = el('div', { className: 'modal-card modal-card-confirm' },
    el('div', { className: 'modal-header' },
      el('h3', { className: 'modal-title' }, '确认操作'),
    ),
    el('div', { className: 'modal-body' }, messageEl),
    el('div', { className: 'modal-footer' }, btnNo, btnYes),
  );

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) {
      overlay.classList.remove('open');
      confirmCallback = null;
    }
  });
  card.addEventListener('click', function (e) { e.stopPropagation(); });

  overlay.appendChild(card);
  return overlay;
}

function showConfirmDialog(message, callback) {
  var overlay = document.getElementById('confirm-overlay');
  var msgEl = document.getElementById('confirm-message');
  if (!overlay || !msgEl) return;
  msgEl.textContent = message;
  var btnYes = overlay.querySelector('.modal-btn-danger');
  if (btnYes) {
    var newBtn = btnYes.cloneNode(true);
    btnYes.parentNode.replaceChild(newBtn, btnYes);
    newBtn.addEventListener('click', function () {
      overlay.classList.remove('open');
      if (callback) callback();
    });
  }
  overlay.classList.add('open');
}

function showWelcomeState() {
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

function hideWelcomeState() {
  var editor = document.getElementById('editor');
  if (editor) editor.classList.remove('welcome');
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function (e) {
    var ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && e.key === 's') {
      e.preventDefault();
      if (currentManuscriptId) {
        var editor = document.getElementById('editor');
        if (editor) {
          var content = editor.innerText || '';
          updateManuscript(currentManuscriptId, {
            content: content,
            excerpt: content.slice(0, 120).replace(/\n/g, ' '),
            wordCount: countWords(content),
          });
          renderManuscriptList();
          setStatus('已保存');
        }
      }
    }

    if (ctrl && e.key === 'n') {
      e.preventDefault();
      handleNewManuscript();
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
  });
}

function handleMenuActions() {
  if (!window.electronAPI) return;
  window.electronAPI.onMenuAction && window.electronAPI.onMenuAction(function (action) {
    if (action === 'new-manuscript') {
      handleNewManuscript();
    } else if (action === 'save') {
      if (currentManuscriptId) {
        var editor = document.getElementById('editor');
        if (editor) {
          var content = editor.innerText || '';
          updateManuscript(currentManuscriptId, {
            content: content,
            excerpt: content.slice(0, 120).replace(/\n/g, ' '),
            wordCount: countWords(content),
          });
          renderManuscriptList();
          setStatus('已保存');
        }
      }
    } else if (action === 'open-ai') {
      openAiModal();
    }
  });
}

function init() {
  buildUI();

  applyTheme(loadTheme());

  loadManuscripts();
  if (manuscripts.length === 0) {
    var ms = createManuscript();
    currentManuscriptId = ms.id;
  } else {
    currentManuscriptId = manuscripts[0].id;
  }

  renderManuscriptList();
  loadEditorContent(currentManuscriptId);

  if (manuscripts.length === 1 && !getManuscript(currentManuscriptId).content) {
    showWelcomeState();
  }

  startAutoSave();
  setupKeyboardShortcuts();
  handleMenuActions();
  setStatus('就绪');
}

document.addEventListener('DOMContentLoaded', init);
