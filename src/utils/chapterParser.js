/**
 * 章节解析工具模块
 * @description 提供小说章节结构识别、解析、提取功能
 *             支持多种章节标题格式的智能识别
 */

var CHAPTER_PATTERNS = [
  /^第[一二三四五六七八九十百千\d]+\s*[章回节卷部].*/gm,
  /^Chapter\s+\d+.*/gim,
  /^Part\s+\d+.*/gim,
  /^卷[一二三四五六七八九十百千\d]+\s*.*/gm,
  /^【[^】]+\】\s*$/gm,
  /^\d+[.、)]\s*.+/gm,
  /^=+\s*.+\s*=+\s*$/gm,
  /^[-—]+\s*.+\s*[-—]+\s*$/gm,
  /^◆+\s*.+\s*◆+\s*$/gm,
  /^\d+\s*[-–—]\s*.+/gm,
  /^第[0-9０-９]+\s*[章回节卷部].*/gm,
];

var MIN_CHAPTER_LENGTH = 200;

export function parseChapters(text) {
  if (!text || !text.trim()) return [];

  var allMatches = [];

  for (var i = 0; i < CHAPTER_PATTERNS.length; i++) {
    var pattern = new RegExp(CHAPTER_PATTERNS[i].source, CHAPTER_PATTERNS[i].flags);
    var match;
    while ((match = pattern.exec(text)) !== null) {
      var title = match[0].trim();
      if (title.length > 50) continue;
      allMatches.push({
        title: title,
        index: match.index,
        patternIndex: i,
      });
    }
    pattern.lastIndex = 0;
  }

  allMatches.sort(function (a, b) { return a.index - b.index; });

  var deduped = [];
  for (var d = 0; d < allMatches.length; d++) {
    if (d === 0 || allMatches[d].index - deduped[deduped.length - 1].index > 5) {
      deduped.push(allMatches[d]);
    }
  }

  if (deduped.length === 0 && text.trim().length > 0) {
    return [{
      title: '全文',
      content: text.trim(),
      startIndex: 0,
      endIndex: text.length,
      chapterNumber: 1,
    }];
  }

  var chapters = [];
  for (var j = 0; j < deduped.length; j++) {
    var start = deduped[j].index;
    var end = j + 1 < deduped.length ? deduped[j + 1].index : text.length;

    var rawContent = text.slice(start, end).trim();
    var titleLine = deduped[j].title;
    var bodyContent = rawContent;

    if (rawContent.indexOf(titleLine) === 0) {
      bodyContent = rawContent.slice(titleLine.length).trim();
    } else {
      var nl = rawContent.indexOf('\n');
      if (nl > 0 && nl < 80 && rawContent.slice(0, nl).trim() === titleLine) {
        bodyContent = rawContent.slice(nl + 1).trim();
      }
    }

    chapters.push({
      title: titleLine,
      content: bodyContent,
      startIndex: start,
      endIndex: end,
      chapterNumber: j + 1,
      wordCount: countWordsSimple(bodyContent),
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
  if (!text || !text.trim()) return '';
  var firstLine = text.split('\n')[0].trim();
  for (var i = 0; i < CHAPTER_PATTERNS.length; i++) {
    var pattern = new RegExp('^' + CHAPTER_PATTERNS[i].source.replace(/gm$/, ''), CHAPTER_PATTERNS[i].flags.replace('m', ''));
    if (pattern.test(firstLine)) {
      return firstLine;
    }
  }
  return '';
}

export function getChapterCount(text) {
  return parseChapters(text).length;
}

export function hasMultipleChapters(text) {
  return parseChapters(text).length > 1;
}

export function detectChapterSplit(text) {
  var parsed = parseChapters(text);
  if (parsed.length <= 1) return null;
  if (!text || text.length < 800) return null;

  var validChapters = [];
  for (var i = 0; i < parsed.length; i++) {
    if (parsed[i].content && parsed[i].content.length >= MIN_CHAPTER_LENGTH) {
      validChapters.push(parsed[i]);
    }
  }

  if (validChapters.length <= 1) return null;
  return validChapters;
}

function countWordsSimple(text) {
  if (!text) return 0;
  var cleaned = text.replace(/\s+/g, '');
  var chinese = cleaned.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g);
  var english = cleaned.match(/[a-zA-Z]+/g);
  return (chinese ? chinese.length : 0) + (english ? english.length : 0);
}
