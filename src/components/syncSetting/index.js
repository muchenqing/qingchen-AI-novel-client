import { el } from '../../utils/helper.js';
import { getSyncState, loadSyncConfig, triggerSync, getSyncHistory } from '../../sync/syncCore.js';
import { startDiscovery, stopDiscovery, getDiscoveredDevices, connectToDevice, disconnectDevice, startLanSync } from '../../sync/localLan.js';
import { testCloudConnection, startCloudSync } from '../../sync/cloudAdapter.js';
import { setConfigValues, getConfig } from '../../config/configManager.js';
import appState from '../../core/appState.js';
import bus from '../../event/bus.js';

var deviceListEl = null;
var discoveryTimer = null;
var syncStatusEl = null;
var historyListEl = null;

function getVal(id) {
  var elem = document.getElementById(id);
  return elem ? elem.value : '';
}

function setVal(id, value) {
  var elem = document.getElementById(id);
  if (elem) elem.value = value;
}

function getChecked(id) {
  var elem = document.getElementById(id);
  return elem ? elem.checked : false;
}

function setChecked(id, value) {
  var elem = document.getElementById(id);
  if (elem) elem.checked = !!value;
}

function saveSyncConfig(patch) {
  var config = getConfig();
  var sync = Object.assign({}, (config && config.sync) || {}, patch);
  setConfigValues({ sync: sync });
}

function buildLanTab() {
  var syncEnabled = el('input', { id: 'sync-lan-enabled', type: 'checkbox' });
  syncEnabled.addEventListener('change', function () {
    saveSyncConfig({ enabled: getChecked('sync-lan-enabled') });
  });

  var deviceNameInput = el('input', { id: 'sync-device-name', className: 'modal-input', type: 'text', placeholder: '当前设备名称' });
  deviceNameInput.addEventListener('change', function () {
    saveSyncConfig({ deviceName: getVal('sync-device-name') });
  });

  var portInput = el('input', { id: 'sync-lan-port', className: 'modal-input', type: 'number', placeholder: '9527' });
  portInput.addEventListener('change', function () {
    saveSyncConfig({ lanPort: parseInt(getVal('sync-lan-port'), 10) || 9527 });
  });

  deviceListEl = el('div', { id: 'sync-device-list', className: 'sync-device-list' });

  var btnDiscover = el('button', { className: 'modal-btn modal-btn-secondary' }, '发现设备');
  btnDiscover.addEventListener('click', handleDiscover);

  var btnStartSync = el('button', { className: 'modal-btn modal-btn-primary' }, '开始同步');
  btnStartSync.addEventListener('click', handleLanSync);

  return el('div', { id: 'tab-lan', className: 'settings-tab-content' },
    el('label', { className: 'modal-label' }, '局域网同步'),
    el('div', { className: 'modal-checkbox-row' }, syncEnabled, el('span', null, '启用局域网同步')),
    el('label', { className: 'modal-label' }, '设备名称'),
    deviceNameInput,
    el('label', { className: 'modal-label' }, '端口'),
    portInput,
    el('div', { style: 'margin-top:8px' }, btnDiscover),
    el('div', { id: 'sync-discover-result', className: 'modal-test-result' }),
    deviceListEl,
    el('div', { style: 'margin-top:8px' }, btnStartSync),
  );
}

function buildCloudTab() {
  var syncEnabled = el('input', { id: 'sync-cloud-enabled', type: 'checkbox' });
  syncEnabled.addEventListener('change', function () {
    saveSyncConfig({ enabled: getChecked('sync-cloud-enabled') });
  });

  var cloudUrlInput = el('input', { id: 'sync-cloud-url', className: 'modal-input', type: 'text', placeholder: 'https://your-cloud-server.com' });
  cloudUrlInput.addEventListener('change', function () {
    saveSyncConfig({ cloudUrl: getVal('sync-cloud-url') });
  });

  var tokenInput = el('input', { id: 'sync-cloud-token', className: 'modal-input', type: 'password', placeholder: '认证令牌' });
  tokenInput.addEventListener('change', function () {
    saveSyncConfig({ cloudToken: getVal('sync-cloud-token') });
  });

  var encKeyInput = el('input', { id: 'sync-enc-key', className: 'modal-input', type: 'password', placeholder: '加密密钥（可选）' });
  encKeyInput.addEventListener('change', function () {
    saveSyncConfig({ encryptionKey: getVal('sync-enc-key') });
  });

  var testResult = el('div', { id: 'sync-cloud-test-result', className: 'modal-test-result' });

  var btnTest = el('button', { className: 'modal-btn modal-btn-secondary' }, '测试连接');
  btnTest.addEventListener('click', function () { handleTestCloud(testResult); });

  var btnStartSync = el('button', { className: 'modal-btn modal-btn-primary' }, '开始同步');
  btnStartSync.addEventListener('click', handleCloudSync);

  return el('div', { id: 'tab-cloud', className: 'settings-tab-content' },
    el('label', { className: 'modal-label' }, '私有云同步'),
    el('div', { className: 'modal-checkbox-row' }, syncEnabled, el('span', null, '启用私有云同步')),
    el('label', { className: 'modal-label' }, '云端地址'),
    cloudUrlInput,
    el('label', { className: 'modal-label' }, '认证令牌'),
    tokenInput,
    el('label', { className: 'modal-label' }, '加密密钥'),
    encKeyInput,
    el('div', { style: 'margin-top:8px' }, btnTest),
    testResult,
    el('div', { style: 'margin-top:8px' }, btnStartSync),
  );
}

function buildStatusSection() {
  syncStatusEl = el('div', { id: 'sync-status-info', className: 'sync-status-info' });
  historyListEl = el('div', { id: 'sync-history-list', className: 'sync-history-list' });

  return el('div', { className: 'sync-status-section' },
    el('label', { className: 'modal-label' }, '同步状态'),
    syncStatusEl,
    el('label', { className: 'modal-label' }, '同步历史'),
    historyListEl,
  );
}

function switchTab(tabName) {
  var tabs = document.querySelectorAll('#sync-setting-overlay .settings-tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle('active', tabs[i].dataset.tab === tabName);
  }
  var contents = document.querySelectorAll('#sync-setting-overlay .settings-tab-content');
  for (var j = 0; j < contents.length; j++) {
    contents[j].style.display = contents[j].id === 'tab-' + tabName ? 'block' : 'none';
  }
}

function formatTime(ts) {
  if (!ts) return '从未同步';
  var d = new Date(ts);
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
    pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

function refreshStatus() {
  var state = getSyncState();
  if (syncStatusEl) {
    var statusMap = { idle: '空闲', syncing: '同步中', discovering: '发现设备中', connecting: '连接中', connected: '已连接', disconnected: '已断开', uploading: '上传中', downloading: '下载中', error: '错误' };
    var statusText = statusMap[state.status] || state.status;
    syncStatusEl.innerHTML = '';

    var statusLabel = el('div', { className: 'sync-status-row' },
      el('span', { className: 'sync-status-label' }, '当前状态: '),
      el('span', { className: 'sync-status-value' }, statusText),
    );

    var lastSyncLabel = el('div', { className: 'sync-status-row' },
      el('span', { className: 'sync-status-label' }, '上次同步: '),
      el('span', { className: 'sync-status-value' }, formatTime(state.lastSync)),
    );

    syncStatusEl.appendChild(statusLabel);
    syncStatusEl.appendChild(lastSyncLabel);

    if (state.error) {
      syncStatusEl.appendChild(el('div', { className: 'sync-status-row' },
        el('span', { className: 'sync-status-label' }, '错误: '),
        el('span', { className: 'sync-status-value', style: 'color:var(--danger)' }, state.error),
      ));
    }
  }

  if (historyListEl) {
    historyListEl.innerHTML = '';
    var history = getSyncHistory(10);
    if (history.length === 0) {
      historyListEl.appendChild(el('div', { className: 'sync-history-empty' }, '暂无同步记录'));
    } else {
      for (var i = 0; i < history.length; i++) {
        var record = history[i];
        var statusCls = record.status === 'success' ? 'sync-history-success' : 'sync-history-error';
        var row = el('div', { className: 'sync-history-row' },
          el('span', { className: 'sync-history-time' }, formatTime(record.timestamp)),
          el('span', { className: 'sync-history-type' }, record.type || 'manual'),
          el('span', { className: statusCls }, record.status === 'success' ? '成功' : '失败'),
          el('span', { className: 'sync-history-detail' }, record.details || ''),
        );
        historyListEl.appendChild(row);
      }
    }
  }
}

function renderDeviceList() {
  if (!deviceListEl) return;
  deviceListEl.innerHTML = '';
  var devices = getDiscoveredDevices();
  if (devices.length === 0) {
    deviceListEl.appendChild(el('div', { className: 'sync-device-empty' }, '未发现设备'));
    return;
  }
  for (var i = 0; i < devices.length; i++) {
    (function (device) {
      var nameSpan = el('span', { className: 'sync-device-name' }, device.deviceName || device.deviceId);
      var btnConnect = el('button', { className: 'modal-btn modal-btn-secondary sync-device-btn' }, '连接');
      btnConnect.addEventListener('click', function () { handleConnectDevice(device); });
      var row = el('div', { className: 'sync-device-row' }, nameSpan, btnConnect);
      deviceListEl.appendChild(row);
    })(devices[i]);
  }
}

async function handleDiscover() {
  var resultEl = document.getElementById('sync-discover-result');
  if (resultEl) {
    resultEl.textContent = '正在搜索局域网设备…';
    resultEl.className = 'modal-test-result';
  }
  stopDiscovery();
  startDiscovery();
  renderDeviceList();

  clearTimeout(discoveryTimer);
  discoveryTimer = setTimeout(function () {
    stopDiscovery();
    renderDeviceList();
    if (resultEl) {
      var devices = getDiscoveredDevices();
      if (devices.length > 0) {
        resultEl.textContent = '发现 ' + devices.length + ' 台设备';
        resultEl.className = 'modal-test-result success';
      } else {
        resultEl.textContent = '未发现其他设备，请确认设备在同一局域网';
        resultEl.className = 'modal-test-result error';
      }
    }
  }, 5500);
}

async function handleConnectDevice(device) {
  var result = await connectToDevice(device);
  if (result.success) {
    bus.emit('tips:show', { message: '已连接到 ' + (device.deviceName || device.deviceId), type: 'success' });
  } else {
    bus.emit('tips:show', { message: '连接失败: ' + ((result.errors && result.errors[0]) || '未知错误'), type: 'error' });
  }
  refreshStatus();
}

function handleLanSync() {
  var result = startLanSync();
  if (result.success) {
    bus.emit('tips:show', { message: '局域网同步已开始', type: 'info' });
  } else {
    bus.emit('tips:show', { message: (result.errors && result.errors[0]) || '同步启动失败', type: 'error' });
  }
  refreshStatus();
}

async function handleTestCloud(resultEl) {
  if (!resultEl) return;
  var cloudUrl = getVal('sync-cloud-url');
  if (!cloudUrl) {
    resultEl.textContent = '请填写云端地址';
    resultEl.className = 'modal-test-result error';
    return;
  }
  resultEl.textContent = '正在测试连接…';
  resultEl.className = 'modal-test-result';
  saveSyncConfig({ cloudUrl: cloudUrl, cloudToken: getVal('sync-cloud-token'), encryptionKey: getVal('sync-enc-key') });
  try {
    var result = await testCloudConnection();
    resultEl.textContent = result.message || (result.success ? '连接成功' : '连接失败');
    resultEl.className = result.success ? 'modal-test-result success' : 'modal-test-result error';
  } catch (e) {
    resultEl.textContent = '连接失败: ' + e.message;
    resultEl.className = 'modal-test-result error';
  }
}

async function handleCloudSync() {
  saveSyncConfig({ cloudUrl: getVal('sync-cloud-url'), cloudToken: getVal('sync-cloud-token'), encryptionKey: getVal('sync-enc-key') });
  var result = await startCloudSync();
  if (result.success) {
    bus.emit('tips:show', { message: '云端同步完成', type: 'success' });
  } else {
    bus.emit('tips:show', { message: (result.errors && result.errors[0]) || '同步失败', type: 'error' });
  }
  refreshStatus();
}

function loadSettingsToUI() {
  var config = getConfig();
  var sync = (config && config.sync) || {};

  setChecked('sync-lan-enabled', !!sync.enabled && sync.mode !== 'cloud');
  setVal('sync-device-name', sync.deviceName || '');
  setVal('sync-lan-port', sync.lanPort || 9527);
  setChecked('sync-cloud-enabled', !!sync.enabled && sync.mode === 'cloud');
  setVal('sync-cloud-url', sync.cloudUrl || '');
  setVal('sync-cloud-token', sync.cloudToken || '');
  setVal('sync-enc-key', sync.encryptionKey || '');

  refreshStatus();
  renderDeviceList();

  var cloudTestResult = document.getElementById('sync-cloud-test-result');
  if (cloudTestResult) { cloudTestResult.textContent = ''; cloudTestResult.className = 'modal-test-result'; }

  var discoverResult = document.getElementById('sync-discover-result');
  if (discoverResult) { discoverResult.textContent = ''; discoverResult.className = 'modal-test-result'; }
}

function openSyncSetting() {
  var overlay = document.getElementById('sync-setting-overlay');
  if (!overlay) return;
  loadSettingsToUI();
  switchTab('lan');
  overlay.classList.add('open');
}

function closeSyncSetting() {
  var overlay = document.getElementById('sync-setting-overlay');
  if (overlay) overlay.classList.remove('open');
  stopDiscovery();
  clearTimeout(discoveryTimer);
}

export function buildSyncSetting() {
  var overlay = el('div', { className: 'modal-overlay', id: 'sync-setting-overlay' });

  var tabs = el('div', { className: 'settings-tabs' });
  var tabData = [
    { key: 'lan', label: '局域网同步' },
    { key: 'cloud', label: '私有云同步' },
  ];
  for (var i = 0; i < tabData.length; i++) {
    var tab = el('button', {
      className: 'settings-tab' + (i === 0 ? ' active' : ''),
      dataset: { tab: tabData[i].key },
    }, tabData[i].label);
    tab.addEventListener('click', function () { switchTab(this.dataset.tab); });
    tabs.appendChild(tab);
  }

  var tabContent = el('div', { className: 'settings-tab-body' },
    buildLanTab(),
    buildCloudTab(),
  );

  var btnClose = el('button', { className: 'modal-btn modal-btn-ghost' }, '关闭');
  btnClose.addEventListener('click', closeSyncSetting);

  var card = el('div', { className: 'modal-card modal-card-settings' },
    el('div', { className: 'modal-header' },
      el('h3', { className: 'modal-title' }, '同步设置'),
    ),
    el('div', { className: 'modal-body' }, tabs, tabContent, buildStatusSection()),
    el('div', { className: 'modal-footer' }, btnClose),
  );

  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeSyncSetting(); });
  card.addEventListener('click', function (e) { e.stopPropagation(); });
  overlay.appendChild(card);

  return overlay;
}

export function initSyncSetting() {
  bus.on('modal:open-sync-setting', openSyncSetting);
  bus.on('sync:completed', function () { refreshStatus(); });
  bus.on('sync:device-found', function () { renderDeviceList(); });
  bus.on('sync:discovery-complete', function () {
    renderDeviceList();
    var resultEl = document.getElementById('sync-discover-result');
    if (resultEl) {
      var devices = getDiscoveredDevices();
      if (devices.length > 0) {
        resultEl.textContent = '发现 ' + devices.length + ' 台设备';
        resultEl.className = 'modal-test-result success';
      } else {
        resultEl.textContent = '未发现其他设备';
        resultEl.className = 'modal-test-result error';
      }
    }
  });
  bus.on('sync:connected', function () { refreshStatus(); });
  bus.on('sync:disconnected', function () { refreshStatus(); });
}
