/**
 * 全局状态管理模块
 * @description 托管应用全局运行状态，包括小说列表、章节数据、AI状态等
 *              所有状态的读取和修改必须通过本模块的方法
 */

import { generateId } from '../utils/helper.js';
import { saveNovels } from '../utils/storage.js';

var novels = [];
var currentNovelId = null;
var currentChapterId = null;
var aiCurrentResult = '';
var aiIsLoading = false;
var searchQuery = '';
var currentAiTab = 'continue';
var currentAiProvider = 'openai';
var aiGlobalParams = { temperature: 0.8, topP: null, maxTokens: 2000 };
var editorConfig = { indent: false, autoFormat: false, punctuationFix: false };
var currentTheme = 'mint';
var shortcuts = {};
var networkStatus = { online: true, lastCheck: 0 };
var isZenMode = false;
var aiUndoStack = [];
var aiRedoStack = [];
var aiHistory = [];
var autoSaveStatus = '已保存';
var syncData = {
  characters: '',
  worldBuilding: '',
  chapterSummary: '',
  lastSyncTime: 0,
  syncEnabled: true,
};

var characterProfiles = {};

var CHAR_CATEGORIES = [
  '基础信息',
  '外在表现',
  '内在心理',
  '人际关系',
  '角色背景',
  '角色动机',
  '成长弧线',
];

var appState = {
  /* ===== 小说列表 ===== */
  getNovels: function () { return novels; },
  setNovels: function (list) { novels = list; },

  /* ===== 当前小说ID ===== */
  getCurrentNovelId: function () { return currentNovelId; },
  setCurrentNovelId: function (id) { currentNovelId = id; },

  /* ===== 当前章节ID ===== */
  getCurrentChapterId: function () { return currentChapterId; },
  setCurrentChapterId: function (id) { currentChapterId = id; },

  /* ===== 自动保存状态 ===== */
  getAutoSaveStatus: function () { return autoSaveStatus; },
  setAutoSaveStatus: function (status) { autoSaveStatus = status; },

  /* ===== AI 结果 ===== */
  getAiCurrentResult: function () { return aiCurrentResult; },
  setAiCurrentResult: function (val) { aiCurrentResult = val; },

  getAiIsLoading: function () { return aiIsLoading; },
  setAiIsLoading: function (val) { aiIsLoading = val; },

  getSearchQuery: function () { return searchQuery; },
  setSearchQuery: function (val) { searchQuery = val; },

  getCurrentAiTab: function () { return currentAiTab; },
  setCurrentAiTab: function (val) { currentAiTab = val; },

  getCurrentAiProvider: function () { return currentAiProvider; },
  setCurrentAiProvider: function (val) { currentAiProvider = val; },

  getAiGlobalParams: function () { return aiGlobalParams; },
  setAiGlobalParams: function (params) { aiGlobalParams = Object.assign({}, aiGlobalParams, params); },

  getEditorConfig: function () { return editorConfig; },
  setEditorConfig: function (cfg) { editorConfig = Object.assign({}, editorConfig, cfg); },

  getCurrentTheme: function () { return currentTheme; },
  setCurrentTheme: function (val) { currentTheme = val; },

  getShortcuts: function () { return shortcuts; },
  setShortcuts: function (sc) { shortcuts = Object.assign({}, sc); },

  getNetworkStatus: function () { return networkStatus; },
  setNetworkStatus: function (online, lastCheck) {
    networkStatus.online = online;
    networkStatus.lastCheck = lastCheck || Date.now();
  },

  getIsZenMode: function () { return isZenMode; },
  setIsZenMode: function (val) { isZenMode = val; },

  pushAiUndo: function (content) {
    aiUndoStack.push(content);
    if (aiUndoStack.length > 50) aiUndoStack.shift();
    aiRedoStack = [];
  },

  aiUndo: function () {
    if (aiUndoStack.length === 0) return null;
    var content = aiUndoStack.pop();
    aiRedoStack.push(aiCurrentResult);
    return content;
  },

  aiRedo: function () {
    if (aiRedoStack.length === 0) return null;
    var content = aiRedoStack.pop();
    aiUndoStack.push(aiCurrentResult);
    return content;
  },

  getAiHistory: function () { return aiHistory; },
  addAiHistory: function (entry) {
    aiHistory.unshift(entry);
    if (aiHistory.length > 100) aiHistory.pop();
  },

  /* ===== 小说 CRUD ===== */
  getNovel: function (id) {
    for (var i = 0; i < novels.length; i++) {
      if (novels[i].id === id) return novels[i];
    }
    return null;
  },

  createNovel: function (title) {
    var novel = {
      id: generateId(),
      title: title || '未命名小说',
      chapters: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      wordCount: 0,
    };
    /* 创建默认第一章 */
    var firstChapter = {
      id: generateId(),
      title: '第一章',
      content: '',
      order: 0,
      wordCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    novel.chapters.push(firstChapter);
    novels.unshift(novel);
    saveNovels(novels);
    return novel;
  },

  deleteNovel: function (id) {
    novels = novels.filter(function (n) { return n.id !== id; });
    saveNovels(novels);
    if (currentNovelId === id) {
      currentNovelId = novels.length > 0 ? novels[0].id : null;
    }
    appState.cleanupNovelRelatedData(id);
  },

  cleanupNovelRelatedData: function (novelId) {
    var keysToRemove = [];
    var profilePrefix = novelId + '_';
    for (var key in characterProfiles) {
      if (characterProfiles.hasOwnProperty(key) && key.indexOf(profilePrefix) === 0) {
        keysToRemove.push(key);
      }
    }
    for (var i = 0; i < keysToRemove.length; i++) {
      delete characterProfiles[keysToRemove[i]];
    }

    aiHistory = aiHistory.filter(function (entry) {
      return entry.novelId !== novelId;
    });

    if (currentNovelId === novelId || currentNovelId === null) {
      aiUndoStack = [];
      aiRedoStack = [];
      syncData.characters = '';
      syncData.worldBuilding = '';
      syncData.chapterSummary = '';
      syncData.lastSyncTime = 0;
    }

    try {
      var lsKeys = [
        'qingchen-version-' + novelId,
        'qingchen-branches-' + novelId,
        'qingchen-active-branch-' + novelId,
        'qingchen-editor-state-' + novelId,
        'qingchen-recovery-' + novelId,
      ];
      for (var j = 0; j < lsKeys.length; j++) {
        localStorage.removeItem(lsKeys[j]);
      }

      var lastNovel = localStorage.getItem('qingchen-last-novel');
      if (lastNovel === novelId) {
        localStorage.removeItem('qingchen-last-novel');
      }

      var backupsRaw = localStorage.getItem('qingchen-backups');
      if (backupsRaw) {
        var backups = JSON.parse(backupsRaw);
        var filteredBackups = backups.filter(function (b) { return b.manuscriptId !== novelId; });
        var removedBackups = backups.filter(function (b) { return b.manuscriptId === novelId; });
        if (filteredBackups.length !== backups.length) {
          localStorage.setItem('qingchen-backups', JSON.stringify(filteredBackups));
          for (var k = 0; k < removedBackups.length; k++) {
            localStorage.removeItem('qingchen-backup-data-' + removedBackups[k].id);
          }
        }
      }
    } catch (e) {
      console.error('[appState] 清理 localStorage 数据失败:', e);
    }
  },

  renameNovel: function (id, newTitle) {
    var novel = appState.getNovel(id);
    if (!novel) return;
    novel.title = newTitle;
    novel.updatedAt = Date.now();
    saveNovels(novels);
  },

  /* ===== 章节 CRUD ===== */
  getChapter: function (novelId, chapterId) {
    var novel = appState.getNovel(novelId);
    if (!novel) return null;
    for (var i = 0; i < novel.chapters.length; i++) {
      if (novel.chapters[i].id === chapterId) return novel.chapters[i];
    }
    return null;
  },

  addChapter: function (novelId, title) {
    var novel = appState.getNovel(novelId);
    if (!novel) return null;
    var chapter = {
      id: generateId(),
      title: title || ('第' + (novel.chapters.length + 1) + '章'),
      content: '',
      order: novel.chapters.length,
      wordCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    novel.chapters.push(chapter);
    novel.updatedAt = Date.now();
    saveNovels(novels);
    return chapter;
  },

  deleteChapter: function (novelId, chapterId) {
    var novel = appState.getNovel(novelId);
    if (!novel) return;
    novel.chapters = novel.chapters.filter(function (c) { return c.id !== chapterId; });
    /* 重排顺序 */
    for (var i = 0; i < novel.chapters.length; i++) {
      novel.chapters[i].order = i;
    }
    novel.updatedAt = Date.now();
    /* 更新字数 */
    appState.recalcNovelWordCount(novelId);
    saveNovels(novels);
  },

  renameChapter: function (novelId, chapterId, newTitle) {
    var chapter = appState.getChapter(novelId, chapterId);
    if (!chapter) return;
    chapter.title = newTitle;
    chapter.updatedAt = Date.now();
    var novel = appState.getNovel(novelId);
    if (novel) novel.updatedAt = Date.now();
    saveNovels(novels);
  },

  updateChapterContent: function (novelId, chapterId, content) {
    var chapter = appState.getChapter(novelId, chapterId);
    if (!chapter) return;
    chapter.content = content;
    chapter.wordCount = appState.countWords(content);
    chapter.updatedAt = Date.now();
    var novel = appState.getNovel(novelId);
    if (novel) {
      novel.updatedAt = Date.now();
      appState.recalcNovelWordCount(novelId);
    }
    saveNovels(novels);
  },

  reorderChapters: function (novelId, orderedChapterIds) {
    var novel = appState.getNovel(novelId);
    if (!novel) return;
    var chapterMap = {};
    for (var i = 0; i < novel.chapters.length; i++) {
      chapterMap[novel.chapters[i].id] = novel.chapters[i];
    }
    novel.chapters = orderedChapterIds.map(function (id, idx) {
      var ch = chapterMap[id];
      if (ch) ch.order = idx;
      return ch;
    }).filter(Boolean);
    novel.updatedAt = Date.now();
    saveNovels(novels);
  },

  recalcNovelWordCount: function (novelId) {
    var novel = appState.getNovel(novelId);
    if (!novel) return;
    var total = 0;
    for (var i = 0; i < novel.chapters.length; i++) {
      total += novel.chapters[i].wordCount || 0;
    }
    novel.wordCount = total;
  },

  countWords: function (text) {
    if (!text) return 0;
    var cleaned = text.replace(/\s+/g, '');
    var chinese = cleaned.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
    var english = cleaned.match(/[a-zA-Z]+/g);
    return (chinese ? chinese.length : 0) + (english ? english.length : 0);
  },

  /* ===== AI 同步数据 ===== */
  getSyncData: function () { return syncData; },
  getSyncCharacters: function () { return syncData.characters; },
  setSyncCharacters: function (val) { syncData.characters = val; },
  getSyncWorldBuilding: function () { return syncData.worldBuilding; },
  setSyncWorldBuilding: function (val) { syncData.worldBuilding = val; },
  getSyncChapterSummary: function () { return syncData.chapterSummary; },
  setSyncChapterSummary: function (val) { syncData.chapterSummary = val; },
  getSyncLastTime: function () { return syncData.lastSyncTime; },
  setSyncLastTime: function (val) { syncData.lastSyncTime = val; },
  isSyncEnabled: function () { return syncData.syncEnabled; },
  setSyncEnabled: function (val) { syncData.syncEnabled = val; },
  mergeSyncCharacters: function (text) {
    if (!text) return;
    if (syncData.characters) {
      syncData.characters = syncData.characters + '\n\n---\n' + text;
    } else {
      syncData.characters = text;
    }
    syncData.characters = deduplicateText(syncData.characters);
  },
  mergeSyncWorldBuilding: function (text) {
    if (!text) return;
    if (syncData.worldBuilding) {
      syncData.worldBuilding = syncData.worldBuilding + '\n\n---\n' + text;
    } else {
      syncData.worldBuilding = text;
    }
    syncData.worldBuilding = deduplicateText(syncData.worldBuilding);
  },
  setSyncChapterSummary: function (text) {
    syncData.chapterSummary = text || '';
  },

  /* ===== 结构化角色设定存储 ===== */
  getCharCategories: function () { return CHAR_CATEGORIES; },

  _profileKey: function (novelId, chapterId) {
    return novelId + '_' + chapterId;
  },

  getCharacterProfiles: function (novelId, chapterId) {
    var key = this._profileKey(novelId, chapterId);
    return characterProfiles[key] || {};
  },

  getCharacterProfile: function (novelId, chapterId, charName) {
    var profiles = this.getCharacterProfiles(novelId, chapterId);
    return profiles[charName] || null;
  },

  ensureCharacterProfile: function (novelId, chapterId, charName) {
    var key = this._profileKey(novelId, chapterId);
    if (!characterProfiles[key]) characterProfiles[key] = {};
    if (!characterProfiles[key][charName]) {
      var empty = {};
      for (var i = 0; i < CHAR_CATEGORIES.length; i++) {
        empty[CHAR_CATEGORIES[i]] = '';
      }
      characterProfiles[key][charName] = empty;
    }
    return characterProfiles[key][charName];
  },

  updateCharacterProfile: function (novelId, chapterId, charName, category, content) {
    var key = this._profileKey(novelId, chapterId);
    if (!characterProfiles[key]) characterProfiles[key] = {};
    if (!characterProfiles[key][charName]) {
      this.ensureCharacterProfile(novelId, chapterId, charName);
    }
    characterProfiles[key][charName][category] = content || '';
  },

  setCharacterProfiles: function (novelId, chapterId, profiles) {
    var key = this._profileKey(novelId, chapterId);
    characterProfiles[key] = profiles;
  },

  deleteCharacterProfile: function (novelId, chapterId, charName) {
    var key = this._profileKey(novelId, chapterId);
    if (characterProfiles[key]) {
      delete characterProfiles[key][charName];
      var keys = Object.keys(characterProfiles[key]);
      if (keys.length === 0) delete characterProfiles[key];
    }
  },

  getAllCharacterNames: function (novelId, chapterId) {
    var profiles = this.getCharacterProfiles(novelId, chapterId);
    return Object.keys(profiles);
  },

  /* ===== 兼容旧 manuscrit API ===== */
  getManuscripts: function () { return novels; },
  setManuscripts: function (list) { novels = list; },
  getCurrentManuscriptId: function () { return currentNovelId; },
  setCurrentManuscriptId: function (id) { currentNovelId = id; },
  getManuscript: function (id) { return appState.getNovel(id); },

  createManuscript: function () {
    var novel = appState.createNovel();
    return {
      id: novel.id,
      title: novel.title,
      content: novel.chapters[0] ? novel.chapters[0].content : '',
      excerpt: '',
      createdAt: novel.createdAt,
      updatedAt: novel.updatedAt,
      wordCount: novel.wordCount,
    };
  },

  deleteManuscript: function (id) { appState.deleteNovel(id); },

  updateManuscript: function (id, fields) {
    var novel = appState.getNovel(id);
    if (!novel) return;
    if (fields.title !== undefined) novel.title = fields.title;
    if (fields.content !== undefined) {
      if (novel.chapters.length === 0) {
        appState.addChapter(id, '第一章');
      }
      var ch = novel.chapters[0];
      if (ch) {
        ch.content = fields.content;
        ch.wordCount = fields.wordCount || 0;
        ch.updatedAt = Date.now();
      }
    }
    if (fields.wordCount !== undefined) novel.wordCount = fields.wordCount;
    novel.updatedAt = Date.now();
    saveNovels(novels);
  },
};

function deduplicateText(text) {
  if (!text) return text;
  var lines = text.split('\n');
  var seen = {};
  var result = [];
  for (var i = 0; i < lines.length; i++) {
    var trimmed = lines[i].trim();
    if (!trimmed) {
      result.push('');
      continue;
    }
    if (!seen[trimmed]) {
      seen[trimmed] = true;
      result.push(lines[i]);
    }
  }
  /* 清理尾部空行 */
  while (result.length > 0 && !result[result.length - 1]) {
    result.pop();
  }
  return result.join('\n');
}

export default appState;
