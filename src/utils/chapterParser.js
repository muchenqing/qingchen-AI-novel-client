/**
 * 章节解析工具模块
 * @description 提供小说章节结构识别、解析、提取功能
 * @exports parseChapters - 从全文中解析出章节结构
 * @exports extractChapterContent - 提取指定章节的内容
 * @exports guessChapterTitle - 智能识别章节标题
 * @param {string} text - 小说全文
 * @returns {Array} 章节列表 [{ title, content, startIndex, endIndex }]
 */

var CHAPTER_PATTERNS = [
  /^第[一二三四五六七八九十百千\d]+章\s*.*/gm,
  /^第[一二三四五六七八九十百千\d]+节\s*.*/gm,
  /^Chapter\s+\d+.*/gim,
  /^卷[一二三四五六七八九十百千\d]+\s*.*/gm,
  /^【.+】\s*$/gm,
  /^=+\s*.+\s*=+\s*$/gm,
  /^\d+[.、]\s*.+/gm,
];

export function parseChapters(text) {
  if (!text || !text.trim()) return [];

  var allMatches = [];
  for (var i = 0; i < CHAPTER_PATTERNS.length; i++) {
    var pattern = new RegExp(CHAPTER_PATTERNS[i].source, CHAPTER_PATTERNS[i].flags);
    var match;
    while ((match = pattern.exec(text)) !== null) {
      allMatches.push({
        title: match[0].trim(),
        index: match.index,
        patternIndex: i,
      });
    }
  }

  allMatches.sort(function (a, b) { return a.index - b.index; });

  var chapters = [];
  for (var j = 0; j < allMatches.length; j++) {
    var start = allMatches[j].index;
    var end = j + 1 < allMatches.length ? allMatches[j + 1].index : text.length;
    chapters.push({
      title: allMatches[j].title,
      content: text.slice(start, end).trim(),
      startIndex: start,
      endIndex: end,
      chapterNumber: j + 1,
    });
  }

  if (chapters.length === 0 && text.trim().length > 0) {
    chapters.push({
      title: '全文',
      content: text.trim(),
      startIndex: 0,
      endIndex: text.length,
      chapterNumber: 1,
    });
  }

  return chapters;
}

export function extractChapterContent(text, chapterIndex) {
  var chapters = parseChapters(text);
  if (chapterIndex >= 0 && chapterIndex < chapters.length) {
    return chapters[chapterIndex];
  }
  return null;
}

export function guessChapterTitle(text) {
  if (!text) return '';
  var firstLine = text.split('\n')[0].trim();
  for (var i = 0; i < CHAPTER_PATTERNS.length; i++) {
    var pattern = new RegExp('^' + CHAPTER_PATTERNS[i].source, CHAPTER_PATTERNS[i].flags);
    if (pattern.test(firstLine)) {
      return firstLine;
    }
  }
  return '';
}

export function getChapterCount(text) {
  return parseChapters(text).length;
}
