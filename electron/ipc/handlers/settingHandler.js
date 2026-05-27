/**
 * 系统信息IPC处理器模块
 * @description 处理系统信息查询相关的IPC事件：获取运行平台信息
 * @param {Electron.ipcMain} ipcMain - IPC主进程模块
 */

const IPC_EVENTS = require('../constants.js');

function register(ipcMain) {
  ipcMain.handle(IPC_EVENTS.GET_PLATFORM, function () {
    return process.platform;
  });
}

module.exports = { register };
