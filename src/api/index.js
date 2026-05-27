/**
 * 全局接口总入口
 * @description 统一导出所有API模块，对外提供统一的接口调用入口
 */

export { aiContinue, aiOutline, aiPolish, testConnection, aiWritingFeatures } from './ai/index.js';
export {
  learnFromText, continueWithStyle, loadStyleTemplates,
  deleteStyleTemplate, renameStyleTemplate, clearAllTemplates,
  getTemplateById, getLearningState,
} from './ai/styleLearn.js';

export {
  speak, speakSelection, speakAll,
  pause, resume, stop,
  getState, getVoices,
  setVoiceConfig, getVoiceConfig,
  startDictation, stopDictation, isDictating,
} from './ai/voice.js';

export { checkDrama, parseDramaReport, getIssueStats, DRAMA_CHECK_PROMPT } from './ai/dramaCheck.js';

export { detectForeshadows, parseForeshadowReport, getForeshadowStats, FORESHADOW_PROMPT } from './ai/foreshadow.js';

export { generateEndings, generateSingleEnding, getEndingStyles, ENDING_STYLES, ENDING_GEN_PROMPT_TEMPLATE } from './ai/endingGen.js';
