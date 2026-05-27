import { parseManifest, validateManifest, createManifest } from './pluginManifest.js';
import { createPluginApi, removePluginApi } from './pluginApi.js';
import { validatePluginCode, isPluginAllowed } from '../utils/sandbox.js';
import bus from '../event/bus.js';
import appState from '../core/appState.js';

var STORAGE_KEY = 'qingchen-plugins';
var loadedPlugins = {};
var pluginStates = {};

function getPluginStorageKey() {
  return STORAGE_KEY;
}

function loadPluginList() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function savePluginList(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('[PluginManager] 保存插件列表失败:', e);
  }
}

function getInstalledPlugins() {
  return loadPluginList();
}

function getPluginById(pluginId) {
  var list = loadPluginList();
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === pluginId) return list[i];
  }
  return null;
}

function isPluginInstalled(pluginId) {
  return getPluginById(pluginId) !== null;
}

function installPlugin(manifestData, code) {
  var manifest = createManifest(manifestData);
  var validation = validateManifest(manifest);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  if (!isPluginAllowed(manifest.id)) {
    return { success: false, errors: ['插件ID格式非法'] };
  }

  if (isPluginInstalled(manifest.id)) {
    return { success: false, errors: ['插件已安装: ' + manifest.id] };
  }

  var codeValidation = validatePluginCode(code);
  if (!codeValidation.valid) {
    return { success: false, errors: codeValidation.errors };
  }

  var config = appState.getAppConfig();
  var maxPlugins = (config && config.plugin && config.plugin.maxPlugins) || 50;
  var list = loadPluginList();
  if (list.length >= maxPlugins) {
    return { success: false, errors: ['已达插件数量上限: ' + maxPlugins] };
  }

  var pluginRecord = {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    author: manifest.author,
    license: manifest.license,
    enabled: false,
    installedAt: Date.now(),
    permissions: manifest.permissions || [],
    hooks: manifest.hooks || [],
    code: code || '',
  };

  list.push(pluginRecord);
  savePluginList(list);

  bus.emit('plugin:installed', pluginRecord);
  return { success: true, plugin: pluginRecord };
}

function uninstallPlugin(pluginId) {
  if (!isPluginInstalled(pluginId)) {
    return { success: false, errors: ['插件未安装: ' + pluginId] };
  }

  if (pluginStates[pluginId]) {
    disablePlugin(pluginId);
  }

  var list = loadPluginList();
  list = list.filter(function (p) { return p.id !== pluginId; });
  savePluginList(list);

  delete loadedPlugins[pluginId];
  removePluginApi(pluginId);

  bus.emit('plugin:uninstalled', { id: pluginId });
  return { success: true };
}

function enablePlugin(pluginId) {
  var plugin = getPluginById(pluginId);
  if (!plugin) {
    return { success: false, errors: ['插件未安装: ' + pluginId] };
  }
  if (pluginStates[pluginId]) {
    return { success: true };
  }

  var config = appState.getAppConfig();
  if (config && config.plugin && config.plugin.enabled === false) {
    return { success: false, errors: ['插件系统未启用，请在配置中心开启'] };
  }

  try {
    var api = createPluginApi(pluginId, plugin.permissions);

    var moduleFunc = null;
    if (plugin.code) {
      var wrapped = new Function('pluginApi', '"use strict"; var exports = {}; var module = { exports: exports }; ' + plugin.code + '; return module.exports || exports;');
      moduleFunc = wrapped(api);
    }

    loadedPlugins[pluginId] = {
      manifest: plugin,
      api: api,
      module: moduleFunc,
    };

    if (moduleFunc && typeof moduleFunc.onLoad === 'function') {
      moduleFunc.onLoad(api);
    }
    if (moduleFunc && typeof moduleFunc.onEnable === 'function') {
      moduleFunc.onEnable(api);
    }

    pluginStates[pluginId] = true;

    var list = loadPluginList();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === pluginId) {
        list[i].enabled = true;
        break;
      }
    }
    savePluginList(list);

    bus.emit('plugin:enabled', { id: pluginId });
    return { success: true };
  } catch (e) {
    return { success: false, errors: ['插件启动失败: ' + e.message] };
  }
}

function disablePlugin(pluginId) {
  var loaded = loadedPlugins[pluginId];
  if (!loaded) {
    pluginStates[pluginId] = false;
    return { success: true };
  }

  try {
    if (loaded.module && typeof loaded.module.onDisable === 'function') {
      loaded.module.onDisable(loaded.api);
    }
    if (loaded.module && typeof loaded.module.onUnload === 'function') {
      loaded.module.onUnload(loaded.api);
    }
  } catch (e) {
    console.error('[PluginManager] 插件停用钩子执行出错:', e);
  }

  delete loadedPlugins[pluginId];
  delete pluginStates[pluginId];
  removePluginApi(pluginId);

  var list = loadPluginList();
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === pluginId) {
      list[i].enabled = false;
      break;
    }
  }
  savePluginList(list);

  bus.emit('plugin:disabled', { id: pluginId });
  return { success: true };
}

function isPluginEnabled(pluginId) {
  return !!pluginStates[pluginId];
}

function emitToPlugins(event) {
  var args = Array.prototype.slice.call(arguments, 1);
  var keys = Object.keys(loadedPlugins);
  for (var i = 0; i < keys.length; i++) {
    var loaded = loadedPlugins[keys[i]];
    if (loaded && loaded.module && typeof loaded.module[event] === 'function') {
      try {
        loaded.module[event].apply(null, [loaded.api].concat(args));
      } catch (e) {
        console.error('[PluginManager] 插件事件处理出错:', keys[i], event, e);
      }
    }
  }
}

function getLoadedPlugins() {
  return loadedPlugins;
}

function reloadPlugin(pluginId) {
  var plugin = getPluginById(pluginId);
  if (!plugin || !pluginStates[pluginId]) return { success: false, errors: ['插件未启用'] };
  disablePlugin(pluginId);
  return enablePlugin(pluginId);
}

function getPluginStats() {
  var list = loadPluginList();
  return {
    total: list.length,
    enabled: list.filter(function (p) { return p.enabled; }).length,
    disabled: list.filter(function (p) { return !p.enabled; }).length,
  };
}

export {
  loadPluginList,
  savePluginList,
  getInstalledPlugins,
  getPluginById,
  isPluginInstalled,
  installPlugin,
  uninstallPlugin,
  enablePlugin,
  disablePlugin,
  isPluginEnabled,
  emitToPlugins,
  getLoadedPlugins,
  reloadPlugin,
  getPluginStats,
  getPluginStorageKey,
};
