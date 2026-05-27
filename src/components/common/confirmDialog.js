/**
 * 确认对话框组件模块
 * @description 构建并管理确认对话框的显示、隐藏及回调机制
 * @exports buildConfirmDialog - 创建确认对话框DOM结构并挂载
 * @exports showConfirmDialog - 显示确认对话框，传入消息和确认回调
 * @param {string} message - 对话框显示的消息文本
 * @param {Function} callback - 用户点击确定后的回调函数
 */

import { el } from '../../utils/helper.js';

var confirmCallback = null;

export function buildConfirmDialog() {
  var overlay = el('div', { className: 'modal-overlay', id: 'confirm-overlay' });
  var messageEl = el('p', { className: 'confirm-message', id: 'confirm-message' });

  var btnNo = el('button', { className: 'modal-btn modal-btn-ghost' }, '取消');
  btnNo.addEventListener('click', function () {
    overlay.classList.remove('open');
    confirmCallback = null;
  });

  var btnYes = el('button', { className: 'modal-btn modal-btn-danger' }, '确定');
  btnYes.addEventListener('click', function () {
    overlay.classList.remove('open');
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
  });

  var card = el('div', { className: 'modal-card modal-card-confirm' },
    el('div', { className: 'modal-header' },
      el('h3', { className: 'modal-title' }, '确认操作'),
    ),
    el('div', { className: 'modal-body' }, messageEl),
    el('div', { className: 'modal-footer' }, btnNo, btnYes),
  );

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) {
      overlay.classList.remove('open');
      confirmCallback = null;
    }
  });
  card.addEventListener('click', function (e) { e.stopPropagation(); });

  overlay.appendChild(card);
  return overlay;
}

export function showConfirmDialog(message, callback) {
  var overlay = document.getElementById('confirm-overlay');
  var msgEl = document.getElementById('confirm-message');
  if (!overlay || !msgEl) return;
  msgEl.textContent = message;
  var btnYes = overlay.querySelector('.modal-btn-danger');
  if (btnYes) {
    var newBtn = btnYes.cloneNode(true);
    btnYes.parentNode.replaceChild(newBtn, btnYes);
    newBtn.addEventListener('click', function () {
      overlay.classList.remove('open');
      if (callback) callback();
    });
  }
  overlay.classList.add('open');
}
