import bus from '../event/bus.js';
import appState from '../core/appState.js';

var SYNC_STORAGE_KEY = 'qingchen-sync-state';
var SYNC_HISTORY_KEY = 'qingchen-sync-history';

var syncState = {
  active: false,
  mode: 'lan',
  lastSync: 0,
  progress: 0,
  status: 'idle',
  error: null,
  connectedDevices: [],
};

var syncInterval = null;

function getSyncState() {
  return syncState;
}

function setSyncState(updates) {
  var keys = Object.keys(updates);
  for (var i = 0; i < keys.length; i++) {
    syncState[keys[i]] = updates[keys[i]];
  }
}

function loadSyncConfig() {
  var config = appState.getAppConfig();
  return (config && config.sync) || {};
}

function loadSyncState() {
  try {
    var raw = localStorage.getItem(SYNC_STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      syncState.active = false;
      syncState.lastSync = parsed.lastSync || 0;
      syncState.status = 'idle';
    }
  } catch (e) { /* ignore */ }
}

function saveSyncState() {
  try {
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify({
      lastSync: syncState.lastSync,
      mode: syncState.mode,
    }));
  } catch (e) { /* ignore */ }
}

function loadSyncHistory() {
  try {
    var raw = localStorage.getItem(SYNC_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveSyncHistory(history) {
  try {
    var trimmed = history.slice(-100);
    localStorage.setItem(SYNC_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) { /* ignore */ }
}

function addSyncRecord(record) {
  var history = loadSyncHistory();
  history.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
    type: record.type || 'manual',
    status: record.status || 'success',
    direction: record.direction || 'upload',
    manuscriptId: record.manuscriptId || '',
    details: record.details || '',
    conflictCount: record.conflictCount || 0,
  });
  saveSyncHistory(history);
}

function getSyncHistory(limit) {
  var history = loadSyncHistory();
  if (limit) {
    history = history.slice(-limit);
  }
  return history.sort(function (a, b) { return b.timestamp - a.timestamp; });
}

function computeDiff(localData, remoteData) {
  var diff = {
    added: [],
    updated: [],
    removed: [],
    unchanged: [],
  };

  var localMap = {};
  var remoteMap = {};

  if (Array.isArray(localData)) {
    for (var i = 0; i < localData.length; i++) {
      localMap[localData[i].id] = localData[i];
    }
  }

  if (Array.isArray(remoteData)) {
    for (var j = 0; j < remoteData.length; j++) {
      remoteMap[remoteData[j].id] = remoteData[j];
    }
  }

  var allIds = {};
  var lk = Object.keys(localMap);
  var rk = Object.keys(remoteMap);

  for (var a = 0; a < lk.length; a++) allIds[lk[a]] = true;
  for (var b = 0; b < rk.length; b++) allIds[rk[b]] = true;

  var ids = Object.keys(allIds);
  for (var c = 0; c < ids.length; c++) {
    var id = ids[c];
    var local = localMap[id];
    var remote = remoteMap[id];

    if (local && !remote) {
      diff.added.push(local);
    } else if (!local && remote) {
      diff.removed.push(remote);
    } else if (local && remote) {
      if ((local.updatedAt || 0) > (remote.updatedAt || 0)) {
        diff.updated.push({ local: local, remote: remote, winner: 'local' });
      } else if ((remote.updatedAt || 0) > (local.updatedAt || 0)) {
        diff.updated.push({ local: local, remote: remote, winner: 'remote' });
      } else {
        diff.unchanged.push(local);
      }
    }
  }

  return diff;
}

function mergeManuscripts(localList, remoteList, strategy) {
  strategy = strategy || 'newest';
  var merged = {};
  var conflicts = [];

  var allItems = (localList || []).concat(remoteList || []);
  for (var i = 0; i < allItems.length; i++) {
    var item = allItems[i];
    if (!merged[item.id]) {
      merged[item.id] = item;
    } else {
      var existing = merged[item.id];
      if (strategy === 'newest') {
        if ((item.updatedAt || 0) > (existing.updatedAt || 0)) {
          merged[item.id] = item;
          conflicts.push({ id: item.id, resolved: 'newest', timestamp: item.updatedAt });
        }
      } else if (strategy === 'local') {
        if (localList && localList.indexOf(item) !== -1) {
          merged[item.id] = item;
        }
      } else if (strategy === 'remote') {
        if (remoteList && remoteList.indexOf(item) !== -1) {
          merged[item.id] = item;
        }
      } else if (strategy === 'keep-both') {
        conflicts.push({ id: item.id, local: existing, remote: item });
      }
    }
  }

  return {
    merged: Object.values(merged),
    conflicts: conflicts,
  };
}

function startAutoSync() {
  var config = loadSyncConfig();
  if (!config.enabled || !config.autoSync) return;

  stopAutoSync();

  var interval = config.syncInterval || 60000;
  syncInterval = setInterval(function () {
    triggerSync('auto');
  }, interval);
}

function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

function triggerSync(type) {
  if (syncState.active) {
    return { success: false, errors: ['同步正在进行中'] };
  }

  var config = loadSyncConfig();
  if (!config.enabled) {
    return { success: false, errors: ['同步功能未启用'] };
  }

  setSyncState({ active: true, status: 'syncing', progress: 0, error: null });

  bus.emit('sync:started', { type: type || 'manual' });

  return { success: true };
}

function completeSync(result) {
  setSyncState({
    active: false,
    status: result.success ? 'idle' : 'error',
    lastSync: Date.now(),
    progress: 100,
    error: result.error || null,
  });

  saveSyncState();

  addSyncRecord({
    type: result.type || 'manual',
    status: result.success ? 'success' : 'error',
    direction: result.direction || 'bidirectional',
    manuscriptId: result.manuscriptId || '',
    details: result.details || '',
    conflictCount: result.conflictCount || 0,
  });

  bus.emit('sync:completed', result);
}

function testConnection() {
  var config = loadSyncConfig();
  if (config.mode === 'cloud') {
    if (!config.cloudUrl) {
      return Promise.resolve({ success: false, message: '未配置云端地址' });
    }
    return fetch(config.cloudUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    }).then(function (response) {
      return { success: response.ok, message: response.ok ? '连接成功' : '服务器响应异常: ' + response.status };
    }).catch(function (e) {
      return { success: false, message: '连接失败: ' + e.message };
    });
  }
  return Promise.resolve({ success: true, message: '局域网模式无需测试' });
}

function initSync() {
  loadSyncState();
  var config = loadSyncConfig();
  if (config.enabled && config.autoSync) {
    startAutoSync();
  }
}

export {
  getSyncState,
  setSyncState,
  loadSyncConfig,
  loadSyncState,
  getSyncHistory,
  addSyncRecord,
  computeDiff,
  mergeManuscripts,
  startAutoSync,
  stopAutoSync,
  triggerSync,
  completeSync,
  testConnection,
  initSync,
};
