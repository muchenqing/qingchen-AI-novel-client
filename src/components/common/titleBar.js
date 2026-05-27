/**
 * 标题栏组件模块
 * @description 构建自定义标题栏，包含窗口控制按钮（最小化、最大化、关闭）
 *              监听窗口最大化状态变化并更新图标显示
 * @exports buildTitleBar - 创建标题栏DOM结构并绑定事件
 */

import { el } from '../../utils/helper.js';

function updateMaximizeIcon(maximized) {
  var btn = document.getElementById('btn-maximize');
  if (!btn) return;
  if (maximized) {
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="2" width="14" height="14" rx="1"/><rect x="2" y="8" width="14" height="14" rx="1"/></svg>';
    btn.title = '还原';
  } else {
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="1"/></svg>';
    btn.title = '最大化';
  }
}

export function buildTitleBar() {
  var btnMinimize = el('button', {
    id: 'btn-minimize',
    className: 'titlebar-btn',
    title: '最小化',
    innerHTML: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  });
  var btnMaximize = el('button', {
    id: 'btn-maximize',
    className: 'titlebar-btn',
    title: '最大化',
    innerHTML: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="1"/></svg>',
  });
  var btnClose = el('button', {
    id: 'btn-close',
    className: 'titlebar-btn titlebar-btn-close',
    title: '关闭',
    innerHTML: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
  });

  btnMinimize.addEventListener('click', function () { window.electronAPI && window.electronAPI.minimizeWindow(); });
  btnMaximize.addEventListener('click', function () { window.electronAPI && window.electronAPI.maximizeWindow(); });
  btnClose.addEventListener('click', function () { window.electronAPI && window.electronAPI.closeWindow(); });

  if (window.electronAPI) {
    window.electronAPI.onWindowMaximizedChange(function (maximized) {
      updateMaximizeIcon(maximized);
    });
    window.electronAPI.isWindowMaximized().then(updateMaximizeIcon).catch(function () {});
  }

  var dragRegion = el('div', { className: 'drag-region' },
    el('span', { className: 'titlebar-logo' }, '\u2726'),
    el('span', { className: 'titlebar-title' }, '卿辰'),
  );
  dragRegion.addEventListener('dblclick', function () { window.electronAPI && window.electronAPI.maximizeWindow(); });

  var controls = el('div', { className: 'titlebar-controls' }, btnMinimize, btnMaximize, btnClose);

  return el('header', { className: 'titlebar' }, dragRegion, controls);
}
