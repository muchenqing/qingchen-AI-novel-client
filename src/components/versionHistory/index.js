import { el } from '../../utils/helper.js';
import { formatDate } from '../../utils/format.js';
import { getVersionList, restoreVersion, markVersion, deleteVersion, diffVersions } from '../../document/versionControl.js';
import { getBranchList, createBranch, switchBranch, deleteBranch, getCurrentBranchInfo } from '../../document/branch.js';
import { createBackup, getBackupList, restoreBackup } from '../../document/backup.js';
import { showConfirmDialog } from '../common/confirmDialog.js';
import appState from '../../core/appState.js';
import bus from '../../event/bus.js';

var currentTab = 'versions';

function openPanel() {
  var overlay = document.getElementById('version-history-overlay');
  if (!overlay) return;
  switchTab('versions');
  overlay.classList.add('open');
}

function closePanel() {
  var overlay = document.getElementById('version-history-overlay');
  if (overlay) overlay.classList.remove('open');
}

function switchTab(tabName) {
  currentTab = tabName;
  var tabs = document.querySelectorAll('#version-history-overlay .settings-tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle('active', tabs[i].dataset.tab === tabName);
  }
  var contents = document.querySelectorAll('#version-history-overlay .settings-tab-content');
  for (var j = 0; j < contents.length; j++) {
    contents[j].style.display = contents[j].id === 'tab-' + tabName ? 'block' : 'none';
  }
  refreshCurrentTab();
}

function refreshCurrentTab() {
  if (currentTab === 'versions') renderVersions();
  else if (currentTab === 'branches') renderBranches();
  else if (currentTab === 'backups') renderBackups();
}

function getMsId() {
  return appState.getCurrentManuscriptId();
}

function renderVersions() {
  var container = document.getElementById('vh-version-list');
  if (!container) return;
  container.innerHTML = '';
  var msId = getMsId();
  if (!msId) {
    container.appendChild(el('div', { className: 'vh-empty' }, '未打开书稿'));
    return;
  }
  var versions = getVersionList(msId);
  if (!versions.length) {
    container.appendChild(el('div', { className: 'vh-empty' }, '暂无版本快照'));
    return;
  }
  for (var i = 0; i < versions.length; i++) {
    (function (v) {
      var tagEl = v.tag
        ? el('span', { className: 'vh-tag' }, v.tag)
        : null;
      var markLabel = v.marked ? '★ ' : '';
      var restoreBtn = el('button', { className: 'modal-btn modal-btn-secondary vh-btn' }, '恢复');
      restoreBtn.addEventListener('click', function () {
        showConfirmDialog('确定要恢复到此版本吗？当前内容会被自动快照。', function () {
          var result = restoreVersion(msId, v.id);
          if (result.success) {
            bus.emit('status:set', '版本已恢复');
            renderVersions();
          }
        });
      });

      var markBtn = el('button', { className: 'modal-btn modal-btn-ghost vh-btn' }, v.marked ? '取消标记' : '标记');
      markBtn.addEventListener('click', function () {
        if (v.marked) {
          markVersion(msId, v.id, '', '');
        } else {
          markVersion(msId, v.id, v.tag || '重要版本', v.note || '');
        }
        renderVersions();
      });

      var deleteBtn = el('button', { className: 'modal-btn modal-btn-ghost vh-btn vh-btn-danger' }, '删除');
      deleteBtn.addEventListener('click', function () {
        showConfirmDialog('确定要删除此版本快照吗？', function () {
          deleteVersion(msId, v.id);
          renderVersions();
        });
      });

      var actions = el('div', { className: 'vh-actions' }, restoreBtn, markBtn, deleteBtn);

      var row = el('div', { className: 'vh-item' },
        el('div', { className: 'vh-item-info' },
          el('span', { className: 'vh-time' }, markLabel + formatDate(v.timestamp)),
          el('span', { className: 'vh-wordcount' }, v.wordCount + ' 字'),
          tagEl,
        ),
        actions,
      );
      container.appendChild(row);
    })(versions[i]);
  }
}

function renderBranches() {
  var container = document.getElementById('vh-branch-list');
  if (!container) return;
  container.innerHTML = '';
  var msId = getMsId();
  if (!msId) {
    container.appendChild(el('div', { className: 'vh-empty' }, '未打开书稿'));
    return;
  }
  var branches = getBranchList(msId);
  var current = getCurrentBranchInfo(msId);
  var currentName = current ? current.name : 'main';

  var nameInput = el('input', { className: 'modal-input vh-branch-input', type: 'text', placeholder: '新分支名称' });
  var displayNameInput = el('input', { className: 'modal-input vh-branch-input', type: 'text', placeholder: '显示名称（可选）' });
  var createBtn = el('button', { className: 'modal-btn modal-btn-primary vh-btn' }, '创建');
  createBtn.addEventListener('click', function () {
    var name = nameInput.value.trim();
    if (!name) return;
    var result = createBranch(msId, name, displayNameInput.value.trim() || name);
    if (result.success) {
      nameInput.value = '';
      displayNameInput.value = '';
      renderBranches();
    }
  });

  container.appendChild(el('div', { className: 'vh-branch-create' },
    el('div', { className: 'vh-branch-input-row' }, nameInput, displayNameInput, createBtn),
  ));

  for (var i = 0; i < branches.length; i++) {
    (function (b) {
      var isActive = b.name === currentName;
      var label = (b.displayName || b.name) + (isActive ? ' (当前)' : '');
      var info = el('div', { className: 'vh-branch-info' },
        el('span', { className: 'vh-branch-name' }, label),
        el('span', { className: 'vh-branch-date' }, formatDate(b.createdAt)),
      );

      var switchBtn = null;
      if (!isActive) {
        switchBtn = el('button', { className: 'modal-btn modal-btn-secondary vh-btn' }, '切换');
        switchBtn.addEventListener('click', function () {
          switchBranch(msId, b.name);
          renderBranches();
        });
      }

      var deleteBtn = null;
      if (!b.isDefault) {
        deleteBtn = el('button', { className: 'modal-btn modal-btn-ghost vh-btn vh-btn-danger' }, '删除');
        deleteBtn.addEventListener('click', function () {
          showConfirmDialog('确定要删除分支 "' + (b.displayName || b.name) + '" 吗？', function () {
            deleteBranch(msId, b.name);
            renderBranches();
          });
        });
      }

      var actions = el('div', { className: 'vh-actions' }, switchBtn, deleteBtn);
      var cls = 'vh-item vh-branch-item' + (isActive ? ' vh-branch-active' : '');
      var row = el('div', { className: cls }, info, actions);
      container.appendChild(row);
    })(branches[i]);
  }
}

function renderBackups() {
  var container = document.getElementById('vh-backup-list');
  if (!container) return;
  container.innerHTML = '';
  var msId = getMsId();
  if (!msId) {
    container.appendChild(el('div', { className: 'vh-empty' }, '未打开书稿'));
    return;
  }
  var backups = getBackupList(msId);
  if (!backups.length) {
    container.appendChild(el('div', { className: 'vh-empty' }, '暂无备份'));
    return;
  }
  for (var i = 0; i < backups.length; i++) {
    (function (b) {
      var restoreBtn = el('button', { className: 'modal-btn modal-btn-secondary vh-btn' }, '恢复');
      restoreBtn.addEventListener('click', function () {
        showConfirmDialog('确定要恢复到此备份吗？当前内容会被覆盖。', function () {
          var result = restoreBackup(b.id);
          if (result.success) {
            bus.emit('status:set', '备份已恢复');
          }
        });
      });

      var deleteBtn = el('button', { className: 'modal-btn modal-btn-ghost vh-btn vh-btn-danger' }, '删除');
      deleteBtn.addEventListener('click', function () {
        showConfirmDialog('确定要删除此备份吗？', function () {
          deleteBackup(b.id);
          renderBackups();
        });
      });

      var actions = el('div', { className: 'vh-actions' }, restoreBtn, deleteBtn);

      var typeLabel = b.type === 'auto' ? '自动' : '手动';
      var row = el('div', { className: 'vh-item' },
        el('div', { className: 'vh-item-info' },
          el('span', { className: 'vh-time' }, formatDate(b.timestamp)),
          el('span', { className: 'vh-wordcount' }, b.wordCount + ' 字'),
          el('span', { className: 'vh-tag' }, typeLabel),
        ),
        actions,
      );
      container.appendChild(row);
    })(backups[i]);
  }
}

function handleCreateBackup() {
  var msId = getMsId();
  if (!msId) return;
  var result = createBackup(msId, { type: 'manual' });
  if (result.success) {
    bus.emit('status:set', '备份已创建');
    renderBackups();
  }
}

export function buildVersionHistory() {
  var overlay = el('div', { className: 'modal-overlay', id: 'version-history-overlay' });

  var tabs = el('div', { className: 'settings-tabs' });
  var tabData = [
    { key: 'versions', label: '版本历史' },
    { key: 'branches', label: '分支管理' },
    { key: 'backups', label: '备份管理' },
  ];
  for (var i = 0; i < tabData.length; i++) {
    var tab = el('button', {
      className: 'settings-tab' + (i === 0 ? ' active' : ''),
      dataset: { tab: tabData[i].key },
    }, tabData[i].label);
    tab.addEventListener('click', function () { switchTab(this.dataset.tab); });
    tabs.appendChild(tab);
  }

  var versionList = el('div', { id: 'vh-version-list', className: 'vh-list' });
  var branchList = el('div', { id: 'vh-branch-list', className: 'vh-list' });
  var backupList = el('div', { id: 'vh-backup-list', className: 'vh-list' });

  var backupCreateBtn = el('button', { className: 'modal-btn modal-btn-primary vh-create-backup-btn' }, '创建备份');
  backupCreateBtn.addEventListener('click', handleCreateBackup);

  var tabContent = el('div', { className: 'settings-tab-body' },
    el('div', { id: 'tab-versions', className: 'settings-tab-content' }, versionList),
    el('div', { id: 'tab-branches', className: 'settings-tab-content' }, branchList),
    el('div', { id: 'tab-backups', className: 'settings-tab-content' },
      el('div', { className: 'vh-backup-header' }, backupCreateBtn),
      backupList,
    ),
  );

  var btnClose = el('button', { className: 'modal-btn modal-btn-ghost' }, '关闭');
  btnClose.addEventListener('click', closePanel);

  var card = el('div', { className: 'modal-card modal-card-history' },
    el('div', { className: 'modal-header' },
      el('h3', { className: 'modal-title' }, '版本管理'),
    ),
    el('div', { className: 'modal-body' }, tabs, tabContent),
    el('div', { className: 'modal-footer' }, btnClose),
  );

  overlay.addEventListener('click', function (e) { if (e.target === overlay) closePanel(); });
  card.addEventListener('click', function (e) { e.stopPropagation(); });
  overlay.appendChild(card);

  return overlay;
}

export function initVersionHistory() {
  bus.on('modal:open-version-history', openPanel);
}
