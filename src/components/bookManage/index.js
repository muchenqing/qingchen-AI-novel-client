import { el } from '../../utils/helper.js';
import { formatDate } from '../../utils/format.js';
import {
  createBook, getBook, updateBookInfo, addVolume, removeVolume,
  addChapter, removeChapter, renameChapter, toggleBookmark,
  moveChapter, toggleVolumeCollapse, getBookStats, exportChapterContent,
} from '../../core/bookProject.js';
import { showConfirmDialog } from '../common/confirmDialog.js';
import appState from '../../core/appState.js';
import bus from '../../event/bus.js';

var treeContainer = null;
var statsContainer = null;
var infoBar = null;
var bookmarkSection = null;

function openBookManage() {
  var overlay = document.getElementById('book-manage-overlay');
  if (!overlay) return;
  renderAll();
  overlay.classList.add('open');
}

function closeBookManage() {
  var overlay = document.getElementById('book-manage-overlay');
  if (overlay) overlay.classList.remove('open');
}

function renderAll() {
  var book = getBook();
  renderInfoBar(book);
  renderStats(book);
  renderTree(book);
  renderBookmarks(book);
}

function renderInfoBar(book) {
  if (!infoBar) return;
  infoBar.innerHTML = '';
  if (!book) {
    var btnCreate = el('button', { className: 'modal-btn modal-btn-primary' }, '创建书籍');
    btnCreate.addEventListener('click', function () {
      createBook({ title: '新书籍' });
      renderAll();
      bus.emit('status:set', '书籍已创建');
    });
    infoBar.appendChild(
      el('div', { className: 'bm-empty' },
        el('div', { className: 'bm-empty-icon' }, '📖'),
        el('div', { className: 'bm-empty-text' }, '尚未创建书籍'),
        el('div', { className: 'bm-empty-sub' }, '点击下方按钮开始创作'),
        btnCreate,
      ),
    );
    return;
  }

  infoBar.appendChild(
    el('div', { className: 'bm-info-row' },
      el('span', { className: 'bm-info-label' }, '书名'),
      el('span', { className: 'bm-info-value bm-editable', dataset: { field: 'title' } }, book.title || '未命名'),
    ),
    el('div', { className: 'bm-info-row' },
      el('span', { className: 'bm-info-label' }, '作者'),
      el('span', { className: 'bm-info-value bm-editable', dataset: { field: 'author' } }, book.author || '未填写'),
    ),
    el('div', { className: 'bm-info-row' },
      el('span', { className: 'bm-info-label' }, '简介'),
      el('span', { className: 'bm-info-value bm-editable', dataset: { field: 'description' } }, book.description || '暂无简介'),
    ),
    el('div', { className: 'bm-info-row bm-info-time' },
      el('span', { className: 'bm-info-label' }, '更新'),
      el('span', { className: 'bm-info-value' }, formatDate(book.updatedAt || Date.now())),
    ),
  );

  var editables = infoBar.querySelectorAll('.bm-editable');
  for (var i = 0; i < editables.length; i++) {
    editables[i].addEventListener('click', handleEditableClick);
  }
}

function handleEditableClick(e) {
  var target = e.currentTarget;
  var field = target.dataset.field;
  var book = getBook();
  if (!book) return;
  var currentVal = book[field] || '';

  var input = el('input', {
    className: 'bm-inline-input',
    type: 'text',
    value: currentVal,
  });

  target.innerHTML = '';
  target.appendChild(input);
  input.focus();
  input.select();

  function commit() {
    var newVal = input.value.trim();
    if (newVal && newVal !== currentVal) {
      var update = {};
      update[field] = newVal;
      updateBookInfo(update);
      bus.emit('status:set', '书籍信息已更新');
    }
    renderInfoBar(getBook());
  }

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      input.blur();
    } else if (ev.key === 'Escape') {
      input.removeEventListener('blur', commit);
      renderInfoBar(getBook());
    }
  });
}

function renderStats(book) {
  if (!statsContainer) return;
  statsContainer.innerHTML = '';
  if (!book) {
    statsContainer.appendChild(el('span', { className: 'bm-stats-item' }, '总字数 0'));
    statsContainer.appendChild(el('span', { className: 'bm-stats-item' }, '章节 0'));
    statsContainer.appendChild(el('span', { className: 'bm-stats-item' }, '分卷 0'));
    return;
  }
  var stats = getBookStats();
  statsContainer.appendChild(el('span', { className: 'bm-stats-item' }, '总字数 ' + stats.totalWords.toLocaleString()));
  statsContainer.appendChild(el('span', { className: 'bm-stats-item' }, '章节 ' + stats.totalChapters));
  statsContainer.appendChild(el('span', { className: 'bm-stats-item' }, '分卷 ' + stats.totalVolumes));
}

function renderTree(book) {
  if (!treeContainer) return;
  treeContainer.innerHTML = '';
  if (!book || !book.volumes || book.volumes.length === 0) {
    treeContainer.appendChild(
      el('div', { className: 'bm-tree-empty' }, '暂无分卷，点击下方"新增分卷"开始'),
    );
    return;
  }

  for (var vi = 0; vi < book.volumes.length; vi++) {
    var volume = book.volumes[vi];
    var isCollapsed = !!volume.collapsed;

    var toggleIcon = el('span', {
      className: 'bm-vol-toggle',
      innerHTML: isCollapsed ? '&#9654;' : '&#9660;',
    });

    var btnAddCh = el('button', { className: 'bm-icon-btn bm-add-ch-btn', title: '新增章节' }, '+');
    btnAddCh.dataset.volumeId = volume.id;
    btnAddCh.addEventListener('click', handleAddChapter);

    var btnDelVol = el('button', { className: 'bm-icon-btn bm-del-btn', title: '删除分卷' }, '\u00D7');
    btnDelVol.dataset.volumeId = volume.id;
    btnDelVol.addEventListener('click', handleRemoveVolume);

    var volHeader = el('div', { className: 'bm-vol-header', dataset: { volumeId: volume.id } },
      toggleIcon,
      el('span', { className: 'bm-vol-name' }, volume.name),
      el('span', { className: 'bm-vol-count' }, volume.chapters.length + '章'),
      btnAddCh,
      btnDelVol,
    );
    volHeader.addEventListener('click', handleToggleVolume);

    treeContainer.appendChild(volHeader);

    if (!isCollapsed && volume.chapters && volume.chapters.length > 0) {
      var chList = el('div', { className: 'bm-ch-list' });
      for (var ci = 0; ci < volume.chapters.length; ci++) {
        var ch = volume.chapters[ci];
        chList.appendChild(buildChapterItem(volume, ch, ci));
      }
      treeContainer.appendChild(chList);
    }
  }
}

function buildChapterItem(volume, chapter, index) {
  var dragHandle = el('span', {
    className: 'bm-drag-handle',
    dataset: { volumeId: volume.id, chapterId: chapter.id, index: index },
    innerHTML: '&#9776;',
  });
  dragHandle.addEventListener('mousedown', handleDragStart);

  var starClass = 'bm-star' + (chapter.bookmark ? ' bm-star-active' : '');
  var btnStar = el('span', { className: starClass }, '\u2605');
  btnStar.dataset.chapterId = chapter.id;
  btnStar.addEventListener('click', function (ev) {
    ev.stopPropagation();
    toggleBookmark(chapter.id);
    renderTree(getBook());
    renderBookmarks(getBook());
  });

  var btnRename = el('button', { className: 'bm-icon-btn bm-rename-btn', title: '重命名' }, '\u270E');
  btnRename.dataset.chapterId = chapter.id;
  btnRename.dataset.chapterName = chapter.name;
  btnRename.addEventListener('click', function (ev) {
    ev.stopPropagation();
    handleRenameChapter(ev.currentTarget);
  });

  var btnDelCh = el('button', { className: 'bm-icon-btn bm-del-btn', title: '删除章节' }, '\u00D7');
  btnDelCh.dataset.chapterId = chapter.id;
  btnDelCh.addEventListener('click', function (ev) {
    ev.stopPropagation();
    handleRemoveChapter(chapter.id, chapter.name);
  });

  var item = el('div', {
    className: 'bm-ch-item',
    dataset: { chapterId: chapter.id },
  },
    dragHandle,
    el('span', { className: 'bm-ch-name' }, chapter.name),
    el('span', { className: 'bm-ch-words' }, (chapter.wordCount || 0).toLocaleString() + '字'),
    btnStar,
    btnRename,
    btnDelCh,
  );
  item.addEventListener('click', function () {
    handleLoadChapter(chapter.id);
  });
  return item;
}

function handleToggleVolume(e) {
  var header = e.currentTarget;
  var volumeId = header.dataset.volumeId;
  if (e.target.closest('.bm-icon-btn')) return;
  toggleVolumeCollapse(volumeId);
  renderTree(getBook());
}

function handleAddChapter(e) {
  e.stopPropagation();
  var volumeId = e.currentTarget.dataset.volumeId;
  var result = addChapter(volumeId);
  if (result && result.success) {
    renderTree(getBook());
    renderStats(getBook());
    bus.emit('status:set', '章节已添加');
  }
}

function handleRemoveVolume(e) {
  e.stopPropagation();
  var volumeId = e.currentTarget.dataset.volumeId;
  var book = getBook();
  var volName = '';
  if (book) {
    for (var i = 0; i < book.volumes.length; i++) {
      if (book.volumes[i].id === volumeId) {
        volName = book.volumes[i].name;
        break;
      }
    }
  }
  showConfirmDialog('确定要删除分卷「' + volName + '」及其所有章节吗？此操作不可撤销。', function () {
    removeVolume(volumeId);
    renderAll();
    bus.emit('status:set', '分卷已删除');
  });
}

function handleRemoveChapter(chapterId, chapterName) {
  showConfirmDialog('确定要删除章节「' + chapterName + '」吗？此操作不可撤销。', function () {
    removeChapter(chapterId);
    renderAll();
    bus.emit('status:set', '章节已删除');
  });
}

function handleRenameChapter(btn) {
  var chapterId = btn.dataset.chapterId;
  var currentName = btn.dataset.chapterName;
  var item = btn.closest('.bm-ch-item');
  if (!item) return;

  var nameEl = item.querySelector('.bm-ch-name');
  if (!nameEl) return;

  var input = el('input', {
    className: 'bm-inline-input bm-rename-input',
    type: 'text',
    value: currentName,
  });

  nameEl.innerHTML = '';
  nameEl.appendChild(input);
  input.focus();
  input.select();

  function commit() {
    var newName = input.value.trim();
    if (newName && newName !== currentName) {
      renameChapter(chapterId, newName);
      bus.emit('status:set', '章节已重命名');
    }
    renderTree(getBook());
  }

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      input.blur();
    } else if (ev.key === 'Escape') {
      input.removeEventListener('blur', commit);
      renderTree(getBook());
    }
  });
}

function handleLoadChapter(chapterId) {
  bus.emit('manuscript:switched', chapterId);
  bus.emit('status:set', '已切换到该章节');
}

function renderBookmarks(book) {
  if (!bookmarkSection) return;
  bookmarkSection.innerHTML = '';
  if (!book) return;

  var bookmarks = [];
  for (var vi = 0; vi < book.volumes.length; vi++) {
    for (var ci = 0; ci < book.volumes[vi].chapters.length; ci++) {
      var ch = book.volumes[vi].chapters[ci];
      if (ch.bookmark) {
        bookmarks.push({ chapter: ch, volumeName: book.volumes[vi].name });
      }
    }
  }

  if (bookmarks.length === 0) {
    bookmarkSection.appendChild(el('div', { className: 'bm-bm-empty' }, '暂无书签'));
    return;
  }

  for (var i = 0; i < bookmarks.length; i++) {
    var bm = bookmarks[i];
    var bmItem = el('div', { className: 'bm-bm-item', dataset: { chapterId: bm.chapter.id } },
      el('span', { className: 'bm-star bm-star-active' }, '\u2605'),
      el('span', { className: 'bm-bm-vol' }, '[' + bm.volumeName + ']'),
      el('span', { className: 'bm-bm-name' }, bm.chapter.name),
      el('span', { className: 'bm-bm-words' }, (bm.chapter.wordCount || 0).toLocaleString() + '字'),
    );
    bmItem.addEventListener('click', (function (chId) {
      return function () {
        handleLoadChapter(chId);
      };
    })(bm.chapter.id));
    bookmarkSection.appendChild(bmItem);
  }
}

function handleExportAll() {
  var book = getBook();
  if (!book) {
    bus.emit('status:set', '无可导出的书籍');
    return;
  }
  var allText = '';
  allText += book.title + '\n';
  allText += '作者：' + (book.author || '佚名') + '\n\n';
  for (var vi = 0; vi < book.volumes.length; vi++) {
    var volume = book.volumes[vi];
    allText += '\n' + '='.repeat(30) + '\n';
    allText += volume.name + '\n';
    allText += '='.repeat(30) + '\n';
    for (var ci = 0; ci < volume.chapters.length; ci++) {
      var content = exportChapterContent(volume.chapters[ci].id);
      if (content) {
        allText += '\n' + content + '\n';
      }
    }
  }

  var blob = new Blob([allText], { type: 'text/plain;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = el('a', { href: url, download: book.title + '.txt' });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  bus.emit('status:set', '全书已导出');
}

var dragState = null;

function handleDragStart(e) {
  var handle = e.currentTarget;
  var chapterId = handle.dataset.chapterId;
  var volumeId = handle.dataset.volumeId;
  var startIndex = parseInt(handle.dataset.index, 10);

  dragState = {
    chapterId: chapterId,
    volumeId: volumeId,
    startIndex: startIndex,
  };

  document.addEventListener('mouseup', handleDragEnd);
  document.addEventListener('mousemove', handleDragMove);
}

function handleDragMove(e) {
  if (!dragState) return;
  var items = treeContainer.querySelectorAll('.bm-ch-item');
  for (var i = 0; i < items.length; i++) {
    items[i].classList.remove('bm-drag-over');
  }
  var target = document.elementFromPoint(e.clientX, e.clientY);
  if (target) {
    var item = target.closest('.bm-ch-item');
    if (item && item.dataset.chapterId !== dragState.chapterId) {
      item.classList.add('bm-drag-over');
    }
  }
}

function handleDragEnd(e) {
  document.removeEventListener('mouseup', handleDragEnd);
  document.removeEventListener('mousemove', handleDragMove);

  if (!dragState) return;

  var items = treeContainer.querySelectorAll('.bm-ch-item');
  var targetIndex = dragState.startIndex;
  var target = document.elementFromPoint(e.clientX, e.clientY);

  if (target) {
    var item = target.closest('.bm-ch-item');
    if (item && item.dataset.chapterId !== dragState.chapterId) {
      for (var i = 0; i < items.length; i++) {
        if (items[i].dataset.chapterId === item.dataset.chapterId) {
          targetIndex = i;
          break;
        }
      }
    }
  }

  for (var j = 0; j < items.length; j++) {
    items[j].classList.remove('bm-drag-over');
  }

  if (targetIndex !== dragState.startIndex) {
    moveChapter(dragState.volumeId, dragState.chapterId, targetIndex);
    renderTree(getBook());
  }

  dragState = null;
}

function handleAddVolume() {
  var book = getBook();
  var name = '第' + ((book ? book.volumes.length : 0) + 1) + '卷';
  var result = addVolume(name);
  if (result && result.success) {
    renderAll();
    bus.emit('status:set', '分卷已添加');
  }
}

export function buildBookManage() {
  var overlay = el('div', { className: 'modal-overlay', id: 'book-manage-overlay' });

  infoBar = el('div', { className: 'bm-info-bar' });
  statsContainer = el('div', { className: 'bm-stats-bar' });
  treeContainer = el('div', { className: 'bm-tree-container' });
  bookmarkSection = el('div', { className: 'bm-bookmark-section' });

  treeContainer.style.maxHeight = '400px';
  treeContainer.style.overflowY = 'auto';

  var treeWrapper = el('div', { className: 'bm-tree-wrapper' },
    el('div', { className: 'bm-section-header' }, '章节结构'),
    treeContainer,
  );

  var bookmarkWrapper = el('div', { className: 'bm-bookmark-wrapper' },
    el('div', { className: 'bm-section-header' }, '书签快跳'),
    bookmarkSection,
  );

  var btnAddVolume = el('button', { className: 'modal-btn modal-btn-secondary' }, '新增分卷');
  btnAddVolume.addEventListener('click', handleAddVolume);

  var btnExport = el('button', { className: 'modal-btn modal-btn-secondary' }, '导出全书');
  btnExport.addEventListener('click', handleExportAll);

  var btnClose = el('button', { className: 'modal-btn modal-btn-ghost' }, '关闭');
  btnClose.addEventListener('click', closeBookManage);

  var card = el('div', { className: 'modal-card modal-card-book-manage' },
    el('div', { className: 'modal-header' },
      el('h3', { className: 'modal-title' }, '书籍管理'),
    ),
    el('div', { className: 'modal-body' },
      infoBar,
      statsContainer,
      treeWrapper,
      bookmarkWrapper,
    ),
    el('div', { className: 'modal-footer' }, btnAddVolume, btnExport, btnClose),
  );

  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeBookManage(); });
  card.addEventListener('click', function (e) { e.stopPropagation(); });
  overlay.appendChild(card);

  return overlay;
}

export function initBookManage() {
  bus.on('modal:open-book-manage', openBookManage);
  bus.on('book:structure-changed', function () {
    var overlay = document.getElementById('book-manage-overlay');
    if (overlay && overlay.classList.contains('open')) {
      renderAll();
    }
  });
}
