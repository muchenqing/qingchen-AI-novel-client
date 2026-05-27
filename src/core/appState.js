/**
 * 全局状态管理模块
 * @description 托管应用全局运行状态，包括书稿列表、当前选中书稿、AI状态等
 *              所有状态的读取和修改必须通过本模块的方法，禁止直接操作变量
 * @exports default - appState对象，包含所有状态的getter/setter及业务方法
 */

import { generateId } from '../utils/helper.js';
import { saveManuscripts } from '../utils/storage.js';

var manuscripts = [];
var currentManuscriptId = null;
var autoSaveTimer = null;
var aiCurrentResult = '';
var aiIsLoading = false;
var searchQuery = '';
var currentAiTab = 'continue';

var currentAiProvider = 'openai';
var aiGlobalParams = { temperature: 0.8, topP: null, maxTokens: 2000 };
var editorConfig = { indent: false, autoFormat: false, punctuationFix: false };
var exportConfig = { defaultFormat: 'txt', includeToc: true, autoClean: true };
var featureSwitches = { contextMemory: true, aiWriteFeatures: true, editorEnhance: true, exportEngine: true };

var appConfig = null;
var currentTheme = 'mint';
var shortcuts = {};
var globalLoading = { visible: false, message: '', type: 'spinner' };
var networkStatus = { online: true, lastCheck: 0 };
var uiPreferences = { configPanelTab: 'general', themePanelOpen: false, shortcutPanelOpen: false };

var pluginStatus = { enabled: false, loaded: [], active: 0 };
var versionControlStatus = { enabled: false, currentBranch: 'main', lastSnapshot: 0 };
var syncStatus = { enabled: false, mode: 'lan', active: false, lastSync: 0 };

var isPinned = false;
var isZenMode = false;
var aiPauseState = { paused: false, content: '' };
var aiUndoStack = [];
var aiRedoStack = [];

var bookProject = null;
var activeCharacterId = null;
var activeMaterialId = null;

var voiceStatus = { isSpeaking: false, isPaused: false, isRecording: false };
var dramaCheckStatus = { loading: false, lastResult: null };
var foreshadowStatus = { loading: false, lastResult: null };
var endingGenStatus = { loading: false, progress: 0, total: 0 };

var appState = {
  getManuscripts: function () {
    return manuscripts;
  },

  setManuscripts: function (list) {
    manuscripts = list;
  },

  getCurrentManuscriptId: function () {
    return currentManuscriptId;
  },

  setCurrentManuscriptId: function (id) {
    currentManuscriptId = id;
  },

  getAutoSaveTimer: function () {
    return autoSaveTimer;
  },

  setAutoSaveTimer: function (timer) {
    if (autoSaveTimer) clearInterval(autoSaveTimer);
    autoSaveTimer = timer;
  },

  getAiCurrentResult: function () {
    return aiCurrentResult;
  },

  setAiCurrentResult: function (val) {
    aiCurrentResult = val;
  },

  getAiIsLoading: function () {
    return aiIsLoading;
  },

  setAiIsLoading: function (val) {
    aiIsLoading = val;
  },

  getSearchQuery: function () {
    return searchQuery;
  },

  setSearchQuery: function (val) {
    searchQuery = val;
  },

  getCurrentAiTab: function () {
    return currentAiTab;
  },

  setCurrentAiTab: function (val) {
    currentAiTab = val;
  },

  getCurrentAiProvider: function () {
    return currentAiProvider;
  },

  setCurrentAiProvider: function (val) {
    currentAiProvider = val;
  },

  getAiGlobalParams: function () {
    return aiGlobalParams;
  },

  setAiGlobalParams: function (params) {
    aiGlobalParams = Object.assign({}, aiGlobalParams, params);
  },

  getEditorConfig: function () {
    return editorConfig;
  },

  setEditorConfig: function (cfg) {
    editorConfig = Object.assign({}, editorConfig, cfg);
  },

  getExportConfig: function () {
    return exportConfig;
  },

  setExportConfig: function (cfg) {
    exportConfig = Object.assign({}, exportConfig, cfg);
  },

  getFeatureSwitches: function () {
    return featureSwitches;
  },

  setFeatureSwitches: function (sw) {
    featureSwitches = Object.assign({}, featureSwitches, sw);
  },

  getAppConfig: function () {
    return appConfig;
  },

  setAppConfig: function (cfg) {
    appConfig = cfg;
  },

  getCurrentTheme: function () {
    return currentTheme;
  },

  setCurrentTheme: function (val) {
    currentTheme = val;
  },

  getShortcuts: function () {
    return shortcuts;
  },

  setShortcuts: function (sc) {
    shortcuts = Object.assign({}, sc);
  },

  getShortcut: function (action) {
    return shortcuts[action] || null;
  },

  setShortcut: function (action, combo) {
    shortcuts[action] = combo;
  },

  getGlobalLoading: function () {
    return globalLoading;
  },

  setGlobalLoading: function (visible, message, type) {
    globalLoading.visible = visible;
    globalLoading.message = message || '';
    globalLoading.type = type || 'spinner';
  },

  getNetworkStatus: function () {
    return networkStatus;
  },

  setNetworkStatus: function (online, lastCheck) {
    networkStatus.online = online;
    networkStatus.lastCheck = lastCheck || Date.now();
  },

  getUiPreferences: function () {
    return uiPreferences;
  },

  setUiPreferences: function (prefs) {
    uiPreferences = Object.assign({}, uiPreferences, prefs);
  },

  getPluginStatus: function () {
    return pluginStatus;
  },

  setPluginStatus: function (status) {
    pluginStatus = Object.assign({}, pluginStatus, status);
  },

  getVersionControlStatus: function () {
    return versionControlStatus;
  },

  setVersionControlStatus: function (status) {
    versionControlStatus = Object.assign({}, versionControlStatus, status);
  },

  getSyncStatus: function () {
    return syncStatus;
  },

  setSyncStatus: function (status) {
    syncStatus = Object.assign({}, syncStatus, status);
  },

  getIsPinned: function () {
    return isPinned;
  },

  setIsPinned: function (val) {
    isPinned = val;
  },

  getIsZenMode: function () {
    return isZenMode;
  },

  setIsZenMode: function (val) {
    isZenMode = val;
  },

  getAiPauseState: function () {
    return aiPauseState;
  },

  setAiPauseState: function (state) {
    aiPauseState = Object.assign({}, aiPauseState, state);
  },

  pushAiUndo: function (content) {
    aiUndoStack.push(content);
    if (aiUndoStack.length > 50) aiUndoStack.shift();
    aiRedoStack = [];
  },

  aiUndo: function () {
    if (aiUndoStack.length === 0) return null;
    var content = aiUndoStack.pop();
    aiRedoStack.push(appState.getAiCurrentResult());
    return content;
  },

  aiRedo: function () {
    if (aiRedoStack.length === 0) return null;
    var content = aiRedoStack.pop();
    aiUndoStack.push(appState.getAiCurrentResult());
    return content;
  },

  getAiUndoStackLength: function () {
    return aiUndoStack.length;
  },

  getAiRedoStackLength: function () {
    return aiRedoStack.length;
  },

  getBookProject: function () {
    return bookProject;
  },

  setBookProject: function (val) {
    bookProject = val;
  },

  getActiveCharacterId: function () {
    return activeCharacterId;
  },

  setActiveCharacterId: function (val) {
    activeCharacterId = val;
  },

  getActiveMaterialId: function () {
    return activeMaterialId;
  },

  setActiveMaterialId: function (val) {
    activeMaterialId = val;
  },

  getVoiceStatus: function () {
    return voiceStatus;
  },

  setVoiceStatus: function (status) {
    voiceStatus = Object.assign({}, voiceStatus, status);
  },

  getDramaCheckStatus: function () {
    return dramaCheckStatus;
  },

  setDramaCheckStatus: function (status) {
    dramaCheckStatus = Object.assign({}, dramaCheckStatus, status);
  },

  getForeshadowStatus: function () {
    return foreshadowStatus;
  },

  setForeshadowStatus: function (status) {
    foreshadowStatus = Object.assign({}, foreshadowStatus, status);
  },

  getEndingGenStatus: function () {
    return endingGenStatus;
  },

  setEndingGenStatus: function (status) {
    endingGenStatus = Object.assign({}, endingGenStatus, status);
  },

  getManuscript: function (id) {
    for (var i = 0; i < manuscripts.length; i++) {
      if (manuscripts[i].id === id) return manuscripts[i];
    }
    return null;
  },

  createManuscript: function () {
    var ms = {
      id: generateId(),
      title: '未命名书稿',
      content: '',
      excerpt: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      wordCount: 0,
    };
    manuscripts.unshift(ms);
    saveManuscripts(manuscripts);
    return ms;
  },

  deleteManuscript: function (id) {
    manuscripts = manuscripts.filter(function (m) { return m.id !== id; });
    saveManuscripts(manuscripts);
    if (currentManuscriptId === id) {
      currentManuscriptId = manuscripts.length > 0 ? manuscripts[0].id : null;
    }
  },

  updateManuscript: function (id, fields) {
    var ms = appState.getManuscript(id);
    if (!ms) return;
    var keys = Object.keys(fields);
    for (var i = 0; i < keys.length; i++) {
      ms[keys[i]] = fields[keys[i]];
    }
    ms.updatedAt = Date.now();
    saveManuscripts(manuscripts);
  },
};

export default appState;
