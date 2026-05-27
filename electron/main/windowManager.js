const { BrowserWindow, screen, nativeImage, app, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const IPC_EVENTS = require('../ipc/constants.js');

var ICON_PATH = path.join(__dirname, '..', '..', 'build', 'icons', 'app.ico');
var DEFAULT_BOUNDS = { width: 1440, height: 920 };

var mainWindow = null;
var _windowStateFile = null;

function getStateFilePath() {
  if (!_windowStateFile) {
    _windowStateFile = path.join(app.getPath('userData'), 'window-state.json');
  }
  return _windowStateFile;
}

function loadWindowState() {
  try {
    var filePath = getStateFilePath();
    if (fs.existsSync(filePath)) {
      var data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      var displays = screen.getAllDisplays();
      var validDisplay = displays.some(function (d) {
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
    fs.writeFileSync(getStateFilePath(), JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) { /* ignore */ }
}

function getMainWindow() {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
}

function sendToRenderer() {
  var win = getMainWindow();
  if (!win) return;
  try {
    win.webContents.send.apply(win.webContents, arguments);
  } catch (e) { /* ignore */ }
}

function createWindow() {
  var state = loadWindowState();
  var preloadPath = path.join(__dirname, '..', 'preload', 'preload.js');
  var distIndex = path.join(__dirname, '..', '..', 'dist', 'index.html');

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1024,
    minHeight: 700,
    title: '\u537f\u8fb0 \u00b7 Mercey',
    icon: nativeImage.createFromPath(ICON_PATH),
    backgroundColor: '#F0F7F4',
    show: false,
    frame: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: false,
      spellcheck: false,
    },
  });

  if (state.isMaximized) {
    mainWindow.maximize();
  }

  if (fs.existsSync(distIndex)) {
    mainWindow.loadFile(distIndex);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.once('ready-to-show', function () {
    var win = getMainWindow();
    if (win) {
      win.show();
      win.focus();
      try {
        win.webContents.send(IPC_EVENTS.WINDOW_MAXIMIZED_CHANGE, win.isMaximized());
      } catch (e) { /* ignore */ }
    }
  });

  mainWindow.on('maximize', function () {
    var win = getMainWindow();
    if (win) {
      try { win.webContents.send(IPC_EVENTS.WINDOW_MAXIMIZED_CHANGE, true); } catch (e) { /* ignore */ }
    }
  });

  mainWindow.on('unmaximize', function () {
    var win = getMainWindow();
    if (win) {
      try { win.webContents.send(IPC_EVENTS.WINDOW_MAXIMIZED_CHANGE, false); } catch (e) { /* ignore */ }
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

module.exports = { createWindow, getMainWindow, sendToRenderer };
