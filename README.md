<div align="center">

# ✦ 卿辰 Mercey

**一款为小说创作者打造的本地独立 AI 写作客户端**

*纯本地运行 · 零依赖服务 · AI 创作辅助 · 四套治愈主题 · 22+ 功能模块*

[![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%2F11-blue)]()

</div>

---

## 截图预览

> 📷 *截图待补充 — 将截图文件放入 `docs/screenshots/` 目录后更新下方路径*

<!-- 
<div align="center">
  <img src="docs/screenshots/preview.png" width="80%" alt="卿辰 Mercey 界面预览" />
</div>
-->

---

## 功能亮点

### 🤖 AI 创作助手（11 项功能）
- **续写** — 基于上下文智能续写
- **大纲生成** — 分析内容生成结构化大纲
- **润色** — 提升文字表达质量
- **人物设计** — 自动生成人物设定卡片
- **世界观构建** — 构建完整世界观设定
- **冲突生成** — 自动生成情节冲突
- **章节总结** — 快速总结章节内容
- **文风模仿** — 基于范文学习写作风格
- **对白润色** — 优化对话表达
- **段落扩写 / 精简** — 灵活调整段落长度
- **多结局生成** — 5 种风格结局（悲情/爽文/反转/开放式/悬疑）

### 🎙 AI 剧情工具箱
- **语音朗读** — TTS 朗读 + 暂停/继续/停止
- **语音转文字** — 实时口述转文本
- **剧情校验** — 检测时间线冲突、人设崩塌、逻辑 BUG
- **伏笔检测** — 扫描伏笔、未回收线索、密度评估

### 📚 专业写作系统
- **书籍管理** — 树形结构（书 > 卷 > 章），拖拽排序，书签标记
- **人物卡库** — 完整人物档案，搜索/分组/收藏，上限 200 个
- **素材库** — 6 大分类（金句/桥段/伏笔/环境/对话/其他），上限 500 条
- **数据看板** — 写作趋势、字数统计、目标进度可视化

### 📝 编辑器增强
- **自动保存** — 定时保存 + 失焦保存 + 关闭提醒
- **悬浮工具栏** — 选中文本弹出润色/扩写/精简/改写按钮
- **粘贴清洗** — 自动剥离 HTML 标签、广告文本
- **AI 撤销/恢复** — AI 生成结果可回退与重做
- **Prompt 模板库** — 5 套内置 + 自定义模板

### 🪟 窗口 & 体验
- **四套治愈主题** — 奶薄荷绿 / 暖调米杏纸 / 冷调雾蓝灰 / 淡奶芋紫
- **极简写作模式** — ESC 退出，悬浮退出按钮，状态自动持久化
- **窗口置顶** — 一键固定窗口在最上层
- **字体排版** — 9 种字体、行距/字号滑块、排版预设
- **自定义快捷键** — 11 个可配置动作

### 🔌 系统能力
- **插件系统** — 沙箱隔离、生命周期管理、10 种权限控制
- **版本管理** — 版本快照、历史回溯、差异对比、多分支管理
- **多端同步** — 局域网同步 + 私有云同步（XOR 加密）
- **多格式导出** — TXT / Markdown / EPUB / JSON
- **6 家 AI 模型** — OpenAI / 通义千问 / 文心一言 / DeepSeek / 本地 Llama / 自定义

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 桌面框架 | Electron | ^33.0.0 |
| 构建工具 | Vite | ^6.4.2 |
| 打包工具 | electron-builder | ^25.0.0 |
| 前端语言 | 原生 JavaScript | ES2020+ |
| 运行时依赖 | **零** | 纯原生 JS，不使用任何框架 |

---

## 项目结构

```
qingchen-novel/
├── electron/                        # Electron 主进程
│   ├── main.js                      # 极简入口
│   ├── main/
│   │   ├── index.js                 # 统一编排入口
│   │   ├── windowManager.js         # 窗口管理
│   │   └── appLifecycle.js          # 生命周期 / 菜单 / CSP
│   ├── ipc/
│   │   ├── constants.js             # 76 个 IPC 通道常量
│   │   ├── router.js                # 路由注册中心
│   │   └── handlers/                # 11 个业务 Handler
│   └── preload/
│       ├── preload.js               # Preload 入口
│       └── apiExpose.js             # 安全暴露 60+ API
│
├── src/                             # 渲染进程
│   ├── app.js                       # 渲染入口
│   ├── core/                        # 核心层（状态/初始化/统计/导出）
│   ├── api/ai/                      # AI 请求层（11 项功能 + 6 家模型）
│   ├── components/                  # UI 组件层（22 个组件模块）
│   ├── plugin/                      # 插件系统
│   ├── document/                    # 版本控制 / 分支 / 备份
│   ├── sync/                        # 同步系统
│   ├── store/                       # 人物卡 / 素材库存储
│   ├── utils/                       # 工具函数（15 个模块）
│   ├── event/                       # 事件总线
│   ├── config/                      # 配置管理
│   └── styles/                      # 样式体系（全局 + 4 主题 + 22 组件）
│
├── build/icons/                     # 打包图标
├── package.json
├── vite.config.js
├── electron-builder.yml
├── .npmrc                           # Electron 国内镜像加速
├── RELEASE_NOTE.md                  # 版本更新日志
├── README.md                        # 本文件
├── LICENSE                          # MIT
└── docs/
    └── DEVELOPMENT.md               # 开发文档
```

---

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/muchenqing/qingchen-AI-novel-client.git
cd qingchen-AI-novel-client
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发

```bash
npm run dev
```

### 4. 构建打包

```bash
# 前端构建
npm run build

# 完整打包（x64 + arm64，国内镜像加速）
npm run electron:build:win

# 仅绿色便携版
npm run electron:build:portable
```

---

## AI 配置指南

首次使用请在设置面板配置 AI API：

| 提供商 | 环境变量 | 说明 |
|--------|---------|------|
| OpenAI | `OPENAI_API_KEY` | 支持 GPT-4o / GPT-4 |
| 通义千问 | `DASHSCOPE_API_KEY` | 阿里云 API |
| 文心一言 | `WENXIN_API_KEY` | 百度 API |
| DeepSeek | `DEEPSEEK_API_KEY` | DeepSeek API |
| 本地 Llama | — | Ollama 本地模型 |
| 自定义 | — | 任意 OpenAI 兼容 API |

---

## 打包产物

| 文件 | 说明 |
|------|------|
| `卿辰Mercey-2.0.0-setup.exe` | NSIS 安装包（x64 + arm64 双架构） |
| `卿辰Mercey-2.0.0-setup-x64.exe` | NSIS 安装包（仅 x64） |
| `卿辰Mercey-2.0.0-setup-arm64.exe` | NSIS 安装包（仅 ARM64） |
| `卿辰Mercey-2.0.0-portable-x64.exe` | 绿色便携版 |

---

## 开发文档

详细开发文档请查阅：[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

涵盖：架构说明、目录结构、模块职责、IPC 通信规则、事件总线规范、样式体系、数据存储、扩展开发指南、编码规范、安全规范。

---

## 贡献指南

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交修改：`git commit -m 'feat: add some feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 提交 Pull Request

---

## 开源协议

MIT License © 2026 卿辰工作室

---

> **自主开发，用心打磨。如果你觉得这个工具有帮助，欢迎给个 Star 支持一下！** ⭐
