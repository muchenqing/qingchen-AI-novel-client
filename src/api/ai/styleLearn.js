import aiAdapter from './aiAdapter.js';
import aiContext from './aiContext.js';
import { cleanText, validateSample, extractStyleStats } from '../../utils/fileParse.js';
import bus from '../../event/bus.js';

var STYLE_TEMPLATE_STORAGE_KEY = 'qingchen-style-templates';
var STYLE_TEMPLATE_MAX = 20;

var STYLE_LEARN_PROMPT_TEMPLATE = [
  '请你仔细分析以下文本的写作风格，提取出该文本的文风特征。',
  '请从以下维度进行分析：',
  '1. 叙事视角（第一人称/第三人称/上帝视角等）',
  '2. 语言风格（华丽/朴素/幽默/冷峻/抒情等）',
  '3. 句式特点（长句为主/短句为主/混合、排比/反问等修辞偏好）',
  '4. 用词习惯（书面语/口语化/文言元素/专业术语等）',
  '5. 段落节奏（密集/舒缓/快节奏/慢节奏）',
  '6. 情感表达方式（直白/含蓄/借景抒情/心理描写偏好等）',
  '7. 人物对话风格（简洁/冗长/方言特色/语气词使用等）',
  '',
  '请用一段精炼的文字（200-500字）总结上述文风特征，作为后续创作的风格指南。',
  '不要分析内容本身，只关注写作风格。',
].join('\n');

var STYLE_CONTINUE_PREFIX = '请你严格模仿以下文风特征进行续写：\n\n';
var STYLE_CONTINUE_MID = '\n\n以下是需要续写的正文内容：\n\n';
var STYLE_CONTINUE_SUFFIX = '\n\n请严格延续上述文风特征，接续正文内容进行创作，保持风格一致，内容自然连贯。';

var styleLearningState = {
  isLearning: false,
  progress: 0,
  message: '',
};

function getLearningState() {
  return styleLearningState;
}

function setLearningState(updates) {
  var keys = Object.keys(updates);
  for (var i = 0; i < keys.length; i++) {
    styleLearningState[keys[i]] = updates[keys[i]];
  }
}

async function learnFromText(sampleText, templateName) {
  var validation = validateSample(sampleText);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  var cleaned = cleanText(validation.cleaned || sampleText);
  var stats = extractStyleStats(cleaned);

  setLearningState({ isLearning: true, progress: 10, message: '正在分析文风特征...' });
  bus.emit('style:learning-progress', { progress: 10, message: '正在分析文风特征...' });

  var truncated = cleaned.slice(0, 10000);

  try {
    setLearningState({ progress: 30, message: '正在请求AI分析...' });
    bus.emit('style:learning-progress', { progress: 30, message: '正在请求AI分析...' });

    var result = await aiAdapter.unifiedRequest(
      STYLE_LEARN_PROMPT_TEMPLATE + '\n\n以下是待分析的文本：\n\n' + truncated,
      { systemPrompt: '你是一位专业的文学评论家和写作风格分析师。' },
      { temperature: 0.3, maxTokens: 1000 }
    );

    if (result.code !== 200) {
      setLearningState({ isLearning: false, progress: 0, message: '' });
      return { success: false, errors: ['AI分析失败: ' + result.message] };
    }

    setLearningState({ progress: 80, message: '正在保存风格模板...' });
    bus.emit('style:learning-progress', { progress: 80, message: '正在保存风格模板...' });

    var styleDescription = result.content;
    var name = templateName || ('风格模板-' + new Date().toLocaleDateString('zh-CN'));

    var template = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name,
      description: styleDescription,
      sampleText: truncated.slice(0, 3000),
      sampleStats: stats,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    var saveResult = saveStyleTemplate(template);
    if (!saveResult.success) {
      setLearningState({ isLearning: false, progress: 0, message: '' });
      return { success: false, errors: saveResult.errors };
    }

    setLearningState({ isLearning: false, progress: 100, message: '学习完成' });
    bus.emit('style:learning-progress', { progress: 100, message: '学习完成' });
    bus.emit('style:learned', template);

    return {
      success: true,
      template: template,
      styleDescription: styleDescription,
      stats: stats,
    };
  } catch (err) {
    setLearningState({ isLearning: false, progress: 0, message: '' });
    if (err.message && (err.message.indexOf('Failed to fetch') !== -1 || err.message.indexOf('NetworkError') !== -1)) {
      return { success: false, errors: ['网络连接异常，请检查网络后重试'] };
    }
    return { success: false, errors: ['学习失败: ' + err.message] };
  }
}

function continueWithStyle(content, templateId) {
  if (!content || !content.trim()) {
    return Promise.resolve({ success: false, errors: ['正文内容为空'] });
  }

  var templates = loadStyleTemplates();
  var template = null;
  for (var i = 0; i < templates.length; i++) {
    if (templates[i].id === templateId) {
      template = templates[i];
      break;
    }
  }

  if (!template) {
    return Promise.resolve({ success: false, errors: ['未找到选中的风格模板'] });
  }

  var prompt = STYLE_CONTINUE_PREFIX + template.description + STYLE_CONTINUE_MID + content.trim().slice(-5000) + STYLE_CONTINUE_SUFFIX;

  var systemPrompt = '你是一位专业的小说写作助手。请严格按照给定的文风特征进行创作。';
  if (template.description) {
    systemPrompt += '\n风格指南：' + template.description;
  }

  return aiAdapter.unifiedRequest(
    prompt,
    { systemPrompt: systemPrompt, history: aiContext.getContext(content).history },
    { temperature: 0.8, maxTokens: 2000 }
  ).then(function (res) {
    if (res.code !== 200) throw new Error(res.message);
    aiContext.addExcerpt(res.content);
    return { success: true, content: res.content };
  }).catch(function (err) {
    if (err.message && (err.message.indexOf('Failed to fetch') !== -1 || err.message.indexOf('NetworkError') !== -1)) {
      return { success: false, errors: ['网络连接异常，请检查网络后重试'] };
    }
    return { success: false, errors: ['续写失败: ' + err.message] };
  });
}

function loadStyleTemplates() {
  var stored = null;
  try {
    stored = localStorage.getItem(STYLE_TEMPLATE_STORAGE_KEY);
  } catch (e) { /* ignore */ }
  return stored ? JSON.parse(stored) : [];
}

function saveStyleTemplate(template) {
  var templates = loadStyleTemplates();
  if (templates.length >= STYLE_TEMPLATE_MAX) {
    return { success: false, errors: ['风格模板数量已达上限 (' + STYLE_TEMPLATE_MAX + ')，请先删除旧模板'] };
  }
  templates.push(template);
  try {
    localStorage.setItem(STYLE_TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
    return { success: true };
  } catch (e) {
    return { success: false, errors: ['保存失败: ' + e.message] };
  }
}

function deleteStyleTemplate(templateId) {
  var templates = loadStyleTemplates();
  var found = false;
  var result = templates.filter(function (t) {
    if (t.id === templateId) { found = true; return false; }
    return true;
  });
  if (!found) return { success: false, errors: ['模板不存在'] };
  try {
    localStorage.setItem(STYLE_TEMPLATE_STORAGE_KEY, JSON.stringify(result));
    bus.emit('style:template-deleted', { id: templateId });
    return { success: true };
  } catch (e) {
    return { success: false, errors: ['删除失败'] };
  }
}

function renameStyleTemplate(templateId, newName) {
  if (!newName || !newName.trim()) {
    return { success: false, errors: ['名称不能为空'] };
  }
  var templates = loadStyleTemplates();
  for (var i = 0; i < templates.length; i++) {
    if (templates[i].id === templateId) {
      templates[i].name = newName.trim();
      templates[i].updatedAt = Date.now();
      try {
        localStorage.setItem(STYLE_TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
        bus.emit('style:template-renamed', { id: templateId, name: newName.trim() });
        return { success: true };
      } catch (e) {
        return { success: false, errors: ['重命名失败'] };
      }
    }
  }
  return { success: false, errors: ['模板不存在'] };
}

function clearAllTemplates() {
  try {
    localStorage.removeItem(STYLE_TEMPLATE_STORAGE_KEY);
    bus.emit('style:templates-cleared');
    return { success: true };
  } catch (e) {
    return { success: false, errors: ['清空失败'] };
  }
}

function getTemplateById(templateId) {
  var templates = loadStyleTemplates();
  for (var i = 0; i < templates.length; i++) {
    if (templates[i].id === templateId) return templates[i];
  }
  return null;
}

export {
  learnFromText,
  continueWithStyle,
  loadStyleTemplates,
  saveStyleTemplate,
  deleteStyleTemplate,
  renameStyleTemplate,
  clearAllTemplates,
  getTemplateById,
  getLearningState,
  setLearningState,
  STYLE_LEARN_PROMPT_TEMPLATE,
  STYLE_TEMPLATE_MAX,
};
