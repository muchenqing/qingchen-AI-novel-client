/**
 * 窗口控制IPC处理器模块
 * @description 处理所有窗口控制相关的IPC事件：最小化、最大化、关闭、查询最大化状态
 *              窗口操作逻辑独立于IPC通信层，通过getMainWindow获取窗口实例
 * @param {Electron.ipcMain} ipcMain - IPC主进程模块
 * @param {Function} getMainWindow - 获取当前主窗口实例的方法
 */

const IPC_EVENTS = require('../constants.js');

function register(ipcMain, getMainWindow) {
  ipcMain.on(IPC_EVENTS.WINDOW_MINIMIZE, function () {
    var win = getMainWindow();
    if (win) {
      try { win.minimize(); } catch (e) { console.error('[IPC] minimize error:', e); }
    }
  });

  ipcMain.on(IPC_EVENTS.WINDOW_MAXIMIZE, function () {
    var win = getMainWindow();
    if (win) {
      try {
        if (win.isMaximized()) win.unmaximize();
        else win.maximize();
      } catch (e) {
        console.error('[IPC] maximize error:', e);
      }
    }
  });

  ipcMain.on(IPC_EVENTS.WINDOW_CLOSE, function () {
    var win = getMainWindow();
    if (win) {
      try { win.close(); } catch (e) { console.error('[IPC] close error:', e); }
    }
  });

  ipcMain.handle(IPC_EVENTS.GET_WINDOW_MAXIMIZED, function () {
    var win = getMainWindow();
    return win ? win.isMaximized() : false;
  });

  var isPinned = false;

  ipcMain.on(IPC_EVENTS.WINDOW_PIN_TOP, function () {
    var win = getMainWindow();
    if (win) {
      try {
        isPinned = !isPinned;
        win.setAlwaysOnTop(isPinned);
        win.webContents.send(IPC_EVENTS.WINDOW_PINNED_CHANGE, isPinned);
      } catch (e) {
        console.error('[IPC] pin top error:', e);
      }
    }
  });

  ipcMain.handle(IPC_EVENTS.WINDOW_GET_PINNED, function () {
    return isPinned;
  });
}

module.exports = { register };
