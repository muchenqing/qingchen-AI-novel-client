/**
 * 主题切换组件模块
 * @description 管理主题的加载、保存、应用及主题切换按钮的交互逻辑
 * @exports applyTheme - 将指定主题应用到页面，更新按钮激活状态
 * @param {string} name - 主题名称（mint/paper/fog/taro）
 */

import { loadTheme, saveTheme, THEMES } from '../../utils/storage.js';
import bus from '../../event/bus.js';

export function applyTheme(name) {
  var body = document.body;
  var classes = body.className.split(' ').filter(function (c) {
    return c.indexOf('theme-') !== 0 && c !== 'zen-mode';
  });
  classes.push('theme-' + name);
  if (body.classList.contains('zen-mode')) {
    classes.push('zen-mode');
  }
  body.className = classes.join(' ');

  var btns = document.querySelectorAll('.theme-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('active', btns[i].dataset.theme === name);
  }
}

export function initThemeControl() {
  applyTheme(loadTheme());

  bus.on('theme:apply', function (name) {
    saveTheme(name);
    applyTheme(name);
  });
}
