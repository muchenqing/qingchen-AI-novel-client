/**
 * AI接口统一出口（增量更新）
 * @description 保持原有aiContinue/aiOutline/aiPolish接口完全兼容
 *              新增多模型适配器和8大写作功能
 * @exports aiContinue - 续写（兼容旧版）
 * @exports aiOutline - 大纲生成（兼容旧版）
 * @exports aiPolish - 润色（兼容旧版）
 * @exports aiAdapter - 多模型适配器（新增）
 * @exports aiContext - 上下文管理（新增）
 * @exports aiWritingFeatures - 小说写作专属功能（新增）
 */

import aiAdapter from '../ai/aiAdapter.js';
import aiContext from '../ai/aiContext.js';
import { loadAiConfig } from '../../utils/storage.js';

async function legacyRequest(prompt) {
  var cfg = loadAiConfig();
  var url = cfg.apiUrl.replace(/\/+$/, '') + '/v1/chat/completions';
  var res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + cfg.apiKey,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });
  if (!res.ok) {
    var errBody = await res.text();
    throw new Error('API 请求失败 (' + res.status + '): ' + errBody);
  }
  var data = await res.json();
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
}

export function aiContinue(content) {
  return aiAdapter.unifiedRequest(
    '请续写以下内容，保持风格一致：\n\n' + content,
    aiContext.getContext(content),
    {}
  ).then(function (res) {
    if (res.code !== 200) throw new Error(res.message);
    aiContext.addExcerpt(res.content);
    return res.content;
  });
}

export function aiOutline(content) {
  return aiAdapter.unifiedRequest(
    '请根据以下内容生成小说大纲：\n\n' + content,
    aiContext.getContext(content),
    {}
  ).then(function (res) {
    if (res.code !== 200) throw new Error(res.message);
    return res.content;
  });
}

export function aiPolish(content) {
  return aiAdapter.unifiedRequest(
    '请润色以下内容，提升文学性：\n\n' + content,
    aiContext.getContext(content),
    {}
  ).then(function (res) {
    if (res.code !== 200) throw new Error(res.message);
    return res.content;
  });
}

export async function testConnection(apiUrl, apiKey, model) {
  try {
    var result = await aiAdapter.testConnection();
    return result;
  } catch (e) {
    try {
      var url = apiUrl.replace(/\/+$/, '') + '/v1/chat/completions';
      var res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5,
        }),
      });
      if (res.ok) return { success: true, message: '\u2713 连接成功' };
      var err = await res.text();
      return { success: false, message: '\u2717 连接失败 (' + res.status + '): ' + err.slice(0, 100) };
    } catch (err2) {
      return { success: false, message: '\u2717 连接错误: ' + err2.message };
    }
  }
}

/**
 * 小说写作专属AI功能
 * @description 在原有续写/大纲/润色基础上新增8大功能
 */
export var aiWritingFeatures = {
  characterDesign: function (content, extraInfo) {
    var prompt = '请根据以下内容为小说设计详细的人物设定，包括性格、背景、外貌、能力等：\n\n' + content;
    if (extraInfo) prompt += '\n\n补充信息：' + extraInfo;
    return aiAdapter.unifiedRequest(prompt, aiContext.getContext(content), {}).then(function (res) {
      if (res.code !== 200) throw new Error(res.message);
      return res.content;
    });
  },

  worldBuilding: function (content, extraInfo) {
    var prompt = '请根据以下内容为小说设计完整的世界观设定，包括时代背景、地理环境、社会体系、特殊规则等：\n\n' + content;
    if (extraInfo) prompt += '\n\n补充信息：' + extraInfo;
    return aiAdapter.unifiedRequest(prompt, aiContext.getContext(content), {}).then(function (res) {
      if (res.code !== 200) throw new Error(res.message);
      return res.content;
    });
  },

  conflictGenerator: function (content, extraInfo) {
    var prompt = '请根据以下内容为小说生成精彩的冲突情节，包括核心矛盾、情节转折、高潮设计：\n\n' + content;
    if (extraInfo) prompt += '\n\n补充信息：' + extraInfo;
    return aiAdapter.unifiedRequest(prompt, aiContext.getContext(content), {}).then(function (res) {
      if (res.code !== 200) throw new Error(res.message);
      return res.content;
    });
  },

  chapterSummary: function (content) {
    return aiAdapter.unifiedRequest(
      '请对以下章节内容进行精炼总结，包括主要事件、人物动态、情节进展：\n\n' + content,
      aiContext.getContext(content),
      { temperature: 0.3 }
    ).then(function (res) {
      if (res.code !== 200) throw new Error(res.message);
      return res.content;
    });
  },

  styleImitation: function (content, referenceText) {
    var prompt = '请模仿以下文风进行创作，保持一致的语言风格和叙述特点：\n\n';
    if (referenceText) prompt += '参考文风：\n' + referenceText.slice(0, 2000) + '\n\n';
    prompt += '创作内容：\n' + content;
    return aiAdapter.unifiedRequest(prompt, aiContext.getContext(content), {}).then(function (res) {
      if (res.code !== 200) throw new Error(res.message);
      return res.content;
    });
  },

  dialoguePolish: function (content) {
    return aiAdapter.unifiedRequest(
      '请优化以下对话内容，使对话更加生动自然、符合角色性格：\n\n' + content,
      aiContext.getContext(content),
      {}
    ).then(function (res) {
      if (res.code !== 200) throw new Error(res.message);
      return res.content;
    });
  },

  expandParagraph: function (content) {
    return aiAdapter.unifiedRequest(
      '请将以下段落进行扩写，增加细节描写和心理活动，使内容更加丰富：\n\n' + content,
      aiContext.getContext(content),
      { maxTokens: 3000 }
    ).then(function (res) {
      if (res.code !== 200) throw new Error(res.message);
      return res.content;
    });
  },

  condenseParagraph: function (content) {
    return aiAdapter.unifiedRequest(
      '请将以下内容精简缩写，保留核心情节，去除冗余描述：\n\n' + content,
      aiContext.getContext(content),
      { temperature: 0.3 }
    ).then(function (res) {
      if (res.code !== 200) throw new Error(res.message);
      return res.content;
    });
  },

  generateTitle: function (content) {
    return aiAdapter.unifiedRequest(
      '请为以下章节生成3-5个合适的标题选项，标题应简洁有力、吸引读者：\n\n' + content.slice(0, 3000),
      aiContext.getContext(content),
      { temperature: 0.9 }
    ).then(function (res) {
      if (res.code !== 200) throw new Error(res.message);
      return res.content;
    });
  },
};
