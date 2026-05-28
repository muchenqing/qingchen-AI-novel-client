var MAX_SAMPLE_LENGTH = 20000;
var MIN_SAMPLE_LENGTH = 20;
var MAX_FILE_SIZE = 5 * 1024 * 1024;

var MAX_NOVEL_FILE_SIZE = 100 * 1024 * 1024;

var TEXT_EXTENSIONS = ['.txt', '.md', '.markdown', '.text', '.log'];

function cleanText(text) {
  if (!text || typeof text !== 'string') return '';
  var cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .replace(/^\s+|\s+$/g, '');
  return cleaned;
}

function validateSample(text) {
  var errors = [];
  if (!text || typeof text !== 'string') {
    errors.push('内容为空');
    return { valid: false, errors: errors };
  }

  var cleaned = cleanText(text);
  if (cleaned.length < MIN_SAMPLE_LENGTH) {
    errors.push('内容过短，至少需要 ' + MIN_SAMPLE_LENGTH + ' 个字符');
  }
  if (cleaned.length > MAX_SAMPLE_LENGTH) {
    errors.push('内容过长，最多支持 ' + MAX_SAMPLE_LENGTH + ' 个字符，当前 ' + cleaned.length + ' 个字符');
  }

  var garbledRatio = (cleaned.match(/[\ufffd\u0000-\u001f]/g) || []).length / cleaned.length;
  if (garbledRatio > 0.1) {
    errors.push('检测到大量乱码字符，请检查文本编码');
  }

  var chineseRatio = (cleaned.match(/[\u4e00-\u9fa5]/g) || []).length / cleaned.length;
  var latinRatio = (cleaned.match(/[a-zA-Z]/g) || []).length / cleaned.length;
  if (chineseRatio < 0.05 && latinRatio < 0.3) {
    errors.push('有效文本内容不足');
  }

  return {
    valid: errors.length === 0,
    errors: errors,
    cleaned: cleaned,
    charCount: cleaned.length,
  };
}

function parseTxtFile(file) {
  return new Promise(function (resolve, reject) {
    if (!file) {
      reject(new Error('未选择文件'));
      return;
    }

    var ext = file.name ? file.name.toLowerCase().slice(file.name.lastIndexOf('.')) : '';
    var isTextFile = TEXT_EXTENSIONS.indexOf(ext) !== -1;
    if (!isTextFile && ext) {
      reject(new Error('不支持的文件格式，支持: ' + TEXT_EXTENSIONS.join(', ')));
      return;
    }

    if (file.size > MAX_NOVEL_FILE_SIZE) {
      reject(new Error('文件过大，最大支持 ' + (MAX_NOVEL_FILE_SIZE / 1024 / 1024) + 'MB'));
      return;
    }

    if (file.size === 0) {
      reject(new Error('文件为空'));
      return;
    }

    var reader = new FileReader();
    reader.onload = function (e) {
      var text = e.target.result;
      var cleaned = cleanText(text);
      resolve({
        success: true,
        text: cleaned,
        charCount: cleaned.length,
        fileName: file.name,
        errors: [],
      });
    };
    reader.onerror = function () {
      reject(new Error('文件读取失败'));
    };
    reader.readAsText(file, 'UTF-8');
  });
}

function createFileInput() {
  return new Promise(function (resolve, reject) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md,.markdown,.text,.log';
    input.style.display = 'none';

    var done = false;

    function cleanup() {
      if (input.parentNode) {
        document.body.removeChild(input);
      }
      window.removeEventListener('focus', onWindowFocus);
    }

    function onWindowFocus() {
      setTimeout(function () {
        if (!done) {
          done = true;
          cleanup();
          reject(new Error('未选择文件'));
        }
      }, 300);
    }

    input.addEventListener('change', function () {
      done = true;
      cleanup();
      var file = input.files && input.files[0];
      if (file) {
        parseTxtFile(file).then(resolve).catch(reject);
      } else {
        reject(new Error('未选择文件'));
      }
    });

    window.addEventListener('focus', onWindowFocus);
    document.body.appendChild(input);
    input.click();
  });
}

function truncateText(text, maxLen) {
  if (!text) return '';
  maxLen = maxLen || MAX_SAMPLE_LENGTH;
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen);
}

function extractStyleStats(text) {
  if (!text) return null;
  var cleaned = cleanText(text);
  var paragraphs = cleaned.split('\n\n').filter(function (p) { return p.trim().length > 0; });
  var sentences = cleaned.split(/[。！？；\n]/).filter(function (s) { return s.trim().length > 0; });
  var avgParaLength = paragraphs.length > 0 ? cleaned.length / paragraphs.length : 0;
  var avgSentenceLength = sentences.length > 0 ? cleaned.length / sentences.length : 0;

  return {
    charCount: cleaned.length,
    paragraphCount: paragraphs.length,
    sentenceCount: sentences.length,
    avgParagraphLength: Math.round(avgParaLength),
    avgSentenceLength: Math.round(avgSentenceLength),
  };
}

export {
  cleanText,
  validateSample,
  parseTxtFile,
  createFileInput,
  truncateText,
  extractStyleStats,
  MAX_SAMPLE_LENGTH,
  MIN_SAMPLE_LENGTH,
  MAX_FILE_SIZE,
  MAX_NOVEL_FILE_SIZE,
  TEXT_EXTENSIONS,
};
