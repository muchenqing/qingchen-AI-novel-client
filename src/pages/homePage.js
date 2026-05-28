/**
 * 小说管理首页组件
 * @description 展示所有小说的卡片网格、搜索、新建、重命名、删除
 */

import { el, generateId } from '../utils/helper.js';
import appState from '../core/appState.js';
import bus from '../event/bus.js';
import { loadTheme, saveTheme, saveNovels } from '../utils/storage.js';
import { formatDate, formatWordCount } from '../utils/format.js';
import { detectChapterSplit } from '../utils/chapterParser.js';
import { createFileInput } from '../utils/fileParse.js';

var pageEl = null;
var contextMenuEl = null;
var targetNovelId = null;
var themePopupEl = null;

var THEME_LIST = [
  { key: 'mint', label: '薄荷绿', color: '#7EC8A3' },
  { key: 'paper', label: '米白纸', color: '#B8A088' },
  { key: 'fog', label: '雾蓝灰', color: '#8AA3B8' },
  { key: 'taro', label: '紫芋色', color: '#B098C8' },
];

function getCurrentTheme() {
  return loadTheme() || 'mint';
}

function applyBodyTheme(name) {
  var body = document.body;
  var classes = body.className.split(' ').filter(function (c) {
    return c.indexOf('theme-') !== 0 && c !== 'zen-mode';
  });
  classes.push('theme-' + name);
  if (body.classList.contains('zen-mode')) {
    classes.push('zen-mode');
  }
  body.className = classes.join(' ');
}

function buildThemeSwitcher() {
  var container = el('div', { style: 'position: relative;' });

  var triggerBtn = el('button', {
    className: 'btn-icon',
    id: 'theme-trigger-btn',
    title: '切换主题',
    style: 'font-size: 18px;',
  }, '\uD83C\uDFA8');

  var popup = el('div', { className: 'theme-switcher-popup', id: 'theme-switcher-popup' });

  var currentTheme = getCurrentTheme();

  for (var i = 0; i < THEME_LIST.length; i++) {
    (function (theme) {
      var isActive = theme.key === currentTheme;
      var dot = el('span', {
        className: 'theme-dot theme-dot-' + theme.key,
        style: 'background: ' + theme.color + ';',
      });
      var option = el('button', {
        className: 'theme-option' + (isActive ? ' active' : ''),
        dataset: { theme: theme.key },
      }, dot, theme.label);

      option.addEventListener('click', function () {
        var newTheme = theme.key;
        saveTheme(newTheme);
        applyBodyTheme(newTheme);
        appState.setCurrentTheme(newTheme);

        var options = popup.querySelectorAll('.theme-option');
        for (var j = 0; j < options.length; j++) {
          options[j].classList.toggle('active', options[j].dataset.theme === newTheme);
        }

        popup.classList.remove('show');
        showToast('success', '已切换至「' + theme.label + '」');
      });

      popup.appendChild(option);
    })(THEME_LIST[i]);
  }

  triggerBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    popup.classList.toggle('show');
  });

  document.addEventListener('click', function (e) {
    if (!container.contains(e.target)) {
      popup.classList.remove('show');
    }
  });

  container.appendChild(triggerBtn);
  container.appendChild(popup);
  return container;
}

function buildLogo() {
  return el('div', { className: 'home-logo' },
    el('div', { className: 'home-logo-icon' }, '卿'),
    el('div', null,
      el('div', { className: 'home-logo-text' }, '卿辰'),
      el('div', { className: 'home-logo-sub' }, 'AI Novel Studio'),
    ),
  );
}

function buildSearchBar() {
  var searchBox = el('div', { className: 'home-search' },
    el('span', { className: 'home-search-icon' }, '\uD83D\uDD0D'),
    el('input', {
      className: 'input',
      id: 'home-search-input',
      type: 'text',
      placeholder: '搜索小说...',
    }),
  );
  var input = searchBox.querySelector('#home-search-input');
  input.addEventListener('input', function () {
    appState.setSearchQuery(this.value.trim().toLowerCase());
    renderNovelCards();
  });
  return searchBox;
}

function buildContextMenu() {
  var menu = el('div', { className: 'context-menu', id: 'novel-context-menu' },
    el('button', { className: 'context-menu-item', id: 'ctx-rename', dataset: { action: 'rename' } }, '\u270F 重命名'),
    el('button', { className: 'context-menu-item danger', id: 'ctx-delete', dataset: { action: 'delete' } }, '\uD83D\uDDD1 删除'),
  );

  menu.querySelector('#ctx-rename').addEventListener('click', function () {
    var novelId = targetNovelId;
    hideContextMenu();
    if (novelId) showRenameModal(novelId);
  });

  menu.querySelector('#ctx-delete').addEventListener('click', function () {
    var novelId = targetNovelId;
    hideContextMenu();
    if (novelId) showDeleteConfirm(novelId);
  });

  document.addEventListener('click', function () {
    hideContextMenu();
  });

  return menu;
}

function showContextMenu(e, novelId) {
  hideContextMenu();
  targetNovelId = novelId;
  contextMenuEl.style.left = e.pageX + 'px';
  contextMenuEl.style.top = e.pageY + 'px';
  contextMenuEl.classList.add('show');
  e.preventDefault();
}

function hideContextMenu() {
  if (contextMenuEl) contextMenuEl.classList.remove('show');
  targetNovelId = null;
}

function buildNovelCard(novel, index) {
  var coverColors = [
    ['#A8DFC0', '#7EC8A3'],
    ['#B8D9E8', '#8BBFCF'],
    ['#E8C8B8', '#D4A892'],
    ['#C8D8C8', '#A8C0A8'],
    ['#D4C8E0', '#B8A8CC'],
  ];
  var colors = coverColors[index % coverColors.length];

  var cover = el('div', {
    className: 'novel-card-cover',
    style: 'background: linear-gradient(135deg, ' + colors[0] + ', ' + colors[1] + ');',
  },
    el('div', { className: 'novel-card-cover-icon' }, '\uD83D\uDCD5'),
  );

  var body = el('div', { className: 'novel-card-body' },
    el('div', { className: 'novel-card-title', title: novel.title }, novel.title),
    el('div', { className: 'novel-card-meta' },
      el('span', { className: 'novel-card-meta-item' }, '\uD83D\uDD52 ' + formatDate(novel.updatedAt)),
      el('span', { className: 'novel-card-meta-item' }, '\uD83D\uDCC4 ' + formatWordCount(novel.wordCount)),
    ),
  );

  var chapterCount = novel.chapters ? novel.chapters.length : 0;
  var footer = el('div', { className: 'novel-card-footer' },
    el('span', { className: 'novel-card-chapter-count' }, chapterCount + ' 章'),
  );

  var card = el('div', { className: 'novel-card' },
    cover,
    body,
    footer,
  );

  card.style.animationDelay = (index * 0.05) + 's';

  card.addEventListener('click', function () {
    bus.emit('page:navigate', 'editor', novel.id);
  });

  card.addEventListener('contextmenu', function (e) {
    showContextMenu(e, novel.id);
  });

  return card;
}

function renderNovelCards() {
  var grid = document.getElementById('novel-grid');
  var emptyState = document.getElementById('novel-empty-state');
  if (!grid || !emptyState) return;

  var novels = appState.getNovels();
  var query = appState.getSearchQuery();

  var filtered = novels;
  if (query) {
    filtered = novels.filter(function (n) {
      return n.title.toLowerCase().indexOf(query) !== -1;
    });
  }

  grid.innerHTML = '';

  if (filtered.length === 0) {
    grid.style.display = 'none';
    emptyState.style.display = '';
  } else {
    grid.style.display = '';
    emptyState.style.display = 'none';
    for (var i = 0; i < filtered.length; i++) {
      grid.appendChild(buildNovelCard(filtered[i], i));
    }
  }
}

function buildEmptyState() {
  return el('div', { className: 'empty-state', id: 'novel-empty-state' },
    el('div', { className: 'empty-state-icon' }, '\uD83D\uDCD6'),
    el('div', { className: 'empty-state-title' }, '暂无小说'),
    el('div', { className: 'empty-state-desc' }, '点击下方按钮创建你的第一部小说，开启创作之旅吧'),
    el('button', {
      className: 'btn btn-primary',
      style: 'margin-top: 12px;',
      onclick: handleCreateNovel,
    }, '+ 新建小说'),
  );
}

function buildFab() {
  var fab = el('button', { className: 'home-fab', title: '新建小说' }, '+');
  fab.addEventListener('click', handleCreateNovel);
  return fab;
}

function handleCreateNovel() {
  var novel = appState.createNovel();
  renderNovelCards();
  bus.emit('page:navigate', 'editor', novel.id);
  showToast('success', '已创建新小说');
}

function handleImportFile() {
  var isElectron = window.electronAPI && typeof window.electronAPI.readFileContent === 'function';

  if (isElectron) {
    window.electronAPI.readFileContent().then(function (result) {
      if (!result.success) {
        if (result.error !== '已取消') {
          showToast('error', result.error || '导入失败');
        }
        return;
      }
      processImportContent(result.text, result.fileName);
    }).catch(function (err) {
      showToast('error', '导入失败: ' + (err.message || '未知错误'));
    });
    return;
  }

  createFileInput().then(function (result) {
    if (!result.success) {
      showToast('error', result.errors ? result.errors.join('；') : '导入失败');
      return;
    }
    var fileName = result.fileName ? result.fileName.replace(/\.txt$/i, '') : '导入小说';
    processImportContent(result.text, fileName);
  }).catch(function (err) {
    if (err.message !== '未选择文件') {
      showToast('error', err.message || '导入失败');
    }
  });
}

function processImportContent(text, fileName) {
  if (!text || !text.trim()) {
    showToast('error', '文件内容为空');
    return;
  }

  var chapters = detectChapterSplit(text);

  if (!chapters || chapters.length === 0) {
    chapters = [{
      title: '第一章',
      content: text.trim(),
      chapterNumber: 1,
      wordCount: countWordsImport(text),
    }];
  }

  var novel = {
    id: generateId(),
    title: fileName || '导入小说',
    chapters: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    wordCount: 0,
  };

  for (var i = 0; i < chapters.length; i++) {
    var ch = chapters[i];
    novel.chapters.push({
      id: generateId(),
      title: ch.title || ('第' + (i + 1) + '章'),
      content: ch.content || '',
      order: i,
      wordCount: ch.wordCount || countWordsImport(ch.content),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  novel.wordCount = novel.chapters.reduce(function (sum, c) { return sum + (c.wordCount || 0); }, 0);

  var novels = appState.getNovels();
  novels.unshift(novel);
  appState.setNovels(novels);
  saveNovels(novels);

  renderNovelCards();
  bus.emit('page:navigate', 'editor', novel.id);
  showToast('success', '已导入《' + novel.title + '》，共 ' + novel.chapters.length + ' 章');
}

function countWordsImport(text) {
  if (!text) return 0;
  var cleaned = text.replace(/\s+/g, '');
  var chinese = cleaned.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
  var english = cleaned.match(/[a-zA-Z]+/g);
  return (chinese ? chinese.length : 0) + (english ? english.length : 0);
}

function showRenameModal(novelId) {
  var novel = appState.getNovel(novelId);
  if (!novel) return;

  var overlay = el('div', { className: 'modal-overlay open', id: 'rename-modal' });

  var card = el('div', { className: 'modal-card' },
    el('div', { className: 'modal-title' }, '重命名小说'),
    el('input', {
      className: 'input',
      id: 'rename-input',
      type: 'text',
      value: novel.title,
      style: 'margin-bottom: 8px;',
    }),
    el('div', { className: 'modal-footer' },
      el('button', { className: 'btn btn-ghost', id: 'rename-cancel' }, '取消'),
      el('button', { className: 'btn btn-primary', id: 'rename-confirm' }, '确定'),
    ),
  );

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  var input = card.querySelector('#rename-input');
  input.focus();
  input.select();

  card.querySelector('#rename-cancel').addEventListener('click', function () {
    document.body.removeChild(overlay);
  });

  card.querySelector('#rename-confirm').addEventListener('click', function () {
    var newTitle = input.value.trim();
    if (newTitle) {
      appState.renameNovel(novelId, newTitle);
      renderNovelCards();
      showToast('success', '已重命名');
    }
    document.body.removeChild(overlay);
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      card.querySelector('#rename-confirm').click();
    } else if (e.key === 'Escape') {
      card.querySelector('#rename-cancel').click();
    }
  });

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) document.body.removeChild(overlay);
  });
}

function showDeleteConfirm(novelId) {
  var novel = appState.getNovel(novelId);
  if (!novel) {
    showToast('error', '小说数据不存在');
    return;
  }

  var overlay = el('div', { className: 'modal-overlay open', id: 'delete-modal' });

  var warningIcon = el('div', { className: 'delete-warning-icon' }, '\u26A0');

  var title = el('div', { className: 'modal-title' }, '删除小说');

  var body = el('div', { className: 'delete-warning-body' },
    el('p', { className: 'delete-warning-text' },
      '确定要删除《' + novel.title + '》吗？'
    ),
    el('p', { className: 'delete-warning-detail' },
      '删除后将清除该小说的所有数据，包括：'
    ),
    el('ul', { className: 'delete-warning-list' },
      el('li', null, novel.chapters.length + ' 个章节内容'),
      el('li', null, '人物设定与世界观数据'),
      el('li', null, 'AI 生成记录与历史'),
      el('li', null, '版本快照与备份数据'),
    ),
    el('p', { className: 'delete-warning-emphasis' }, '此操作不可撤销，请谨慎操作。'),
  );

  var cancelBtn = el('button', {
    className: 'btn btn-ghost',
    id: 'delete-cancel',
  }, '取消');

  var confirmBtn = el('button', {
    className: 'btn btn-danger-solid',
    id: 'delete-confirm',
  }, '确认删除');

  var footer = el('div', { className: 'modal-footer' }, cancelBtn, confirmBtn);

  var card = el('div', { className: 'modal-card delete-modal-card' },
    warningIcon,
    title,
    body,
    footer,
  );

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  var isDeleting = false;

  function closeModal() {
    if (!isDeleting) {
      document.body.removeChild(overlay);
    }
  }

  cancelBtn.addEventListener('click', closeModal);

  confirmBtn.addEventListener('click', function () {
    if (isDeleting) return;
    isDeleting = true;
    confirmBtn.disabled = true;
    confirmBtn.textContent = '删除中...';
    cancelBtn.disabled = true;

    try {
      appState.deleteNovel(novelId);

      if (window.electronAPI && typeof window.electronAPI.cleanupNovel === 'function') {
        window.electronAPI.cleanupNovel(novelId).catch(function () {});
      }

      document.body.removeChild(overlay);
      renderNovelCards();
      showToast('success', '《' + novel.title + '》已删除');
    } catch (err) {
      isDeleting = false;
      confirmBtn.disabled = false;
      confirmBtn.textContent = '确认删除';
      cancelBtn.disabled = false;
      showToast('error', '删除失败: ' + (err.message || '未知错误'));
    }
  });

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', onKey);
    }
  });
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

export function buildHomePage() {
  var settingsBtn = el('button', {
    className: 'btn-icon',
    title: 'AI 设置',
    style: 'font-size: 16px;',
    onclick: function () { bus.emit('modal:open-settings'); },
  }, '\u2699');

  var header = el('header', { className: 'home-header' },
    buildLogo(),
    el('div', { className: 'home-header-actions' },
      buildSearchBar(),
      buildThemeSwitcher(),
      settingsBtn,
      el('button', { className: 'btn btn-secondary', onclick: handleImportFile }, '\uD83D\uDCC2 导入文件'),
      el('button', { className: 'btn btn-primary', onclick: handleCreateNovel }, '+ 新建小说'),
    ),
  );

  var grid = el('div', { className: 'novel-grid', id: 'novel-grid' });
  var empty = buildEmptyState();

  var content = el('div', { className: 'home-content' }, grid, empty);
  var fab = buildFab();

  pageEl = el('div', { className: 'page active', id: 'home-page' },
    header,
    content,
    fab,
  );

  contextMenuEl = buildContextMenu();
  pageEl.appendChild(contextMenuEl);

  return pageEl;
}

export function initHomePage() {
  renderNovelCards();
}

export function refreshHomePage() {
  renderNovelCards();
}
