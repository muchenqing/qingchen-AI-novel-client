/**
 * 文本批量格式化工具模块
 * @description 提供小说文本排版、缩进、格式化等功能
 * @exports applyIndentation - 应用首行缩进（2个中文全角空格）
 * @exports removeIndentation - 移除首行缩进
 * @exports formatParagraphSpacing - 格式化段落间距
 * @exports formatChapterTitle - 格式化章节标题
 * @exports formatForExport - 导出前的综合格式化
 * @param {string} text - 待处理文本
 * @returns {string} 格式化后的文本
 */

export function applyIndentation(text) {
  if (!text) return '';
  var paragraphs = text.split('\n');
  return paragraphs.map(function (p) {
    var trimmed = p.trim();
    if (!trimmed) return '';
    if (/^[一二三四五六七八九十百千\d]+[章节目]|^Chapter\s|^卷|^【|^=/i.test(trimmed)) {
      return trimmed;
    }
    return '\u3000\u3000' + trimmed;
  }).join('\n');
}

export function removeIndentation(text) {
  if (!text) return '';
  return text.replace(/^[　 ]{1,4}/gm, '');
}

export function formatParagraphSpacing(text) {
  if (!text) return '';
  return text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/([^\n])\n([^\n])/g, '$1\n\n$2')
    .trim();
}

export function formatChapterTitle(title) {
  if (!title) return '';
  return title.trim().replace(/\s{2,}/g, ' ');
}

export function formatForExport(text, options) {
  if (!text) return '';
  var opts = options || {};
  var result = text;
  if (opts.removeBlankLines !== false) {
    result = result.replace(/\n{3,}/g, '\n\n');
  }
  if (opts.trimWhitespace !== false) {
    result = result.trim();
  }
  return result;
}

export function formatDialogAlignment(text) {
  if (!text) return '';
  return text.replace(/^(\s*)([""\u201c])([^\n""]*?)([""\u201d])/gm, function (match, indent, open, content, close) {
    return indent + open + content + close;
  });
}
