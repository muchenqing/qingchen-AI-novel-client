import { generateId } from '../utils/helper.js';
import bus from '../event/bus.js';
import appState from '../core/appState.js';

var STORAGE_PREFIX = 'qingchen-version-';

function getVersionStorageKey(manuscriptId) {
  return STORAGE_PREFIX + manuscriptId;
}

function loadVersions(manuscriptId) {
  try {
    var raw = localStorage.getItem(getVersionStorageKey(manuscriptId));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveVersions(manuscriptId, versions) {
  try {
    localStorage.setItem(getVersionStorageKey(manuscriptId), JSON.stringify(versions));
  } catch (e) {
    console.error('[VersionControl] 保存版本失败:', e);
  }
}

function createSnapshot(manuscriptId, content, options) {
  var ms = appState.getManuscript(manuscriptId);
  if (!ms) {
    return { success: false, errors: ['书稿不存在'] };
  }

  var config = appState.getAppConfig();
  var vcConfig = (config && config.versionControl) || {};
  var maxSnapshots = vcConfig.maxSnapshots || 100;

  var versions = loadVersions(manuscriptId);
  if (versions.length >= maxSnapshots) {
    versions = versions.slice(versions.length - maxSnapshots + 1);
  }

  var snapshot = {
    id: generateId(),
    manuscriptId: manuscriptId,
    content: content || ms.content || '',
    title: ms.title || '',
    wordCount: (content || ms.content || '').replace(/\s/g, '').length,
    timestamp: Date.now(),
    marked: false,
    tag: (options && options.tag) || '',
    note: (options && options.note) || '',
    branch: (options && options.branch) || 'main',
  };

  versions.push(snapshot);
  saveVersions(manuscriptId, versions);

  bus.emit('version:snapshot-created', snapshot);
  return { success: true, snapshot: snapshot };
}

function getVersionList(manuscriptId, branch) {
  var versions = loadVersions(manuscriptId);
  if (branch) {
    versions = versions.filter(function (v) { return v.branch === branch; });
  }
  return versions.sort(function (a, b) { return b.timestamp - a.timestamp; });
}

function getVersionById(manuscriptId, versionId) {
  var versions = loadVersions(manuscriptId);
  for (var i = 0; i < versions.length; i++) {
    if (versions[i].id === versionId) return versions[i];
  }
  return null;
}

function restoreVersion(manuscriptId, versionId) {
  var version = getVersionById(manuscriptId, versionId);
  if (!version) {
    return { success: false, errors: ['版本不存在'] };
  }

  var ms = appState.getManuscript(manuscriptId);
  if (!ms) {
    return { success: false, errors: ['书稿不存在'] };
  }

  createSnapshot(manuscriptId, ms.content, { tag: '回退前自动快照' });

  appState.updateManuscript(manuscriptId, { content: version.content });

  bus.emit('version:restored', { manuscriptId: manuscriptId, versionId: versionId });
  return { success: true, content: version.content };
}

function markVersion(manuscriptId, versionId, tag, note) {
  var versions = loadVersions(manuscriptId);
  for (var i = 0; i < versions.length; i++) {
    if (versions[i].id === versionId) {
      versions[i].marked = true;
      if (tag) versions[i].tag = tag;
      if (note !== undefined) versions[i].note = note;
      saveVersions(manuscriptId, versions);
      bus.emit('version:marked', versions[i]);
      return { success: true, version: versions[i] };
    }
  }
  return { success: false, errors: ['版本不存在'] };
}

function deleteVersion(manuscriptId, versionId) {
  var versions = loadVersions(manuscriptId);
  var found = false;
  var result = versions.filter(function (v) {
    if (v.id === versionId) { found = true; return false; }
    return true;
  });
  if (!found) {
    return { success: false, errors: ['版本不存在'] };
  }
  saveVersions(manuscriptId, result);
  bus.emit('version:deleted', { manuscriptId: manuscriptId, versionId: versionId });
  return { success: true };
}

function diffVersions(manuscriptId, versionIdA, versionIdB) {
  var vA = getVersionById(manuscriptId, versionIdA);
  var vB = getVersionById(manuscriptId, versionIdB);
  if (!vA || !vB) {
    return { success: false, errors: ['版本不存在'] };
  }

  var contentA = vA.content || '';
  var contentB = vB.content || '';
  var linesA = contentA.split('\n');
  var linesB = contentB.split('\n');

  var diff = [];
  var maxLen = Math.max(linesA.length, linesB.length);
  for (var i = 0; i < maxLen; i++) {
    var lineA = i < linesA.length ? linesA[i] : null;
    var lineB = i < linesB.length ? linesB[i] : null;

    if (lineA === lineB) {
      diff.push({ type: 'same', line: i + 1, content: lineA || '' });
    } else {
      if (lineA !== null) {
        diff.push({ type: 'removed', line: i + 1, content: lineA });
      }
      if (lineB !== null) {
        diff.push({ type: 'added', line: i + 1, content: lineB });
      }
    }
  }

  return {
    success: true,
    diff: diff,
    versionA: { id: vA.id, tag: vA.tag, timestamp: vA.timestamp },
    versionB: { id: vB.id, tag: vB.tag, timestamp: vB.timestamp },
  };
}

function cleanExpiredVersions(manuscriptId) {
  var config = appState.getAppConfig();
  var vcConfig = (config && config.versionControl) || {};
  var retentionDays = vcConfig.retentionDays || 30;
  var cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  var versions = loadVersions(manuscriptId);
  var kept = [];
  var removed = 0;

  for (var i = 0; i < versions.length; i++) {
    if (versions[i].marked || versions[i].timestamp >= cutoff) {
      kept.push(versions[i]);
    } else {
      removed++;
    }
  }

  if (removed > 0) {
    saveVersions(manuscriptId, kept);
  }

  return { removed: removed, kept: kept.length };
}

export {
  createSnapshot,
  getVersionList,
  getVersionById,
  restoreVersion,
  markVersion,
  deleteVersion,
  diffVersions,
  cleanExpiredVersions,
  loadVersions,
  saveVersions,
};
