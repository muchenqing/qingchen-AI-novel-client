/**
 * 阿里通义千问适配驱动
 * @description 适配通义千问API（DashScope OpenAI兼容模式 + 原生模式）
 * @exports provider - 通义千问适配器对象
 */

var provider = {
  name: 'qwen',
  displayName: '通义千问',
  isOpenAICompatible: true,

  defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode',
  defaultApiPrefix: '/v1/chat/completions',

  models: [
    { id: 'qwen-max', name: '通义千问 Max', maxTokens: 32000 },
    { id: 'qwen-plus', name: '通义千问 Plus', maxTokens: 131072 },
    { id: 'qwen-turbo', name: '通义千问 Turbo', maxTokens: 131072 },
    { id: 'qwen-long', name: '通义千问 Long', maxTokens: 10000000 },
  ],

  normalizeParams: function (params) {
    var result = {
      model: params.model || 'qwen-plus',
      messages: params.messages,
      temperature: params.temperature != null ? params.temperature : 0.8,
      max_tokens: params.maxTokens || 2000,
    };
    if (params.topP != null) result.top_p = params.topP;
    if (params.stream) result.stream = true;
    return result;
  },

  parseResponse: function (data) {
    var choice = data.choices && data.choices[0];
    return {
      content: choice && choice.message && choice.message.content || '',
      finishReason: choice ? choice.finishReason || choice.finish_reason : '',
    };
  },

  buildUrl: function (baseUrl) {
    return baseUrl.replace(/\/+$/, '') + '/v1/chat/completions';
  },

  buildHeaders: function (apiKey) {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    };
  },
};

export default provider;
