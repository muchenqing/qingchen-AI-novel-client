/**
 * 本地持久化存储封装模块
 * @description 统一管理localStorage读写操作，包括书稿列表、主题、AI配置的存取
 * @exports loadManuscripts - 从localStorage加载书稿列表，解析为数组
 * @exports saveManuscripts - 将书稿列表序列化并存储到localStorage
 * @exports loadTheme - 读取当前主题名称，默认返回'mint'
 * @exports saveTheme - 保存主题名称到localStorage
 * @exports loadAiConfig - 读取AI配置对象，无数据时返回默认配置
 * @exports saveAiConfig - 保存AI配置对象到localStorage
 * @exports STORAGE_KEYS - 存储键名常量对象
 * @exports THEMES - 可用主题名称数组
 * @param {string} name - 主题名称
 * @param {Object} cfg - AI配置对象，包含apiUrl、apiKey、model
 */

export var STORAGE_KEYS = {
  manuscripts: 'qingchen-manuscripts',
  theme: 'qingchen-theme',
  aiConfig: 'qingchen-ai-config',
};

export var THEMES = ['mint', 'paper', 'fog', 'taro'];

export function loadManuscripts() {
  try {
    var raw = localStorage.getItem(STORAGE_KEYS.manuscripts);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveManuscripts(list) {
  try {
    localStorage.setItem(STORAGE_KEYS.manuscripts, JSON.stringify(list));
  } catch (e) {
    console.error('[Storage] 保存书稿列表失败:', e);
  }
}

export function loadTheme() {
  return localStorage.getItem(STORAGE_KEYS.theme) || 'mint';
}

export function saveTheme(name) {
  try {
    localStorage.setItem(STORAGE_KEYS.theme, name);
  } catch (e) {
    console.error('[Storage] 保存主题失败:', e);
  }
}

export function loadAiConfig() {
  try {
    var raw = localStorage.getItem(STORAGE_KEYS.aiConfig);
    return raw ? JSON.parse(raw) : { apiUrl: 'https://api.openai.com', apiKey: '', model: 'gpt-4o' };
  } catch (e) {
    return { apiUrl: 'https://api.openai.com', apiKey: '', model: 'gpt-4o' };
  }
}

export function saveAiConfig(cfg) {
  try {
    localStorage.setItem(STORAGE_KEYS.aiConfig, JSON.stringify(cfg));
  } catch (e) {
    console.error('[Storage] 保存AI配置失败:', e);
  }
}
