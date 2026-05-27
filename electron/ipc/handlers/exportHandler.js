/**
 * 文件导出IPC处理器模块
 * @description 处理文件导出相关的IPC事件：保存文件到本地磁盘
 * @param {Electron.ipcMain} ipcMain - IPC主进程模块
 * @param {Function} getMainWindow - 获取当前主窗口实例的方法
 */

const IPC_EVENTS = require('../constants.js');
const { dialog } = require('electron');
const fs = require('fs');
const path = require('path');

function register(ipcMain, getMainWindow) {
  ipcMain.handle(IPC_EVENTS.EXPORT_FILE, async function (_, options) {
    try {
      var win = getMainWindow();
      if (!win) return { success: false, message: '窗口不可用' };

      var extMap = { txt: 'txt', md: 'md', epub: 'epub', json: 'json' };
      var mimeMap = {
        txt: 'text/plain',
        md: 'text/markdown',
        epub: 'application/epub+zip',
        json: 'application/json',
      };

      var ext = options.format || 'txt';
      var defaultName = (options.filename || '书稿') + '.' + ext;

      var result = await dialog.showSaveDialog(win, {
        title: '导出书稿',
        defaultPath: defaultName,
        filters: [
          { name: ext.toUpperCase() + ' 文件', extensions: [ext] },
          { name: '所有文件', extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, message: '用户取消导出' };
      }

      var content = options.content || '';
      fs.writeFileSync(result.filePath, content, 'utf-8');

      return {
        success: true,
        message: '导出成功',
        filePath: result.filePath,
        fileSize: Buffer.byteLength(content, 'utf-8'),
      };
    } catch (err) {
      return { success: false, message: '导出失败: ' + err.message };
    }
  });
}

module.exports = { register };
