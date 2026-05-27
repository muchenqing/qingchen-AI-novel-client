/**
 * 导出工具函数模块
 * @description 提供导出流程中通用的文本清理、元数据生成、文件名生成等工具方法
 * @exports cleanForExport - 清理文本多余空行并首尾去空白
 * @exports generateEpubMetadata - 生成 EPUB 元数据对象
 * @exports getExportFilename - 根据标题和格式生成导出文件名
 * @param {string} text - 待处理文本
 * @param {string} title - 书稿标题
 * @param {string} author - 作者名称
 * @param {string} format - 导出格式扩展名
 * @returns {string} 处理后的文本 / 文件名字符串
 * @returns {Object} EPUB 元数据对象
 */

export function cleanForExport(text) {
  if (!text) return '';
  return text
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function generateEpubMetadata(title, author) {
  return {
    title: title || '未命名书稿',
    author: author || '佚名',
    language: 'zh-CN',
    generator: 'Novel Export Engine',
    createdAt: new Date().toISOString(),
  };
}

export function getExportFilename(title, format) {
  var safeName = (title || '未命名书稿')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim();
  return safeName + '.' + format;
}
