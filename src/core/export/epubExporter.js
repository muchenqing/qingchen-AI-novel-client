/**
 * EPUB 导出器模块
 * @description 将小说章节数据导出为 EPUB 结构的 XHTML 内容字符串
 * @exports exportEpub - 将章节数组导出为 EPUB 格式的结构化内容
 * @param {Array} chapters - 章节数组，每项包含 {title, content}
 * @param {Object} options - 导出选项 {title, author, description}
 * @returns {Object} 包含 type、metadata 和 chapters 的结构化对象，供后续渲染生成 EPUB 文件
 */

import { cleanForExport, generateEpubMetadata } from './exportUtil.js';

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function paragraphToXhtml(text) {
  var paragraphs = text.split(/\n\s*\n/);
  var result = [];
  for (var i = 0; i < paragraphs.length; i++) {
    var p = paragraphs[i].trim();
    if (p) {
      result.push('    <p>' + escapeXml(p) + '</p>');
    }
  }
  return result.join('\n');
}

function buildChapterXhtml(chapterTitle, bodyContent, chapterIndex) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE html>\n' +
    '<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh-CN">\n' +
    '<head>\n' +
    '  <title>' + escapeXml(chapterTitle) + '</title>\n' +
    '  <meta charset="UTF-8"/>\n' +
    '</head>\n' +
    '<body>\n' +
    '  <h1>' + escapeXml(chapterTitle) + '</h1>\n' +
    bodyContent + '\n' +
    '</body>\n' +
    '</html>';
}

function buildOpf(metadata, chapterCount) {
  var idStart = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">\n' +
    '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n' +
    '  <dc:title>' + escapeXml(metadata.title) + '</dc:title>\n' +
    '  <dc:creator>' + escapeXml(metadata.author) + '</dc:creator>\n' +
    '  <dc:language>' + metadata.language + '</dc:language>\n' +
    '  <dc:identifier id="bookid">novel-' + Date.now() + '</dc:identifier>\n' +
    '  <meta property="dcterms:modified">' + metadata.createdAt + '</meta>\n' +
    '</metadata>\n' +
    '<manifest>\n' +
    '  <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>\n';

  var manifestItems = '';
  var spineItems = '';
  for (var i = 0; i < chapterCount; i++) {
    var num = i + 1;
    manifestItems += '  <item id="chapter' + num + '" href="chapter' + num + '.xhtml" media-type="application/xhtml+xml"/>\n';
    spineItems += '  <itemref idref="chapter' + num + '"/>\n';
  }

  var idEnd = manifestItems +
    '</manifest>\n' +
    '<spine toc="ncx">\n' +
    spineItems +
    '</spine>\n' +
    '</package>';

  return idStart + idEnd;
}

function buildNcx(metadata, chapters) {
  var ncx = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">\n' +
    '<head>\n' +
    '  <meta name="dtb:uid" content="novel-' + Date.now() + '"/>\n' +
    '</head>\n' +
    '<docTitle><text>' + escapeXml(metadata.title) + '</text></docTitle>\n' +
    '<navMap>\n';

  for (var i = 0; i < chapters.length; i++) {
    var num = i + 1;
    var chTitle = chapters[i].title || ('第' + num + '章');
    ncx += '  <navPoint id="navpoint-' + num + '" playOrder="' + num + '">\n' +
      '    <navLabel><text>' + escapeXml(chTitle) + '</text></navLabel>\n' +
      '    <content src="chapter' + num + '.xhtml"/>\n' +
      '  </navPoint>\n';
  }

  ncx += '</navMap>\n</ncx>';
  return ncx;
}

export function exportEpub(chapters, options) {
  var title = (options && options.title) || '未命名书稿';
  var author = (options && options.author) || '佚名';
  var description = (options && options.description) || '';
  var metadata = generateEpubMetadata(title, author);

  if (description) {
    metadata.description = description;
  }

  var chapterData = [];
  if (chapters && chapters.length > 0) {
    for (var i = 0; i < chapters.length; i++) {
      var chapter = chapters[i];
      var chapterTitle = chapter.title || ('第' + (i + 1) + '章');
      var chapterContent = cleanForExport(chapter.content || '');
      var bodyXhtml = paragraphToXhtml(chapterContent);
      var fullXhtml = buildChapterXhtml(chapterTitle, bodyXhtml, i + 1);

      chapterData.push({
        index: i + 1,
        title: chapterTitle,
        xhtml: fullXhtml,
        filename: 'chapter' + (i + 1) + '.xhtml',
      });
    }
  }

  var opf = buildOpf(metadata, chapterData.length);
  var ncx = buildNcx(metadata, chapters || []);

  return {
    type: 'epub-content',
    metadata: metadata,
    opf: opf,
    ncx: ncx,
    chapters: chapterData,
  };
}
