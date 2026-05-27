/**
 * 编辑器状态记忆模块
 * @description 使用localStorage持久化编辑器状态，支持保存/恢复光标位置、
 *              滚动位置和最后编辑时间，用于书稿切换时的状态还原
 * @exports saveEditorState - 保存编辑器状态（光标偏移、滚动位置、编辑时间）
 * @exports loadEditorState - 加载指定书稿的已保存编辑器状态
 * @exports clearEditorState - 清除指定书稿的编辑器状态
 * @exports restoreCursorPosition - 尝试通过字符偏移量恢复编辑器光标位置
 * @exports getScrollPosition - 获取已保存的滚动位置
 * @exports saveScrollPosition - 保存滚动位置
 * @param {string} manuscriptId - 书稿唯一标识
 * @param {Object} state - 编辑器状态对象，包含cursorOffset、scrollTop、lastEditTime
 * @param {number} offset - 字符偏移量
 * @param {HTMLElement} editorEl - contentEditable编辑器元素
 * @param {number} scrollTop - 滚动位置值
 * @returns {Object|null} loadEditorState返回保存的状态对象或null
 * @returns {boolean} restoreCursorPosition返回是否成功恢复光标位置
 * @returns {number} getScrollPosition返回保存的滚动位置，无数据时返回0
 */

var STORAGE_KEY_PREFIX = 'qingchen-editor-state-';

function getKey(manuscriptId) {
  return STORAGE_KEY_PREFIX + manuscriptId;
}

export function saveEditorState(manuscriptId, state) {
  if (!manuscriptId || !state) return;

  var data = {
    cursorOffset: state.cursorOffset || 0,
    scrollTop: state.scrollTop || 0,
    lastEditTime: state.lastEditTime || Date.now(),
  };

  try {
    localStorage.setItem(getKey(manuscriptId), JSON.stringify(data));
  } catch (e) {
    console.error('[EditorState] 保存编辑器状态失败:', e);
  }
}

export function loadEditorState(manuscriptId) {
  if (!manuscriptId) return null;

  try {
    var raw = localStorage.getItem(getKey(manuscriptId));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('[EditorState] 加载编辑器状态失败:', e);
    return null;
  }
}

export function clearEditorState(manuscriptId) {
  if (!manuscriptId) return;

  try {
    localStorage.removeItem(getKey(manuscriptId));
  } catch (e) {
    console.error('[EditorState] 清除编辑器状态失败:', e);
  }
}

export function restoreCursorPosition(editorEl, offset) {
  if (!editorEl || typeof offset !== 'number' || offset < 0) return false;

  // 聚焦编辑器以确保光标可操作
  editorEl.focus();

  var walker = document.createTreeWalker(
    editorEl,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  var currentOffset = 0;
  var targetNode = null;
  var targetOffset = 0;

  // 遍历文本节点，找到目标偏移位置
  while (walker.nextNode()) {
    var node = walker.currentNode;
    var nodeLength = node.textContent.length;

    if (currentOffset + nodeLength >= offset) {
      targetNode = node;
      targetOffset = offset - currentOffset;
      break;
    }
    currentOffset += nodeLength;
  }

  // 如果偏移量超出文本长度，将光标放在末尾
  if (!targetNode) {
    var allText = editorEl.textContent || '';
    if (allText.length > 0) {
      // 回退到最后一个文本节点
      var lastWalker = document.createTreeWalker(
        editorEl,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      var lastNode = null;
      while (lastWalker.nextNode()) {
        lastNode = lastWalker.currentNode;
      }
      if (lastNode) {
        targetNode = lastNode;
        targetOffset = lastNode.textContent.length;
      }
    }
  }

  if (!targetNode) return false;

  // 使用 Selection API 设置光标位置
  var selection = window.getSelection();
  var range = document.createRange();

  try {
    range.setStart(targetNode, Math.min(targetOffset, targetNode.textContent.length));
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  } catch (e) {
    return false;
  }
}

export function getScrollPosition(manuscriptId) {
  if (!manuscriptId) return 0;

  var state = loadEditorState(manuscriptId);
  return state ? (state.scrollTop || 0) : 0;
}

export function saveScrollPosition(manuscriptId, scrollTop) {
  if (!manuscriptId) return;

  // 读取现有状态并合并，避免覆盖其他字段
  var existing = loadEditorState(manuscriptId) || {};

  saveEditorState(manuscriptId, {
    cursorOffset: existing.cursorOffset || 0,
    scrollTop: scrollTop || 0,
    lastEditTime: existing.lastEditTime || Date.now(),
  });
}
