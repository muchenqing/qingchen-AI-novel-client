var MAX_SAMPLE_LENGTH = 20000;
var MIN_SAMPLE_LENGTH = 20;
var MAX_FILE_SIZE = 5 * 1024 * 1024;

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

    if (!file.name || !file.name.toLowerCase().endsWith('.txt')) {
      reject(new Error('仅支持 TXT 格式文件'));
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      reject(new Error('文件过大，最大支持 ' + (MAX_FILE_SIZE / 1024 / 1024) + 'MB'));
      return;
    }

    if (file.size === 0) {
      reject(new Error('文件为空'));
      return;
    }

    var reader = new FileReader();
    reader.onload = function (e) {
      var text = e.target.result;
      var validation = validateSample(text);
      resolve({
        success: validation.valid,
        text: validation.cleaned || text,
        charCount: validation.charCount || text.length,
        fileName: file.name,
        errors: validation.errors,
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
    input.accept = '.txt';
    input.style.display = 'none';
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (file) {
        parseTxtFile(file).then(resolve).catch(reject);
      } else {
        reject(new Error('未选择文件'));
      }
      document.body.removeChild(input);
    });
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
};
