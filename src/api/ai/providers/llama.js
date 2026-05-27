/**
 * Llama本地模型适配驱动
 * @description 适配Ollama/vLLM/LM Studio等本地部署的Llama系列模型
 * @exports provider - Llama本地模型适配器对象
 */

var provider = {
  name: 'llama',
  displayName: 'Llama 本地',
  isOpenAICompatible: true,

  defaultBaseUrl: 'http://localhost:11434/v1',

  models: [
    { id: 'llama3.1', name: 'Llama 3.1', maxTokens: 131072 },
    { id: 'llama3', name: 'Llama 3', maxTokens: 8192 },
    { id: 'llama2', name: 'Llama 2', maxTokens: 4096 },
    { id: 'qwen2.5', name: 'Qwen 2.5 (本地)', maxTokens: 32768 },
    { id: 'mistral', name: 'Mistral', maxTokens: 32768 },
    { id: 'custom', name: '自定义模型', maxTokens: 32768 },
  ],

  normalizeParams: function (params) {
    var result = {
      model: params.model || 'llama3.1',
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
    var headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;
    return headers;
  },
};

export default provider;
