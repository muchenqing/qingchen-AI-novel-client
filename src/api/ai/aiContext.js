/**
 * AI上下文记忆管理模块
 * @description 管理小说续写上下文缓存，包括当前章节信息、人物、文风等
 *              为AI提供连续性上下文，提升续写质量
 * @exports default - aiContext对象
 */

var MAX_HISTORY = 20;
var MAX_CONTEXT_LENGTH = 8000;

var contextData = {
  currentChapter: '',
  characters: [],
  setting: '',
  writingStyle: '',
  recentExcerpts: [],
  customInstructions: '',
};

function buildSystemPrompt() {
  var parts = ['你是一位专业的小说写作助手，擅长各类小说创作。'];
  if (contextData.writingStyle) {
    parts.push('文风特点：' + contextData.writingStyle);
  }
  if (contextData.characters && contextData.characters.length > 0) {
    parts.push('主要人物：' + contextData.characters.join('、'));
  }
  if (contextData.setting) {
    parts.push('故事背景：' + contextData.setting);
  }
  if (contextData.currentChapter) {
    parts.push('当前章节：' + contextData.currentChapter);
  }
  if (contextData.customInstructions) {
    parts.push('特殊要求：' + contextData.customInstructions);
  }
  return parts.join('\n');
}

function buildRecentContext(content) {
  if (!content) return '';
  var trimmed = content.trim();
  if (trimmed.length <= MAX_CONTEXT_LENGTH) return trimmed;
  return trimmed.slice(-MAX_CONTEXT_LENGTH);
}

function buildHistory(content) {
  var history = [];
  if (contextData.recentExcerpts.length > 0) {
    var excerpts = contextData.recentExcerpts.slice(-5);
    for (var i = 0; i < excerpts.length; i++) {
      history.push({ role: 'assistant', content: '之前的续写内容：' + excerpts[i] });
    }
  }
  return history;
}

var aiContext = {
  setChapterInfo: function (info) {
    if (typeof info === 'string') {
      contextData.currentChapter = info;
    } else if (info) {
      contextData.currentChapter = info.title || '';
      contextData.characters = info.characters || contextData.characters;
      contextData.setting = info.setting || contextData.setting;
      contextData.writingStyle = info.writingStyle || contextData.writingStyle;
    }
  },

  setCharacters: function (chars) {
    contextData.characters = Array.isArray(chars) ? chars : [];
  },

  setWritingStyle: function (style) {
    contextData.writingStyle = style || '';
  },

  setSetting: function (setting) {
    contextData.setting = setting || '';
  },

  setCustomInstructions: function (instructions) {
    contextData.customInstructions = instructions || '';
  },

  addExcerpt: function (text) {
    if (!text) return;
    contextData.recentExcerpts.push(text.slice(-500));
    if (contextData.recentExcerpts.length > MAX_HISTORY) {
      contextData.recentExcerpts = contextData.recentExcerpts.slice(-MAX_HISTORY);
    }
  },

  getContext: function (content) {
    return {
      systemPrompt: buildSystemPrompt(),
      history: buildHistory(content),
      chapterInfo: contextData.currentChapter,
    };
  },

  clear: function () {
    contextData.currentChapter = '';
    contextData.characters = [];
    contextData.setting = '';
    contextData.writingStyle = '';
    contextData.recentExcerpts = [];
    contextData.customInstructions = '';
  },

  getData: function () {
    return Object.assign({}, contextData);
  },
};

export default aiContext;
