import defaultConfigData from './defaultConfig.json';
import { validateConfig, getDefaultValue } from './schema.js';

var STORAGE_KEY = 'qingchen-app-config';
var CONFIG_VERSION = 1;

var currentConfig = null;

function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(function (item) { return deepClone(item); });
  var result = {};
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) {
    result[keys[i]] = deepClone(obj[keys[i]]);
  }
  return result;
}

function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target;
  var result = deepClone(target);
  var keys = Object.keys(source);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else if (source[key] !== undefined) {
      result[key] = deepClone(source[key]);
    }
  }
  return result;
}

function fillDefaults(config, schema) {
  if (!schema || !config) return config;
  if (schema.type && schema.default !== undefined && config === undefined) {
    return deepClone(schema.default);
  }
  if (typeof schema === 'object' && !schema.type && typeof config === 'object') {
    var result = deepClone(config);
    var keys = Object.keys(schema);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (schema[key].type) {
        if (result[key] === undefined) {
          result[key] = deepClone(schema[key].default);
        }
      } else if (typeof schema[key] === 'object') {
        if (!result[key]) result[key] = {};
        result[key] = fillDefaults(result[key], schema[key]);
      }
    }
    return result;
  }
  return config;
}

function migrateConfig(config) {
  if (!config) return deepClone(defaultConfigData);
  var migrated = deepClone(config);
  migrated.version = defaultConfigData.version;
  migrated.configVersion = CONFIG_VERSION;
  return migrated;
}

function loadConfig() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      currentConfig = deepClone(defaultConfigData);
      saveConfig(currentConfig);
      return currentConfig;
    }
    var parsed = JSON.parse(raw);
    var migrated = migrateConfig(parsed);
    var filled = fillDefaults(migrated, {
      type: 'object',
      ai: {
        currentProvider: { type: 'string', default: defaultConfigData.ai.currentProvider },
        providers: { type: 'object' },
        parameters: {
          temperature: { type: 'number', default: defaultConfigData.ai.parameters.temperature },
          topP: { type: 'number', default: defaultConfigData.ai.parameters.topP },
          maxTokens: { type: 'number', default: defaultConfigData.ai.parameters.maxTokens },
          timeout: { type: 'number', default: defaultConfigData.ai.parameters.timeout },
        },
      },
      editor: {
        indent: { type: 'boolean', default: defaultConfigData.editor.indent },
        autoFormat: { type: 'boolean', default: defaultConfigData.editor.autoFormat },
        punctuationFix: { type: 'boolean', default: defaultConfigData.editor.punctuationFix },
        fontSize: { type: 'number', default: defaultConfigData.editor.fontSize },
        lineHeight: { type: 'number', default: defaultConfigData.editor.lineHeight },
        autoSaveInterval: { type: 'number', default: defaultConfigData.editor.autoSaveInterval },
        chunkSize: { type: 'number', default: defaultConfigData.editor.chunkSize },
        debounceDelay: { type: 'number', default: defaultConfigData.editor.debounceDelay },
      },
      export: {
        defaultFormat: { type: 'string', default: defaultConfigData.export.defaultFormat },
        includeToc: { type: 'boolean', default: defaultConfigData.export.includeToc },
        autoClean: { type: 'boolean', default: defaultConfigData.export.autoClean },
      },
      theme: {
        current: { type: 'string', default: defaultConfigData.theme.current },
        customThemes: { type: 'array', default: defaultConfigData.theme.customThemes },
      },
      shortcuts: { type: 'object' },
      window: { type: 'object' },
      features: { type: 'object' },
    });
    currentConfig = filled;
    return currentConfig;
  } catch (e) {
    console.error('[ConfigManager] 加载配置失败，使用默认配置:', e);
    currentConfig = deepClone(defaultConfigData);
    return currentConfig;
  }
}

function saveConfig(config) {
  try {
    var toSave = config || currentConfig;
    if (!toSave) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    return true;
  } catch (e) {
    console.error('[ConfigManager] 保存配置失败:', e);
    return false;
  }
}

function getConfig() {
  if (!currentConfig) loadConfig();
  return currentConfig;
}

function getConfigValue(path) {
  var config = getConfig();
  var parts = path.split('.');
  var current = config;
  for (var i = 0; i < parts.length; i++) {
    if (current === undefined || current === null) return undefined;
    current = current[parts[i]];
  }
  return current;
}

function setConfigValue(path, value) {
  var config = getConfig();
  var parts = path.split('.');
  var current = config;
  for (var i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
  saveConfig(config);
  return true;
}

function setConfigValues(updates) {
  var config = getConfig();
  config = deepMerge(config, updates);
  currentConfig = config;
  saveConfig(config);
  return config;
}

function resetConfig() {
  currentConfig = deepClone(defaultConfigData);
  saveConfig(currentConfig);
  return currentConfig;
}

function resetConfigSection(section) {
  var config = getConfig();
  if (defaultConfigData[section] !== undefined) {
    config[section] = deepClone(defaultConfigData[section]);
    currentConfig = config;
    saveConfig(config);
  }
  return config;
}

function validateCurrentConfig() {
  var config = getConfig();
  return validateConfig(config);
}

function onConfigChange(callback) {
  if (typeof window !== 'undefined' && window._configListeners) {
    window._configListeners.push(callback);
  } else {
    if (typeof window !== 'undefined') window._configListeners = [callback];
  }
}

function notifyConfigChange(path, oldValue, newValue) {
  if (typeof window !== 'undefined' && window._configListeners) {
    for (var i = 0; i < window._configListeners.length; i++) {
      try {
        window._configListeners[i](path, oldValue, newValue);
      } catch (e) {
        console.error('[ConfigManager] 配置变更监听器错误:', e);
      }
    }
  }
}

function exportConfigJSON() {
  var config = getConfig();
  return JSON.stringify(config, null, 2);
}

function importConfigJSON(jsonStr) {
  try {
    var parsed = JSON.parse(jsonStr);
    var errors = validateConfig(parsed);
    if (errors.length > 0) {
      return { success: false, errors: errors };
    }
    currentConfig = migrateConfig(parsed);
    saveConfig(currentConfig);
    return { success: true, config: currentConfig };
  } catch (e) {
    return { success: false, errors: ['配置文件格式错误: ' + e.message] };
  }
}

function getRawConfig() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export {
  loadConfig,
  saveConfig,
  getConfig,
  getConfigValue,
  setConfigValue,
  setConfigValues,
  resetConfig,
  resetConfigSection,
  validateCurrentConfig,
  onConfigChange,
  exportConfigJSON,
  importConfigJSON,
  deepClone,
  deepMerge,
  defaultConfigData,
};
