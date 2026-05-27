/**
 * 文本净化工具模块
 * @description 提供文本清理、空行清理、标点规范化、重复内容检测等功能
 * @exports cleanBlankLines - 清理多余空行（连续空行合并为单个）
 * @exports cleanWhitespace - 清理文本首尾及异常空白字符
 * @exports normalizePunctuation - 中英文标点规范化修正
 * @exports detectDuplicate - 检测重复段落
 * @exports cleanAll - 综合清理：空行+空白+标点
 * @param {string} text - 待处理文本
 * @returns {string} 处理后的文本
 */

export function cleanBlankLines(text) {
  if (!text) return '';
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

export function cleanWhitespace(text) {
  if (!text) return '';
  return text
    .replace(/\t/g, '  ')
    .replace(/[ ]+\n/g, '\n')
    .replace(/\n[ ]+/g, '\n')
    .replace(/ {3,}/g, '  ')
    .trim();
}

export function normalizePunctuation(text) {
  if (!text) return '';
  var rules = [
    [/[,\uff0c]/g, '，'],
    [/[;]\s*/g, '；'],
    [/[:]\s*(?=[\u4e00-\u9fff])/g, '：'],
    [/[?]\s*(?=[\u4e00-\u9fff])/g, '？'],
    [/[!]\s*(?=[\u4e00-\u9fff])/g, '！'],
    [/[)]/g, '）'],
    [/[(](?=[\u4e00-\u9fff])/g, '（'],
  ];
  var result = text;
  for (var i = 0; i < rules.length; i++) {
    result = result.replace(rules[i][0], rules[i][1]);
  }
  return result;
}

export function detectDuplicate(text) {
  if (!text) return [];
  var paragraphs = text.split(/\n\s*\n/).filter(function (p) { return p.trim().length > 10; });
  var duplicates = [];
  var seen = {};
  for (var i = 0; i < paragraphs.length; i++) {
    var normalized = paragraphs[i].trim().replace(/\s+/g, '');
    if (seen[normalized] !== undefined) {
      duplicates.push({
        firstIndex: seen[normalized],
        duplicateIndex: i,
        preview: paragraphs[i].slice(0, 50),
      });
    } else {
      seen[normalized] = i;
    }
  }
  return duplicates;
}

export function cleanAll(text) {
  return cleanWhitespace(cleanBlankLines(normalizePunctuation(text)));
}
