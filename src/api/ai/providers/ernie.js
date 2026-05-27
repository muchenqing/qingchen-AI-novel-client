/**
 * 百度文心一言适配驱动
 * @description 适配百度文心一言API（ERNIE-BOT系列）
 * @exports provider - 文心一言适配器对象
 */

var provider = {
  name: 'ernie',
  displayName: '文心一言',

  defaultBaseUrl: 'https://aip.baidubce.com',

  models: [
    { id: 'ernie-4.0-turbo-8k', name: 'ERNIE 4.0 Turbo', maxTokens: 8192 },
    { id: 'ernie-4.0-8k', name: 'ERNIE 4.0', maxTokens: 8192 },
    { id: 'ernie-3.5-8k', name: 'ERNIE 3.5', maxTokens: 8192 },
  ],

  normalizeParams: function (params) {
    var result = {
      model: params.model || 'ernie-3.5-8k',
      messages: params.messages,
      temperature: params.temperature != null ? params.temperature : 0.8,
    };
    if (params.maxTokens) result.max_output_tokens = params.maxTokens;
    if (params.topP != null) result.top_p = params.topP;
    if (params.stream) result.stream = true;
    return result;
  },

  parseResponse: function (data) {
    var choice = data.choices && data.choices[0];
    return {
      content: choice && choice.message && choice.message.content || '',
      finishReason: choice ? choice.finish_reason : '',
    };
  },

  buildUrl: function (baseUrl) {
    return baseUrl.replace(/\/+$/, '') + '/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions';
  },

  buildHeaders: function (apiKey) {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    };
  },
};

export default provider;
