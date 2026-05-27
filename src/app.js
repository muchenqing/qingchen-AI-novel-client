/**
 * 渲染进程总入口
 * @description 仅负责加载CSS样式和触发初始化流程，不包含任何业务逻辑
 */

import './styles/global.css';
import './styles/themes/mint.css';
import './styles/themes/paper.css';
import './styles/themes/fog.css';
import './styles/themes/taro.css';
import './styles/components/titlebar.css';
import './styles/components/sidebar.css';
import './styles/components/editor.css';
import './styles/components/aiPanel.css';
import './styles/components/modal.css';
import './styles/components/tips.css';
import './styles/components/configPanel.css';
import './styles/components/themeManager.css';
import './styles/components/shortcutSetting.css';
import './styles/components/pluginMarket.css';
import './styles/components/versionHistory.css';
import './styles/components/syncSetting.css';
import './styles/components/helpCenter.css';
import './styles/components/styleLearn.css';
import './styles/components/floatTool.css';
import './styles/components/promptTemplate.css';
import './styles/components/fontSetting.css';
import './styles/components/characterLib.css';
import './styles/components/materialLib.css';
import './styles/components/bookManage.css';
import './styles/components/dashboard.css';
import './styles/components/aiDramaTool.css';

import { init } from './core/init.js';

document.addEventListener('DOMContentLoaded', init);
