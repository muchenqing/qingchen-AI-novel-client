/**
 * IPC路由中心模块
 * @description 统一注册所有IPC事件监听，根据业务分类分发到对应Handler处理器
 *              主进程不直接监听IPC事件，全部通过router集中注册和分发
 * @param {Electron.ipcMain} ipcMain - IPC主进程模块
 * @param {Electron.app} app - Electron应用实例
 * @param {Function} getMainWindow - 获取当前主窗口实例的方法
 */

const windowHandler = require('./handlers/windowHandler.js');
const fileHandler = require('./handlers/fileHandler.js');
const settingHandler = require('./handlers/settingHandler.js');
const aiHandler = require('./handlers/aiHandler.js');
const exportHandler = require('./handlers/exportHandler.js');
const configHandler = require('./handlers/configHandler.js');
const themeHandler = require('./handlers/themeHandler.js');
const shortcutHandler = require('./handlers/shortcutHandler.js');
const pluginHandler = require('./handlers/pluginHandler.js');
const versionHandler = require('./handlers/versionHandler.js');
const syncHandler = require('./handlers/syncHandler.js');

function registerAll(ipcMain, app, getMainWindow) {
  windowHandler.register(ipcMain, getMainWindow);
  fileHandler.register(ipcMain, app, getMainWindow);
  settingHandler.register(ipcMain);
  aiHandler.register(ipcMain);
  exportHandler.register(ipcMain, getMainWindow);
  configHandler.register(ipcMain, app);
  themeHandler.register(ipcMain, app);
  shortcutHandler.register(ipcMain, app);
  pluginHandler.register(ipcMain, app);
  versionHandler.register(ipcMain, app);
  syncHandler.register(ipcMain, app);

  console.log('[Router] 所有IPC事件处理器已注册');
}

module.exports = { registerAll };
