import { triggerSync, completeSync, computeDiff, mergeManuscripts, setSyncState } from './syncCore.js';
import bus from '../event/bus.js';
import appState from '../core/appState.js';

var discoveredDevices = [];
var wsConnection = null;
var broadcastChannel = null;
var LAN_MULTICAST_ADDR = '239.1.1.1';
var LAN_DEFAULT_PORT = 9527;

function getDeviceId() {
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

function getDeviceName() {
  var config = appState.getAppConfig();
  var syncConfig = (config && config.sync) || {};
  return syncConfig.deviceName || ('卿辰设备-' + getDeviceId().slice(-6));
}

function getDiscoveredDevices() {
  return discoveredDevices;
}

function startDiscovery() {
  setSyncState({ status: 'discovering' });
  bus.emit('sync:discovering');

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      broadcastChannel = new BroadcastChannel('qingchen-sync-discovery');
      broadcastChannel.onmessage = function (event) {
        handleDiscoveryMessage(event.data);
      };
      broadcastChannel.postMessage({
        type: 'discovery',
        deviceId: getDeviceId(),
        deviceName: getDeviceName(),
        timestamp: Date.now(),
      });
    } catch (e) {
      console.error('[LocalLAN] BroadcastChannel不可用:', e);
    }
  }

  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.syncLanDiscover) {
    window.electronAPI.syncLanDiscover().then(function (result) {
      if (result && result.devices) {
        for (var i = 0; i < result.devices.length; i++) {
          handleDiscoveryMessage(result.devices[i]);
        }
      }
    }).catch(function () { /* ignore */ });
  }

  setTimeout(function () {
    setSyncState({ status: 'idle' });
    bus.emit('sync:discovery-complete', { devices: discoveredDevices });
  }, 5000);
}

function handleDiscoveryMessage(data) {
  if (!data || data.deviceId === getDeviceId()) return;

  var exists = false;
  for (var i = 0; i < discoveredDevices.length; i++) {
    if (discoveredDevices[i].deviceId === data.deviceId) {
      discoveredDevices[i] = data;
      exists = true;
      break;
    }
  }

  if (!exists) {
    discoveredDevices.push(data);
  }

  bus.emit('sync:device-found', data);
}

function stopDiscovery() {
  if (broadcastChannel) {
    try { broadcastChannel.close(); } catch (e) { /* ignore */ }
    broadcastChannel = null;
  }
  discoveredDevices = [];
}

function connectToDevice(device) {
  if (!device || !device.deviceId) {
    return { success: false, errors: ['目标设备信息无效'] };
  }

  setSyncState({ status: 'connecting' });

  return new Promise(function (resolve) {
    if (typeof WebSocket !== 'undefined' && device.wsUrl) {
      try {
        wsConnection = new WebSocket(device.wsUrl);
        wsConnection.onopen = function () {
          setSyncState({ status: 'connected' });
          bus.emit('sync:connected', device);
          resolve({ success: true, device: device });
        };
        wsConnection.onerror = function () {
          setSyncState({ status: 'error', error: 'WebSocket连接失败' });
          resolve({ success: false, errors: ['连接失败'] });
        };
        wsConnection.onclose = function () {
          wsConnection = null;
          setSyncState({ status: 'disconnected' });
          bus.emit('sync:disconnected');
        };
        wsConnection.onmessage = function (event) {
          handleSyncMessage(event.data);
        };
      } catch (e) {
        resolve({ success: false, errors: ['WebSocket创建失败: ' + e.message] });
      }
    } else {
      setSyncState({ status: 'connected' });
      bus.emit('sync:connected', device);
      resolve({ success: true, device: device });
    }
  });
}

function disconnectDevice() {
  if (wsConnection) {
    try { wsConnection.close(); } catch (e) { /* ignore */ }
    wsConnection = null;
  }
  setSyncState({ status: 'disconnected' });
  bus.emit('sync:disconnected');
}

function handleSyncMessage(rawData) {
  try {
    var data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

    if (data.type === 'sync-request') {
      handleSyncRequest(data);
    } else if (data.type === 'sync-response') {
      handleSyncResponse(data);
    } else if (data.type === 'conflict') {
      bus.emit('sync:conflict', data);
    }
  } catch (e) {
    console.error('[LocalLAN] 消息解析失败:', e);
  }
}

function handleSyncRequest(data) {
  var manuscripts = appState.getManuscripts();
  var response = {
    type: 'sync-response',
    requestId: data.requestId,
    manuscripts: manuscripts.map(function (m) {
      return { id: m.id, title: m.title, content: m.content, updatedAt: m.updatedAt, wordCount: m.wordCount };
    }),
    timestamp: Date.now(),
    deviceId: getDeviceId(),
  };

  sendMessage(response);
}

function handleSyncResponse(data) {
  if (!data.manuscripts || !Array.isArray(data.manuscripts)) return;

  var localManuscripts = appState.getManuscripts();
  var result = mergeManuscripts(localManuscripts, data.manuscripts, 'newest');

  var localMap = {};
  for (var i = 0; i < localManuscripts.length; i++) {
    localMap[localManuscripts[i].id] = localManuscripts[i];
  }

  for (var j = 0; j < result.merged.length; j++) {
    var merged = result.merged[j];
    if (localMap[merged.id]) {
      if ((merged.updatedAt || 0) > (localMap[merged.id].updatedAt || 0)) {
        appState.updateManuscript(merged.id, {
          content: merged.content,
          title: merged.title,
          wordCount: merged.wordCount,
        });
      }
    } else {
      var manuscripts = appState.getManuscripts();
      manuscripts.push(merged);
    }
  }

  completeSync({
    success: true,
    type: 'lan',
    direction: 'bidirectional',
    details: '已同步 ' + result.merged.length + ' 篇书稿',
    conflictCount: result.conflicts.length,
  });

  bus.emit('manuscript:list-changed');
}

function sendMessage(data) {
  var msg = JSON.stringify(data);
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    wsConnection.send(msg);
  }
  if (broadcastChannel) {
    broadcastChannel.postMessage(data);
  }
}

function startLanSync() {
  var result = triggerSync('manual');
  if (!result.success) return result;

  var manuscripts = appState.getManuscripts();
  setSyncState({ progress: 10 });

  if (wsConnection) {
    sendMessage({
      type: 'sync-request',
      requestId: Date.now().toString(36),
      manuscripts: manuscripts,
      deviceId: getDeviceId(),
      timestamp: Date.now(),
    });
    setSyncState({ progress: 50 });
  } else {
    completeSync({
      success: false,
      type: 'lan',
      error: '未连接到目标设备',
    });
    return { success: false, errors: ['请先发现并连接目标设备'] };
  }

  return { success: true };
}

export {
  getDeviceId,
  getDeviceName,
  getDiscoveredDevices,
  startDiscovery,
  stopDiscovery,
  connectToDevice,
  disconnectDevice,
  startLanSync,
  sendMessage,
};
