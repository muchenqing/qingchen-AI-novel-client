/**
 * 通用辅助方法模块
 * @description 提供ID生成、DOM元素创建等通用工具方法
 * @exports generateId - 生成唯一标识ID
 * @exports el - 创建DOM元素的快捷方法
 * @returns {string} generateId返回基于时间戳+随机数的唯一字符串
 * @returns {HTMLElement} el返回创建好的DOM元素
 */

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function el(tag, attrs) {
  var children = Array.prototype.slice.call(arguments, 2);
  var elem = document.createElement(tag);
  if (attrs) {
    var keys = Object.keys(attrs);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var v = attrs[k];
      if (k === 'className') {
        elem.className = v;
      } else if (k === 'dataset') {
        var dk = Object.keys(v);
        for (var j = 0; j < dk.length; j++) {
          elem.dataset[dk[j]] = v[dk[j]];
        }
      } else if (k.indexOf('on') === 0 && typeof v === 'function') {
        elem.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === 'innerHTML') {
        elem.innerHTML = v;
      } else {
        elem.setAttribute(k, v);
      }
    }
  }
  for (var ci = 0; ci < children.length; ci++) {
    var child = children[ci];
    if (child == null || child === false) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      elem.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      elem.appendChild(child);
    }
  }
  return elem;
}
