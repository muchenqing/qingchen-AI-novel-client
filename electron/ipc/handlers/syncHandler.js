const IPC_EVENTS = require('../constants.js');
const path = require('path');
const fs = require('fs');

function getSyncConfigPath(app) {
  return path.join(app.getPath('userData'), 'sync-config.json');
}

function register(ipcMain, app) {
  ipcMain.handle(IPC_EVENTS.SYNC_CONFIG, function () {
    try {
      var configPath = getSyncConfigPath(app);
      if (!fs.existsSync(configPath)) {
        return { success: true, data: null };
      }
      var data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return { success: true, data: data };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.SYNC_STATUS, function () {
    return { success: true, status: 'idle', lastSync: 0 };
  });

  ipcMain.handle(IPC_EVENTS.SYNC_START, function (_, config) {
    try {
      var configPath = getSyncConfigPath(app);
      var dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(configPath, JSON.stringify(config || {}, null, 2), 'utf-8');
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.SYNC_STOP, function () {
    return { success: true };
  });

  ipcMain.handle(IPC_EVENTS.SYNC_HISTORY, function () {
    try {
      var historyPath = path.join(app.getPath('userData'), 'sync-history.json');
      if (!fs.existsSync(historyPath)) {
        return { success: true, history: [] };
      }
      var data = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
      return { success: true, history: data };
    } catch (err) {
      return { success: true, history: [] };
    }
  });

  ipcMain.handle(IPC_EVENTS.SYNC_LAN_DISCOVER, function () {
    return { success: true, devices: [] };
  });

  ipcMain.handle(IPC_EVENTS.SYNC_LAN_CONNECT, function (_, deviceId) {
    return { success: true, message: '局域网连接待实现' };
  });

  ipcMain.handle(IPC_EVENTS.SYNC_CLOUD_TEST, function (_, cloudUrl) {
    if (!cloudUrl) {
      return { success: false, message: '未配置云端地址' };
    }
    return { success: true, message: '云端测试需要渲染进程发起网络请求' };
  });

  console.log('[SyncHandler] 同步管理IPC已注册');
}

module.exports = { register };
