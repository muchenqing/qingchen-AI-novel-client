/**
 * DeepSeek适配驱动
 * @description 适配DeepSeek API（OpenAI兼容格式）
 * @exports provider - DeepSeek适配器对象
 */

var provider = {
  name: 'deepseek',
  displayName: 'DeepSeek',
  isOpenAICompatible: true,

  defaultBaseUrl: 'https://api.deepseek.com',

  models: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat', maxTokens: 65536 },
    { id: 'deepseek-coder', name: 'DeepSeek Coder', maxTokens: 65536 },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', maxTokens: 65536 },
  ],

  normalizeParams: function (params) {
    var result = {
      model: params.model || 'deepseek-chat',
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
