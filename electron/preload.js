const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppPath: function () { return ipcRenderer.invoke('get-app-path'); },
  getPlatform: function () { return ipcRenderer.invoke('get-platform'); },
  showSaveDialog: function (options) { return ipcRenderer.invoke('show-save-dialog', options); },
  showOpenDialog: function (options) { return ipcRenderer.invoke('show-open-dialog', options); },
  isWindowMaximized: function () { return ipcRenderer.invoke('get-window-maximized'); },
  minimizeWindow: function () { return ipcRenderer.send('window-minimize'); },
  maximizeWindow: function () { return ipcRenderer.send('window-maximize'); },
  closeWindow: function () { return ipcRenderer.send('window-close'); },
  onWindowMaximizedChange: function (callback) {
    var handler = function (_, maximized) { callback(maximized); };
    ipcRenderer.on('window-maximized-change', handler);
    return function () { ipcRenderer.removeListener('window-maximized-change', handler); };
  },
  onMenuAction: function (callback) {
    var handler = function (_, action) { callback(action); };
    ipcRenderer.on('menu-action', handler);
    return function () { ipcRenderer.removeListener('menu-action', handler); };
  },
});
