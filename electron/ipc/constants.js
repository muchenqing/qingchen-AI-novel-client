/**
 * IPC事件名称常量定义模块
 * @description 统一管理所有IPC通道名称，禁止在代码中硬编码事件名
 *              所有主进程、预加载脚本、渲染进程的IPC通信必须引用本模块常量
 * @exports IPC_EVENTS - IPC事件名称常量对象
 */

const IPC_EVENTS = {
  WINDOW_MINIMIZE: 'window-minimize',
  WINDOW_MAXIMIZE: 'window-maximize',
  WINDOW_CLOSE: 'window-close',
  GET_WINDOW_MAXIMIZED: 'get-window-maximized',
  WINDOW_MAXIMIZED_CHANGE: 'window-maximized-change',
  MENU_ACTION: 'menu-action',
  GET_APP_PATH: 'get-app-path',
  SHOW_SAVE_DIALOG: 'show-save-dialog',
  SHOW_OPEN_DIALOG: 'show-open-dialog',
  GET_PLATFORM: 'get-platform',
  AI_TEST_CONNECTION: 'ai-test-connection',
  EXPORT_FILE: 'export-file',
  EXPORT_PROGRESS: 'export-progress',
  CONFIG_READ: 'config-read',
  CONFIG_WRITE: 'config-write',
  CONFIG_RESET: 'config-reset',
  THEME_READ_FILE: 'theme-read-file',
  THEME_WRITE_FILE: 'theme-write-file',
  THEME_LIST_FILES: 'theme-list-files',
  THEME_DELETE_FILE: 'theme-delete-file',
  SHORTCUT_READ: 'shortcut-read',
  SHORTCUT_WRITE: 'shortcut-write',
  NETWORK_CHECK: 'network-check',

  PLUGIN_LIST: 'plugin-list',
  PLUGIN_INSTALL: 'plugin-install',
  PLUGIN_UNINSTALL: 'plugin-uninstall',
  PLUGIN_ENABLE: 'plugin-enable',
  PLUGIN_DISABLE: 'plugin-disable',
  PLUGIN_READ_MANIFEST: 'plugin-read-manifest',
  PLUGIN_WRITE_FILE: 'plugin-write-file',
  PLUGIN_DELETE_FILE: 'plugin-delete-file',
  PLUGIN_LIST_DIR: 'plugin-list-dir',

  VERSION_SNAPSHOT: 'version-snapshot',
  VERSION_LIST: 'version-list',
  VERSION_RESTORE: 'version-restore',
  VERSION_DIFF: 'version-diff',
  VERSION_DELETE: 'version-delete',
  VERSION_MARK: 'version-mark',
  BACKUP_CREATE: 'backup-create',
  BACKUP_LIST: 'backup-list',
  BACKUP_RESTORE: 'backup-restore',
  BACKUP_DELETE: 'backup-delete',
  BACKUP_CLEAN: 'backup-clean',
  BRANCH_LIST: 'branch-list',
  BRANCH_CREATE: 'branch-create',
  BRANCH_DELETE: 'branch-delete',
  BRANCH_SWITCH: 'branch-switch',
  BRANCH_MERGE: 'branch-merge',

  SYNC_STATUS: 'sync-status',
  SYNC_START: 'sync-start',
  SYNC_STOP: 'sync-stop',
  SYNC_CONFIG: 'sync-config',
  SYNC_HISTORY: 'sync-history',
  SYNC_LAN_DISCOVER: 'sync-lan-discover',
  SYNC_LAN_CONNECT: 'sync-lan-connect',
  SYNC_CLOUD_TEST: 'sync-cloud-test',

  AI_IMPORT_SAMPLE: 'ai-import-sample',

  READ_FILE: 'read-file',

  CLEANUP_NOVEL: 'cleanup-novel',

  WINDOW_PIN_TOP: 'window-pin-top',
  WINDOW_GET_PINNED: 'window-get-pinned',
  WINDOW_PINNED_CHANGE: 'window-pinned-change',

  BOOK_EXPORT: 'book-export',
};

module.exports = IPC_EVENTS;
