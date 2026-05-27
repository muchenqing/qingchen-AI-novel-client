import { el } from '../../utils/helper.js';
import { getConfig } from '../../config/configManager.js';
import bus from '../../event/bus.js';

var currentTab = 'quickstart';

function buildQuickStartTab() {
  var steps = [
    {
      title: '1. 配置 AI 模型',
      items: [
        '打开「设置」面板（Ctrl+,）',
        '选择 AI 模型提供商（OpenAI / DeepSeek / 通义千问 等）',
        '填写 API 地址与密钥',
        '点击「测试连接」确认可用',
      ],
    },
    {
      title: '2. 创建稿件',
      items: [
        '点击侧边栏「新建稿件」按钮（Ctrl+N）',
        '输入稿件标题开始创作',
        '编辑器支持首行缩进、自动排版和标点修正',
      ],
    },
    {
      title: '3. AI 辅助写作',
      items: [
        '选中文本后使用 AI 续写 / 改写 / 润色',
        '通过侧边栏 AI 面板（Ctrl+Shift+A）与 AI 对话',
        '利用上下文记忆让 AI 了解全文脉络',
      ],
    },
    {
      title: '4. 导出作品',
      items: [
        '支持导出为 TXT / Markdown / EPUB / JSON',
        '可自动生成目录、自动清理空行',
        '使用 Ctrl+Shift+E 快速导出',
      ],
    },
  ];

  var list = el('div', { className: 'help-section-list' });
  for (var i = 0; i < steps.length; i++) {
    var step = steps[i];
    var items = el('ul', { className: 'help-items' });
    for (var j = 0; j < step.items.length; j++) {
      items.appendChild(el('li', null, step.items[j]));
    }
    list.appendChild(
      el('div', { className: 'help-section' },
        el('div', { className: 'help-section-title' }, step.title),
        items,
      ),
    );
  }

  return el('div', { id: 'tab-quickstart', className: 'settings-tab-content' }, list);
}

function buildFeaturesTab() {
  var features = [
    { name: 'AI 写作', desc: '接入多种大模型，支持续写、改写、润色、对话等智能创作辅助' },
    { name: '多格式导出', desc: '一键导出 TXT、Markdown、EPUB 电子书及 JSON 结构化文件' },
    { name: '专业编辑器', desc: '首行缩进、段落自动排版、中英文标点修正、分块自动保存' },
    { name: '版本控制', desc: '自动快照与手动存档，支持版本对比、分支管理和回滚操作' },
    { name: '局域网同步', desc: '局域网内多设备实时同步稿件，支持云端同步与加密传输' },
    { name: '插件系统', desc: '可扩展的插件架构，通过自定义插件增强应用功能' },
    { name: '快捷键', desc: '全局快捷键体系，覆盖保存、导出、AI 调用等高频操作' },
    { name: '主题切换', desc: '内置多种护眼主题，支持自定义主题配色方案' },
  ];

  var list = el('div', { className: 'help-feature-list' });
  for (var i = 0; i < features.length; i++) {
    list.appendChild(
      el('div', { className: 'help-feature-item' },
        el('div', { className: 'help-feature-name' }, features[i].name),
        el('div', { className: 'help-feature-desc' }, features[i].desc),
      ),
    );
  }

  return el('div', { id: 'tab-features', className: 'settings-tab-content' }, list);
}

function buildAboutTab() {
  var config = getConfig();
  var about = (config && config.about) || {};

  var rows = [
    { label: '应用名称', value: about.productName || '卿辰 Mercey' },
    { label: '当前版本', value: about.version || '2.0.0' },
    { label: '应用简介', value: about.description || '' },
    { label: '作者', value: about.author || 'Mercey' },
    { label: '开源协议', value: about.license || 'MIT' },
  ];

  var table = el('div', { className: 'help-about-table' });
  for (var i = 0; i < rows.length; i++) {
    table.appendChild(
      el('div', { className: 'help-about-row' },
        el('span', { className: 'help-about-label' }, rows[i].label),
        el('span', { className: 'help-about-value' }, rows[i].value),
      ),
    );
  }

  var link = null;
  if (about.homepage) {
    link = el('div', { className: 'help-about-link' },
      el('span', { className: 'help-about-label' }, '项目主页'),
      el('a', { href: about.homepage, target: '_blank', className: 'help-about-homepage' }, about.homepage),
    );
  }

  return el('div', { id: 'tab-about', className: 'settings-tab-content' }, table, link);
}

function switchTab(tabName) {
  currentTab = tabName;
  var tabs = document.querySelectorAll('#help-center-overlay .settings-tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle('active', tabs[i].dataset.tab === tabName);
  }
  var contents = document.querySelectorAll('#help-center-overlay .settings-tab-content');
  for (var j = 0; j < contents.length; j++) {
    contents[j].style.display = contents[j].id === 'tab-' + tabName ? 'block' : 'none';
  }
}

function openHelpCenter() {
  var overlay = document.getElementById('help-center-overlay');
  if (!overlay) return;
  switchTab('quickstart');
  overlay.classList.add('open');
}

function closeHelpCenter() {
  var overlay = document.getElementById('help-center-overlay');
  if (overlay) overlay.classList.remove('open');
}

export function buildHelpCenter() {
  var overlay = el('div', { className: 'modal-overlay', id: 'help-center-overlay' });

  var tabs = el('div', { className: 'settings-tabs' });
  var tabData = [
    { key: 'quickstart', label: '快速上手' },
    { key: 'features', label: '功能说明' },
    { key: 'about', label: '关于' },
  ];
  for (var i = 0; i < tabData.length; i++) {
    var tab = el('button', {
      className: 'settings-tab' + (i === 0 ? ' active' : ''),
      dataset: { tab: tabData[i].key },
    }, tabData[i].label);
    tab.addEventListener('click', function () { switchTab(this.dataset.tab); });
    tabs.appendChild(tab);
  }

  var tabContent = el('div', { className: 'settings-tab-body' },
    buildQuickStartTab(),
    buildFeaturesTab(),
    buildAboutTab(),
  );

  var btnClose = el('button', { className: 'modal-btn modal-btn-ghost' }, '关闭');
  btnClose.addEventListener('click', closeHelpCenter);

  var card = el('div', { className: 'modal-card modal-card-settings' },
    el('div', { className: 'modal-header' },
      el('h3', { className: 'modal-title' }, '帮助中心'),
    ),
    el('div', { className: 'modal-body' }, tabs, tabContent),
    el('div', { className: 'modal-footer' }, btnClose),
  );

  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeHelpCenter(); });
  card.addEventListener('click', function (e) { e.stopPropagation(); });
  overlay.appendChild(card);
  return overlay;
}

export function initHelpCenter() {
  bus.on('modal:open-help', openHelpCenter);
}
