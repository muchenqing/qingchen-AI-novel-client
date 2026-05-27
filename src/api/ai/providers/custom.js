/**
 * 自定义私有API适配驱动
 * @description 适配用户自定义的私有API接口（需兼容OpenAI格式）
 * @exports provider - 自定义API适配器对象
 */

var provider = {
  name: 'custom',
  displayName: '自定义 API',
  isOpenAICompatible: true,

  defaultBaseUrl: '',

  models: [
    { id: 'custom-model', name: '自定义模型', maxTokens: 32768 },
  ],

  normalizeParams: function (params) {
    var result = {
      model: params.model || 'custom-model',
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
    if (choice && choice.message && choice.message.content) {
      return {
        content: choice.message.content,
        finishReason: choice.finish_reason || '',
      };
    }
    if (data.output && data.output.text) {
      return { content: data.output.text, finishReason: 'stop' };
    }
    if (data.result) {
      return { content: data.result, finishReason: 'stop' };
    }
    return { content: '', finishReason: '' };
  },

  buildUrl: function (baseUrl) {
    var url = baseUrl.replace(/\/+$/, '');
    if (url.indexOf('/chat/completions') !== -1) return url;
    if (url.indexOf('/v1/') !== -1) return url;
    return url + '/v1/chat/completions';
  },

  buildHeaders: function (apiKey) {
    var headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;
    return headers;
  },
};

export default provider;
