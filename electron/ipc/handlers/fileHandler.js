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
const fs = require('fs');
const path = require('path');

var MAX_FILE_SIZE = 100 * 1024 * 1024;

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

  ipcMain.handle(IPC_EVENTS.READ_FILE, function () {
    var win = getMainWindow();
    if (!win) return { success: false, error: '窗口不可用' };

    var result = dialog.showOpenDialogSync(win, {
      title: '导入本地小说文件',
      filters: [
        { name: '文本文件', extensions: ['txt', 'md', 'markdown', 'text', 'log'] },
        { name: '所有文件', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (!result || result.length === 0) {
      return { success: false, error: '已取消' };
    }

    var filePath = result[0];
    try {
      var stat = fs.statSync(filePath);
      if (stat.size > MAX_FILE_SIZE) {
        return { success: false, error: '文件过大，最大支持 ' + (MAX_FILE_SIZE / 1024 / 1024) + 'MB' };
      }
      if (stat.size === 0) {
        return { success: false, error: '文件为空' };
      }

      var buffer = fs.readFileSync(filePath);
      var text = buffer.toString('utf-8');
      var cleaned = cleanText(text);

      return {
        success: true,
        text: cleaned,
        fileName: path.basename(filePath, path.extname(filePath)),
        charCount: cleaned.length,
      };
    } catch (err) {
      return { success: false, error: '文件读取失败: ' + err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.CLEANUP_NOVEL, function (_, novelId) {
    if (!novelId) return { success: false };
    try {
      var userData = app.getPath('userData');
      var versionsDir = path.join(userData, 'versions', novelId);
      var branchesFile = path.join(userData, 'versions', novelId + '-branches.json');

      if (fs.existsSync(versionsDir)) {
        fs.rmSync(versionsDir, { recursive: true, force: true });
      }
      if (fs.existsSync(branchesFile)) {
        fs.unlinkSync(branchesFile);
      }

      var backupsDir = path.join(userData, 'backups');
      if (fs.existsSync(backupsDir)) {
        var files = fs.readdirSync(backupsDir);
        for (var i = 0; i < files.length; i++) {
          var filePath = path.join(backupsDir, files[i]);
          try {
            var content = fs.readFileSync(filePath, 'utf-8');
            var data = JSON.parse(content);
            if (data.manuscriptId === novelId) {
              fs.unlinkSync(filePath);
            }
          } catch (e) {}
        }
      }

      return { success: true };
    } catch (err) {
      console.error('[FileHandler] 清理小说数据失败:', err);
      return { success: false, error: err.message };
    }
  });
}

function cleanText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .trim();
}

module.exports = { register };
