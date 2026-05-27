import { countWords } from './format.js';
import appState from '../core/appState.js';
import bus from '../event/bus.js';

var STORAGE_KEY = 'qingchen-autosave-config';
var dirtyFlag = false;
var lastSaveTime = 0;
var autoSaveTimers = { interval: null, blur: null, beforeunload: null, debounce: null };
var _busUnsubscribers = [];

function getDefaultConfig() {
  return {
    enabled: true,
    interval: 5000,
    debounce: 500,
    onBlur: true,
    onCloseReminder: true,
  };
}

function loadConfig() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      return Object.assign({}, getDefaultConfig(), parsed);
    }
  } catch (e) { /* ignore */ }
  return getDefaultConfig();
}

function saveConfig(cfg) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (e) { /* ignore */ }
}

function setDirty() {
  dirtyFlag = true;
  scheduleDebounceSave();
}

function isDirty() {
  return dirtyFlag;
}

function clearDirty() {
  dirtyFlag = false;
  lastSaveTime = Date.now();
}

function performSave() {
  var msId = appState.getCurrentManuscriptId();
  if (!msId) return false;

  var editor = document.getElementById('editor');
  if (!editor) return false;

  var content = editor.innerText || '';

  try {
    bus.emit('autosave:saving');
    var wc = countWords(content);
    appState.updateManuscript(msId, {
      content: content,
      excerpt: content.slice(0, 120).replace(/\n/g, ' '),
      wordCount: wc,
    });
    clearDirty();
    bus.emit('manuscript:list-changed');
    bus.emit('autosave:saved');
    return true;
  } catch (e) {
    bus.emit('tips:show', { type: 'error', message: '保存失败: ' + e.message, duration: 4000 });
    return false;
  }
}

function scheduleDebounceSave() {
  if (autoSaveTimers.debounce) {
    clearTimeout(autoSaveTimers.debounce);
  }
  var cfg = loadConfig();
  var delay = cfg.debounce || 500;
  autoSaveTimers.debounce = setTimeout(function () {
    autoSaveTimers.debounce = null;
    if (dirtyFlag) {
      performSave();
    }
  }, delay);
}

function startIntervalSave() {
  stopIntervalSave();
  var cfg = loadConfig();
  if (!cfg.enabled || cfg.interval <= 0) return;

  autoSaveTimers.interval = setInterval(function () {
    if (dirtyFlag) {
      performSave();
    }
  }, cfg.interval);
}

function stopIntervalSave() {
  if (autoSaveTimers.interval) {
    clearInterval(autoSaveTimers.interval);
    autoSaveTimers.interval = null;
  }
}

function _handleBlur() {
  if (dirtyFlag) {
    if (autoSaveTimers.debounce) {
      clearTimeout(autoSaveTimers.debounce);
      autoSaveTimers.debounce = null;
    }
    performSave();
  }
}

function _handleBeforeUnload(e) {
  if (dirtyFlag) {
    if (autoSaveTimers.debounce) {
      clearTimeout(autoSaveTimers.debounce);
      autoSaveTimers.debounce = null;
    }
    performSave();
    var msg = '您有未保存的更改，确定要离开吗？';
    e.returnValue = msg;
    return msg;
  }
}

function setupBlurSave() {
  var cfg = loadConfig();
  if (!cfg.enabled || !cfg.onBlur) return;

  window.addEventListener('blur', _handleBlur);
}

function setupBeforeUnloadReminder() {
  var cfg = loadConfig();
  if (!cfg.enabled || !cfg.onCloseReminder) return;

  window.addEventListener('beforeunload', _handleBeforeUnload);
}

function manualSave() {
  if (autoSaveTimers.debounce) {
    clearTimeout(autoSaveTimers.debounce);
    autoSaveTimers.debounce = null;
  }
  var ok = performSave();
  if (ok) {
    bus.emit('tips:show', { type: 'success', message: '已保存', duration: 2000 });
  } else {
    bus.emit('tips:show', { type: 'warning', message: '没有需要保存的内容', duration: 2000 });
  }
  return ok;
}

function updateInterval(newInterval) {
  var cfg = loadConfig();
  cfg.interval = Math.max(1000, Math.min(300000, newInterval));
  saveConfig(cfg);
  startIntervalSave();
}

function setEnabled(enabled) {
  var cfg = loadConfig();
  cfg.enabled = enabled;
  saveConfig(cfg);
  if (enabled) {
    startIntervalSave();
  } else {
    stopIntervalSave();
  }
}

function initAutoSave() {
  var cfg = loadConfig();
  if (cfg.enabled) {
    startIntervalSave();
  }
  setupBlurSave();
  setupBeforeUnloadReminder();

  bus.on('editor:content-changed', setDirty);
}

function destroyAutoSave() {
  stopIntervalSave();
  if (autoSaveTimers.debounce) {
    clearTimeout(autoSaveTimers.debounce);
    autoSaveTimers.debounce = null;
  }
  window.removeEventListener('blur', _handleBlur);
  window.removeEventListener('beforeunload', _handleBeforeUnload);
  for (var i = 0; i < _busUnsubscribers.length; i++) {
    if (typeof _busUnsubscribers[i] === 'function') _busUnsubscribers[i]();
  }
  _busUnsubscribers = [];
}

function getLastSaveTime() {
  return lastSaveTime;
}

export {
  initAutoSave,
  destroyAutoSave,
  manualSave,
  setDirty,
  isDirty,
  performSave,
  loadConfig,
  saveConfig,
  updateInterval,
  setEnabled,
  getLastSaveTime,
  getDefaultConfig,
};
