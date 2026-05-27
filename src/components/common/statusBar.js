/**
 * 状态栏组件模块
 * @description 管理底部状态栏：消息、字数、保存状态、网络状态、当前章节名
 * @exports setStatus - 设置状态栏消息文本
 * @exports updateWordCountDisplay - 更新字数显示
 */

import bus from '../../event/bus.js';
import appState from '../../core/appState.js';

var saveStatus = 'saved';
var networkOnline = navigator.onLine !== false;

function updateSaveStatus(status) {
  saveStatus = status;
  var dot = document.getElementById('status-save-dot');
  var text = document.getElementById('status-save-text');
  if (dot) {
    dot.className = 'status-dot ' + status;
  }
  if (text) {
    var labels = { saved: '已保存', saving: '保存中...', unsaved: '未保存' };
    text.textContent = labels[status] || status;
  }
}

function updateNetworkStatus(online) {
  networkOnline = online;
  var dot = document.getElementById('status-network-dot');
  var text = document.getElementById('status-network-text');
  if (dot) {
    dot.className = 'status-dot ' + (online ? 'online' : 'offline');
  }
  if (text) {
    text.textContent = online ? '在线' : '离线';
  }
}

function updateCurrentChapter() {
  var el = document.getElementById('status-chapter-name');
  if (!el) return;
  var msId = appState.getCurrentManuscriptId();
  if (msId) {
    var ms = appState.getManuscript(msId);
    if (ms) {
      el.textContent = ms.title || '未命名书稿';
      return;
    }
  }
  el.textContent = '未选择书稿';
}

export function setStatus(msg) {
  var el = document.getElementById('status-message');
  if (el) el.textContent = msg;
}

export function updateWordCountDisplay(count) {
  var el = document.getElementById('word-count');
  if (el) el.textContent = count + ' 字';
}

export function updateDetailedWordCount(detail) {
  var el = document.getElementById('word-count-detail');
  if (el && detail) {
    el.textContent = '中:' + detail.chinese + ' 英:' + detail.english + ' 段:' + detail.paragraphs;
  }
}

export function initStatusBar() {
  bus.on('status:set', setStatus);

  bus.on('manuscript:switched', function () {
    updateCurrentChapter();
  });

  bus.on('manuscript:list-changed', function () {
    updateCurrentChapter();
  });

  bus.on('status:network-changed', function (online) {
    updateNetworkStatus(online);
  });

  bus.on('editor:content-changed', function () {
    updateSaveStatus('unsaved');
  });

  bus.on('autosave:saving', function () {
    updateSaveStatus('saving');
  });

  bus.on('autosave:saved', function () {
    updateSaveStatus('saved');
  });

  updateCurrentChapter();
  updateNetworkStatus(networkOnline);
  updateSaveStatus('saved');
}
