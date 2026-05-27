import { el } from '../../utils/helper.js';
import { learnFromText, continueWithStyle, loadStyleTemplates, deleteStyleTemplate, renameStyleTemplate, clearAllTemplates, getTemplateById } from '../../api/ai/styleLearn.js';
import { createFileInput, validateSample } from '../../utils/fileParse.js';
import { showConfirmDialog } from '../common/confirmDialog.js';
import appState from '../../core/appState.js';
import bus from '../../event/bus.js';

var activeTemplateId = null;

function formatDate(ts) {
  var d = new Date(ts);
  var y = d.getFullYear();
  var m = ('0' + (d.getMonth() + 1)).slice(-2);
  var day = ('0' + d.getDate()).slice(-2);
  return y + '-' + m + '-' + day;
}

function getDefaultTemplateName() {
  var now = new Date();
  var y = now.getFullYear();
  var m = ('0' + (now.getMonth() + 1)).slice(-2);
  var day = ('0' + now.getDate()).slice(-2);
  return '风格模板-' + y + m + day;
}

function getEditorContent() {
  var editor = document.getElementById('editor');
  return editor ? editor.innerText || '' : '';
}

function renderTemplateList(listEl) {
  listEl.innerHTML = '';
  var templates = loadStyleTemplates();
  if (templates.length === 0) {
    listEl.appendChild(el('div', { className: 'style-learn-empty' }, '暂无风格模板'));
    return;
  }
  for (var i = 0; i < templates.length; i++) {
    (function (tpl) {
      var isActive = tpl.id === activeTemplateId;
      var row = el('div', { className: 'style-learn-tpl-row' + (isActive ? ' active' : '') });

      var info = el('div', { className: 'style-learn-tpl-info' },
        el('span', { className: 'style-learn-tpl-name' }, tpl.name),
        el('span', { className: 'style-learn-tpl-meta' }, (tpl.description ? tpl.description.length : 0) + '字 · ' + formatDate(tpl.createdAt)),
      );

      var btnSelect = el('button', { className: 'modal-btn modal-btn-secondary' }, isActive ? '已选中' : '选中');
      if (isActive) btnSelect.disabled = true;
      btnSelect.addEventListener('click', function () {
        activeTemplateId = tpl.id;
        listEl.parentNode && renderTemplateList(listEl);
        updateContinueSection();
        bus.emit('tips:show', { type: 'info', message: '已选择模板: ' + tpl.name });
      });

      var btnRename = el('button', { className: 'modal-btn modal-btn-ghost' }, '重命名');
      btnRename.addEventListener('click', function () {
        var newName = prompt('请输入新名称', tpl.name);
        if (newName && newName.trim()) {
          var res = renameStyleTemplate(tpl.id, newName);
          if (res.success) {
            renderTemplateList(listEl);
            updateContinueSection();
            bus.emit('tips:show', { type: 'info', message: '重命名成功' });
          } else {
            bus.emit('tips:show', { type: 'error', message: res.errors ? res.errors[0] : '重命名失败' });
          }
        }
      });

      var btnDelete = el('button', { className: 'modal-btn modal-btn-ghost' }, '删除');
      btnDelete.addEventListener('click', function () {
        showConfirmDialog('确定要删除模板「' + tpl.name + '」吗？', function () {
          var res = deleteStyleTemplate(tpl.id);
          if (res.success) {
            if (activeTemplateId === tpl.id) activeTemplateId = null;
            renderTemplateList(listEl);
            updateContinueSection();
            bus.emit('tips:show', { type: 'info', message: '模板已删除' });
          } else {
            bus.emit('tips:show', { type: 'error', message: res.errors ? res.errors[0] : '删除失败' });
          }
        });
      });

      var actions = el('div', { className: 'style-learn-tpl-actions' }, btnSelect, btnRename, btnDelete);
      row.appendChild(info);
      row.appendChild(actions);
      listEl.appendChild(row);
    })(templates[i]);
  }
}

function updateContinueSection() {
  var nameEl = document.getElementById('sl-selected-name');
  if (!nameEl) return;
  if (activeTemplateId) {
    var tpl = getTemplateById(activeTemplateId);
    nameEl.textContent = tpl ? tpl.name : '未选择';
  } else {
    nameEl.textContent = '未选择';
  }
}

function updateProgressBar(progressEl, statusEl, progress, message) {
  if (progressEl) {
    progressEl.style.display = progress > 0 && progress < 100 ? 'block' : 'none';
    var bar = progressEl.querySelector('.style-learn-progress-bar');
    if (bar) bar.style.width = progress + '%';
  }
  if (statusEl) {
    statusEl.textContent = message || '';
  }
}

export function buildStyleLearnPanel() {
  var templateListEl = el('div', { className: 'style-learn-tpl-list' });

  var sampleTextarea = el('textarea', {
    className: 'modal-input style-learn-textarea',
    placeholder: '粘贴或输入您的范文...\n支持 TXT 文件导入，AI 将分析文本的文风特征',
    rows: '8',
  });

  var nameInput = el('input', {
    className: 'modal-input',
    type: 'text',
    id: 'sl-template-name',
    placeholder: '模板名称',
    value: getDefaultTemplateName(),
  });

  var btnImport = el('button', { className: 'modal-btn modal-btn-secondary' }, '导入TXT文件');
  btnImport.addEventListener('click', function () {
    createFileInput().then(function (result) {
      if (result.success && result.text) {
        sampleTextarea.value = result.text;
        bus.emit('tips:show', { type: 'info', message: '文件已导入: ' + result.fileName + ' (' + result.charCount + '字)' });
      } else if (result.errors && result.errors.length > 0) {
        bus.emit('tips:show', { type: 'error', message: result.errors[0] });
      }
    }).catch(function (err) {
      if (err && err.message && err.message !== '未选择文件') {
        bus.emit('tips:show', { type: 'error', message: err.message });
      }
    });
  });

  var statusMsgEl = el('div', { className: 'style-learn-status' });
  var progressBarOuter = el('div', { className: 'style-learn-progress' });
  progressBarOuter.style.display = 'none';
  var progressBarInner = el('div', { className: 'style-learn-progress-bar' });
  progressBarOuter.appendChild(progressBarInner);

  var btnLearn = el('button', { className: 'modal-btn modal-btn-primary' }, '开始学习');
  btnLearn.addEventListener('click', function () {
    var text = sampleTextarea.value.trim();
    if (!text) {
      bus.emit('tips:show', { type: 'error', message: '请先输入或导入范文内容' });
      return;
    }
    var validation = validateSample(text);
    if (!validation.valid) {
      bus.emit('tips:show', { type: 'error', message: validation.errors[0] });
      return;
    }
    var tplName = nameInput.value.trim() || getDefaultTemplateName();
    btnLearn.disabled = true;
    btnImport.disabled = true;
    updateProgressBar(progressBarOuter, statusMsgEl, 10, '正在分析文风特征...');
    bus.emit('status:set', '正在学习文风...');

    learnFromText(text, tplName).then(function (result) {
      if (result.success) {
        updateProgressBar(progressBarOuter, statusMsgEl, 100, '学习完成');
        bus.emit('tips:show', { type: 'info', message: '文风学习完成: ' + result.template.name });
        bus.emit('status:set', '文风学习完成');
        renderTemplateList(templateListEl);
        nameInput.value = getDefaultTemplateName();
        setTimeout(function () {
          updateProgressBar(progressBarOuter, statusMsgEl, 0, '');
        }, 2000);
      } else {
        var errMsg = result.errors ? result.errors[0] : '学习失败';
        updateProgressBar(progressBarOuter, statusMsgEl, 0, '学习失败: ' + errMsg);
        bus.emit('tips:show', { type: 'error', message: errMsg });
        bus.emit('status:set', '文风学习失败');
      }
    }).catch(function (err) {
      updateProgressBar(progressBarOuter, statusMsgEl, 0, '学习失败');
      bus.emit('tips:show', { type: 'error', message: '学习失败: ' + (err.message || '未知错误') });
      bus.emit('status:set', '文风学习失败');
    }).finally(function () {
      btnLearn.disabled = false;
      btnImport.disabled = false;
    });
  });

  var learnSection = el('div', { className: 'style-learn-section' },
    el('h4', { className: 'style-learn-section-title' }, '学习文风'),
    sampleTextarea,
    el('div', { className: 'style-learn-toolbar' }, btnImport, btnLearn),
    el('label', { className: 'modal-label' }, '模板名称'),
    nameInput,
    progressBarOuter,
    statusMsgEl,
  );

  var btnClearAll = el('button', { className: 'modal-btn modal-btn-ghost style-learn-clear-btn' }, '清空所有模板');
  btnClearAll.addEventListener('click', function () {
    var templates = loadStyleTemplates();
    if (templates.length === 0) {
      bus.emit('tips:show', { type: 'info', message: '暂无模板可清空' });
      return;
    }
    showConfirmDialog('确定要清空所有风格模板吗？此操作不可撤销。', function () {
      var res = clearAllTemplates();
      if (res.success) {
        activeTemplateId = null;
        renderTemplateList(templateListEl);
        updateContinueSection();
        bus.emit('tips:show', { type: 'info', message: '所有模板已清空' });
      } else {
        bus.emit('tips:show', { type: 'error', message: res.errors ? res.errors[0] : '清空失败' });
      }
    });
  });

  var templateSection = el('div', { className: 'style-learn-section' },
    el('h4', { className: 'style-learn-section-title' }, '风格模板'),
    templateListEl,
    btnClearAll,
  );

  var continueResultEl = el('div', { className: 'ai-result-wrap style-learn-result' });

  var btnContinue = el('button', { className: 'modal-btn modal-btn-primary' }, '按文风续写');
  btnContinue.addEventListener('click', function () {
    if (!activeTemplateId) {
      bus.emit('tips:show', { type: 'error', message: '请先选择一个风格模板' });
      return;
    }
    var content = getEditorContent();
    if (!content.trim()) {
      bus.emit('tips:show', { type: 'error', message: '编辑器内容为空' });
      return;
    }
    btnContinue.disabled = true;
    continueResultEl.innerHTML = '';
    var loadingEl = el('div', { className: 'ai-loading' },
      el('div', { className: 'ai-loading-spinner' }),
      el('span', null, '正在按文风续写...'),
    );
    continueResultEl.appendChild(loadingEl);
    bus.emit('status:set', '正在按文风续写...');

    continueWithStyle(content, activeTemplateId).then(function (result) {
      continueResultEl.innerHTML = '';
      if (result.success) {
        continueResultEl.appendChild(el('div', { className: 'ai-result-content' }, result.content));
        bus.emit('status:set', '续写完成');
      } else {
        var errMsg = result.errors ? result.errors[0] : '续写失败';
        continueResultEl.appendChild(el('div', { className: 'ai-result-content style-learn-error' }, errMsg));
        bus.emit('status:set', '续写失败');
      }
    }).catch(function (err) {
      continueResultEl.innerHTML = '';
      continueResultEl.appendChild(el('div', { className: 'ai-result-content style-learn-error' }, '续写失败: ' + (err.message || '未知错误')));
      bus.emit('status:set', '续写失败');
    }).finally(function () {
      btnContinue.disabled = false;
    });
  });

  var selectedNameEl = el('span', { id: 'sl-selected-name' }, '未选择');

  var continueSection = el('div', { className: 'style-learn-section' },
    el('h4', { className: 'style-learn-section-title' }, '按文风续写'),
    el('div', { className: 'style-learn-continue-info' },
      el('span', { className: 'style-learn-label' }, '当前模板: '),
      selectedNameEl,
    ),
    btnContinue,
    continueResultEl,
  );

  renderTemplateList(templateListEl);
  updateContinueSection();

  var panel = el('div', { className: 'style-learn-panel' }, learnSection, templateSection, continueSection);
  return panel;
}

export function initStyleLearnPanel() {
  bus.on('style:learned', function () {
    var listEl = document.querySelector('.style-learn-tpl-list');
    if (listEl) renderTemplateList(listEl);
    updateContinueSection();
  });
  bus.on('style:template-deleted', function () {
    var listEl = document.querySelector('.style-learn-tpl-list');
    if (listEl) renderTemplateList(listEl);
    updateContinueSection();
  });
  bus.on('style:templates-cleared', function () {
    activeTemplateId = null;
    var listEl = document.querySelector('.style-learn-tpl-list');
    if (listEl) renderTemplateList(listEl);
    updateContinueSection();
  });
}
