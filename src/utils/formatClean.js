var HTML_TAG_REGEX = /<[^>]*>/g;
var MULTILINE_BREAK = /\n{3,}/g;
var MULTI_SPACE = /[ \t]{2,}/g;
var LEADING_TRAILING_SPACE = /^[ \t]+|[ \t]+$/gm;
var AD_PATTERNS = [
  /^广告.*$/gm,
  /^ADVERTISEMENT.*$/gm,
  /^推广信息.*$/gm,
  /^点击查看.*$/gm,
  /^点击展开.*$/gm,
  /^收起.*$/gm,
  /^分享到.*$/gm,
  /^举报.*$/gm,
  /^\d+个回复$/gm,
  /^\d+条评论$/gm,
  /^\(\d+\)$/gm,
];
var NON_CONTENT_PATTERNS = [
  /[\u200B\u200C\u200D\uFEFF]/g,
  /\u00A0/g,
  /\u2028/g,
  /\u2029/g,
  /\r\n/g,
  /\r/g,
];
var CHINESE_PUNCTUATION_SPACES = /([，。！？；：、（）])\s+/g;
var SPACE_BEFORE_PUNCTUATION = /\s+([，。！？；：、）])/g;

function stripHtml(html) {
  if (!html) return '';
  var text = html.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n');
  text = text.replace(HTML_TAG_REGEX, '');
  return text;
}

function removeSpecialChars(text) {
  var result = text;
  for (var i = 0; i < NON_CONTENT_PATTERNS.length; i++) {
    result = result.replace(NON_CONTENT_PATTERNS[i], '\n');
  }
  return result;
}

function removeAds(text) {
  var result = text;
  for (var i = 0; i < AD_PATTERNS.length; i++) {
    result = result.replace(AD_PATTERNS[i], '');
  }
  return result;
}

function normalizeWhitespace(text) {
  return text
    .replace(MULTILINE_BREAK, '\n\n')
    .replace(MULTI_SPACE, ' ')
    .replace(LEADING_TRAILING_SPACE, '')
    .replace(CHINESE_PUNCTUATION_SPACES, '$1')
    .replace(SPACE_BEFORE_PUNCTUATION, '$1')
    .replace(/^\s+|\s+$/g, '');
}

function cleanPastedText(text) {
  if (!text) return '';
  var cleaned = removeSpecialChars(text);
  cleaned = stripHtml(cleaned);
  cleaned = removeAds(cleaned);
  cleaned = normalizeWhitespace(cleaned);
  return cleaned;
}

function cleanPastedHtml(html) {
  if (!html) return '';
  var text = stripHtml(html);
  text = removeSpecialChars(text);
  text = removeAds(text);
  text = normalizeWhitespace(text);
  return text;
}

function handlePasteEvent(e) {
  var clipboardData = e.clipboardData || window.clipboardData;
  if (!clipboardData) return null;

  var html = clipboardData.getData('text/html');
  var text = clipboardData.getData('text/plain');

  if (html && html.length > 100) {
    var cleaned = cleanPastedHtml(html);
    if (cleaned.length > 10 && cleaned.length > text.length * 0.5) {
      return cleaned;
    }
  }

  return cleanPastedText(text);
}

function isLikelyRichPaste(html) {
  if (!html) return false;
  var hasStyle = /style\s*=/i.test(html);
  var hasClass = /class\s*=/i.test(html);
  var hasDiv = /<div/i.test(html);
  var hasSpan = /<span/i.test(html);
  var hasImg = /<img/i.test(html);
  return (hasStyle || hasClass) && (hasDiv || hasSpan || hasImg);
}

export {
  cleanPastedText,
  cleanPastedHtml,
  handlePasteEvent,
  stripHtml,
  removeSpecialChars,
  normalizeWhitespace,
};
