import { generateId } from '../utils/helper.js';
import bus from '../event/bus.js';
import appState from '../core/appState.js';

var BRANCH_STORAGE_PREFIX = 'qingchen-branches-';

function getBranchStorageKey(manuscriptId) {
  return BRANCH_STORAGE_PREFIX + manuscriptId;
}

function loadBranches(manuscriptId) {
  try {
    var raw = localStorage.getItem(getBranchStorageKey(manuscriptId));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveBranches(manuscriptId, branches) {
  try {
    localStorage.setItem(getBranchStorageKey(manuscriptId), JSON.stringify(branches));
  } catch (e) {
    console.error('[Branch] 保存分支失败:', e);
  }
}

function getActiveBranchKey(manuscriptId) {
  return 'qingchen-active-branch-' + manuscriptId;
}

function getActiveBranch(manuscriptId) {
  try {
    return localStorage.getItem(getActiveBranchKey(manuscriptId)) || 'main';
  } catch (e) {
    return 'main';
  }
}

function setActiveBranch(manuscriptId, branchName) {
  try {
    localStorage.setItem(getActiveBranchKey(manuscriptId), branchName);
  } catch (e) { /* ignore */ }
}

function ensureMainBranch(manuscriptId) {
  var branches = loadBranches(manuscriptId);
  var hasMain = false;
  for (var i = 0; i < branches.length; i++) {
    if (branches[i].name === 'main') {
      hasMain = true;
      break;
    }
  }

  if (!hasMain) {
    var ms = appState.getManuscript(manuscriptId);
    branches.unshift({
      id: generateId(),
      name: 'main',
      displayName: '主线',
      createdAt: Date.now(),
      contentSnapshot: ms ? (ms.content || '') : '',
      wordCount: ms ? (ms.wordCount || 0) : 0,
      isDefault: true,
    });
    saveBranches(manuscriptId, branches);
  }

  return branches;
}

function getBranchList(manuscriptId) {
  return ensureMainBranch(manuscriptId);
}

function createBranch(manuscriptId, branchName, displayName) {
  if (!branchName || !/^[\w\-\.]+$/.test(branchName)) {
    return { success: false, errors: ['分支名仅允许字母、数字、连字符和点号'] };
  }

  var branches = loadBranches(manuscriptId);
  for (var i = 0; i < branches.length; i++) {
    if (branches[i].name === branchName) {
      return { success: false, errors: ['分支已存在: ' + branchName] };
    }
  }

  var ms = appState.getManuscript(manuscriptId);
  var branch = {
    id: generateId(),
    name: branchName,
    displayName: displayName || branchName,
    createdAt: Date.now(),
    contentSnapshot: ms ? (ms.content || '') : '',
    wordCount: ms ? (ms.wordCount || 0) : 0,
    isDefault: false,
  };

  branches.push(branch);
  saveBranches(manuscriptId, branches);

  bus.emit('branch:created', { manuscriptId: manuscriptId, branch: branch });
  return { success: true, branch: branch };
}

function deleteBranch(manuscriptId, branchName) {
  if (branchName === 'main') {
    return { success: false, errors: ['不能删除主线分支'] };
  }

  var branches = loadBranches(manuscriptId);
  var found = false;
  var result = branches.filter(function (b) {
    if (b.name === branchName) { found = true; return false; }
    return true;
  });

  if (!found) {
    return { success: false, errors: ['分支不存在: ' + branchName] };
  }

  saveBranches(manuscriptId, result);

  if (getActiveBranch(manuscriptId) === branchName) {
    setActiveBranch(manuscriptId, 'main');
  }

  bus.emit('branch:deleted', { manuscriptId: manuscriptId, branchName: branchName });
  return { success: true };
}

function switchBranch(manuscriptId, branchName) {
  var branches = loadBranches(manuscriptId);
  var target = null;
  for (var i = 0; i < branches.length; i++) {
    if (branches[i].name === branchName) {
      target = branches[i];
      break;
    }
  }

  if (!target) {
    return { success: false, errors: ['分支不存在: ' + branchName] };
  }

  var ms = appState.getManuscript(manuscriptId);
  if (!ms) {
    return { success: false, errors: ['书稿不存在'] };
  }

  var currentBranchName = getActiveBranch(manuscriptId);
  var branchesList = loadBranches(manuscriptId);
  for (var j = 0; j < branchesList.length; j++) {
    if (branchesList[j].name === currentBranchName) {
      branchesList[j].contentSnapshot = ms.content || '';
      branchesList[j].wordCount = (ms.content || '').replace(/\s/g, '').length;
      break;
    }
  }
  saveBranches(manuscriptId, branchesList);

  setActiveBranch(manuscriptId, branchName);

  if (target.contentSnapshot) {
    appState.updateManuscript(manuscriptId, { content: target.contentSnapshot });
  }

  bus.emit('branch:switched', { manuscriptId: manuscriptId, branchName: branchName });
  return { success: true, content: target.contentSnapshot || '' };
}

function mergeBranch(manuscriptId, sourceBranchName, targetBranchName) {
  var branches = loadBranches(manuscriptId);
  var source = null;
  var target = null;

  for (var i = 0; i < branches.length; i++) {
    if (branches[i].name === sourceBranchName) source = branches[i];
    if (branches[i].name === targetBranchName) target = branches[i];
  }

  if (!source || !target) {
    return { success: false, errors: ['分支不存在'] };
  }

  if (source.name === getActiveBranch(manuscriptId)) {
    return { success: false, errors: ['不能合并当前活跃分支到目标分支，请先切换分支'] };
  }

  target.contentSnapshot = source.contentSnapshot;
  target.wordCount = source.wordCount;

  saveBranches(manuscriptId, branches);

  bus.emit('branch:merged', {
    manuscriptId: manuscriptId,
    source: sourceBranchName,
    target: targetBranchName,
  });

  return { success: true };
}

function getCurrentBranchInfo(manuscriptId) {
  var activeName = getActiveBranch(manuscriptId);
  var branches = loadBranches(manuscriptId);
  for (var i = 0; i < branches.length; i++) {
    if (branches[i].name === activeName) return branches[i];
  }
  return { name: activeName, displayName: activeName };
}

export {
  getBranchList,
  createBranch,
  deleteBranch,
  switchBranch,
  mergeBranch,
  getActiveBranch,
  getCurrentBranchInfo,
  ensureMainBranch,
};
