'use strict';

const { app, BrowserWindow, Menu, nativeTheme, ipcMain, dialog, shell, screen, session } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;
const DEFAULT_BOUNDS = { width: 1440, height: 920 };
const WINDOW_STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

let mainWindow = null;

if (isDev) {
  app.commandLine.appendSwitch('disable-features', 'ElectronSecurityWarning');
}

function loadWindowState() {
  try {
    if (fs.existsSync(WINDOW_STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(WINDOW_STATE_FILE, 'utf-8'));
      const displays = screen.getAllDisplays();
      const validDisplay = displays.some(function (d) {
        return data.x !== undefined &&
          data.y !== undefined &&
          data.x < d.bounds.x + d.bounds.width &&
          data.y < d.bounds.y + d.bounds.height &&
          data.x + data.width > d.bounds.x &&
          data.y + data.height > d.bounds.y;
      });
      if (validDisplay && data.width > 0 && data.height > 0) {
        return {
          x: data.x,
          y: data.y,
          width: Math.max(data.width, 1024),
          height: Math.max(data.height, 700),
          isMaximized: !!data.isMaximized,
        };
      }
    }
  } catch (e) { /* ignore */ }
  return Object.assign({}, DEFAULT_BOUNDS, { isMaximized: false });
}

function saveWindowState(win) {
  if (win.isDestroyed()) return;
  var isMaximized = win.isMaximized();
  var bounds = isMaximized ? win.getNormalBounds() : win.getBounds();
  var state = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    isMaximized: isMaximized,
  };
  try {
    fs.writeFileSync(WINDOW_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) { /* ignore */ }
}

function getTargetWindow() {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
}

function setupCSP() {
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

function createWindow() {
  var state = loadWindowState();
  var preloadPath = path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1024,
    minHeight: 700,
    title: '卿辰 · Mercey',
    backgroundColor: '#F0F7F4',
    show: false,
    frame: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
      spellcheck: false,
    },
  });

  if (state.isMaximized) {
    mainWindow.maximize();
  }

  var distIndex = path.join(__dirname, '..', 'dist', 'index.html');
  if (fs.existsSync(distIndex)) {
    mainWindow.loadFile(distIndex);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.once('ready-to-show', function () {
    var win = getTargetWindow();
    if (win) {
      win.show();
      win.focus();
      try {
        win.webContents.send('window-maximized-change', win.isMaximized());
      } catch (e) { /* ignore */ }
    }
  });

  mainWindow.on('maximize', function () {
    var win = getTargetWindow();
    if (win) {
      try { win.webContents.send('window-maximized-change', true); } catch (e) { /* ignore */ }
    }
  });

  mainWindow.on('unmaximize', function () {
    var win = getTargetWindow();
    if (win) {
      try { win.webContents.send('window-maximized-change', false); } catch (e) { /* ignore */ }
    }
  });

  mainWindow.on('resize', function () {
    if (mainWindow && !mainWindow.isDestroyed()) saveWindowState(mainWindow);
  });

  mainWindow.on('move', function () {
    if (mainWindow && !mainWindow.isDestroyed()) saveWindowState(mainWindow);
  });

  mainWindow.on('closed', function () {
    if (mainWindow && !mainWindow.isDestroyed()) {
      saveWindowState(mainWindow);
    }
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(function (info) {
    shell.openExternal(info.url);
    return { action: 'deny' };
  });
}

function buildMenu() {
  var template = [
    {
      label: '文件',
      submenu: [
        { label: '新建书稿', accelerator: 'CmdOrCtrl+N', click: function () { sendToRenderer('menu-action', 'new-manuscript'); } },
        { label: '保存', accelerator: 'CmdOrCtrl+S', click: function () { sendToRenderer('menu-action', 'save'); } },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载', accelerator: 'CmdOrCtrl+R' },
        { role: 'toggleDevTools', label: '开发者工具', accelerator: 'F12' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
      ],
    },
    {
      label: 'AI 助手',
      submenu: [
        { label: '打开 AI 助手', accelerator: 'CmdOrCtrl+Shift+A', click: function () { sendToRenderer('menu-action', 'open-ai'); } },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 卿辰',
          click: function () {
            var win = getTargetWindow();
            if (win) {
              dialog.showMessageBox(win, {
                type: 'info',
                title: '关于 卿辰 Mercey',
                message: '卿辰 Mercey v1.0',
                detail: '本地独立小说创作客户端，数据本地存储，支持自定义 AI API\n\n© 2026 卿辰工作室',
              });
            }
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function sendToRenderer() {
  var win = getTargetWindow();
  if (!win) return;
  try {
    win.webContents.send.apply(win.webContents, arguments);
  } catch (e) { /* ignore */ }
}

app.whenReady().then(function () {
  nativeTheme.themeSource = 'light';
  setupCSP();
  buildMenu();
  createWindow();
});

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('window-minimize', function () {
  var win = getTargetWindow();
  if (win) {
    try { win.minimize(); } catch (e) { /* ignore */ }
  }
});

ipcMain.on('window-maximize', function () {
  var win = getTargetWindow();
  if (win) {
    try {
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    } catch (e) { /* ignore */ }
  }
});

ipcMain.on('window-close', function () {
  var win = getTargetWindow();
  if (win) {
    try { win.close(); } catch (e) { /* ignore */ }
  }
});

ipcMain.handle('get-window-maximized', function () {
  var win = getTargetWindow();
  return win ? win.isMaximized() : false;
});

ipcMain.handle('get-app-path', function () {
  return app.getPath('userData');
});

ipcMain.handle('show-save-dialog', function (_, options) {
  var win = getTargetWindow();
  if (!win) return { canceled: true };
  return dialog.showSaveDialog(win, options);
});

ipcMain.handle('show-open-dialog', function (_, options) {
  var win = getTargetWindow();
  if (!win) return { canceled: true, filePaths: [] };
  return dialog.showOpenDialog(win, options);
});

ipcMain.handle('get-platform', function () {
  return process.platform;
});
