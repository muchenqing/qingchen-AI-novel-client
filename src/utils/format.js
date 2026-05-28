/**
 * 文本格式处理工具模块
 * @description 提供字数统计、日期格式化等通用文本处理方法
 * @exports countWords - 统计文本字数（中文字符+英文单词）
 * @exports formatDate - 将时间戳格式化为可读日期时间字符串
 * @param {string} text - 待统计的文本内容
 * @returns {number} 中文字符数与英文单词数之和
 * @param {number} ts - 时间戳
 * @returns {string} 格式化后的日期时间，格式：YYYY-MM-DD HH:mm
 */

export function countWords(text) {
  if (!text) return 0;
  var chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  var stripped = text.replace(/[\u4e00-\u9fff]/g, ' ');
  var english = stripped.split(/\s+/).filter(Boolean).length;
  return chinese + english;
}

export function formatDate(ts) {
  var d = new Date(ts);
  var pad = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

export function formatWordCount(count) {
  if (!count || count === 0) return '0 字';
  if (count < 1000) return count + ' 字';
  if (count < 10000) return (count / 1000).toFixed(1) + 'k 字';
  return (count / 10000).toFixed(1) + 'w 字';
}
