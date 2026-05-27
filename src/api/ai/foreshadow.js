import aiAdapter from './aiAdapter.js';
import bus from '../../event/bus.js';

var FORESHADOW_PROMPT = [
  '你是一位专业的小说伏笔分析专家。请仔细阅读以下小说内容，识别并分析所有伏笔和悬念线索。',
  '',
  '请按以下维度进行分析：',
  '',
  '1. **已埋设的伏笔**：列出所有已设置的伏笔/悬念/暗示',
  '2. **未回收线索**：哪些伏笔尚未得到回应或解答',
  '3. **可回收伏笔**：哪些伏笔适合在后续章节中回收',
  '4. **伏笔密度评估**：整体伏笔设置是否合理',
  '',
  '请按以下格式输出：',
  '',
  '## 伏笔检测报告',
  '',
  '### 已埋伏笔清单',
  '| 序号 | 伏笔内容 | 所在位置 | 类型 | 状态 |',
  '|------|---------|---------|------|------|',
  '| 1 | 描述 | 章节/段落 | 人物/情节/道具/环境 | 已回收/未回收 |',
  '',
  '### 未回收伏笔',
  '- [伏笔描述] | 建议回收方式',
  '',
  '### 伏笔密度评估',
  '- 整体评估和建议',
].join('\n');

async function detectForeshadows(content, options) {
  if (!content || !content.trim()) {
    return { success: false, errors: ['请先输入或加载需要检测的小说内容'] };
  }

  var truncated = content.slice(0, 15000);
  var prompt = FORESHADOW_PROMPT + '\n\n---\n\n以下是需要分析的小说内容：\n\n' + truncated;

  bus.emit('ai:foreshadow-progress', { status: 'analyzing', message: '正在扫描伏笔线索...' });

  try {
    var result = await aiAdapter.unifiedRequest(
      prompt,
      { systemPrompt: '你是一位专业的小说结构分析师，擅长识别伏笔和悬念线索。' },
      { temperature: 0.3, maxTokens: 3000 }
    );

    if (result.code !== 200) {
      return { success: false, errors: ['检测失败: ' + result.message] };
    }

    var analysis = parseForeshadowReport(result.content);

    bus.emit('ai:foreshadow-progress', { status: 'done', message: '分析完成' });

    return {
      success: true,
      content: result.content,
      analysis: analysis,
    };
  } catch (err) {
    bus.emit('ai:foreshadow-progress', { status: 'error', message: '分析失败' });
    if (err.message && (err.message.indexOf('Failed to fetch') !== -1 || err.message.indexOf('网络') !== -1)) {
      return { success: false, errors: ['网络连接异常，请检查网络后重试'] };
    }
    return { success: false, errors: ['分析失败: ' + err.message] };
  }
}

function parseForeshadowReport(content) {
  if (!content) return { foreshadows: [], unrecovered: [], density: '' };

  var foreshadows = [];
  var unrecovered = [];
  var density = '';
  var lines = content.split('\n');
  var section = '';

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.indexOf('已埋伏笔') !== -1 || line.indexOf('伏笔清单') !== -1) section = 'foreshadows';
    else if (line.indexOf('未回收') !== -1) section = 'unrecovered';
    else if (line.indexOf('密度评估') !== -1 || line.indexOf('整体评估') !== -1) section = 'density';

    if (section === 'foreshadows' && line.indexOf('|') === 0 && line.indexOf('---') === -1 && line.indexOf('序号') === -1) {
      var cells = line.split('|').filter(function (c) { return c.trim(); });
      if (cells.length >= 4) {
        foreshadows.push({
          id: cells[0].trim(),
          content: cells[1].trim(),
          location: cells[2].trim(),
          type: cells[3] ? cells[3].trim() : '',
          status: cells[4] ? cells[4].trim() : '',
        });
      }
    } else if (section === 'unrecovered' && line.indexOf('-') === 0) {
      unrecovered.push(line.replace(/^-\s*/, '').trim());
    } else if (section === 'density' && line && line.indexOf('#') === -1) {
      density += line + ' ';
    }
  }

  return { foreshadows: foreshadows, unrecovered: unrecovered, density: density.trim() };
}

function getForeshadowStats(analysis) {
  if (!analysis) return { total: 0, unrecovered: 0, recovered: 0 };
  var unrecovered = 0;
  var recovered = 0;
  for (var i = 0; i < analysis.foreshadows.length; i++) {
    if (analysis.foreshadows[i].status && analysis.foreshadows[i].status.indexOf('未回收') !== -1) {
      unrecovered++;
    } else {
      recovered++;
    }
  }
  return { total: analysis.foreshadows.length, unrecovered: unrecovered, recovered: recovered };
}

export { detectForeshadows, parseForeshadowReport, getForeshadowStats, FORESHADOW_PROMPT };
