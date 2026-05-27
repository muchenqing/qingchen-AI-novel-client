/**
 * 主进程统一入口模块
 * @description 加载并初始化所有主进程模块：窗口管理、生命周期、IPC路由
 *              本模块只负责编排初始化流程，不包含具体业务逻辑
 */

const { app, ipcMain, nativeTheme } = require('electron');
const { createWindow, getMainWindow } = require('./windowManager.js');
const { initLifecycle } = require('./appLifecycle.js');
const ipcRouter = require('../ipc/router.js');

app.whenReady().then(function () {
  var isDev = !app.isPackaged;

  if (isDev) {
    app.commandLine.appendSwitch('disable-features', 'ElectronSecurityWarning');
  }

  nativeTheme.themeSource = 'light';
  initLifecycle();
  ipcRouter.registerAll(ipcMain, app, getMainWindow);
  createWindow();
  console.log('[Main] 应用启动完成');
});
