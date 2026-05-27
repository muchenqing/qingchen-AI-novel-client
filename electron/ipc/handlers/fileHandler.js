/**
 * 文件操作IPC处理器模块
 * @description 处理文件相关的IPC事件：获取应用路径、显示保存对话框、显示打开对话框
 *              所有文件对话框通过主窗口实例展示，遵循Electron安全规范
 * @param {Electron.ipcMain} ipcMain - IPC主进程模块
 * @param {Electron.app} app - Electron应用实例
 * @param {Function} getMainWindow - 获取当前主窗口实例的方法
 */

const IPC_EVENTS = require('../constants.js');
const { dialog } = require('electron');
const path = require('path');

function register(ipcMain, app, getMainWindow) {
  ipcMain.handle(IPC_EVENTS.GET_APP_PATH, function () {
    return app.getPath('userData');
  });

  ipcMain.handle(IPC_EVENTS.SHOW_SAVE_DIALOG, function (_, options) {
    var win = getMainWindow();
    if (!win) return { canceled: true };
    return dialog.showSaveDialog(win, options);
  });

  ipcMain.handle(IPC_EVENTS.SHOW_OPEN_DIALOG, function (_, options) {
    var win = getMainWindow();
    if (!win) return { canceled: true, filePaths: [] };
    return dialog.showOpenDialog(win, options);
  });
}

module.exports = { register };
