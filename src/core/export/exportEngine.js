/**
 * 统一导出引擎模块
 * @description 提供多格式导出的统一入口，根据指定格式委托给对应的导出器处理
 * @exports exportManuscript - 根据格式导出手稿内容
 * @param {string} format - 导出格式，支持 'txt' | 'md' | 'epub' | 'json'
 * @param {Array} chapters - 章节数组，每项包含 {title, content}
 * @param {Object} options - 导出选项 {title, author, description, includeToc}
 * @returns {Object} 导出结果 {success, content, filename, mimeType}
 */

import { getExportFilename } from './exportUtil.js';
import { exportTxt } from './txtExporter.js';
import { exportMd } from './mdExporter.js';
import { exportEpub } from './epubExporter.js';

var MIME_TYPES = {
  txt: 'text/plain',
  md: 'text/markdown',
  epub: 'application/epub+zip',
  json: 'application/json',
};

export function exportManuscript(format, chapters, options) {
  var safeOptions = options || {};
  var safeChapters = chapters || [];

  if (!format || !MIME_TYPES[format]) {
    return {
      success: false,
      content: null,
      filename: null,
      mimeType: null,
      error: '不支持的导出格式：' + format,
    };
  }

  var content;

  try {
    switch (format) {
      case 'txt':
        content = exportTxt(safeChapters, safeOptions);
        break;
      case 'md':
        content = exportMd(safeChapters, safeOptions);
        break;
      case 'epub':
        content = exportEpub(safeChapters, safeOptions);
        break;
      case 'json':
        content = JSON.stringify({
          title: safeOptions.title || '未命名书稿',
          author: safeOptions.author || '',
          description: safeOptions.description || '',
          chapters: safeChapters,
          exportedAt: new Date().toISOString(),
        }, null, 2);
        break;
      default:
        content = null;
    }
  } catch (err) {
    return {
      success: false,
      content: null,
      filename: null,
      mimeType: null,
      error: '导出失败：' + err.message,
    };
  }

  var title = safeOptions.title || '未命名书稿';
  var filename = getExportFilename(title, format);

  return {
    success: true,
    content: content,
    filename: filename,
    mimeType: MIME_TYPES[format],
  };
}
