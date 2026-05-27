/**
 * 参数校验工具模块
 * @description 提供请求参数、配置参数、数据对象的合法性校验方法
 * @exports validateAiConfig - 校验AI配置对象是否包含必要字段
 * @exports validateManuscript - 校验书稿数据对象是否完整合法
 * @param {Object} cfg - 待校验的AI配置对象
 * @returns {boolean} 配置是否合法
 * @param {Object} ms - 待校验的书稿对象
 * @returns {boolean} 书稿数据是否合法
 */

export function validateAiConfig(cfg) {
  if (!cfg || typeof cfg !== 'object') return false;
  if (!cfg.apiUrl || typeof cfg.apiUrl !== 'string') return false;
  if (typeof cfg.apiKey !== 'string') return false;
  if (typeof cfg.model !== 'string') return false;
  return true;
}

export function validateManuscript(ms) {
  if (!ms || typeof ms !== 'object') return false;
  if (!ms.id || typeof ms.id !== 'string') return false;
  if (typeof ms.title !== 'string') return false;
  return true;
}
