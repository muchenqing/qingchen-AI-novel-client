import { el } from '../../utils/helper.js';
import { getAll, getById, create, update, remove, search, toggleFavorite, getGroups } from '../../store/characterStore.js';
import { showConfirmDialog } from '../common/confirmDialog.js';
import appState from '../../core/appState.js';
import bus from '../../event/bus.js';

var currentGroup = 'all';
var currentQuery = '';
var selectedId = null;
var listContainer = null;
var detailPanel = null;
var genderInput = null;
var nameInput = null;
var appearanceInput = null;
var personalityInput = null;
var backstoryInput = null;
var relationshipsInput = null;
var quotesInput = null;
var notesInput = null;
var groupInput = null;
var tabsContainer = null;

var FIELD_DEFS = [
  { key: 'name', label: '\u59d3\u540d', type: 'input', placeholder: '\u89d2\u8272\u540d\u79f0' },
  { key: 'gender', label: '\u6027\u522b', type: 'select', options: ['', '\u7537', '\u5973', '\u5176\u4ed6'] },
  { key: 'appearance', label: '\u5916\u8c8c\u63cf\u8ff0', type: 'textarea', placeholder: '\u63cf\u8ff0\u89d2\u8272\u7684\u5916\u8c8c\u7279\u5f81' },
  { key: 'personality', label: '\u6027\u683c\u7279\u70b9', type: 'textarea', placeholder: '\u63cf\u8ff0\u89d2\u8272\u7684\u6027\u683c' },
  { key: 'backstory', label: '\u80cc\u666f\u6545\u4e8b', type: 'textarea', placeholder: '\u89d2\u8272\u7684\u80cc\u666f\u7ecf\u5386' },
  { key: 'relationships', label: '\u4eba\u7269\u5173\u7cfb', type: 'textarea', placeholder: '\u4e0e\u5176\u4ed6\u89d2\u8272\u7684\u5173\u7cfb' },
  { key: 'quotes', label: '\u7ecf\u5178\u53f0\u8bcd', type: 'textarea', placeholder: '\u89d2\u8272\u7684\u7ecf\u5178\u53f0\u8bcd\u6216\u8bed\u5f55' },
  { key: 'notes', label: '\u5907\u6ce8', type: 'textarea', placeholder: '\u5176\u4ed6\u5907\u6ce8\u4fe1\u606f' },
];

function getGenderLabel(gender) {
  if (!gender) return '\u672a\u8bbe\u5b9a';
  return gender;
}

function getFormValues() {
  var fields = document.querySelectorAll('#cl-detail-form .cl-field-input, #cl-detail-form .cl-field-textarea, #cl-detail-form select[data-field]');
  var values = {};
  for (var i = 0; i < fields.length; i++) {
    values[fields[i].dataset.field] = fields[i].value;
  }
  return values;
}

function setFormValues(character) {
  if (!character) return;
  var fields = document.querySelectorAll('#cl-detail-form [data-field]');
  for (var i = 0; i < fields.length; i++) {
    var key = fields[i].dataset.field;
    if (fields[i].tagName === 'SELECT') {
      fields[i].value = character[key] || '';
    } else {
      fields[i].value = character[key] || '';
    }
  }
}

function clearForm() {
  var fields = document.querySelectorAll('#cl-detail-form [data-field]');
  for (var i = 0; i < fields.length; i++) {
    if (fields[i].tagName === 'SELECT') {
      fields[i].selectedIndex = 0;
    } else {
      fields[i].value = '';
    }
  }
}

function renderList() {
  if (!listContainer) return;
  listContainer.innerHTML = '';

  var items;
  if (currentQuery) {
    items = search(currentQuery);
  } else {
    items = getAll();
  }

  if (currentGroup !== 'all') {
    var filtered = [];
    for (var i = 0; i < items.length; i++) {
      var g = items[i].group || '\u9ed8\u8ba4';
      if (g === currentGroup) filtered.push(items[i]);
    }
    items = filtered;
  }

  if (items.length === 0) {
    listContainer.appendChild(el('div', { className: 'cl-empty' }, '\u6682\u65e0\u4eba\u7269\u89d2\u8272'));
    return;
  }

  for (var j = 0; j < items.length; j++) {
    (function (c) {
      var isSelected = c.id === selectedId;
      var cls = 'cl-list-item' + (isSelected ? ' cl-list-item-active' : '');

      var starBtn = el('span', {
        className: 'cl-favorite' + (c.favorite ? ' cl-favorite-active' : ''),
        dataset: { id: c.id },
      }, c.favorite ? '\u2605' : '\u2606');
      starBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleFavorite(c.id);
        renderList();
      });

      var deleteBtn = el('span', { className: 'cl-delete-btn' }, '\u00d7');
      deleteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        showConfirmDialog('\u786e\u5b9a\u8981\u5220\u9664\u4eba\u7269\u201c' + c.name + '\u201d\u5417\uff1f', function () {
          remove(c.id);
          if (selectedId === c.id) {
            selectedId = null;
            clearForm();
          }
          renderList();
        });
      });

      var nameEl = el('span', { className: 'cl-item-name' }, c.name || '\u672a\u547d\u540d');
      var genderEl = el('span', { className: 'cl-item-gender' }, getGenderLabel(c.gender));
      var groupEl = el('span', { className: 'cl-item-group-tag' }, c.group || '\u9ed8\u8ba4');

      var row = el('div', { className: cls, dataset: { id: c.id } },
        el('div', { className: 'cl-item-main' }, starBtn, nameEl, genderEl, groupEl),
        deleteBtn,
      );
      row.addEventListener('click', function () {
        selectCharacter(c.id);
      });
      listContainer.appendChild(row);
    })(items[j]);
  }
}

function renderTabs() {
  if (!tabsContainer) return;
  tabsContainer.innerHTML = '';

  var groups = getGroups();
  var groupNames = Object.keys(groups);

  var allTab = el('button', {
    className: 'cl-tab' + (currentGroup === 'all' ? ' cl-tab-active' : ''),
    dataset: { group: 'all' },
  }, '\u5168\u90e8');
  allTab.addEventListener('click', function () {
    currentGroup = 'all';
    renderTabs();
    renderList();
  });
  tabsContainer.appendChild(allTab);

  for (var i = 0; i < groupNames.length; i++) {
    (function (gName) {
      var count = groups[gName].length;
      var tab = el('button', {
        className: 'cl-tab' + (currentGroup === gName ? ' cl-tab-active' : ''),
        dataset: { group: gName },
      }, gName + ' (' + count + ')');
      tab.addEventListener('click', function () {
        currentGroup = gName;
        renderTabs();
        renderList();
      });
      tabsContainer.appendChild(tab);
    })(groupNames[i]);
  }
}

function selectCharacter(id) {
  selectedId = id;
  var character = getById(id);
  if (character) {
    setFormValues(character);
  }
  renderList();
}

function handleSave() {
  if (!selectedId) return;
  var values = getFormValues();
  if (!values.name || !values.name.trim()) {
    bus.emit('tips:show', { type: 'error', message: '\u59d3\u540d\u4e0d\u80fd\u4e3a\u7a7a' });
    return;
  }
  var result = update(selectedId, values);
  if (result.success) {
    bus.emit('status:set', '\u4eba\u7269\u5df2\u4fdd\u5b58');
    renderList();
  } else {
    bus.emit('tips:show', { type: 'error', message: result.errors ? result.errors[0] : '\u4fdd\u5b58\u5931\u8d25' });
  }
}

function handleCreate() {
  var result = create({ name: '\u65b0\u89d2\u8272' });
  if (result.success) {
    selectedId = result.character.id;
    setFormValues(result.character);
    renderTabs();
    renderList();
    bus.emit('status:set', '\u4eba\u7269\u5df2\u521b\u5efa');
  } else {
    bus.emit('tips:show', { type: 'error', message: result.errors ? result.errors[0] : '\u521b\u5efa\u5931\u8d25' });
  }
}

function handleClearAll() {
  showConfirmDialog('\u786e\u5b9a\u8981\u6e05\u7a7a\u6240\u6709\u4eba\u7269\u89d2\u8272\u5417\uff1f\u6b64\u64cd\u4f5c\u4e0d\u53ef\u64a4\u9500\u3002', function () {
    var list = getAll();
    for (var i = list.length - 1; i >= 0; i--) {
      remove(list[i].id);
    }
    selectedId = null;
    clearForm();
    renderTabs();
    renderList();
    bus.emit('status:set', '\u5df2\u6e05\u7a7a\u6240\u6709\u4eba\u7269');
  });
}

function openCharacterLib() {
  var overlay = document.getElementById('character-lib-overlay');
  if (!overlay) return;
  currentQuery = '';
  currentGroup = 'all';
  selectedId = null;
  var searchInput = document.getElementById('cl-search-input');
  if (searchInput) searchInput.value = '';
  renderTabs();
  renderList();
  clearForm();
  overlay.classList.add('open');
}

function closeCharacterLib() {
  var overlay = document.getElementById('character-lib-overlay');
  if (overlay) overlay.classList.remove('open');
}

export function buildCharacterLib() {
  var overlay = el('div', { className: 'modal-overlay', id: 'character-lib-overlay' });

  var searchInput = el('input', {
    id: 'cl-search-input',
    className: 'modal-input cl-search-input',
    type: 'text',
    placeholder: '\u641c\u7d22\u4eba\u7269...',
  });
  searchInput.addEventListener('input', function () {
    currentQuery = searchInput.value.trim();
    renderList();
  });

  tabsContainer = el('div', { className: 'cl-tabs' });

  listContainer = el('div', { id: 'cl-list-container', className: 'cl-list-container' });

  var leftPanel = el('div', { className: 'cl-left' },
    searchInput,
    tabsContainer,
    listContainer,
  );

  nameInput = el('input', { className: 'modal-input cl-field-input', dataset: { field: 'name' }, type: 'text', placeholder: '\u89d2\u8272\u540d\u79f0' });

  genderInput = el('select', { className: 'modal-input cl-field-input', dataset: { field: 'gender' } });
  genderInput.appendChild(el('option', { value: '' }, '\u672a\u8bbe\u5b9a'));
  genderInput.appendChild(el('option', { value: '\u7537' }, '\u7537'));
  genderInput.appendChild(el('option', { value: '\u5973' }, '\u5973'));
  genderInput.appendChild(el('option', { value: '\u5176\u4ed6' }, '\u5176\u4ed6'));

  appearanceInput = el('textarea', { className: 'modal-input cl-field-textarea', dataset: { field: 'appearance' }, placeholder: '\u63cf\u8ff0\u89d2\u8272\u7684\u5916\u8c8c\u7279\u5f81', rows: '3' });
  personalityInput = el('textarea', { className: 'modal-input cl-field-textarea', dataset: { field: 'personality' }, placeholder: '\u63cf\u8ff0\u89d2\u8272\u7684\u6027\u683c', rows: '3' });
  backstoryInput = el('textarea', { className: 'modal-input cl-field-textarea', dataset: { field: 'backstory' }, placeholder: '\u89d2\u8272\u7684\u80cc\u666f\u7ecf\u5386', rows: '3' });
  relationshipsInput = el('textarea', { className: 'modal-input cl-field-textarea', dataset: { field: 'relationships' }, placeholder: '\u4e0e\u5176\u4ed6\u89d2\u8272\u7684\u5173\u7cfb', rows: '3' });
  quotesInput = el('textarea', { className: 'modal-input cl-field-textarea', dataset: { field: 'quotes' }, placeholder: '\u89d2\u8272\u7684\u7ecf\u5178\u53f0\u8bcd\u6216\u8bed\u5f55', rows: '3' });
  notesInput = el('textarea', { className: 'modal-input cl-field-textarea', dataset: { field: 'notes' }, placeholder: '\u5176\u4ed6\u5907\u6ce8\u4fe1\u606f', rows: '3' });
  groupInput = el('input', { className: 'modal-input cl-field-input', dataset: { field: 'group' }, type: 'text', placeholder: '\u4eba\u7269\u5206\u7ec4' });

  var detailForm = el('div', { id: 'cl-detail-form', className: 'cl-detail-form' },
    el('div', { className: 'cl-field-row' },
      el('label', { className: 'modal-label' }, FIELD_DEFS[0].label),
      nameInput,
    ),
    el('div', { className: 'cl-field-row' },
      el('label', { className: 'modal-label' }, FIELD_DEFS[1].label),
      genderInput,
    ),
    el('div', { className: 'cl-field-row' },
      el('label', { className: 'modal-label' }, '\u5206\u7ec4'),
      groupInput,
    ),
    el('div', { className: 'cl-field-row' },
      el('label', { className: 'modal-label' }, FIELD_DEFS[2].label),
      appearanceInput,
    ),
    el('div', { className: 'cl-field-row' },
      el('label', { className: 'modal-label' }, FIELD_DEFS[3].label),
      personalityInput,
    ),
    el('div', { className: 'cl-field-row' },
      el('label', { className: 'modal-label' }, FIELD_DEFS[4].label),
      backstoryInput,
    ),
    el('div', { className: 'cl-field-row' },
      el('label', { className: 'modal-label' }, FIELD_DEFS[5].label),
      relationshipsInput,
    ),
    el('div', { className: 'cl-field-row' },
      el('label', { className: 'modal-label' }, FIELD_DEFS[6].label),
      quotesInput,
    ),
    el('div', { className: 'cl-field-row' },
      el('label', { className: 'modal-label' }, FIELD_DEFS[7].label),
      notesInput,
    ),
  );

  var btnSave = el('button', { className: 'modal-btn modal-btn-primary' }, '\u4fdd\u5b58');
  btnSave.addEventListener('click', handleSave);

  var btnCancel = el('button', { className: 'modal-btn modal-btn-ghost' }, '\u53d6\u6d88');
  btnCancel.addEventListener('click', function () {
    if (selectedId) {
      var character = getById(selectedId);
      if (character) setFormValues(character);
    }
  });

  var detailActions = el('div', { className: 'cl-detail-actions' }, btnSave, btnCancel);

  detailPanel = el('div', { className: 'cl-right' },
    el('div', { className: 'cl-detail-title' }, '\u89d2\u8272\u8be6\u60c5'),
    detailForm,
    detailActions,
  );

  var content = el('div', { className: 'cl-content' }, leftPanel, detailPanel);

  var btnCreate = el('button', { className: 'modal-btn modal-btn-primary' }, '\u65b0\u589e\u4eba\u7269');
  btnCreate.addEventListener('click', handleCreate);

  var btnClear = el('button', { className: 'modal-btn modal-btn-danger' }, '\u6e05\u7a7a');
  btnClear.addEventListener('click', handleClearAll);

  var btnClose = el('button', { className: 'modal-btn modal-btn-ghost' }, '\u5173\u95ed');
  btnClose.addEventListener('click', closeCharacterLib);

  var card = el('div', { className: 'modal-card modal-card-charlib' },
    el('div', { className: 'modal-header' },
      el('h3', { className: 'modal-title' }, '\u4eba\u7269\u89d2\u8272\u5e93'),
    ),
    el('div', { className: 'modal-body' }, content),
    el('div', { className: 'modal-footer' }, btnCreate, btnClear, btnClose),
  );

  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeCharacterLib(); });
  card.addEventListener('click', function (e) { e.stopPropagation(); });
  overlay.appendChild(card);

  return overlay;
}

export function initCharacterLib() {
  bus.on('modal:open-character-lib', openCharacterLib);
}
