/**
 * OpenAI / OpenAI兼容接口适配驱动
 * @description 适配OpenAI及所有兼容OpenAI格式的API（如One API、vLLM等）
 * @exports provider - OpenAI适配器对象，包含normalizeParams和parseResponse方法
 */

var provider = {
  name: 'openai',
  displayName: 'OpenAI',

  defaultBaseUrl: 'https://api.openai.com',

  models: [
    { id: 'gpt-4o', name: 'GPT-4o', maxTokens: 128000 },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', maxTokens: 128000 },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', maxTokens: 128000 },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', maxTokens: 16385 },
  ],

  /**
   * 将统一请求参数转换为OpenAI格式
   * @param {Object} params - 统一参数 { messages, temperature, topP, maxTokens, stream }
   * @returns {Object} OpenAI格式参数
   */
  normalizeParams: function (params) {
    var result = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature != null ? params.temperature : 0.8,
      max_tokens: params.maxTokens || 2000,
    };
    if (params.topP != null) result.top_p = params.topP;
    if (params.stream) result.stream = true;
    return result;
  },

  /**
   * 解析OpenAI格式的响应为统一格式
   * @param {Object} data - OpenAI原始响应
   * @returns {Object} { content, finishReason }
   */
  parseResponse: function (data) {
    var choice = data.choices && data.choices[0];
    return {
      content: choice && choice.message && choice.message.content || '',
      finishReason: choice ? choice.finishReason || choice.finish_reason : '',
    };
  },

  /**
   * 构建完整请求URL
   * @param {string} baseUrl - API基础地址
   * @returns {string} 完整的chat completions端点URL
   */
  buildUrl: function (baseUrl) {
    return baseUrl.replace(/\/+$/, '') + '/v1/chat/completions';
  },

  /**
   * 构建请求头
   * @param {string} apiKey - API密钥
   * @returns {Object} 请求头对象
   */
  buildHeaders: function (apiKey) {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    };
  },
};

export default provider;
