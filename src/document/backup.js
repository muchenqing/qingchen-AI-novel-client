import { generateId } from '../utils/helper.js';
import { createArchive, archiveToString, parseArchive } from '../utils/archive.js';
import bus from '../event/bus.js';
import appState from '../core/appState.js';

var BACKUP_STORAGE_KEY = 'qingchen-backups';
var MAX_BACKUPS = 20;

function loadBackupIndex() {
  try {
    var raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveBackupIndex(index) {
  try {
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(index));
  } catch (e) {
    console.error('[Backup] 保存备份索引失败:', e);
  }
}

function getBackupKey(backupId) {
  return 'qingchen-backup-data-' + backupId;
}

function createBackup(manuscriptId, options) {
  var ms = appState.getManuscript(manuscriptId);
  if (!ms) {
    return { success: false, errors: ['书稿不存在'] };
  }

  var config = appState.getAppConfig();
  var vcConfig = (config && config.versionControl) || {};
  var maxBackups = vcConfig.maxBackups || MAX_BACKUPS;

  var index = loadBackupIndex();
  if (index.length >= maxBackups) {
    var toRemove = index.slice(0, index.length - maxBackups + 1);
    for (var r = 0; r < toRemove.length; r++) {
      try { localStorage.removeItem(getBackupKey(toRemove[r].id)); } catch (e) { /* ignore */ }
    }
    index = index.slice(index.length - maxBackups + 1);
  }

  var backupId = generateId();
  var archive = createArchive({
    name: ms.title || 'untitled',
    path: ms.id,
    content: ms.content || '',
    metadata: {
      id: ms.id,
      title: ms.title,
      wordCount: ms.wordCount || 0,
      createdAt: ms.createdAt,
      updatedAt: ms.updatedAt,
    },
  });

  var archiveStr = archiveToString(archive);

  try {
    localStorage.setItem(getBackupKey(backupId), archiveStr);
  } catch (e) {
    return { success: false, errors: ['备份数据写入失败: ' + e.message] };
  }

  var record = {
    id: backupId,
    manuscriptId: manuscriptId,
    title: ms.title || '',
    wordCount: ms.wordCount || 0,
    size: archiveStr.length,
    timestamp: Date.now(),
    type: (options && options.type) || 'auto',
    note: (options && options.note) || '',
  };

  index.push(record);
  saveBackupIndex(index);

  bus.emit('backup:created', record);
  return { success: true, backup: record };
}

function getBackupList(manuscriptId) {
  var index = loadBackupIndex();
  if (manuscriptId) {
    index = index.filter(function (b) { return b.manuscriptId === manuscriptId; });
  }
  return index.sort(function (a, b) { return b.timestamp - a.timestamp; });
}

function getBackupById(backupId) {
  var index = loadBackupIndex();
  for (var i = 0; i < index.length; i++) {
    if (index[i].id === backupId) return index[i];
  }
  return null;
}

function restoreBackup(backupId) {
  var record = getBackupById(backupId);
  if (!record) {
    return { success: false, errors: ['备份不存在'] };
  }

  var archiveStr = null;
  try {
    archiveStr = localStorage.getItem(getBackupKey(backupId));
  } catch (e) {
    return { success: false, errors: ['备份数据读取失败'] };
  }

  if (!archiveStr) {
    return { success: false, errors: ['备份数据已损坏'] };
  }

  var parsed = parseArchive(archiveStr);
  if (!parsed.success) {
    return { success: false, errors: parsed.errors };
  }

  var entry = parsed.archive.entries[0];
  if (!entry) {
    return { success: false, errors: ['备份数据为空'] };
  }

  var ms = appState.getManuscript(record.manuscriptId);
  if (ms) {
    appState.updateManuscript(record.manuscriptId, { content: entry.content });
  }

  bus.emit('backup:restored', record);
  return {
    success: true,
    manuscriptId: record.manuscriptId,
    content: entry.content,
    metadata: entry.metadata,
  };
}

function deleteBackup(backupId) {
  var index = loadBackupIndex();
  var found = false;
  var result = index.filter(function (b) {
    if (b.id === backupId) { found = true; return false; }
    return true;
  });

  if (!found) {
    return { success: false, errors: ['备份不存在'] };
  }

  try { localStorage.removeItem(getBackupKey(backupId)); } catch (e) { /* ignore */ }

  saveBackupIndex(result);
  bus.emit('backup:deleted', { backupId: backupId });
  return { success: true };
}

function cleanExpiredBackups() {
  var config = appState.getAppConfig();
  var vcConfig = (config && config.versionControl) || {};
  var retentionDays = vcConfig.retentionDays || 30;
  var cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  var index = loadBackupIndex();
  var kept = [];
  var removed = 0;

  for (var i = 0; i < index.length; i++) {
    if (index[i].timestamp >= cutoff) {
      kept.push(index[i]);
    } else {
      try { localStorage.removeItem(getBackupKey(index[i].id)); } catch (e) { /* ignore */ }
      removed++;
    }
  }

  if (removed > 0) {
    saveBackupIndex(kept);
  }

  return { removed: removed, kept: kept.length };
}

function getBackupStats() {
  var index = loadBackupIndex();
  var totalSize = 0;
  for (var i = 0; i < index.length; i++) {
    totalSize += index[i].size || 0;
  }
  return {
    count: index.length,
    totalSize: totalSize,
    manuscripts: index.reduce(function (acc, b) {
      if (acc.indexOf(b.manuscriptId) === -1) acc.push(b.manuscriptId);
      return acc;
    }, []),
  };
}

export {
  createBackup,
  getBackupList,
  getBackupById,
  restoreBackup,
  deleteBackup,
  cleanExpiredBackups,
  getBackupStats,
  loadBackupIndex,
};
