/**
 * 人物解析工具模块
 * @description 从 AI 人物设定文本中智能提取多角色并解析结构化信息
 *              同时支持从正文中自动提取中文人名
 */

var CHINESE_CHAR = /[\u4e00-\u9fff]/;

var GROUP_LABELS = ['基本', '基础', '年龄', '性别', '身份', '外貌', '性格', '能力', '背景',
  '关系', '动机', '目标', '经历', '关键', '事件', '成长'];
var ITEM_LABELS = ['年龄', '性别', '身份', '职业', '外貌', '性格', '能力', '特长',
  '背景', '出身', '动机', '目标', '信念', '口头禅', '习惯', '弱点', '成长',
  '关系', '父母', '亲人', '朋友', '爱人', '对手', '导师'];

var SURNAME_LIST = [
  '王','李','张','刘','陈','杨','黄','赵','吴','徐',
  '孙','朱','胡','郭','何','高','林','罗','郑','梁',
  '谢','宋','唐','许','邓','冯','韩','曹','曾','彭',
  '萧','田','董','潘','袁','蒋','蔡','余','叶','苏',
  '魏','程','吕','丁','沈','任','卢','姚','傅','钟',
  '姜','崔','廖','汪','陆','金','石','戴','贾','韦',
  '夏','邱','侯'
];

var SURNAME_DICT = {};
for (var si = 0; si < SURNAME_LIST.length; si++) {
  SURNAME_DICT[SURNAME_LIST[si]] = true;
}

var NOISE_WORDS = [
  '今天','明天','公司','大学','北京','上海','因为','所以','但是',
  '如果','可以','他们','我们','自己','什么','怎么','这样','那样',
  '然后','或者','已经','没有','应该','可能','这个','那个','哪些',
  '不要','不是','就是','只是','其实','虽然','不过','而且',
  '因此','之后','以前','之后','已经','政府','经济','社会',
  '世界','中国','美国','日本','欧洲','东西','地方','时候',
  '知道','觉得','开始','结束','继续','突然','忽然','终于',
  '一声','说道','问道','笑道','看到','听到','感到','想到',
  '走过来','走过去','说道','看着','对着','朝着','随着',
  '另外','某个人','某些','其中','一切','任何','这次','那次'
];

var NOISE_SET = {};
for (var ni = 0; ni < NOISE_WORDS.length; ni++) {
  NOISE_SET[NOISE_WORDS[ni]] = true;
}

var NOISE_SUFFIX = ['公司','大学','政府','社会','世界','中心','集团','组织','机构','医院','学校'];

export function parseCharacters(text) {
  if (!text || !text.trim()) return [];

  var blocks = splitIntoCharacterBlocks(text);

  var characters = [];
  var seenNames = {};

  for (var i = 0; i < blocks.length; i++) {
    var char = parseOneBlock(blocks[i], characters.length);
    if (char && char.name && !seenNames[char.name]) {
      seenNames[char.name] = true;
      characters.push(char);
    }
  }

  /* 如果没拆出多个角色，尝试按空行再拆一次 */
  if (characters.length <= 1) {
    characters = retrySplit(text, seenNames);
  }

  return characters;
}

function splitIntoCharacterBlocks(text) {
  /* 尝试多种分割方式 */
  var blocks;

  /* 方式1：按 "数字. **名字**" 或 "数字、名字" 分割 */
  blocks = splitByPattern(text, /^[0-9一二三四五六七八九十]+[.、)）]\s*/m);
  if (blocks.length >= 2) return blocks;

  /* 方式2: 按 markdown ### 标题分割 */
  blocks = splitByPattern(text, /^#{1,3}\s+/m);
  if (blocks.length >= 2) return blocks;

  /* 方式3: 按空行 + 下一行包含粗体名字 分割 */
  blocks = splitByBoldName(text);
  if (blocks.length >= 2) return blocks;

  /* 方式4: 按双空行分割 */
  var raw = text.split(/\n\n\n+/);
  blocks = [];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i].trim()) blocks.push(raw[i].trim());
  }
  if (blocks.length >= 2) return blocks;

  return [text];
}

function splitByPattern(text, pattern) {
  var parts = text.split(pattern);
  var result = [];
  for (var i = 0; i < parts.length; i++) {
    var t = parts[i].trim();
    if (t) result.push(t);
  }
  if (result.length <= 1) return [text];
  return result;
}

function splitByBoldName(text) {
  var lines = text.split('\n');
  var blocks = [];
  var current = [];

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    /* 检测行首的粗体名字 */
    var boldMatch = line.match(/^\*{1,2}([^*\n]{2,15})\*{1,2}/);
    /* 检测行首的 【名字】 */
    var bracketMatch = line.match(/^【([^】\n]{2,15})】/);

    var hasBoldName = boldMatch && !isNoise(boldMatch[1]);
    var hasBracket = bracketMatch && !isNoise(bracketMatch[1]);

    if ((hasBoldName || hasBracket) && current.length > 0) {
      blocks.push(current.join('\n').trim());
      current = [];
    }
    current.push(lines[i]);
  }

  if (current.length > 0) {
    blocks.push(current.join('\n').trim());
  }

  return blocks.length >= 2 ? blocks : [text];
}

function parseOneBlock(text, idx) {
  var name = extractNameFromBlock(text);
  if (!name) return null;

  var items = extractItems(text, name);

  return {
    id: 'char-' + idx,
    name: name,
    detail: text,
    items: items,
  };
}

function extractNameFromBlock(text) {
  /* 1. 行首粗体: **张三** */
  var m1 = text.match(/^\*{1,2}([^*\n]{2,15})\*{1,2}/);
  if (m1 && !isNoise(m1[1])) return m1[1];

  /* 2. 【张三】 */
  var m2 = text.match(/【([^】\n]{2,15})】/);
  if (m2 && !isNoise(m2[1])) return m2[1];

  /* 3. 数字. 名字 - 描述 或 数字、名字 */
  var m3 = text.match(/^[0-9一二三四五六七八九十]+[.、)）]\s*([^\s\-:：\n]{2,15})/m);
  if (m3 && !isNoise(m3[1])) return m3[1];

  /* 4. 第一行就是名字（2-4个中文字符） */
  var firstLine = text.split('\n')[0].trim();
  if (/^[\u4e00-\u9fff]{2,4}$/.test(firstLine)) return firstLine;

  /* 5. 姓名：xxx */
  var m5 = text.match(/(?:姓名|名字|角色)[：:]\s*([^\n]{2,15})/m);
  if (m5 && !isNoise(m5[1])) return m5[1];

  return null;
}

function extractItems(text, charName) {
  var items = [];
  var lines = text.split('\n');

  /* 尝试解析 "字段：值" 格式的行 */
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || line.length < 3) continue;

    for (var j = 0; j < ITEM_LABELS.length; j++) {
      var label = ITEM_LABELS[j];
      var re = new RegExp('^' + label + '[：:\\s]*([^\\n]{1,200})');
      var m = line.match(re);
      if (m) {
        /* 检查该行是否在角色名行内（如 "张三：年龄25"）*/
        if (line.indexOf(charName) === 0) {
          var afterName = line.substring(charName.length).replace(/^[：:]\s*/, '');
          var innerMatch = afterName.match(new RegExp('^' + label + '[：:\\s]*([^\\n]{1,200})'));
          if (innerMatch) {
            items.push({ group: getGroup(label), label: label, content: innerMatch[1].trim() });
          }
        } else {
          items.push({ group: getGroup(label), label: label, content: m[1].trim() });
        }
        break;
      }
    }
  }

  /* 如果没解析出条目，把全部文本作为一条 */
  if (items.length === 0) {
    items.push({ group: '概览', label: '完整设定', content: text });
  }

  return items;
}

function getGroup(label) {
  if (/年龄|性别|身份|职业|外貌/.test(label)) return '基础信息';
  if (/性格|能力|特长|口头禅|习惯|弱点|信念/.test(label)) return '角色特质';
  if (/背景|出身|经历|成长|动机|目标/.test(label)) return '角色背景';
  if (/关系|父母|亲人|朋友|爱人|对手|导师/.test(label)) return '角色关系';
  if (/事件|关键/.test(label)) return '关键事件';
  return '其他';
}

function retrySplit(text, seenNames) {
  var characters = [];
  /* 强力模式：逐行扫描，遇到任何看起来像名字的行就开新角色 */
  var lines = text.split('\n');
  var currentName = null;
  var currentLines = [];

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) {
      if (currentLines.length) currentLines.push('');
      continue;
    }

    /* 检测是否是角色开始行 */
    var isCharStart = false;
    var newName = null;

    /* 数字序号 + 粗体/名字 */
    var seqMatch = line.match(/^[0-9一二三四五六七八九十]+[.、)）]\s*\*{0,2}([^\*\-:：\n]{2,15})/);
    if (seqMatch && !isNoise(seqMatch[1])) { isCharStart = true; newName = seqMatch[1]; }

    /* 行首粗体名字 */
    if (!isCharStart) {
      var boldMatch = line.match(/^\*{1,2}([^*\n]{2,15})\*{1,2}/);
      if (boldMatch && !isNoise(boldMatch[1])) { isCharStart = true; newName = boldMatch[1]; }
    }

    /* 【名字】 */
    if (!isCharStart) {
      var brkMatch = line.match(/^【([^】\n]{2,15})】/);
      if (brkMatch && !isNoise(brkMatch[1])) { isCharStart = true; newName = brkMatch[1]; }
    }

    /* 2-4个汉字独立成行 */
    if (!isCharStart && /^[\u4e00-\u9fff]{2,4}$/.test(line)) {
      if (!isNoise(line)) { isCharStart = true; newName = line; }
    }

    if (isCharStart && newName && !seenNames[newName]) {
      if (currentName && currentLines.length > 0) {
        characters.push({
          id: 'char-' + characters.length,
          name: currentName,
          detail: currentLines.join('\n').trim(),
          items: extractItems(currentLines.join('\n'), currentName),
        });
        seenNames[currentName] = true;
      }
      currentName = newName;
      currentLines = [];
    } else if (currentName) {
      currentLines.push(line);
    }
  }

  if (currentName && currentLines.length > 0 && !seenNames[currentName]) {
    characters.push({
      id: 'char-' + characters.length,
      name: currentName,
      detail: currentLines.join('\n').trim(),
      items: extractItems(currentLines.join('\n'), currentName),
    });
  }

  return characters;
}

function isNoise(word) {
  if (!word || word.length < 2) return true;
  var noise = [
    '主要人物', '次要人物', '人物设定', '角色设定', '人物介绍',
    '第一章', '第二章', '第三章', '第', '世界观', '剧情', '大纲',
    '开始', '结尾', '以上', '以下', '总体', '总结', '结论',
    'character', '介绍', '建议', '说明', '注意', '注释',
  ];
  for (var i = 0; i < noise.length; i++) {
    if (word.indexOf(noise[i]) !== -1) return true;
  }
  return false;
}

export function extractNamesFromText(text) {
  if (!text || !text.trim()) return [];

  var nameFreq = {};

  /* 正则直扫：2-4个汉字，首字在姓氏库内 */
  var re = /[\u4e00-\u9fff]{2,4}/g;
  var m;
  while ((m = re.exec(text)) !== null) {
    var candidate = m[0];
    if (candidate.length < 2 || candidate.length > 4) continue;
    if (!SURNAME_DICT[candidate.charAt(0)]) continue;
    if (NOISE_SET[candidate]) continue;
    if (!isAllChinese(candidate)) continue;
    if (hasNoiseSuffix(candidate)) continue;
    nameFreq[candidate] = (nameFreq[candidate] || 0) + 1;
  }

  var names = Object.keys(nameFreq);
  names.sort(function (a, b) { return nameFreq[b] - nameFreq[a]; });

  return names;
}

function isAllChinese(str) {
  for (var i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) < 0x4e00 || str.charCodeAt(i) > 0x9fff) return false;
  }
  return true;
}

function hasNoiseSuffix(str) {
  for (var i = 0; i < NOISE_SUFFIX.length; i++) {
    if (str.indexOf(NOISE_SUFFIX[i]) !== -1 && str.length > NOISE_SUFFIX[i].length) return true;
  }
  return false;
}
