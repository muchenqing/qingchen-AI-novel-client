const IPC_EVENTS = require('../constants.js');
const path = require('path');
const fs = require('fs');

function getPluginsDir(app) {
  var dir = path.join(app.getPath('userData'), 'plugins');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getPluginDir(app, pluginId) {
  var safeId = pluginId.replace(/[^a-zA-Z0-9\-_\.]/g, '');
  var dir = path.join(getPluginsDir(app), safeId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function register(ipcMain, app) {
  ipcMain.handle(IPC_EVENTS.PLUGIN_LIST_DIR, function () {
    try {
      var pluginsDir = getPluginsDir(app);
      var dirs = fs.readdirSync(pluginsDir, { withFileTypes: true })
        .filter(function (d) { return d.isDirectory(); })
        .map(function (d) { return d.name; });
      return { success: true, directories: dirs };
    } catch (err) {
      return { success: true, directories: [] };
    }
  });

  ipcMain.handle(IPC_EVENTS.PLUGIN_READ_MANIFEST, function (_, pluginId) {
    try {
      var pluginDir = getPluginDir(app, pluginId);
      var manifestPath = path.join(pluginDir, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        return { success: false, message: '清单文件不存在' };
      }
      var content = fs.readFileSync(manifestPath, 'utf-8');
      return { success: true, content: content };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.PLUGIN_WRITE_FILE, function (_, pluginId, filename, content) {
    try {
      var pluginDir = getPluginDir(app, pluginId);
      var safeName = path.basename(filename);
      var filePath = path.join(pluginDir, safeName);
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true, filePath: filePath };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.PLUGIN_DELETE_FILE, function (_, pluginId, filename) {
    try {
      var pluginDir = getPluginDir(app, pluginId);
      var filePath = path.join(pluginDir, path.basename(filename));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.PLUGIN_INSTALL, function (_, pluginId, files) {
    try {
      var pluginDir = getPluginDir(app, pluginId);
      if (!files || typeof files !== 'object') {
        return { success: false, message: '无效的插件文件数据' };
      }
      var fileNames = Object.keys(files);
      for (var i = 0; i < fileNames.length; i++) {
        var safeName = path.basename(fileNames[i]);
        fs.writeFileSync(path.join(pluginDir, safeName), files[fileNames[i]], 'utf-8');
      }
      return { success: true, installDir: pluginDir };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.PLUGIN_UNINSTALL, function (_, pluginId) {
    try {
      var pluginDir = path.join(getPluginsDir(app), pluginId.replace(/[^a-zA-Z0-9\-_\.]/g, ''));
      if (fs.existsSync(pluginDir)) {
        fs.rmSync(pluginDir, { recursive: true, force: true });
      }
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.PLUGIN_ENABLE, function (_, pluginId) {
    return { success: true };
  });

  ipcMain.handle(IPC_EVENTS.PLUGIN_DISABLE, function (_, pluginId) {
    return { success: true };
  });

  console.log('[PluginHandler] 插件管理IPC已注册');
}

module.exports = { register };
