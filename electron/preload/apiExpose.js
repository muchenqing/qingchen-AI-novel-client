/**
 * Preload API暴露封装模块
 * @description 按模块分组封装需要暴露给渲染进程的API
 *              严格使用contextBridge安全规范，禁止整体暴露ipcRenderer
 *              每个API方法对应一个明确的IPC事件，入参出参类型固定
 * @param {Electron.contextBridge} contextBridge - Electron安全桥接模块
 * @param {Electron.ipcRenderer} ipcRenderer - IPC渲染进程通信模块
 */

const IPC_EVENTS = require('../ipc/constants.js');

function exposeAPI(contextBridge, ipcRenderer) {
  contextBridge.exposeInMainWorld('electronAPI', {
    minimizeWindow: function () { return ipcRenderer.send(IPC_EVENTS.WINDOW_MINIMIZE); },
    maximizeWindow: function () { return ipcRenderer.send(IPC_EVENTS.WINDOW_MAXIMIZE); },
    closeWindow: function () { return ipcRenderer.send(IPC_EVENTS.WINDOW_CLOSE); },
    isWindowMaximized: function () { return ipcRenderer.invoke(IPC_EVENTS.GET_WINDOW_MAXIMIZED); },
    pinWindowTop: function () { return ipcRenderer.send(IPC_EVENTS.WINDOW_PIN_TOP); },
    isWindowPinned: function () { return ipcRenderer.invoke(IPC_EVENTS.WINDOW_GET_PINNED); },

    getAppPath: function () { return ipcRenderer.invoke(IPC_EVENTS.GET_APP_PATH); },
    getPlatform: function () { return ipcRenderer.invoke(IPC_EVENTS.GET_PLATFORM); },
    showSaveDialog: function (options) { return ipcRenderer.invoke(IPC_EVENTS.SHOW_SAVE_DIALOG, options); },
    showOpenDialog: function (options) { return ipcRenderer.invoke(IPC_EVENTS.SHOW_OPEN_DIALOG, options); },
    readFileContent: function () { return ipcRenderer.invoke(IPC_EVENTS.READ_FILE); },
    cleanupNovel: function (novelId) { return ipcRenderer.invoke(IPC_EVENTS.CLEANUP_NOVEL, novelId); },

    testAiConnection: function (config) { return ipcRenderer.invoke(IPC_EVENTS.AI_TEST_CONNECTION, config); },

    exportFile: function (options) { return ipcRenderer.invoke(IPC_EVENTS.EXPORT_FILE, options); },

    importSample: function (options) { return ipcRenderer.invoke(IPC_EVENTS.AI_IMPORT_SAMPLE, options); },

    configRead: function () { return ipcRenderer.invoke(IPC_EVENTS.CONFIG_READ); },
    configWrite: function (data) { return ipcRenderer.invoke(IPC_EVENTS.CONFIG_WRITE, data); },
    configReset: function () { return ipcRenderer.invoke(IPC_EVENTS.CONFIG_RESET); },

    themeReadFile: function (filename) { return ipcRenderer.invoke(IPC_EVENTS.THEME_READ_FILE, filename); },
    themeWriteFile: function (filename, content) { return ipcRenderer.invoke(IPC_EVENTS.THEME_WRITE_FILE, filename, content); },
    themeListFiles: function () { return ipcRenderer.invoke(IPC_EVENTS.THEME_LIST_FILES); },
    themeDeleteFile: function (filename) { return ipcRenderer.invoke(IPC_EVENTS.THEME_DELETE_FILE, filename); },

    shortcutRead: function () { return ipcRenderer.invoke(IPC_EVENTS.SHORTCUT_READ); },
    shortcutWrite: function (data) { return ipcRenderer.invoke(IPC_EVENTS.SHORTCUT_WRITE, data); },

    networkCheck: function (url) { return ipcRenderer.invoke(IPC_EVENTS.NETWORK_CHECK, url); },

    pluginListDir: function () { return ipcRenderer.invoke(IPC_EVENTS.PLUGIN_LIST_DIR); },
    pluginReadManifest: function (pluginId) { return ipcRenderer.invoke(IPC_EVENTS.PLUGIN_READ_MANIFEST, pluginId); },
    pluginWriteFile: function (pluginId, filename, content) { return ipcRenderer.invoke(IPC_EVENTS.PLUGIN_WRITE_FILE, pluginId, filename, content); },
    pluginDeleteFile: function (pluginId, filename) { return ipcRenderer.invoke(IPC_EVENTS.PLUGIN_DELETE_FILE, pluginId, filename); },
    pluginInstall: function (pluginId, files) { return ipcRenderer.invoke(IPC_EVENTS.PLUGIN_INSTALL, pluginId, files); },
    pluginUninstall: function (pluginId) { return ipcRenderer.invoke(IPC_EVENTS.PLUGIN_UNINSTALL, pluginId); },
    pluginEnable: function (pluginId) { return ipcRenderer.invoke(IPC_EVENTS.PLUGIN_ENABLE, pluginId); },
    pluginDisable: function (pluginId) { return ipcRenderer.invoke(IPC_EVENTS.PLUGIN_DISABLE, pluginId); },

    versionSnapshot: function (manuscriptId, data) { return ipcRenderer.invoke(IPC_EVENTS.VERSION_SNAPSHOT, manuscriptId, data); },
    versionList: function (manuscriptId) { return ipcRenderer.invoke(IPC_EVENTS.VERSION_LIST, manuscriptId); },
    versionRestore: function (manuscriptId, versionId) { return ipcRenderer.invoke(IPC_EVENTS.VERSION_RESTORE, manuscriptId, versionId); },
    versionDelete: function (manuscriptId, versionId) { return ipcRenderer.invoke(IPC_EVENTS.VERSION_DELETE, manuscriptId, versionId); },
    versionMark: function (manuscriptId, versionId, tag) { return ipcRenderer.invoke(IPC_EVENTS.VERSION_MARK, manuscriptId, versionId, tag); },
    versionDiff: function (manuscriptId, vIdA, vIdB) { return ipcRenderer.invoke(IPC_EVENTS.VERSION_DIFF, manuscriptId, vIdA, vIdB); },

    backupCreate: function (data) { return ipcRenderer.invoke(IPC_EVENTS.BACKUP_CREATE, data); },
    backupList: function () { return ipcRenderer.invoke(IPC_EVENTS.BACKUP_LIST); },
    backupRestore: function (backupId) { return ipcRenderer.invoke(IPC_EVENTS.BACKUP_RESTORE, backupId); },
    backupDelete: function (backupId) { return ipcRenderer.invoke(IPC_EVENTS.BACKUP_DELETE, backupId); },
    backupClean: function () { return ipcRenderer.invoke(IPC_EVENTS.BACKUP_CLEAN); },

    branchList: function (manuscriptId) { return ipcRenderer.invoke(IPC_EVENTS.BRANCH_LIST, manuscriptId); },
    branchCreate: function (manuscriptId, data) { return ipcRenderer.invoke(IPC_EVENTS.BRANCH_CREATE, manuscriptId, data); },
    branchDelete: function (manuscriptId, branchName) { return ipcRenderer.invoke(IPC_EVENTS.BRANCH_DELETE, manuscriptId, branchName); },
    branchSwitch: function (manuscriptId, branchName) { return ipcRenderer.invoke(IPC_EVENTS.BRANCH_SWITCH, manuscriptId, branchName); },
    branchMerge: function (manuscriptId, sourceBranch, targetBranch) { return ipcRenderer.invoke(IPC_EVENTS.BRANCH_MERGE, manuscriptId, sourceBranch, targetBranch); },

    syncStatus: function () { return ipcRenderer.invoke(IPC_EVENTS.SYNC_STATUS); },
    syncStart: function (config) { return ipcRenderer.invoke(IPC_EVENTS.SYNC_START, config); },
    syncStop: function () { return ipcRenderer.invoke(IPC_EVENTS.SYNC_STOP); },
    syncConfig: function () { return ipcRenderer.invoke(IPC_EVENTS.SYNC_CONFIG); },
    syncHistory: function () { return ipcRenderer.invoke(IPC_EVENTS.SYNC_HISTORY); },
    syncLanDiscover: function () { return ipcRenderer.invoke(IPC_EVENTS.SYNC_LAN_DISCOVER); },
    syncLanConnect: function (deviceId) { return ipcRenderer.invoke(IPC_EVENTS.SYNC_LAN_CONNECT, deviceId); },
    syncCloudTest: function (cloudUrl) { return ipcRenderer.invoke(IPC_EVENTS.SYNC_CLOUD_TEST, cloudUrl); },

    onWindowMaximizedChange: function (callback) {
      var handler = function (_, maximized) { callback(maximized); };
      ipcRenderer.on(IPC_EVENTS.WINDOW_MAXIMIZED_CHANGE, handler);
      return function () { ipcRenderer.removeListener(IPC_EVENTS.WINDOW_MAXIMIZED_CHANGE, handler); };
    },
    onMenuAction: function (callback) {
      var handler = function (_, action) { callback(action); };
      ipcRenderer.on(IPC_EVENTS.MENU_ACTION, handler);
      return function () { ipcRenderer.removeListener(IPC_EVENTS.MENU_ACTION, handler); };
    },
    onPinnedChange: function (callback) {
      var handler = function (_, pinned) { callback(pinned); };
      ipcRenderer.on(IPC_EVENTS.WINDOW_PINNED_CHANGE, handler);
      return function () { ipcRenderer.removeListener(IPC_EVENTS.WINDOW_PINNED_CHANGE, handler); };
    },
  });
}

module.exports = { exposeAPI };
