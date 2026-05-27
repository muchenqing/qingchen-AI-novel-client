import aiAdapter from './aiAdapter.js';
import bus from '../../event/bus.js';

var ENDING_STYLES = [
  { key: 'tragic', label: '悲情结局', prompt: '请以悲情、伤感的基调创作一个令人唏嘘的结局' },
  { key: 'happy', label: '爽文结局', prompt: '请以爽快、大团圆的基调创作一个酣畅淋漓的结局' },
  { key: 'twist', label: '反转结局', prompt: '请创作一个出人意料的反转结局，颠覆读者预期' },
  { key: 'open', label: '开放式结局', prompt: '请创作一个开放式结局，留下想象空间和回味' },
  { key: 'suspense', label: '悬疑结局', prompt: '请创作一个悬疑感十足的结局，揭示谜底但留有余韵' },
];

var ENDING_GEN_PROMPT_TEMPLATE = [
  '你是一位专业的小说创作大师，擅长构思精彩的结局。请基于以下内容，创作一个完整的结局。',
  '',
  '风格要求：{style}',
  '',
  '要求：',
  '1. 结局需要与前文内容自然衔接',
  '2. 保持人物性格和行为的一致性',
  '3. 结局需要完整、有收束感',
  '4. 字数控制在 500-1000 字',
  '5. 情节紧凑、情感饱满',
].join('\n');

async function generateEndings(content, options) {
  if (!content || !content.trim()) {
    return { success: false, errors: ['请先选择或输入需要生成结局的段落内容'] };
  }

  var truncated = content.slice(0, 8000);
  var styles = (options && options.styles) || ENDING_STYLES;
  var results = [];

  bus.emit('ai:ending-progress', { status: 'generating', current: 0, total: styles.length, message: '正在生成结局...' });

  for (var i = 0; i < styles.length; i++) {
    bus.emit('ai:ending-progress', {
      status: 'generating',
      current: i + 1,
      total: styles.length,
      message: '正在生成「' + styles[i].label + '」...',
    });

    var stylePrompt = ENDING_GEN_PROMPT_TEMPLATE.replace('{style}', styles[i].prompt);
    var prompt = stylePrompt + '\n\n---\n\n以下是小说前文内容：\n\n' + truncated;

    try {
      var result = await aiAdapter.unifiedRequest(
        prompt,
        { systemPrompt: '你是一位专业的小说结局创作大师。' },
        { temperature: 0.8, maxTokens: 1500 }
      );

      if (result.code === 200 && result.content) {
        results.push({
          style: styles[i].key,
          styleLabel: styles[i].label,
          content: result.content,
        });
      }
    } catch (err) {
      results.push({
        style: styles[i].key,
        styleLabel: styles[i].label,
        content: '',
        error: err.message,
      });
    }
  }

  bus.emit('ai:ending-progress', { status: 'done', message: '生成完成' });

  if (results.length === 0) {
    return { success: false, errors: ['所有结局生成失败'] };
  }

  return {
    success: true,
    endings: results,
  };
}

async function generateSingleEnding(content, styleKey) {
  var style = null;
  for (var i = 0; i < ENDING_STYLES.length; i++) {
    if (ENDING_STYLES[i].key === styleKey) {
      style = ENDING_STYLES[i];
      break;
    }
  }
  if (!style) {
    return { success: false, errors: ['未知的结局风格'] };
  }

  var results = await generateEndings(content, { styles: [style] });
  if (results.success && results.endings.length > 0) {
    return { success: true, ending: results.endings[0] };
  }
  return results;
}

function getEndingStyles() {
  return ENDING_STYLES;
}

export { generateEndings, generateSingleEnding, getEndingStyles, ENDING_STYLES, ENDING_GEN_PROMPT_TEMPLATE };
