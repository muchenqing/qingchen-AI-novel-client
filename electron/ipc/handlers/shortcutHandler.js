const IPC_EVENTS = require('../constants.js');
const path = require('path');
const fs = require('fs');

function getShortcutPath(app) {
  return path.join(app.getPath('userData'), 'shortcuts.json');
}

function register(ipcMain, app) {
  ipcMain.handle(IPC_EVENTS.SHORTCUT_READ, function () {
    try {
      var filePath = getShortcutPath(app);
      if (!fs.existsSync(filePath)) {
        return { success: true, data: null };
      }
      var data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return { success: true, data: data };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.SHORTCUT_WRITE, function (_, data) {
    try {
      var filePath = getShortcutPath(app);
      var dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  console.log('[ShortcutHandler] 快捷键管理IPC已注册');
}

module.exports = { register };
