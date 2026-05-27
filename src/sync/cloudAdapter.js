import { triggerSync, completeSync, mergeManuscripts, setSyncState } from './syncCore.js';
import bus from '../event/bus.js';
import appState from '../core/appState.js';

function getCloudConfig() {
  var config = appState.getAppConfig();
  return (config && config.sync) || {};
}

function simpleEncrypt(text, key) {
  if (!key) return text;
  var result = '';
  for (var i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

function simpleDecrypt(encoded, key) {
  if (!key) return encoded;
  try {
    var text = atob(encoded);
    var result = '';
    for (var i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch (e) {
    return encoded;
  }
}

function testCloudConnection() {
  var cloudCfg = getCloudConfig();
  if (!cloudCfg.cloudUrl) {
    return Promise.resolve({ success: false, message: '未配置私有云地址' });
  }

  var url = cloudCfg.cloudUrl.replace(/\/$/, '');
  var headers = {};
  if (cloudCfg.cloudToken) {
    headers['Authorization'] = 'Bearer ' + cloudCfg.cloudToken;
  }

  return fetch(url + '/status', {
    method: 'GET',
    headers: headers,
    signal: AbortSignal.timeout(8000),
  }).then(function (response) {
    if (response.ok) {
      return { success: true, message: '云端连接成功', status: response.status };
    }
    return { success: false, message: '云端响应异常: ' + response.status };
  }).catch(function (e) {
    return { success: false, message: '连接失败: ' + e.message };
  });
}

function uploadManuscripts(manuscripts) {
  var cloudCfg = getCloudConfig();
  if (!cloudCfg.cloudUrl) {
    return Promise.resolve({ success: false, errors: ['未配置私有云地址'] });
  }

  var url = cloudCfg.cloudUrl.replace(/\/$/, '') + '/api/sync/upload';
  var headers = { 'Content-Type': 'application/json' };
  if (cloudCfg.cloudToken) {
    headers['Authorization'] = 'Bearer ' + cloudCfg.cloudToken;
  }

  var payload = {
    deviceId: getLocalDeviceId(),
    manuscripts: manuscripts.map(function (m) {
      return {
        id: m.id,
        title: m.title,
        content: m.content,
        wordCount: m.wordCount,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      };
    }),
    timestamp: Date.now(),
  };

  if (cloudCfg.encryptionKey) {
    payload = JSON.parse(simpleEncrypt(JSON.stringify(payload), cloudCfg.encryptionKey));
    payload._encrypted = true;
  }

  return fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  }).then(function (response) {
    return response.json();
  }).then(function (data) {
    return { success: true, data: data };
  }).catch(function (e) {
    return { success: false, errors: ['上传失败: ' + e.message] };
  });
}

function downloadManuscripts() {
  var cloudCfg = getCloudConfig();
  if (!cloudCfg.cloudUrl) {
    return Promise.resolve({ success: false, errors: ['未配置私有云地址'] });
  }

  var url = cloudCfg.cloudUrl.replace(/\/$/, '') + '/api/sync/download';
  var headers = {};
  if (cloudCfg.cloudToken) {
    headers['Authorization'] = 'Bearer ' + cloudCfg.cloudToken;
  }

  return fetch(url + '?deviceId=' + encodeURIComponent(getLocalDeviceId()), {
    method: 'GET',
    headers: headers,
    signal: AbortSignal.timeout(30000),
  }).then(function (response) {
    return response.json();
  }).then(function (data) {
    if (cloudCfg.encryptionKey && data && data._encrypted) {
      data = JSON.parse(simpleDecrypt(JSON.stringify(data), cloudCfg.encryptionKey));
    }
    return { success: true, manuscripts: data.manuscripts || [] };
  }).catch(function (e) {
    return { success: false, errors: ['下载失败: ' + e.message] };
  });
}

function startCloudSync() {
  var result = triggerSync('manual');
  if (!result.success) return result;

  setSyncState({ progress: 10, status: 'uploading' });

  var manuscripts = appState.getManuscripts();

  return uploadManuscripts(manuscripts).then(function (uploadResult) {
    setSyncState({ progress: 50, status: 'downloading' });

    return downloadManuscripts();
  }).then(function (downloadResult) {
    setSyncState({ progress: 80 });

    if (downloadResult.success && downloadResult.manuscripts) {
      var localManuscripts = appState.getManuscripts();
      var merged = mergeManuscripts(localManuscripts, downloadResult.manuscripts, 'newest');

      var localMap = {};
      for (var i = 0; i < localManuscripts.length; i++) {
        localMap[localManuscripts[i].id] = localManuscripts[i];
      }

      for (var j = 0; j < merged.merged.length; j++) {
        var item = merged.merged[j];
        if (localMap[item.id]) {
          if ((item.updatedAt || 0) > (localMap[item.id].updatedAt || 0)) {
            appState.updateManuscript(item.id, {
              content: item.content,
              title: item.title,
              wordCount: item.wordCount,
            });
          }
        } else {
          appState.getManuscripts().push(item);
        }
      }

      bus.emit('manuscript:list-changed');

      completeSync({
        success: true,
        type: 'cloud',
        direction: 'bidirectional',
        details: '已同步 ' + merged.merged.length + ' 篇书稿',
        conflictCount: merged.conflicts.length,
      });

      return { success: true, synced: merged.merged.length, conflicts: merged.conflicts.length };
    }

    completeSync({ success: true, type: 'cloud', direction: 'upload', details: '上传完成' });
    return { success: true };
  }).catch(function (e) {
    completeSync({ success: false, type: 'cloud', error: e.message });
    return { success: false, errors: [e.message] };
  });
}

function getLocalDeviceId() {
  var stored = null;
  try {
    stored = localStorage.getItem('qingchen-device-id');
  } catch (e) { /* ignore */ }
  if (!stored) {
    stored = 'device-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    try {
      localStorage.setItem('qingchen-device-id', stored);
    } catch (e) { /* ignore */ }
  }
  return stored;
}

export {
  testCloudConnection,
  uploadManuscripts,
  downloadManuscripts,
  startCloudSync,
  getLocalDeviceId,
  simpleEncrypt,
  simpleDecrypt,
};
