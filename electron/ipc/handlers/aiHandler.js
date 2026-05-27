/**
 * AI请求IPC处理器模块
 * @description 处理AI相关的IPC事件：模型测试连接、文件导入
 * @param {Electron.ipcMain} ipcMain - IPC主进程模块
 */

const IPC_EVENTS = require('../constants.js');
const electron = require('electron');
const fs = require('fs');
const path = require('path');

function readSampleFile(filePath) {
  try {
    var content = fs.readFileSync(filePath, 'utf-8');
    return {
      success: true,
      content: content,
      fileName: path.basename(filePath),
      size: content.length,
    };
  } catch (err) {
    return { success: false, message: '文件读取失败: ' + err.message };
  }
}

function register(ipcMain, getMainWindow) {
  ipcMain.handle(IPC_EVENTS.AI_TEST_CONNECTION, async function (_, config) {
    try {
      var url = config.baseUrl.replace(/\/+$/, '') + '/v1/chat/completions';
      var headers = { 'Content-Type': 'application/json' };
      if (config.apiKey) headers['Authorization'] = 'Bearer ' + config.apiKey;

      var start = Date.now();
      var res = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5,
          temperature: 0.1,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        return { success: true, message: '连接成功', latency: Date.now() - start };
      }
      var body = await res.text();
      return { success: false, message: '连接失败 (' + res.status + '): ' + body.slice(0, 100) };
    } catch (err) {
      return { success: false, message: '连接错误: ' + err.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.NETWORK_CHECK, async function (_, url) {
    try {
      var controller = new AbortController();
      var timeoutId = setTimeout(function () { controller.abort(); }, 5000);
      var checkUrl = url || 'https://www.baidu.com';
      var response = await fetch(checkUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return { success: true, online: true };
    } catch (error) {
      return { success: false, online: false, message: error.message };
    }
  });

  ipcMain.handle(IPC_EVENTS.AI_IMPORT_SAMPLE, function (_, options) {
    return new Promise(function (resolve) {
      var win = getMainWindow();

      var filter = [
        { name: '文本文件', extensions: ['txt'] },
        { name: '所有文件', extensions: ['*'] },
      ];

      dialog.showOpenDialog(win, {
        title: '选择范文文件',
        properties: ['openFile'],
        filters: filter,
      }).then(function (result) {
        if (result.canceled || !result.filePaths.length) {
          resolve({ success: false, message: '已取消选择' });
          return;
        }
        resolve(readSampleFile(result.filePaths[0]));
      }).catch(function (err) {
        resolve({ success: false, message: err.message });
      });
    });
  });
}

module.exports = { register };
