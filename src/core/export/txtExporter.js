/**
 * TXT 导出器模块
 * @description 将小说章节数据导出为纯文本（TXT）格式字符串
 * @exports exportTxt - 将章节数组导出为 TXT 格式内容
 * @param {Array} chapters - 章节数组，每项包含 {title, content}
 * @param {Object} options - 导出选项 {title, author, includeToc}
 * @returns {string} TXT 格式的完整文本内容
 */

import { cleanForExport } from './exportUtil.js';

export function exportTxt(chapters, options) {
  var title = (options && options.title) || '未命名书稿';
  var author = (options && options.author) || '';
  var includeToc = options && options.includeToc;
  var lines = [];

  lines.push(title);
  if (author) {
    lines.push('作者：' + author);
  }
  lines.push('');
  lines.push('');

  if (includeToc && chapters && chapters.length > 0) {
    lines.push('目录');
    lines.push('');
    for (var i = 0; i < chapters.length; i++) {
      lines.push((i + 1) + '. ' + (chapters[i].title || ('第' + (i + 1) + '章')));
    }
    lines.push('');
    lines.push('');
  }

  if (chapters && chapters.length > 0) {
    for (var j = 0; j < chapters.length; j++) {
      var chapter = chapters[j];
      var chapterTitle = chapter.title || ('第' + (j + 1) + '章');
      var chapterContent = cleanForExport(chapter.content || '');

      lines.push(chapterTitle);
      lines.push('');
      lines.push(chapterContent);
      lines.push('');
    }
  }

  return lines.join('\n');
}
