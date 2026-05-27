/**
 * AI统一请求封装模块
 * @description 提供fetch封装、重试、超时、中断控制
 * @exports default - aiRequest对象
 */

function fetchWithTimeout(url, options, timeout) {
  var controller = new AbortController();
  var timeoutId = null;
  var originalSignal = options.signal;

  if (timeout > 0) {
    timeoutId = setTimeout(function () {
      controller.abort();
    }, timeout);
  }

  var fetchOptions = Object.assign({}, options);
  if (originalSignal) {
    if (originalSignal.aborted) {
      controller.abort();
    } else {
      originalSignal.addEventListener('abort', function () {
        controller.abort();
      });
    }
  }
  fetchOptions.signal = controller.signal;

  return fetch(url, fetchOptions).then(function (res) {
    if (timeoutId) clearTimeout(timeoutId);
    if (!res.ok) {
      return res.text().then(function (body) {
        throw new Error('API请求失败 (' + res.status + '): ' + body.slice(0, 200));
      });
    }
    return res.json();
  }).catch(function (err) {
    if (timeoutId) clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      if (originalSignal && originalSignal.aborted) {
        var abortErr = new Error('请求已取消');
        abortErr.name = 'AbortError';
        throw abortErr;
      }
      throw new Error('请求超时 (' + (timeout / 1000) + '秒)');
    }
    throw err;
  });
}

var aiRequest = {
  fetchWithTimeout: fetchWithTimeout,

  /**
   * 带重试的请求封装
   * @param {string} url - 请求地址
   * @param {Object} options - fetch选项
   * @param {number} maxRetries - 最大重试次数，默认0
   * @returns {Promise<Object>} 解析后的JSON响应
   */
  fetchWithRetry: async function (url, options, maxRetries) {
    var retries = maxRetries || 0;
    var lastError = null;
    for (var attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fetchWithTimeout(url, options, options.timeout || 60000);
      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError') throw err;
        if (attempt < retries) {
          var delay = Math.pow(2, attempt) * 1000;
          await new Promise(function (r) { setTimeout(r, delay); });
        }
      }
    }
    throw lastError;
  },

  createAbortController: function () {
    return new AbortController();
  },
};

export default aiRequest;
