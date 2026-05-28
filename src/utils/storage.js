/**
 * 本地持久化存储封装模块
 * @description 统一管理localStorage读写操作
 */

export var STORAGE_KEYS = {
  novels: 'qingchen-novels',
  theme: 'qingchen-theme',
  aiConfig: 'qingchen-ai-config',
};

export var THEMES = ['mint', 'paper', 'fog', 'taro'];

export function loadNovels() {
  try {
    var raw = localStorage.getItem(STORAGE_KEYS.novels);
    var list = raw ? JSON.parse(raw) : [];
    /* 兼容旧 manuscrit 数据 */
    if (list.length === 0) {
      var oldRaw = localStorage.getItem('qingchen-manuscripts');
      if (oldRaw) {
        var oldList = JSON.parse(oldRaw);
        for (var i = 0; i < oldList.length; i++) {
          var old = oldList[i];
          list.push({
            id: old.id,
            title: old.title || '未命名小说',
            chapters: [{
              id: old.id + '-ch1',
              title: '第一章',
              content: old.content || '',
              order: 0,
              wordCount: old.wordCount || 0,
              createdAt: old.createdAt || Date.now(),
              updatedAt: old.updatedAt || Date.now(),
            }],
            createdAt: old.createdAt || Date.now(),
            updatedAt: old.updatedAt || Date.now(),
            wordCount: old.wordCount || 0,
          });
        }
        saveNovels(list);
        localStorage.removeItem('qingchen-manuscripts');
      }
    }
    return list;
  } catch (e) {
    return [];
  }
}

export function saveNovels(list) {
  try {
    localStorage.setItem(STORAGE_KEYS.novels, JSON.stringify(list));
  } catch (e) {
    console.error('[Storage] 保存小说列表失败:', e);
  }
}

/* 兼容旧 API */
export function loadManuscripts() {
  return loadNovels();
}

export function saveManuscripts(list) {
  saveNovels(list);
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
