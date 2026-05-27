/**
 * AI统一适配器模块（核心）
 * @description 抹平所有模型差异，提供统一调用接口
 *              无论使用什么模型，调用方式完全一致
 * @exports default - aiAdapter对象，提供unifiedRequest统一调用方法
 */

import aiConfig from './aiConfig.js';
import aiRequest from './aiRequest.js';
import openaiProvider from './providers/openai.js';
import qwenProvider from './providers/qwen.js';
import ernieProvider from './providers/ernie.js';
import deepseekProvider from './providers/deepseek.js';
import llamaProvider from './providers/llama.js';
import customProvider from './providers/custom.js';

var providerModules = {
  openai: openaiProvider,
  qwen: qwenProvider,
  ernie: ernieProvider,
  deepseek: deepseekProvider,
  llama: llamaProvider,
  custom: customProvider,
};

function getProvider(name) {
  if (providerModules[name]) return providerModules[name];
  return null;
}

function loadAllProviders() {
  var names = Object.keys(providerModules);
  for (var i = 0; i < names.length; i++) {
    aiConfig.registerProvider(names[i], providerModules[names[i]]);
  }
}

var loaded = false;

function ensureLoaded() {
  if (!loaded) {
    loadAllProviders();
    loaded = true;
  }
}

function getActiveProvider() {
  ensureLoaded();
  var providerName = aiConfig.getCurrentProviderName();
  return getProvider(providerName) || getProvider('openai');
}

var aiAdapter = {
  init: function () {
    loadAllProviders();
  },

  /**
   * 统一AI请求入口
   * @param {string} prompt - 用户输入的提示文本
   * @param {Object} context - 上下文信息 { history, chapterInfo }
   * @param {Object} overrides - 参数覆盖 { temperature, maxTokens, model }
   * @param {AbortSignal} signal - 可选的中断信号
   * @returns {Promise<Object>} { code, message, content, finishReason }
   */
  unifiedRequest: async function (prompt, context, overrides, signal) {
    ensureLoaded();
    var provider = getActiveProvider();
    var providerCfg = aiConfig.getActiveProviderConfig();
    var globalParams = aiConfig.getParameters();
    var mergedParams = Object.assign({}, globalParams, overrides || {});

    var messages = [];
    if (context && context.systemPrompt) {
      messages.push({ role: 'system', content: context.systemPrompt });
    }
    if (context && context.history && context.history.length > 0) {
      for (var i = 0; i < context.history.length; i++) {
        messages.push(context.history[i]);
      }
    }
    messages.push({ role: 'user', content: prompt });

    var normalizedParams = provider.normalizeParams({
      model: providerCfg.model,
      messages: messages,
      temperature: mergedParams.temperature,
      topP: mergedParams.topP,
      maxTokens: mergedParams.maxTokens,
      stream: false,
    });

    try {
      var url = provider.buildUrl(providerCfg.baseUrl);
      var headers = provider.buildHeaders(providerCfg.apiKey);

      var rawResult = await aiRequest.fetchWithRetry(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(normalizedParams),
        signal: signal,
        timeout: mergedParams.timeout || 60000,
      });

      var parsed = provider.parseResponse(rawResult);
      return {
        code: 200,
        message: 'success',
        content: parsed.content,
        finishReason: parsed.finishReason,
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { code: 499, message: '请求已取消', content: '', finishReason: 'abort' };
      }
      return { code: 500, message: err.message || '请求失败', content: '', finishReason: 'error' };
    }
  },

  /**
   * 测试连接
   * @param {string} providerName - 模型提供商名称
   * @returns {Promise<Object>} { success, message, latency }
   */
  testConnection: async function (providerName) {
    ensureLoaded();
    var provider = getProvider(providerName || aiConfig.getCurrentProviderName());
    var providerCfg = aiConfig.getProviderConfig(providerName || aiConfig.getCurrentProviderName());
    if (!provider || !providerCfg) {
      return { success: false, message: '未找到对应的模型提供商' };
    }

    var start = Date.now();
    try {
      var url = provider.buildUrl(providerCfg.baseUrl);
      var headers = provider.buildHeaders(providerCfg.apiKey);
      var normalizedParams = provider.normalizeParams({
        model: providerCfg.model,
        messages: [{ role: 'user', content: 'hi' }],
        maxTokens: 5,
        temperature: 0.1,
      });

      await aiRequest.fetchWithRetry(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(normalizedParams),
        timeout: 15000,
      });

      return {
        success: true,
        message: '\u2713 连接成功 (' + provider.displayName + ')',
        latency: Date.now() - start,
      };
    } catch (err) {
      return {
        success: false,
        message: '\u2717 连接失败: ' + err.message,
        latency: Date.now() - start,
      };
    }
  },

  getActiveProviderName: function () {
    return aiConfig.getCurrentProviderName();
  },

  getAvailableProviders: function () {
    ensureLoaded();
    return aiConfig.getAllEnabledProviders();
  },

  switchProvider: function (name) {
    aiConfig.setCurrentProvider(name);
  },
};

export default aiAdapter;
