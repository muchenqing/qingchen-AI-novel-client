/**
 * 小说专用排版格式化模块
 * @description 提供编辑器内容的排版格式化功能，包括首行缩进、章节标题识别、
 *              段落间距规范化、内容清理和标点修正
 * @exports toggleIndentation - 切换编辑器内所有段落的首行缩进（2个全角空格）
 * @exports formatChapterHeadings - 检测并格式化章节标题（居中、加大）
 * @exports formatParagraphSpacing - 规范化段落间距
 * @exports cleanEditorContent - 清理编辑器内容中的空行和多余空白
 * @exports normalizePunctuationInEditor - 修正编辑器内容中的标点符号
 * @param {HTMLElement} editorEl - contentEditable编辑器元素
 * @param {boolean} enable - 是否启用缩进
 */

var CHAPTER_PATTERN = /^[一二三四五六七八九十百千\d]+[章节目]|^Chapter\s|^卷|^【|^=/i;
var FULL_WIDTH_SPACE = '\u3000\u3000';

export function toggleIndentation(editorEl, enable) {
  if (!editorEl) return;

  var paragraphs = editorEl.querySelectorAll('div, p, br');

  if (enable) {
    // 为每个非标题段落添加首行缩进
    for (var i = 0; i < paragraphs.length; i++) {
      var el = paragraphs[i];
      if (el.tagName === 'BR') continue;

      var text = el.textContent || '';
      if (!text.trim()) continue;

      // 跳过章节标题段落
      if (CHAPTER_PATTERN.test(text.trim())) continue;

      // 避免重复缩进
      if (text.indexOf(FULL_WIDTH_SPACE) !== 0) {
        el.textContent = FULL_WIDTH_SPACE + text;
      }
    }
  } else {
    // 移除所有段落的首行缩进
    for (var j = 0; j < paragraphs.length; j++) {
      var el2 = paragraphs[j];
      if (el2.tagName === 'BR') continue;

      var text2 = el2.textContent || '';
      if (text2.indexOf(FULL_WIDTH_SPACE) === 0) {
        el2.textContent = text2.substring(2);
      }
    }
  }
}

export function formatChapterHeadings(editorEl) {
  if (!editorEl) return;

  var children = editorEl.children;

  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    var text = child.textContent || '';
    var trimmed = text.trim();

    if (!trimmed) continue;

    // 检测章节标题模式
    if (CHAPTER_PATTERN.test(trimmed)) {
      // 设置标题样式：居中、加粗、字号放大
      child.style.textAlign = 'center';
      child.style.fontWeight = 'bold';
      child.style.fontSize = '1.2em';
      child.style.margin = '1.5em 0 0.8em';
    } else {
      // 非标题段落恢复默认样式
      child.style.textAlign = '';
      child.style.fontWeight = '';
      child.style.fontSize = '';
      child.style.margin = '';
    }
  }
}

export function formatParagraphSpacing(editorEl) {
  if (!editorEl) return;

  var children = Array.prototype.slice.call(editorEl.children);
  var prevWasBlank = false;

  for (var i = children.length - 1; i >= 0; i--) {
    var child = children[i];
    var text = child.textContent || '';
    var isBlank = text.trim() === '';

    if (isBlank) {
      // 连续空行只保留一个
      if (prevWasBlank) {
        child.remove();
      }
      prevWasBlank = true;
    } else {
      prevWasBlank = false;
      // 确保段落间至少有一个空行间距（通过margin实现）
      child.style.marginBottom = '';
    }
  }
}

export function cleanEditorContent(editorEl) {
  if (!editorEl) return;

  var children = Array.prototype.slice.call(editorEl.children);

  for (var i = children.length - 1; i >= 0; i--) {
    var child = children[i];
    var text = child.textContent || '';

    // 清理首尾空白
    var cleaned = text.replace(/^\s+|\s+$/g, '');

    // 将多个连续空白合并为单个空格
    cleaned = cleaned.replace(/\s{2,}/g, ' ');

    // 移除纯空白行
    if (!cleaned) {
      // 保留一个空行作为段落分隔，移除多余的
      if (i > 0) {
        var prevChild = children[i - 1];
        var prevText = (prevChild && prevChild.textContent) || '';
        if (!prevText.trim()) {
          child.remove();
          continue;
        }
      }
    }

    child.textContent = cleaned;
  }

  // 移除编辑器开头的空行
  while (editorEl.firstChild) {
    var first = editorEl.firstChild;
    if (first.tagName === 'BR' || ((first.textContent || '').trim() === '')) {
      first.remove();
    } else {
      break;
    }
  }
}

export function normalizePunctuationInEditor(editorEl) {
  if (!editorEl) return;

  var children = editorEl.children;

  // 标点修正规则：将常见英文标点替换为对应中文标点
  var rules = [
    [/[,\uff0c]/g, '，'],
    [/[;]\s*/g, '；'],
    [/[:]\s*(?=[\u4e00-\u9fff])/g, '：'],
    [/[?]\s*(?=[\u4e00-\u9fff])/g, '？'],
    [/[!]\s*(?=[\u4e00-\u9fff])/g, '！'],
    [/[)]/g, '）'],
    [/[(](?=[\u4e00-\u9fff])/g, '（'],
  ];

  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    var text = child.textContent || '';

    var result = text;
    for (var j = 0; j < rules.length; j++) {
      result = result.replace(rules[j][0], rules[j][1]);
    }

    if (result !== text) {
      child.textContent = result;
    }
  }
}
