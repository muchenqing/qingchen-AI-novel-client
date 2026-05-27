import { el } from '../../utils/helper.js';
import { showConfirmDialog } from '../common/confirmDialog.js';
import bus from '../../event/bus.js';

var STORAGE_KEY = 'qingchen-prompt-templates';
var CATEGORY_LIST = ['续写', '大纲', '润色', '自定义'];

var builtInTemplates = [
  {
    id: 'builtin-1',
    name: '续写模板',
    content: '请继续创作以下小说内容，保持原有风格和节奏，自然衔接情节发展，注意人物性格的一致性和故事逻辑的连贯性。\n\n{{content}}',
    category: '续写',
    favorite: true,
    createdAt: 1700000000000,
  },
  {
    id: 'builtin-2',
    name: '大纲模板',
    content: '请根据以下内容生成详细的小说大纲，包括主要情节线索、人物发展弧线、关键转折点和结局走向。\n\n{{content}}',
    category: '大纲',
    favorite: false,
    createdAt: 1700000001000,
  },
  {
    id: 'builtin-3',
    name: '润色模板',
    content: '请对以下文本进行润色优化，保持原意但提升文学性，增强画面感和情感表达，使语言更加生动优美。\n\n{{content}}',
    category: '润色',
    favorite: false,
    createdAt: 1700000002000,
  },
  {
    id: 'builtin-4',
    name: '扩写模板',
    content: '请将以下段落进行细节扩写，增加描写和情感表达，丰富场景细节和人物心理活动，使内容更加饱满。\n\n{{content}}',
    category: '自定义',
    favorite: false,
    createdAt: 1700000003000,
  },
  {
    id: 'builtin-5',
    name: '精简模板',
    content: '请精简以下文本，去除冗余内容，保留核心情节和关键对话，使文章更加紧凑有力。\n\n{{content}}',
    category: '自定义',
    favorite: false,
    createdAt: 1700000004000,
  },
];

var editingId = null;

function loadTemplates() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return [];
}

function saveTemplates(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) { /* ignore */ }
}

function ensureDefaults() {
  var list = loadTemplates();
  if (list.length === 0) {
    saveTemplates(builtInTemplates);
    list = builtInTemplates.slice();
  }
  return list;
}

function generateId() {
  return 'tpl-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function truncateText(text, max) {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max) + '...';
}

function formatDate(ts) {
  var d = new Date(ts);
  var y = d.getFullYear();
  var m = ('0' + (d.getMonth() + 1)).slice(-2);
  var day = ('0' + d.getDate()).slice(-2);
  return y + '-' + m + '-' + day;
}

function renderTemplateList(listEl) {
  listEl.innerHTML = '';
  var templates = ensureDefaults();
  templates.sort(function (a, b) {
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;
    return b.createdAt - a.createdAt;
  });

  if (templates.length === 0) {
    listEl.appendChild(el('div', { className: 'prompt-template-empty' }, '暂无模板'));
    return;
  }

  for (var i = 0; i < templates.length; i++) {
    (function (tpl) {
      var row = el('div', { className: 'prompt-template-row' });

      var favStar = tpl.favorite ? '\u2605' : '\u2606';
      var favBtn = el('button', { className: 'prompt-template-fav' }, favStar);
      favBtn.addEventListener('click', function () {
        tpl.favorite = !tpl.favorite;
        var all = loadTemplates();
        for (var k = 0; k < all.length; k++) {
          if (all[k].id === tpl.id) {
            all[k].favorite = tpl.favorite;
            break;
          }
        }
        saveTemplates(all);
        renderTemplateList(listEl);
        bus.emit('tips:show', { type: 'info', message: tpl.favorite ? '已收藏: ' + tpl.name : '已取消收藏: ' + tpl.name });
      });

      var nameEl = el('span', { className: 'prompt-template-name' }, tpl.name);
      var previewEl = el('span', { className: 'prompt-template-preview' }, truncateText(tpl.content, 50));
      var categoryTag = el('span', { className: 'prompt-template-category' }, tpl.category);
      var dateEl = el('span', { className: 'prompt-template-date' }, formatDate(tpl.createdAt));

      var info = el('div', { className: 'prompt-template-info' }, favBtn, nameEl, categoryTag, previewEl, dateEl);

      var btnUse = el('button', { className: 'modal-btn modal-btn-secondary' }, '使用');
      btnUse.addEventListener('click', function () {
        var sourceArea = document.getElementById('ai-panel-source');
        if (sourceArea) {
          var editor = document.getElementById('editor');
          var editorText = editor ? editor.innerText || '' : '';
          var title = document.title || '';
          var output = tpl.content
            .replace(/\{\{content\}\}/g, editorText)
            .replace(/\{\{title\}\}/g, title);
          sourceArea.value = output;
        }
        bus.emit('tips:show', { type: 'info', message: '已加载模板: ' + tpl.name });
      });

      var btnEdit = el('button', { className: 'modal-btn modal-btn-ghost' }, '编辑');
      btnEdit.addEventListener('click', function () {
        editingId = tpl.id;
        var nameInput = document.getElementById('pt-editor-name');
        var categorySelect = document.getElementById('pt-editor-category');
        var contentTextarea = document.getElementById('pt-editor-content');
        if (nameInput) nameInput.value = tpl.name;
        if (categorySelect) categorySelect.value = tpl.category;
        if (contentTextarea) contentTextarea.value = tpl.content;
        bus.emit('tips:show', { type: 'info', message: '正在编辑: ' + tpl.name });
      });

      var btnDelete = el('button', { className: 'modal-btn modal-btn-ghost' }, '删除');
      btnDelete.addEventListener('click', function () {
        showConfirmDialog('确定要删除模板「' + tpl.name + '」吗？', function () {
          var all = loadTemplates();
          var filtered = [];
          for (var k = 0; k < all.length; k++) {
            if (all[k].id !== tpl.id) filtered.push(all[k]);
          }
          saveTemplates(filtered);
          if (editingId === tpl.id) editingId = null;
          renderTemplateList(listEl);
          bus.emit('tips:show', { type: 'info', message: '模板已删除' });
        });
      });

      var actions = el('div', { className: 'prompt-template-actions' }, btnUse, btnEdit, btnDelete);
      row.appendChild(info);
      row.appendChild(actions);
      listEl.appendChild(row);
    })(templates[i]);
  }
}

function clearEditor() {
  var nameInput = document.getElementById('pt-editor-name');
  var categorySelect = document.getElementById('pt-editor-category');
  var contentTextarea = document.getElementById('pt-editor-content');
  if (nameInput) nameInput.value = '';
  if (categorySelect) categorySelect.value = CATEGORY_LIST[0];
  if (contentTextarea) contentTextarea.value = '';
  editingId = null;
}

function handleSave(listEl) {
  var nameInput = document.getElementById('pt-editor-name');
  var categorySelect = document.getElementById('pt-editor-category');
  var contentTextarea = document.getElementById('pt-editor-content');

  var name = nameInput ? nameInput.value.trim() : '';
  var category = categorySelect ? categorySelect.value : CATEGORY_LIST[0];
  var content = contentTextarea ? contentTextarea.value.trim() : '';

  if (!name) {
    bus.emit('tips:show', { type: 'error', message: '请输入模板名称' });
    return;
  }
  if (!content) {
    bus.emit('tips:show', { type: 'error', message: '请输入模板内容' });
    return;
  }

  var all = loadTemplates();

  if (editingId) {
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === editingId) {
        all[i].name = name;
        all[i].category = category;
        all[i].content = content;
        break;
      }
    }
    saveTemplates(all);
    editingId = null;
    renderTemplateList(listEl);
    clearEditor();
    bus.emit('tips:show', { type: 'info', message: '模板已更新' });
  } else {
    var exists = false;
    for (var j = 0; j < all.length; j++) {
      if (all[j].name === name) {
        exists = true;
        break;
      }
    }
    if (exists) {
      showConfirmDialog('已存在同名模板「' + name + '」，是否覆盖？', function () {
        var updated = loadTemplates();
        for (var k = 0; k < updated.length; k++) {
          if (updated[k].name === name) {
            updated[k].category = category;
            updated[k].content = content;
            break;
          }
        }
        saveTemplates(updated);
        renderTemplateList(listEl);
        bus.emit('tips:show', { type: 'info', message: '模板已覆盖保存' });
      });
      return;
    }
    var newTpl = {
      id: generateId(),
      name: name,
      content: content,
      category: category,
      favorite: false,
      createdAt: Date.now(),
    };
    all.push(newTpl);
    saveTemplates(all);
    renderTemplateList(listEl);
    clearEditor();
    bus.emit('tips:show', { type: 'info', message: '模板已保存' });
  }
}

export function buildPromptTemplatePanel() {
  var templateListEl = el('div', { className: 'prompt-template-list' });
  renderTemplateList(templateListEl);

  var btnClearAll = el('button', { className: 'modal-btn modal-btn-ghost prompt-template-clear-btn' }, '清空所有');
  btnClearAll.addEventListener('click', function () {
    var templates = loadTemplates();
    if (templates.length === 0) {
      bus.emit('tips:show', { type: 'info', message: '暂无模板可清空' });
      return;
    }
    showConfirmDialog('确定要清空所有提示词模板吗？此操作不可撤销。', function () {
      saveTemplates([]);
      editingId = null;
      clearEditor();
      renderTemplateList(templateListEl);
      bus.emit('tips:show', { type: 'info', message: '所有模板已清空' });
    });
  });

  var listSection = el('div', { className: 'prompt-template-section' },
    el('h4', { className: 'prompt-template-section-title' }, '提示词模板'),
    templateListEl,
    el('div', { className: 'prompt-template-clear-wrap' }, btnClearAll),
  );

  var nameInput = el('input', {
    className: 'modal-input',
    type: 'text',
    id: 'pt-editor-name',
    placeholder: '模板名称',
  });

  var categoryOptions = [];
  for (var c = 0; c < CATEGORY_LIST.length; c++) {
    categoryOptions.push(el('option', { value: CATEGORY_LIST[c] }, CATEGORY_LIST[c]));
  }
  var categorySelect = el('select', { className: 'modal-input', id: 'pt-editor-category' }, categoryOptions);

  var contentTextarea = el('textarea', {
    className: 'modal-input prompt-template-textarea',
    id: 'pt-editor-content',
    placeholder: '输入模板内容...\n支持占位符: {{content}} 为选中文本, {{title}} 为章节标题',
    rows: '8',
  });

  var btnSave = el('button', { className: 'modal-btn modal-btn-primary' }, '保存模板');
  btnSave.addEventListener('click', function () {
    handleSave(templateListEl);
  });

  var btnUse = el('button', { className: 'modal-btn modal-btn-secondary' }, '使用模板');
  btnUse.addEventListener('click', function () {
    var content = contentTextarea.value.trim();
    if (!content) {
      bus.emit('tips:show', { type: 'error', message: '请先输入模板内容' });
      return;
    }
    var sourceArea = document.getElementById('ai-panel-source');
    if (sourceArea) {
      var editor = document.getElementById('editor');
      var editorText = editor ? editor.innerText || '' : '';
      var title = document.title || '';
      var output = content
        .replace(/\{\{content\}\}/g, editorText)
        .replace(/\{\{title\}\}/g, title);
      sourceArea.value = output;
    }
    bus.emit('tips:show', { type: 'success', message: '模板已加载到 AI 输入区', duration: 2000 });
  });

  var editorSection = el('div', { className: 'prompt-template-section' },
    el('h4', { className: 'prompt-template-section-title' }, '模板编辑器'),
    el('label', { className: 'modal-label' }, '模板名称'),
    nameInput,
    el('label', { className: 'modal-label' }, '分类'),
    categorySelect,
    el('label', { className: 'modal-label' }, '模板内容'),
    contentTextarea,
    el('div', { className: 'prompt-template-editor-actions' }, btnSave, btnUse),
  );

  var panel = el('div', { className: 'prompt-template-panel' }, listSection, editorSection);
  return panel;
}

export function initPromptTemplatePanel() {
  bus.on('prompt-template:refresh', function () {
    var listEl = document.querySelector('.prompt-template-list');
    if (listEl) renderTemplateList(listEl);
  });
}
