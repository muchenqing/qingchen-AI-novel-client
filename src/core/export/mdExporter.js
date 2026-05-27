/**
 * Markdown 导出器模块
 * @description 将小说章节数据导出为 Markdown 格式字符串
 * @exports exportMd - 将章节数组导出为 Markdown 格式内容
 * @param {Array} chapters - 章节数组，每项包含 {title, content}
 * @param {Object} options - 导出选项 {title, author, includeToc}
 * @returns {string} Markdown 格式的完整文本内容
 */

import { cleanForExport } from './exportUtil.js';

export function exportMd(chapters, options) {
  var title = (options && options.title) || '未命名书稿';
  var author = (options && options.author) || '';
  var includeToc = options && options.includeToc;
  var lines = [];

  lines.push('# ' + title);
  lines.push('');
  if (author) {
    lines.push('**作者：** ' + author);
    lines.push('');
  }
  lines.push('---');
  lines.push('');

  if (includeToc && chapters && chapters.length > 0) {
    lines.push('## 目录');
    lines.push('');
    for (var i = 0; i < chapters.length; i++) {
      var tocTitle = chapters[i].title || ('第' + (i + 1) + '章');
      lines.push('- [' + tocTitle + '](#' + (i + 1) + ')');
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  if (chapters && chapters.length > 0) {
    for (var j = 0; j < chapters.length; j++) {
      var chapter = chapters[j];
      var chapterTitle = chapter.title || ('第' + (j + 1) + '章');
      var chapterContent = cleanForExport(chapter.content || '');

      lines.push('## ' + chapterTitle);
      lines.push('');
      lines.push(chapterContent);
      lines.push('');
    }
  }

  return lines.join('\n');
}
