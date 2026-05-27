import aiAdapter from './aiAdapter.js';
import bus from '../../event/bus.js';

var DRAMA_CHECK_PROMPT = [
  '你是一位专业的小说编辑和剧情逻辑审查专家。请仔细阅读以下小说内容，从以下维度进行全面的剧情逻辑检测：',
  '',
  '1. **时间线冲突**：检查事件发生的时间顺序是否合理，是否存在时间矛盾',
  '2. **人设崩塌**：检查角色行为是否符合其人设定位，是否存在前后性格矛盾',
  '3. **逻辑BUG**：检查情节发展是否符合因果逻辑，是否存在不合理的巧合或漏洞',
  '4. **前后矛盾**：检查前后文描述是否一致，包括物品、地点、关系等细节',
  '5. **设定遗忘**：检查是否遗忘了之前建立的重要设定',
  '',
  '请按以下格式输出检测结果：',
  '',
  '## 剧情检测报告',
  '',
  '### 严重问题',
  '- [问题描述] | 章节位置 | 优化建议',
  '',
  '### 一般问题',
  '- [问题描述] | 章节位置 | 优化建议',
  '',
  '### 细节问题',
  '- [问题描述] | 章节位置 | 优化建议',
  '',
  '如果没有发现问题，请说明"剧情逻辑整体通顺，未发现明显问题"。',
].join('\n');

async function checkDrama(content, options) {
  if (!content || !content.trim()) {
    return { success: false, errors: ['请先输入或加载需要检测的小说内容'] };
  }

  var truncated = content.slice(0, 15000);
  var prompt = DRAMA_CHECK_PROMPT + '\n\n---\n\n以下是需要检测的小说内容：\n\n' + truncated;

  bus.emit('ai:drama-check-progress', { status: 'analyzing', message: '正在分析剧情逻辑...' });

  try {
    var result = await aiAdapter.unifiedRequest(
      prompt,
      { systemPrompt: '你是一位严谨的小说编辑，专注于发现剧情逻辑问题。' },
      { temperature: 0.3, maxTokens: 3000 }
    );

    if (result.code !== 200) {
      return { success: false, errors: ['检测失败: ' + result.message] };
    }

    var report = parseDramaReport(result.content);

    bus.emit('ai:drama-check-progress', { status: 'done', message: '检测完成' });

    return {
      success: true,
      content: result.content,
      report: report,
    };
  } catch (err) {
    bus.emit('ai:drama-check-progress', { status: 'error', message: '检测失败' });
    if (err.message && (err.message.indexOf('Failed to fetch') !== -1 || err.message.indexOf('网络') !== -1)) {
      return { success: false, errors: ['网络连接异常，请检查网络后重试'] };
    }
    return { success: false, errors: ['检测失败: ' + err.message] };
  }
}

function parseDramaReport(content) {
  if (!content) return { severe: [], normal: [], detail: [] };

  var severe = [];
  var normal = [];
  var detail = [];
  var lines = content.split('\n');
  var currentSection = '';

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.indexOf('严重问题') !== -1) currentSection = 'severe';
    else if (line.indexOf('一般问题') !== -1) currentSection = 'normal';
    else if (line.indexOf('细节问题') !== -1) currentSection = 'detail';
    else if (line.indexOf('-') === 0 && line.length > 2) {
      var item = line.replace(/^-\s*/, '').trim();
      if (currentSection === 'severe') severe.push(item);
      else if (currentSection === 'normal') normal.push(item);
      else if (currentSection === 'detail') detail.push(item);
    }
  }

  return { severe: severe, normal: normal, detail: detail };
}

function getIssueStats(report) {
  if (!report) return { total: 0, severe: 0, normal: 0, detail: 0 };
  return {
    total: report.severe.length + report.normal.length + report.detail.length,
    severe: report.severe.length,
    normal: report.normal.length,
    detail: report.detail.length,
  };
}

export { checkDrama, parseDramaReport, getIssueStats, DRAMA_CHECK_PROMPT };
