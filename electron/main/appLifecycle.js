const { app, Menu, nativeTheme, dialog, session } = require('electron');
const { getMainWindow, sendToRenderer } = require('./windowManager.js');
const IPC_EVENTS = require('../ipc/constants.js');

function setupCSP() {
  var isDev = !app.isPackaged;
  session.defaultSession.webRequest.onHeadersReceived(function (details, callback) {
    var cspHeader;
    if (isDev) {
      cspHeader = [
        "default-src 'self' http://localhost:* ws://localhost:*",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*",
        "style-src 'self' 'unsafe-inline' http://localhost:*",
        "img-src 'self' data: blob: http://localhost:*",
        "font-src 'self' data: http://localhost:*",
        "connect-src 'self' http://localhost:* ws://localhost:*",
        "media-src 'self' blob:",
        "object-src 'none'",
        "frame-src 'none'",
      ].join('; ');
    } else {
      cspHeader = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self' http://localhost:* https://*",
        "media-src 'self' blob:",
        "object-src 'none'",
        "frame-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ');
    }
    var headers = Object.assign({}, details.responseHeaders);
    headers['Content-Security-Policy'] = [cspHeader];
    callback({ responseHeaders: headers });
  });
}

function buildMenu() {
  var template = [
    {
      label: '\u6587\u4ef6',
      submenu: [
        { label: '\u65b0\u5efa\u4e66\u7a3f', accelerator: 'CmdOrCtrl+N', click: function () { sendToRenderer(IPC_EVENTS.MENU_ACTION, 'new-manuscript'); } },
        { label: '\u4fdd\u5b58', accelerator: 'CmdOrCtrl+S', click: function () { sendToRenderer(IPC_EVENTS.MENU_ACTION, 'save'); } },
        { type: 'separator' },
        { role: 'quit', label: '\u9000\u51fa' },
      ],
    },
    {
      label: '\u7f16\u8f91',
      submenu: [
        { role: 'undo', label: '\u64a4\u9500' },
        { role: 'redo', label: '\u91cd\u505a' },
        { type: 'separator' },
        { role: 'cut', label: '\u526a\u5207' },
        { role: 'copy', label: '\u590d\u5236' },
        { role: 'paste', label: '\u7c98\u8d34' },
        { role: 'selectAll', label: '\u5168\u9009' },
      ],
    },
    {
      label: '\u89c6\u56fe',
      submenu: [
        { role: 'reload', label: '\u91cd\u65b0\u52a0\u8f7d', accelerator: 'CmdOrCtrl+R' },
        { role: 'toggleDevTools', label: '\u5f00\u53d1\u8005\u5de5\u5177', accelerator: 'F12' },
        { type: 'separator' },
        { role: 'resetZoom', label: '\u91cd\u7f6e\u7f29\u653e' },
        { role: 'zoomIn', label: '\u653e\u5927' },
        { role: 'zoomOut', label: '\u7f29\u5c0f' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '\u5168\u5c4f' },
      ],
    },
    {
      label: 'AI \u52a9\u624b',
      submenu: [
        { label: '\u6253\u5f00 AI \u52a9\u624b', accelerator: 'CmdOrCtrl+Shift+A', click: function () { sendToRenderer(IPC_EVENTS.MENU_ACTION, 'open-ai'); } },
      ],
    },
    {
      label: '\u5e2e\u52a9',
      submenu: [
        {
          label: '\u5173\u4e8e \u537f\u8fb0',
          click: function () {
            var win = getMainWindow();
            if (win) {
              dialog.showMessageBox(win, {
                type: 'info',
                title: '\u5173\u4e8e \u537f\u8fb0 Mercey',
                message: '\u537f\u8fb0 Mercey v2.0',
                detail: '\u672c\u5730\u72ec\u7acb\u5c0f\u8bf4\u521b\u4f5c\u5ba2\u6237\u7aef\uff0c\u6570\u636e\u672c\u5730\u5b58\u50a8\uff0c\u652f\u6301\u81ea\u5b9a\u4e49 AI API\n\n\u00a9 2026 \u537f\u8fb0\u5de5\u4f5c\u5ba4',
              });
            }
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function initLifecycle() {
  setupCSP();
  buildMenu();

  app.on('activate', function () {
    var { createWindow } = require('./windowManager.js');
    if (require('electron').BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
  });

  console.log('[Lifecycle] \u5e94\u7528\u751f\u547d\u5468\u671f\u5df2\u521d\u59cb\u5316');
}

module.exports = { initLifecycle };
