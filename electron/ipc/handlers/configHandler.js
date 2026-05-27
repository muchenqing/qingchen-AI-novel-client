const IPC_EVENTS = require('../constants.js');
const path = require('path');
const fs = require('fs');

function getConfigPath(app) {
  return path.join(app.getPath('userData'), 'config.json');
}

function readConfigFile(configPath) {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    return null;
  } catch (e) {
    console.error('[ConfigHandler] 读取配置文件失败:', e);
    return null;
  }
}

function writeConfigFile(configPath, data) {
  try {
    var dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('[ConfigHandler] 写入配置文件失败:', e);
    return false;
  }
}

function register(ipcMain, app) {
  ipcMain.handle(IPC_EVENTS.CONFIG_READ, function () {
    try {
      var configPath = getConfigPath(app);
      var data = readConfigFile(configPath);
      return { success: true, data: data };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.CONFIG_WRITE, function (_, data) {
    try {
      var configPath = getConfigPath(app);
      var success = writeConfigFile(configPath, data);
      return { success: success };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.CONFIG_RESET, function () {
    try {
      var configPath = getConfigPath(app);
      if (fs.existsSync(configPath)) {
        var backupPath = configPath + '.backup.' + Date.now();
        fs.copyFileSync(configPath, backupPath);
        fs.unlinkSync(configPath);
      }
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  console.log('[ConfigHandler] 配置管理IPC已注册');
}

module.exports = { register };
