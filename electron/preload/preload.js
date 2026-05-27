/**
 * Preload脚本入口文件
 * @description 加载apiExpose模块，完成contextBridge安全暴露
 *              本文件只做加载工作，不编写具体逻辑
 */

const { contextBridge, ipcRenderer } = require('electron');
const { exposeAPI } = require('./apiExpose.js');

exposeAPI(contextBridge, ipcRenderer);
