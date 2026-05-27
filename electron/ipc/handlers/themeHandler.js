const IPC_EVENTS = require('../constants.js');
const path = require('path');
const fs = require('fs');

function getThemesDir(app) {
  var dir = path.join(app.getPath('userData'), 'themes');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function register(ipcMain, app) {
  ipcMain.handle(IPC_EVENTS.THEME_READ_FILE, function (_, filename) {
    try {
      var themesDir = getThemesDir(app);
      var filePath = path.join(themesDir, filename);
      if (!fs.existsSync(filePath)) {
        return { success: false, message: '主题文件不存在' };
      }
      var content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, content: content };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.THEME_WRITE_FILE, function (_, filename, content) {
    try {
      var themesDir = getThemesDir(app);
      var safeName = path.basename(filename);
      if (!safeName.endsWith('.json')) safeName += '.json';
      var filePath = path.join(themesDir, safeName);
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true, filePath: filePath };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.THEME_LIST_FILES, function () {
    try {
      var themesDir = getThemesDir(app);
      var files = fs.readdirSync(themesDir).filter(function (f) {
        return f.endsWith('.json');
      });
      var themes = [];
      for (var i = 0; i < files.length; i++) {
        try {
          var content = fs.readFileSync(path.join(themesDir, files[i]), 'utf-8');
          var parsed = JSON.parse(content);
          themes.push({
            filename: files[i],
            name: parsed.name || files[i].replace('.json', ''),
            variables: parsed.variables || {},
          });
        } catch (e) {
          themes.push({
            filename: files[i],
            name: files[i].replace('.json', ''),
            variables: {},
            error: true,
          });
        }
      }
      return { success: true, themes: themes };
    } catch (err) {
      return { success: false, message: err.message, themes: [] };
    }
  });

  ipcMain.handle(IPC_EVENTS.THEME_DELETE_FILE, function (_, filename) {
    try {
      var themesDir = getThemesDir(app);
      var filePath = path.join(themesDir, path.basename(filename));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  console.log('[ThemeHandler] 主题管理IPC已注册');
}

module.exports = { register };
