import { el } from '../../utils/helper.js';
import { getAll, create, update, remove, search, getByCategory, toggleFavorite, CATEGORIES } from '../../store/materialStore.js';
import { showConfirmDialog } from '../common/confirmDialog.js';
import appState from '../../core/appState.js';
import bus from '../../event/bus.js';

var currentCategory = 'all';
var searchQuery = '';
var selectedId = null;
var editingId = null;

var listEl = null;
var detailEl = null;
var searchInput = null;
var tabsEl = null;

function openMaterialLib() {
  var overlay = document.getElementById('material-lib-overlay');
  if (!overlay) return;
  currentCategory = 'all';
  searchQuery = '';
  selectedId = null;
  editingId = null;
  if (searchInput) searchInput.value = '';
  refreshTabs();
  refreshList();
  renderDetail();
  overlay.classList.add('open');
}

function closeMaterialLib() {
  var overlay = document.getElementById('material-lib-overlay');
  if (overlay) overlay.classList.remove('open');
}

function getFilteredMaterials() {
  var list;
  if (searchQuery) {
    list = search(searchQuery);
  } else if (currentCategory === 'all') {
    list = getAll();
  } else {
    list = getByCategory(currentCategory);
  }
  return list;
}

function getCategoryLabel(key) {
  for (var i = 0; i < CATEGORIES.length; i++) {
    if (CATEGORIES[i].key === key) return CATEGORIES[i].label;
  }
  return '其他';
}

function truncate(text, len) {
  if (!text) return '';
  return text.length > len ? text.slice(0, len) + '...' : text;
}

function refreshTabs() {
  if (!tabsEl) return;
  tabsEl.innerHTML = '';
  var allTab = el('button', {
    className: 'ml-tab' + (currentCategory === 'all' ? ' active' : ''),
    dataset: { cat: 'all' },
  }, '全部');
  allTab.addEventListener('click', function () {
    currentCategory = 'all';
    refreshTabs();
    refreshList();
  });
  tabsEl.appendChild(allTab);

  for (var i = 0; i < CATEGORIES.length; i++) {
    (function (cat) {
      var tab = el('button', {
        className: 'ml-tab' + (currentCategory === cat.key ? ' active' : ''),
        dataset: { cat: cat.key },
      }, cat.label);
      tab.addEventListener('click', function () {
        currentCategory = cat.key;
        refreshTabs();
        refreshList();
      });
      tabsEl.appendChild(tab);
    })(CATEGORIES[i]);
  }
}

function refreshList() {
  if (!listEl) return;
  listEl.innerHTML = '';
  var materials = getFilteredMaterials();

  if (materials.length === 0) {
    listEl.appendChild(el('div', { className: 'ml-empty' }, '暂无素材'));
    return;
  }

  for (var i = 0; i < materials.length; i++) {
    (function (m) {
      var isSelected = selectedId === m.id;
      var starText = m.favorite ? '\u2605' : '\u2606';
      var starBtn = el('button', { className: 'ml-star' + (m.favorite ? ' ml-star-active' : '') }, starText);
      starBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleFavorite(m.id);
        refreshList();
      });

      var delBtn = el('button', { className: 'ml-item-del' }, '\u00d7');
      delBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        showConfirmDialog('确定要删除素材"' + m.title + '"吗？', function () {
          remove(m.id);
          if (selectedId === m.id) {
            selectedId = null;
            editingId = null;
            renderDetail();
          }
          refreshList();
        });
      });

      var tagEl = el('span', { className: 'ml-tag' }, getCategoryLabel(m.category));

      var row = el('div', { className: 'ml-item' + (isSelected ? ' ml-item-active' : '') },
        el('div', { className: 'ml-item-header' },
          el('span', { className: 'ml-item-title' }, m.title || '未命名素材'),
          starBtn,
          delBtn,
        ),
        el('div', { className: 'ml-item-preview' }, truncate(m.content, 60)),
        el('div', { className: 'ml-item-footer' }, tagEl),
      );

      row.addEventListener('click', function () {
        selectedId = m.id;
        editingId = null;
        refreshList();
        renderDetail();
      });

      listEl.appendChild(row);
    })(materials[i]);
  }
}

function renderDetail() {
  if (!detailEl) return;
  detailEl.innerHTML = '';

  if (!selectedId) {
    detailEl.appendChild(el('div', { className: 'ml-detail-empty' }, '选择左侧素材查看详情'));
    return;
  }

  var material = null;
  var all = getAll();
  for (var i = 0; i < all.length; i++) {
    if (all[i].id === selectedId) { material = all[i]; break; }
  }
  if (!material) {
    detailEl.appendChild(el('div', { className: 'ml-detail-empty' }, '素材不存在'));
    return;
  }

  var isEditing = editingId === material.id;

  if (!isEditing) {
    var titleView = el('div', { className: 'ml-detail-title' }, material.title || '未命名素材');
    var catView = el('span', { className: 'ml-tag' }, getCategoryLabel(material.category));
    var contentView = el('div', { className: 'ml-detail-content' }, material.content || '（无内容）');
    var tagsText = material.tags && material.tags.length ? material.tags.join(', ') : '无标签';
    var tagsView = el('div', { className: 'ml-detail-tags' }, '标签: ' + tagsText);

    var editBtn = el('button', { className: 'modal-btn modal-btn-secondary' }, '编辑');
    editBtn.addEventListener('click', function () {
      editingId = material.id;
      renderDetail();
    });

    detailEl.appendChild(titleView);
    detailEl.appendChild(catView);
    detailEl.appendChild(contentView);
    detailEl.appendChild(tagsView);
    detailEl.appendChild(editBtn);
    return;
  }

  var titleInput = el('input', { className: 'modal-input', type: 'text', value: material.title || '', placeholder: '素材标题' });

  var catSelect = el('select', { className: 'modal-input' });
  for (var c = 0; c < CATEGORIES.length; c++) {
    var opt = el('option', { value: CATEGORIES[c].key }, CATEGORIES[c].label);
    if (CATEGORIES[c].key === material.category) opt.selected = true;
    catSelect.appendChild(opt);
  }

  var contentTA = el('textarea', {
    className: 'modal-input ml-textarea',
    placeholder: '素材内容',
  });
  contentTA.value = material.content || '';

  var tagsInput = el('input', {
    className: 'modal-input',
    type: 'text',
    value: material.tags ? material.tags.join(', ') : '',
    placeholder: '标签（逗号分隔）',
  });

  var saveBtn = el('button', { className: 'modal-btn modal-btn-primary' }, '保存');
  saveBtn.addEventListener('click', function () {
    var tagsRaw = tagsInput.value.split(',');
    var tags = [];
    for (var t = 0; t < tagsRaw.length; t++) {
      var trimmed = tagsRaw[t].trim();
      if (trimmed) tags.push(trimmed);
    }
    update(material.id, {
      title: titleInput.value.trim(),
      category: catSelect.value,
      content: contentTA.value,
      tags: tags,
    });
    editingId = null;
    refreshList();
    renderDetail();
    bus.emit('status:set', '素材已保存');
  });

  var cancelBtn = el('button', { className: 'modal-btn modal-btn-ghost' }, '取消');
  cancelBtn.addEventListener('click', function () {
    editingId = null;
    renderDetail();
  });

  detailEl.appendChild(el('label', { className: 'modal-label' }, '标题'));
  detailEl.appendChild(titleInput);
  detailEl.appendChild(el('label', { className: 'modal-label' }, '分类'));
  detailEl.appendChild(catSelect);
  detailEl.appendChild(el('label', { className: 'modal-label' }, '内容'));
  detailEl.appendChild(contentTA);
  detailEl.appendChild(el('label', { className: 'modal-label' }, '标签'));
  detailEl.appendChild(tagsInput);
  detailEl.appendChild(el('div', { className: 'ml-edit-actions' }, saveBtn, cancelBtn));
}

function handleNewMaterial() {
  var result = create({ title: '新素材', content: '', category: currentCategory === 'all' ? 'other' : currentCategory, tags: [] });
  if (result.success) {
    selectedId = result.material.id;
    editingId = result.material.id;
    refreshList();
    renderDetail();
    bus.emit('status:set', '素材已创建');
  }
}

function handleInsert() {
  if (!selectedId) return;
  var all = getAll();
  var material = null;
  for (var i = 0; i < all.length; i++) {
    if (all[i].id === selectedId) { material = all[i]; break; }
  }
  if (material && material.content) {
    bus.emit('editor:apply-content', material.content);
    bus.emit('status:set', '素材已插入编辑器');
  }
}

function handleSearchInput() {
  searchQuery = searchInput ? searchInput.value.trim() : '';
  refreshList();
}

export function buildMaterialLib() {
  var overlay = el('div', { className: 'modal-overlay', id: 'material-lib-overlay' });

  tabsEl = el('div', { className: 'ml-tabs' });

  searchInput = el('input', {
    className: 'modal-input ml-search',
    type: 'text',
    placeholder: '搜索素材...',
  });
  searchInput.addEventListener('input', handleSearchInput);

  listEl = el('div', { className: 'ml-list' });

  detailEl = el('div', { className: 'ml-detail' });

  var contentArea = el('div', { className: 'ml-content' },
    el('div', { className: 'ml-left' }, tabsEl, searchInput, listEl),
    detailEl,
  );

  var btnNew = el('button', { className: 'modal-btn modal-btn-primary' }, '新增素材');
  btnNew.addEventListener('click', handleNewMaterial);

  var btnInsert = el('button', { className: 'modal-btn modal-btn-primary' }, '插入编辑器');
  btnInsert.addEventListener('click', handleInsert);

  var btnClose = el('button', { className: 'modal-btn modal-btn-ghost' }, '关闭');
  btnClose.addEventListener('click', closeMaterialLib);

  var card = el('div', { className: 'modal-card modal-card-material' },
    el('div', { className: 'modal-header' },
      el('h3', { className: 'modal-title' }, '素材库'),
    ),
    el('div', { className: 'modal-body' }, contentArea),
    el('div', { className: 'modal-footer' }, btnNew, btnInsert, btnClose),
  );

  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeMaterialLib(); });
  card.addEventListener('click', function (e) { e.stopPropagation(); });
  overlay.appendChild(card);

  refreshTabs();
  refreshList();
  renderDetail();

  return overlay;
}

export function initMaterialLib() {
  bus.on('modal:open-material-lib', openMaterialLib);
}
