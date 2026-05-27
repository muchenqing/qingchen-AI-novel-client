/**
 * 写作助手工具模块
 * @description 提供写作过程中的辅助功能，包括详细字数统计、文本清理、
 *              重复内容检测、综合格式化、选中文本操作等
 * @exports getDetailedWordCount - 获取详细字数统计信息
 * @exports cleanEmptyLines - 清理空行（调用cleanAll）
 * @exports detectDuplicates - 检测重复段落（调用detectDuplicate）
 * @exports formatText - 综合格式化文本（缩进、间距、标点）
 * @exports getSelectedText - 获取编辑器中当前选中的文本
 * @exports replaceSelectedText - 替换编辑器中当前选中的文本
 * @param {string} text - 待处理的文本内容
 * @param {Object} options - 格式化选项，包含indent、spacing、punctuation
 * @param {boolean} options.indent - 是否应用首行缩进
 * @param {boolean} options.spacing - 是否规范化段落间距
 * @param {boolean} options.punctuation - 是否修正标点符号
 * @returns {Object} getDetailedWordCount返回字数统计对象
 * @returns {string} cleanEmptyLines返回清理后的文本
 * @returns {Array} detectDuplicates返回重复段落列表
 * @returns {string} formatText返回格式化后的文本
 * @returns {string} getSelectedText返回选中的文本
 */

import { countWords } from '../../utils/format.js';
import { cleanAll, detectDuplicate } from '../../utils/textCleaner.js';

var FULL_WIDTH_SPACE = '\u3000\u3000';
var CHAPTER_PATTERN = /^[一二三四五六七八九十百千\d]+[章节目]|^Chapter\s|^卷|^【|^=/i;

export function getDetailedWordCount(text) {
  if (!text) {
    return { total: 0, chinese: 0, english: 0, paragraphs: 0, selectedCount: 0 };
  }

  // 统计中文字符数
  var chineseMatches = text.match(/[\u4e00-\u9fff]/g);
  var chinese = chineseMatches ? chineseMatches.length : 0;

  // 统计英文单词数（移除中文后按空白分词）
  var stripped = text.replace(/[\u4e00-\u9fff]/g, ' ');
  var englishWords = stripped.split(/\s+/).filter(function (w) { return w.length > 0; });
  var english = englishWords.length;

  // 统计段落数（以换行分隔，忽略空段落）
  var lines = text.split(/\n/);
  var paragraphCount = 0;
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].trim().length > 0) {
      paragraphCount++;
    }
  }

  var total = chinese + english;

  return {
    total: total,
    chinese: chinese,
    english: english,
    paragraphs: paragraphCount,
    selectedCount: 0,
  };
}

export function cleanEmptyLines(text) {
  return cleanAll(text);
}

export function detectDuplicates(text) {
  return detectDuplicate(text);
}

export function formatText(text, options) {
  if (!text) return '';

  var opts = options || {};
  var result = text;

  // 段落间距规范化
  if (opts.spacing) {
    result = result.replace(/\n{3,}/g, '\n\n');
  }

  // 首行缩进处理
  if (opts.indent) {
    var paragraphs = result.split('\n');
    result = paragraphs.map(function (p) {
      var trimmed = p.trim();
      if (!trimmed) return '';
      // 章节标题不缩进
      if (CHAPTER_PATTERN.test(trimmed)) {
        return trimmed;
      }
      // 避免重复缩进
      if (trimmed.indexOf(FULL_WIDTH_SPACE) === 0) {
        return trimmed;
      }
      return FULL_WIDTH_SPACE + trimmed;
    }).join('\n');
  }

  // 标点符号规范化
  if (opts.punctuation) {
    var rules = [
      [/[,\uff0c]/g, '，'],
      [/[;]\s*/g, '；'],
      [/[:]\s*(?=[\u4e00-\u9fff])/g, '：'],
      [/[?]\s*(?=[\u4e00-\u9fff])/g, '？'],
      [/[!]\s*(?=[\u4e00-\u9fff])/g, '！'],
      [/[)]/g, '）'],
      [/[(](?=[\u4e00-\u9fff])/g, '（'],
    ];
    for (var i = 0; i < rules.length; i++) {
      result = result.replace(rules[i][0], rules[i][1]);
    }
  }

  return result;
}

export function getSelectedText() {
  var selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return '';

  var range = selection.getRangeAt(0);

  // 检查选区是否在编辑器内
  var editor = document.getElementById('editor');
  if (!editor || !editor.contains(range.commonAncestorContainer)) {
    return '';
  }

  return selection.toString();
}

export function replaceSelectedText(text) {
  var selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  var range = selection.getRangeAt(0);

  // 检查选区是否在编辑器内
  var editor = document.getElementById('editor');
  if (!editor || !editor.contains(range.commonAncestorContainer)) {
    return false;
  }

  // 删除选中内容并插入新文本
  range.deleteContents();

  // 使用insertText保持撤销历史可追溯
  var tempDiv = document.createElement('div');
  tempDiv.textContent = text;
  var textNode = document.createTextNode(tempDiv.textContent);
  range.insertNode(textNode);

  // 将光标移动到插入文本的末尾
  range.setStartAfter(textNode);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);

  return true;
}
