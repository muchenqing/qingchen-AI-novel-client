/**
 * AI参数统一配置管理模块
 * @description 管理所有AI模型的配置信息，支持多模型并存、动态切换
 *              配置持久化到localStorage，兼容旧版本单模型配置格式
 * @exports default - aiConfig对象，包含读写配置、获取当前provider等方法
 */

import { STORAGE_KEYS, THEMES } from '../../utils/storage.js';

var PROVIDERS = {
  openai: null,
  qwen: null,
  ernie: null,
  deepseek: null,
  llama: null,
  custom: null,
};

var AI_CONFIG_KEY = 'qingchen-ai-config-v2';
var AI_LEGACY_KEY = 'qingchen-ai-config';

var DEFAULT_CONFIG = {
  currentProvider: 'openai',
  providers: {
    openai: { baseUrl: 'https://api.openai.com', apiKey: '', model: 'gpt-4o', enabled: true },
    qwen: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode', apiKey: '', model: 'qwen-plus', enabled: false },
    ernie: { baseUrl: 'https://aip.baidubce.com', apiKey: '', model: 'ernie-3.5-8k', enabled: false },
    deepseek: { baseUrl: 'https://api.deepseek.com', apiKey: '', model: 'deepseek-chat', enabled: false },
    llama: { baseUrl: 'http://localhost:11434/v1', apiKey: '', model: 'llama3.1', enabled: false },
    custom: { baseUrl: '', apiKey: '', model: 'custom-model', enabled: false },
  },
  parameters: {
    temperature: 0.8,
    topP: null,
    maxTokens: 2000,
    timeout: 60000,
  },
};

function migrateLegacyConfig() {
  try {
    var legacy = localStorage.getItem(AI_LEGACY_KEY);
    if (!legacy) return null;
    var oldCfg = JSON.parse(legacy);
    var migrated = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    migrated.providers.openai.baseUrl = oldCfg.apiUrl || migrated.providers.openai.baseUrl;
    migrated.providers.openai.apiKey = oldCfg.apiKey || '';
    migrated.providers.openai.model = oldCfg.model || 'gpt-4o';
    migrated.providers.openai.enabled = !!oldCfg.apiKey;
    localStorage.removeItem(AI_LEGACY_KEY);
    return migrated;
  } catch (e) {
    return null;
  }
}

function loadConfig() {
  try {
    var raw = localStorage.getItem(AI_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
    var migrated = migrateLegacyConfig();
    if (migrated) {
      saveConfig(migrated);
      return migrated;
    }
  } catch (e) { /* ignore */ }
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function saveConfig(cfg) {
  try {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.error('[AIConfig] 保存配置失败:', e);
  }
}

var aiConfig = {
  get: loadConfig,

  save: saveConfig,

  getCurrentProviderName: function () {
    return loadConfig().currentProvider;
  },

  setCurrentProvider: function (name) {
    var cfg = loadConfig();
    cfg.currentProvider = name;
    saveConfig(cfg);
  },

  getProviderConfig: function (name) {
    var cfg = loadConfig();
    return cfg.providers[name] || null;
  },

  setProviderConfig: function (name, providerCfg) {
    var cfg = loadConfig();
    cfg.providers[name] = Object.assign({}, cfg.providers[name] || {}, providerCfg);
    saveConfig(cfg);
  },

  getParameters: function () {
    return loadConfig().parameters;
  },

  setParameters: function (params) {
    var cfg = loadConfig();
    cfg.parameters = Object.assign({}, cfg.parameters, params);
    saveConfig(cfg);
  },

  getActiveProviderConfig: function () {
    var cfg = loadConfig();
    return cfg.providers[cfg.currentProvider] || cfg.providers.openai;
  },

  registerProvider: function (name, providerModule) {
    PROVIDERS[name] = providerModule;
  },

  getProvider: function (name) {
    return PROVIDERS[name] || null;
  },

  getAvailableModels: function (providerName) {
    var p = PROVIDERS[providerName];
    return p ? p.models : [];
  },

  getAllEnabledProviders: function () {
    var cfg = loadConfig();
    var result = [];
    var names = Object.keys(cfg.providers);
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      if (cfg.providers[name].enabled) {
        var p = PROVIDERS[name];
        result.push({
          name: name,
          displayName: p ? p.displayName : name,
          models: p ? p.models : [],
        });
      }
    }
    return result;
  },
};

export default aiConfig;
