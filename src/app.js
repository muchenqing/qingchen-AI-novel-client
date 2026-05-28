/**
 * 渲染进程总入口
 * @description 仅负责加载CSS样式和触发初始化流程
 */

import './styles/global.css';
import './styles/pages/home.css';
import './styles/pages/editor.css';

import { init } from './core/init.js';

document.addEventListener('DOMContentLoaded', init);
