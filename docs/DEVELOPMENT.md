# 卿辰 Mercey · 项目开发文档

> 本文档面向项目开发者与贡献者，涵盖环境搭建、架构说明、开发流程、打包构建、常见问题排查等完整指南。
> 最后更新：2026-05-27 · 版本：v2.0.0

---

## 目录

- [一、项目简介](#一项目简介)
- [二、技术栈](#二技术栈)
- [三、环境依赖](#三环境依赖)
- [四、本地开发流程](#四本地开发流程)
- [五、项目目录结构](#五项目目录结构)
- [六、主进程与渲染进程说明](#六主进程与渲染进程说明)
- [七、核心功能模块](#七核心功能模块)
- [八、界面布局说明](#八界面布局说明)
- [九、打包构建流程](#九打包构建流程)
- [十、常见问题排查](#十常见问题排查)
- [十一、基础使用说明](#十一基础使用说明)

---

## 一、项目简介

**卿辰 Mercey** 是一款为小说创作者打造的本地独立 AI 写作桌面客户端。基于 Electron + Vite 构建，使用纯原生 JavaScript 开发（零框架依赖），所有数据本地存储，支持自定义 AI API 接入。

### 核心特性

- **11 项 AI 创作功能**：续写、大纲生成、润色、人物设计、世界观构建、冲突生成、章节总结、文风模仿、对白润色、段落扩写/精简
- **AI 剧情工具箱**：语音朗读、语音转文字、剧情逻辑校验、伏笔检测、多结局生成
- **专业写作系统**：书籍章节管理、人物卡库、素材库、数据看板、字数统计
- **编辑器增强**：自动保存、悬浮工具栏、粘贴清洗、AI 撤销/恢复、Prompt 模板库
- **插件系统**：沙箱隔离、生命周期管理、10 种权限控制、12 种 Hook
- **版本管理**：版本快照、多分支管理、历史回溯、差异对比
- **多端同步**：局域网同步 + 私有云同步（XOR 加密）
- **6 家 AI 模型**：OpenAI、通义千问、文心一言、DeepSeek、本地 Llama、自定义 API

### 仓库信息

| 项目 | 信息 |
|------|------|
| 仓库地址 | https://github.com/muchenqing/qingchen-AI-novel-client |
| 开源协议 | MIT License |
| 作者 | 卿辰工作室 |

---

## 二、技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 桌面框架 | Electron | ^33.0.0 | 主进程 + 渲染进程双进程架构 |
| 构建工具 | Vite | ^6.4.2 | 渲染进程前端资源构建 |
| 打包工具 | electron-builder | ^25.0.0 | Windows NSIS 安装包 + Portable |
| 前端语言 | 原生 JavaScript | ES2020+ | 零框架依赖，不使用 React / Vue |
| 样式方案 | CSS 自定义属性 | — | 4 套主题变量，body class 切换 |
| 数据存储 | localStorage | — | 书稿、配置、插件、版本等全部本地存储 |
| AI 通信 | fetch API | — | 对接 OpenAI 兼容接口 |
| 语音能力 | Web Speech API | — | 浏览器原生 TTS / STT |

---

## 三、环境依赖

### 3.1 系统要求

| 项目 | 要求 |
|------|------|
| 操作系统 | Windows 10 (1809+) / Windows 11 |
| Node.js | v18.0.0 或更高版本 |
| npm | v9.0.0 或更高版本 |
| 处理器 | x64 或 ARM64 |
| 内存 | ≥ 4 GB |
| 磁盘空间 | ≥ 500 MB（含 node_modules） |

### 3.2 确认环境版本

```bash
node -v       # 应显示 v18.x 或更高
npm -v        # 应显示 v9.x 或更高
```

### 3.3 可选工具

| 工具 | 用途 |
|------|------|
| Git | 版本控制 |
| VS Code | 推荐代码编辑器 |
| Ollama | 本地运行 Llama 模型 |

---

## 四、本地开发流程

### 4.1 克隆仓库

```bash
git clone https://github.com/muchenqing/qingchen-AI-novel-client.git
cd qingchen-AI-novel-client
```

### 4.2 安装依赖

```bash
npm install
```

> **国内用户加速提示**：项目已内置 `.npmrc` 配置 Electron 国内镜像源（npmmirror），安装 Electron 时会自动使用镜像加速。如需额外配置 npm 镜像：
> ```bash
> npm config set registry https://registry.npmmirror.com
> ```

### 4.3 启动开发服务器

```bash
npm run dev
```

开发服务器启动在 `http://localhost:5173`（严格端口模式）。Electron 窗口会自动加载 Vite 开发服务器地址。

### 4.4 开发调试

- **渲染进程调试**：在 Electron 窗口中按 `F12` 或通过菜单 `视图 > 开发者工具` 打开 DevTools
- **主进程调试**：在终端查看 `[Main]` 和 `[Lifecycle]` 前缀的日志输出
- **热更新**：修改 `src/` 下的渲染进程代码后 Vite 自动热更新；修改 `electron/` 下的主进程代码需重启应用

### 4.5 停止开发

在终端按 `Ctrl+C` 停止 Vite 开发服务器。如有残留 Electron 进程：

```bash
npm run clean
```

---

## 五、项目目录结构

```
qingchen-novel/
│
├── electron/                              # Electron 主进程代码
│   ├── main.js                            # 极简入口（仅 require ./main/index.js）
│   ├── main/                              # 主进程核心模块
│   │   ├── index.js                       # 统一编排入口：whenReady 内初始化所有模块
│   │   ├── windowManager.js               # 窗口管理：BrowserWindow、状态记忆、多显示器
│   │   └── appLifecycle.js                # 生命周期：CSP、原生菜单、系统事件
│   ├── ipc/                               # IPC 通信层
│   │   ├── constants.js                   # 76 个 IPC 通道名称常量
│   │   ├── router.js                      # 路由注册中心：统一注册 11 个 Handler
│   │   └── handlers/                      # 业务处理器（按职责拆分）
│   │       ├── windowHandler.js           #   窗口控制：最小化/最大化/关闭/置顶
│   │       ├── fileHandler.js             #   文件操作：路径查询、保存/打开对话框
│   │       ├── settingHandler.js          #   系统信息：获取运行平台
│   │       ├── aiHandler.js               #   AI 连接测试、范文导入
│   │       ├── exportHandler.js           #   文件导出到本地磁盘
│   │       ├── configHandler.js           #   配置文件读写重置
│   │       ├── themeHandler.js            #   主题文件 CRUD
│   │       ├── shortcutHandler.js         #   快捷键配置读写
│   │       ├── pluginHandler.js           #   插件文件系统操作
│   │       ├── versionHandler.js          #   版本快照/备份/分支管理
│   │       └── syncHandler.js             #   同步状态/配置/局域网/云端
│   └── preload/                           # Preload 安全桥接层
│       ├── preload.js                     # Preload 入口
│       └── apiExpose.js                   # contextBridge 暴露 60+ API
│
├── src/                                   # 渲染进程代码（前端）
│   ├── index.html                         # 入口 HTML
│   ├── app.js                             # 渲染入口：加载 26 个 CSS + 触发 init()
│   ├── core/                              # 核心层
│   │   ├── init.js                        # 初始化编排器（47 步流程）
│   │   ├── appState.js                    # 全局状态管理（33 个状态变量）
│   │   ├── wordStats.js                   # 字数统计：日/周/历史、写作目标
│   │   ├── bookProject.js                 # 书籍工程：树形结构 CRUD、拖拽排序
│   │   └── export/                        # 导出引擎（TXT / MD / EPUB / JSON）
│   ├── api/                               # 网络请求层
│   │   ├── index.js                       # API 统一导出入口
│   │   └── ai/                            # AI 请求层（11 项功能 + 6 家模型）
│   │       ├── aiAdapter.js               #   多模型统一适配器
│   │       ├── aiConfig.js                #   AI 配置管理
│   │       ├── aiContext.js               #   AI 上下文记忆
│   │       ├── aiRequest.js               #   底层 HTTP 请求（重试逻辑）
│   │       ├── voice.js                   #   TTS 朗读 + 语音转文字
│   │       ├── dramaCheck.js              #   剧情逻辑校验
│   │       ├── foreshadow.js              #   伏笔检测
│   │       ├── endingGen.js               #   多结局生成
│   │       ├── styleLearn.js              #   文风学习
│   │       └── providers/                 #   6 家 AI 提供商适配
│   ├── components/                        # UI 组件层（22 个组件模块）
│   │   ├── common/                        #   通用基础组件（标题栏/侧边栏/编辑器/状态栏）
│   │   ├── aiPanel/                       #   AI 创作助手面板
│   │   ├── editor/                        #   编辑器增强（悬浮工具栏/格式化/写作助手）
│   │   ├── bookManage/                    #   书籍管理
│   │   ├── characterLib/                  #   人物卡库
│   │   ├── materialLib/                   #   素材库
│   │   ├── dashboard/                     #   数据看板
│   │   ├── versionHistory/                #   版本历史
│   │   ├── pluginMarket/                  #   插件市场
│   │   ├── configPanel/                   #   配置中心
│   │   ├── settingPanel/                  #   AI 设置面板
│   │   ├── setting/                       #   字体排版设置
│   │   ├── shortcutSetting/               #   快捷键管理
│   │   ├── themeControl/                  #   主题切换
│   │   ├── themeManager/                  #   主题管理器
│   │   ├── syncSetting/                   #   同步设置
│   │   ├── helpCenter/                    #   帮助中心
│   │   └── tips/                          #   提示组件（Toast/加载遮罩/错误边界）
│   ├── plugin/                            # 插件系统（沙箱/API/清单校验）
│   ├── document/                          # 版本控制 / 分支 / 备份
│   ├── sync/                              # 同步系统（局域网 + 私有云）
│   ├── store/                             # 人物卡 / 素材库存储
│   ├── config/                            # 配置管理（读写/迁移/Schema/导入导出）
│   ├── event/                             # 事件总线（发布-订阅）
│   ├── utils/                             # 工具函数层（15 个模块）
│   └── styles/                            # 样式体系
│       ├── global.css                     #   全局基础样式
│       ├── themes/                        #   4 套主题（mint / paper / fog / taro）
│       └── components/                    #   22 个组件级样式
│
├── build/icons/                           # 打包图标（app.ico）
├── public/app.ico                         # 公共静态图标
├── docs/                                  # 文档目录
│   └── DEVELOPMENT.md                     # 本文件
├── package.json                           # 项目配置与依赖
├── vite.config.js                         # Vite 构建配置
├── electron-builder.yml                   # electron-builder 打包配置
├── .npmrc                                 # npm 镜像配置（Electron 国内加速）
├── .gitignore                             # Git 忽略规则
├── LICENSE                                # MIT 开源协议
├── README.md                              # 项目说明文档
└── RELEASE_NOTE.md                        # 版本更新日志
```

---

## 六、主进程与渲染进程说明

### 6.1 架构概览

项目遵循 Electron 标准的**主进程 + 渲染进程**双进程隔离架构：

```
┌───────────────────────────────────────────────────────────────┐
│                    主进程 (Main Process)                         │
│                                                                │
│  electron/main.js  ←  极简入口，仅 require 子模块                │
│    └─ electron/main/index.js  ←  统一编排入口                    │
│         ├─ appLifecycle.js   ←  生命周期 / 菜单 / CSP            │
│         ├─ windowManager.js  ←  窗口创建 / 状态记忆              │
│         └─ ipc/router.js     ←  IPC 路由注册中心                 │
│              └─ 11 个 Handler  ←  76 个 IPC 通道                 │
│                                                                │
├──────────────────── contextBridge ─────────────────────────────┤
│  electron/preload/preload.js  ←  Preload 入口                   │
│    └─ apiExpose.js  ←  安全暴露 60+ API                         │
│         暴露: window.electronAPI                                │
│                                                                │
├───────────────────────────────────────────────────────────────┤
│                  渲染进程 (Renderer Process)                     │
│  src/app.js → src/core/init.js → 47 步初始化流程                │
│  22 个组件模块 · AI 适配层 · 事件总线 · 工具函数层               │
└───────────────────────────────────────────────────────────────┘
```

### 6.2 主进程模块

#### `electron/main.js` — 极简入口

electron-builder 的入口点，仅一行代码加载子模块：

```javascript
require('./main/index.js');
```

#### `electron/main/index.js` — 统一编排

所有初始化在 `app.whenReady()` 回调内执行，确保 Electron API 可用：

1. 开发模式下抑制 Electron 安全警告
2. 设置系统主题为 `light`
3. 初始化生命周期（CSP + 菜单 + 系统事件）
4. 注册 IPC 路由（11 个 Handler）
5. 创建主窗口

#### `electron/main/windowManager.js` — 窗口管理

| 职责 | 说明 |
|------|------|
| 创建窗口 | 1440×920 默认尺寸，最小 1024×700，无边框窗口 |
| 状态记忆 | 窗口位置/大小/最大化状态持久化到 `userData/window-state.json` |
| 多显示器适配 | 恢复时验证窗口是否在可见显示器范围内 |
| 启动优化 | `show: false` + `ready-to-show` 避免白屏闪烁 |
| 外部链接 | 拦截新窗口请求，改用系统浏览器打开 |

#### `electron/main/appLifecycle.js` — 生命周期管理

| 职责 | 说明 |
|------|------|
| CSP 安全策略 | 开发/生产环境区分 CSP，通过 `onHeadersReceived` 注入 |
| 原生菜单 | 文件/编辑/视图/AI 助手/帮助 五组菜单 |
| 系统事件 | `activate`（macOS）、`window-all-closed`（非 macOS 退出） |

### 6.3 渲染进程核心模块

#### `src/app.js` — 渲染入口

导入 26 个 CSS 文件（全局 + 4 主题 + 22 组件样式），在 `DOMContentLoaded` 时调用 `init()`。

#### `src/core/init.js` — 初始化编排器

按固定顺序执行 47 步初始化，包括：构建 UI → 初始化主题 → 绑定各面板事件 → 加载数据 → 启动自动保存/版本快照/插件系统/同步 → 设置快捷键/极简模式/网络检测。

#### `src/core/appState.js` — 全局状态管理

集中管理 33 个应用运行状态（书稿管理、AI 状态、主题/配置、UI 状态、版本控制、插件、同步、语音等），通过 getter/setter 控制访问。

#### `src/event/bus.js` — 事件总线

轻量级发布-订阅模式，每个监听器调用包裹 `try-catch` 异常隔离。命名规范：`领域:动作` 格式。

### 6.4 安全隔离模型

| 安全层 | 配置 | 作用 |
|--------|------|------|
| `contextIsolation: true` | BrowserWindow | 渲染进程与 Node.js 完全隔离 |
| `nodeIntegration: false` | BrowserWindow | 渲染进程不能直接访问 Node.js API |
| `sandbox: false` | BrowserWindow | 允许 preload 脚本使用 require() |
| `webviewTag: false` | BrowserWindow | 禁用 webview 标签 |
| `contextBridge` | Preload | 仅暴露 60+ 必要 API 到 `window.electronAPI` |
| `CSP` | Session | 生产环境严格限制资源加载策略 |
| `requestedExecutionLevel: asInvoker` | 打包配置 | 不请求管理员权限 |
| 插件沙箱 | utils/sandbox.js | 禁止 eval/require/window 等危险 API |

### 6.5 IPC 通信模型

| 模式 | 方法 | 方向 | 用途 |
|------|------|------|------|
| 单向消息 | `ipcRenderer.send` → `ipcMain.on` | 渲染 → 主 | 窗口控制等无需返回值的操作 |
| 请求-响应 | `ipcRenderer.invoke` → `ipcMain.handle` | 双向 | 需要返回值的操作（查询、对话框等） |

**通信编码规范**：

- 禁止硬编码 IPC 通道名称（必须使用 `IPC_EVENTS` 常量）
- 渲染进程禁止直接使用 `ipcRenderer`
- 所有 Handler 必须包裹 `try-catch`
- 事件监听类方法返回清理函数，防止内存泄漏

---

## 七、核心功能模块

### 7.1 AI 功能模块

#### 统一适配器 (`src/api/ai/aiAdapter.js`)

所有 AI 功能通过统一适配器调用，自动识别当前配置的提供商，自动拼接端点和鉴权头。

#### 11 项 AI 功能

| 功能 | 说明 |
|------|------|
| 续写 | 基于上下文智能续写 |
| 大纲生成 | 分析内容生成结构化大纲 |
| 润色 | 提升文字表达质量 |
| 人物设计 | 自动生成人物设定卡片 |
| 世界观构建 | 构建完整世界观设定 |
| 冲突生成 | 自动生成情节冲突 |
| 章节总结 | 快速总结章节内容 |
| 文风模仿 | 基于范文模仿写作风格 |
| 对白润色 | 优化对话表达 |
| 段落扩写 / 精简 | 灵活调整段落长度 |
| 多结局生成 | 5 种风格结局（悲情/爽文/反转/开放式/悬疑） |

#### AI 剧情工具箱

| 功能 | 说明 |
|------|------|
| 语音朗读 | TTS 朗读 + 暂停/继续/停止 |
| 语音转文字 | Web Speech API 实时口述转文本 |
| 剧情校验 | 检测时间线冲突、人设崩塌、逻辑 BUG |
| 伏笔检测 | 扫描伏笔、未回收线索、密度评估 |

#### 6 家 AI 提供商

| 提供商 | 适配文件 | 说明 |
|--------|---------|------|
| OpenAI | `providers/openai.js` | 支持 GPT-4o / GPT-4 |
| 通义千问 | `providers/qwen.js` | 阿里云 DashScope API |
| 文心一言 | `providers/ernie.js` | 百度 API |
| DeepSeek | `providers/deepseek.js` | DeepSeek API |
| 本地 Llama | `providers/llama.js` | Ollama 本地模型 |
| 自定义 | `providers/custom.js` | 任意 OpenAI 兼容 API |

### 7.2 插件系统

| 模块 | 职责 |
|------|------|
| `pluginManager.js` | 生命周期管理：install / uninstall / enable / disable / reload |
| `pluginApi.js` | API 桥接：10 种权限白名单控制访问 |
| `pluginManifest.js` | 清单校验：必填字段、版本格式、12 种 Hook 验证 |
| `sandbox.js` | 沙箱安全：禁止 eval/require/window 等危险 API |

**10 种权限类型**：`manuscript:read` / `manuscript:write` / `editor:read` / `editor:write` / `ai:invoke` / `ui:toast` / `ui:dialog` / `ui:panel` / `config:read` / `event:emit`

**12 种生命周期 Hook**：`onLoad` / `onEnable` / `onDisable` / `onUnload` / `onManuscriptOpen` / `onManuscriptSave` / `onEditorReady` / `onAiResponse` / `onThemeChange` / `onShortcut` / `onExport` / `onPluginInstalled`

### 7.3 版本管理 / 分支 / 备份

| 模块 | 职责 |
|------|------|
| `versionControl.js` | 版本快照 CRUD、差异对比、自动清理（30 天） |
| `branch.js` | 分支 CRUD / 切换 / 合并，main 分支保护 |
| `backup.js` | 归档备份，最多 20 个，30 天自动清理 |

### 7.4 同步系统

| 模块 | 职责 |
|------|------|
| `syncCore.js` | 同步核心：差异计算、4 种合并策略（最新/本地/远程/保留双方） |
| `cloudAdapter.js` | 私有云：上传/下载 + XOR 加密 |
| `localLan.js` | 局域网：BroadcastChannel 设备发现 + WebSocket 实时同步 |

### 7.5 数据存储层

| 模块 | 职责 |
|------|------|
| `characterStore.js` | 人物卡 CRUD / 搜索 / 分组 / 收藏，最多 200 个，内存缓存 |
| `materialStore.js` | 素材 CRUD / 6 分类 / 收藏，最多 500 条，内存缓存 |
| `bookProject.js` | 书籍工程树形 CRUD / 拖拽排序 / 书签，内存缓存 |

### 7.6 导出引擎

支持 4 种格式导出：TXT / Markdown / EPUB / JSON，通过 `exportEngine.js` 统一路由到格式导出器。

### 7.7 工具函数层

| 模块 | 核心导出 |
|------|---------|
| `helper.js` | `generateId()` / `el(tag, attrs, ...children)` |
| `storage.js` | `loadManuscripts()` / `saveManuscripts()` / `STORAGE_KEYS` |
| `format.js` | `countWords(text)` / `formatDate(ts)` |
| `formatClean.js` | 粘贴格式清洗（HTML 剥离、广告过滤、空白规范化） |
| `autoSave.js` | 定时保存 + 失焦保存 + 关闭提醒 + 监听器泄漏防护 |
| `shortcutUtil.js` | 快捷键解析/匹配/冲突检测，11 个可配置动作 |
| `sandbox.js` | 插件代码校验、危险模式检测 |
| `validator.js` | AI 配置校验、书稿数据校验 |

---

## 八、界面布局说明

应用采用经典桌面编辑器布局，支持自定义标题栏和极简写作模式：

```
┌──────────────────────────────────────────────────────────┐
│ [自定义标题栏]              卿辰 Mercey        [_ □ ✕]  │
├──────────┬───────────────────────────────────────────────┤
│          │  [工具栏]                                      │
│  侧边栏   │                                               │
│          │  ┌─────────────────────────────────────────┐  │
│ 📚 书稿   │  │                                         │  │
│ 📖 管理   │  │          编辑器区域                       │  │
│ 👤 人物卡  │  │     （contenteditable）                 │  │
│ 📦 素材库  │  │                                         │  │
│ 📊 看板   │  │    选中文本 → 悬浮工具栏弹出              │  │
│ 🔍 AI     │  │    （润色/扩写/精简/改写）               │  │
│ 🔌 插件   │  │                                         │  │
│ 🔄 版本   │  └─────────────────────────────────────────┘  │
│ ☁️ 同步   │                                               │
│ ⚙️ 设置   │  [状态栏] 就绪 | 字数 | 连接状态 | 主题       │
├──────────┴───────────────────────────────────────────────┤
└──────────────────────────────────────────────────────────┘
```

### 布局说明

| 区域 | 说明 |
|------|------|
| **标题栏** | 自定义无边框标题栏，支持拖拽、最小化/最大化/关闭、窗口置顶 |
| **侧边栏** | 可折叠导航面板，包含书稿管理、AI 助手、插件市场等功能入口 |
| **工具栏** | 格式化工具和 AI 快捷操作按钮 |
| **编辑器区域** | 核心写作区域，支持富文本编辑、选中文本悬浮工具栏 |
| **状态栏** | 显示应用状态、字数统计、网络连接、当前主题 |
| **弹窗面板** | AI 面板、设置面板、人物卡、素材库等以弹窗/抽屉形式打开 |

### 极简写作模式

按 `ESC` 进入极简模式，隐藏侧边栏和标题栏，仅保留编辑器区域和悬浮退出按钮，专注沉浸式写作。

### 主题系统

4 套治愈系主题通过 CSS 自定义属性实现全局切换：

| 主题 | 类名 | 风格 |
|------|------|------|
| 奶薄荷绿 | `theme-mint` | 默认主题，清新自然 |
| 暖调米杏纸 | `theme-paper` | 温暖纸质质感 |
| 冷调雾蓝灰 | `theme-fog` | 冷静专注风格 |
| 淡奶芋紫 | `theme-taro` | 柔和紫色调 |

---

## 九、打包构建流程

### 9.1 前置准备

确保已安装依赖：

```bash
npm install
```

### 9.2 打包前清理

```bash
npm run clean
```

该命令会：
- 终止残留的 `electron.exe` 和 `builder.exe` 进程
- 删除 `release/` 目录下的旧构建产物

> **注意**：`clean` 脚本仅终止 `electron.exe` 和 `builder.exe`，不会误杀 `node.exe`（避免终止 npm 自身进程）。

### 9.3 完整打包（推荐）

```bash
npm run electron:build:win
```

该命令依次执行：
1. `vite build` — 构建前端资源到 `dist/`
2. `electron-builder --win` — 打包 Windows x64 + arm64 双架构
3. 内置国内 Electron 镜像加速

### 9.4 其他打包命令

| 命令 | 说明 |
|------|------|
| `npm run electron:build` | 标准打包（无镜像加速，适用于海外 CI） |
| `npm run electron:build:nsis` | 仅生成 NSIS 安装包 |
| `npm run electron:build:portable` | 仅生成绿色便携版 |
| `npm run electron:build:arm64` | 仅打包 ARM64 架构 |
| `npm run electron:publish` | 打包并发布到 GitHub Release |
| `npm run build` | 仅构建前端资源（不打包） |

### 9.5 打包产物

| 产物 | 架构 | 说明 |
|------|------|------|
| `卿辰Mercey-x.x.x-setup-x64.exe` | x64 | NSIS 安装包（推荐） |
| `卿辰Mercey-x.x.x-setup-arm64.exe` | ARM64 | NSIS 安装包（Windows on ARM） |
| `卿辰Mercey-x.x.x-portable-x64.exe` | x64 | 绿色便携版（免安装） |

产物输出目录：`release/`

### 9.6 electron-builder 配置说明

配置文件位于项目根目录 `electron-builder.yml`，主要配置项：

| 配置项 | 说明 |
|--------|------|
| `asar: true` | 启用 ASAR 归档，提升启动速度和文件安全性 |
| `compression: normal` | 平衡打包速度与压缩率 |
| `removePackageScripts: true` | 移除 node_modules 内 npm 安装脚本 |
| `files` | 43 条文件过滤规则，剔除源码、调试文件、CI 配置等冗余内容 |
| `asarUnpack` | 仅解压 `.node` 原生模块和图标目录 |
| `nsis.unicode: true` | 确保中文路径兼容 |
| `signtoolOptions` | 代码签名配置（publisherName / signingHashAlgorithms / 时间戳服务） |

### 9.7 Windows 端打包执行完整流程

```bash
# 步骤 1：确认环境
node -v && npm -v

# 步骤 2：安装依赖
npm install

# 步骤 3：清理旧产物
npm run clean

# 步骤 4：执行完整打包（x64 + arm64，国内镜像加速）
npm run electron:build:win

# 步骤 5：检查产物
dir release\
```

---

## 十、常见问题排查

### 10.1 打包后启动崩溃：`ReferenceError: app is not defined`

**原因**：主进程拆分后，模块顶层代码在 `app.whenReady()` 之前调用了 `app` 方法。

**解决**：确保所有 `app.isPackaged`、`app.getPath()` 等调用都在 `app.whenReady()` 回调内执行。

### 10.2 打包 `Access is denied` 权限报错

**原因**：`asarUnpack` 中包含 `**/*.dll` 规则，导致系统 DLL（如 `d3dcompiler_47.dll`）被复制到解压目录时被杀毒软件或系统锁定。

**解决**：`asarUnpack` 中不得包含 `**/*.dll`。当前配置已移除此规则，仅保留 `**/*.node` 和 `build/icons/**`。

### 10.3 打包配置校验失败/弃用警告

**原因**：electron-builder 25.x 移除了多个顶层配置属性，包括 `publisherName`、`signingHashAlgorithms`、`logLevel`、`description`、`installationDir`、`createAppWrapper`、`legalCopyright`。

**解决**：将 `publisherName` 和 `signingHashAlgorithms` 迁移至 `signtoolOptions` 节点。不得在配置中使用上述已废弃属性。

### 10.4 打包后标题栏按钮无响应

**原因**：Electron 20+ 默认启用 `sandbox: true`，导致 preload 脚本中的 `require()` 受限，`contextBridge` 暴露的 API 无法正常工作。

**解决**：在 `BrowserWindow` 的 `webPreferences` 中显式设置 `sandbox: false`。

### 10.5 `clean` 脚本导致 npm 崩溃

**原因**：`taskkill /f /im node.exe` 会杀死包括 npm 在内的所有 Node.js 进程。

**解决**：当前 `clean` 脚本仅终止 `electron.exe` 和 `builder.exe`：

```bash
taskkill /f /im electron.exe 2>nul & taskkill /f /im builder.exe 2>nul & if exist release rmdir /s /q release & exit /b 0
```

### 10.6 打包后自动保存/快捷键/主题切换不生效

**原因**：`ipcRenderer` 相关 API 在渲染进程中不可直接使用，需通过 `window.electronAPI` 调用。

**解决**：确保渲染进程代码中所有主进程交互都通过 `window.electronAPI` 完成，不直接引用 `ipcRenderer`。

### 10.7 周统计字数永远返回 0

**原因**：日期格式匹配逻辑错误，导致按周统计字数始终为空。

**解决**：检查 `wordStats.js` 中日期格式化与匹配逻辑是否一致（`formatDate` 输出格式需与周统计解析格式匹配）。

### 10.8 自动保存监听器泄漏

**原因**：`blur` / `beforeunload` 事件监听器在组件销毁时未移除，导致重复绑定。

**解决**：`autoSave.js` 中的事件监听器返回清理函数，在销毁时必须调用清理。

### 10.9 输入框背景透明（`--bg-primary` CSS 变量缺失）

**原因**：4 套主题文件均未定义 `--bg-primary` 变量。

**解决**：确保每个主题 CSS 文件（`mint.css` / `paper.css` / `fog.css` / `taro.css`）都定义完整的 CSS 变量集合，包括 `--bg-primary`。

### 10.10 Vite 开发服务器端口被占用

**解决**：`vite.config.js` 配置了 `strictPort: true`（严格端口模式）。如果 5173 端口被占用，需先终止占用进程：

```bash
netstat -ano | findstr :5173
taskkill /f /pid <PID>
```

### 10.11 Electron 下载超时

**解决**：项目 `.npmrc` 已内置 npmmirror 镜像加速。如果仍超时，手动设置环境变量：

```bash
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-binaries/
npm install
```

---

## 十一、基础使用说明

### 11.1 首次启动

1. 启动应用后，会自动创建一份默认书稿
2. 点击左侧 **设置** 面板，配置 AI API Key
3. 选择合适的 AI 提供商（推荐 DeepSeek 或通义千问）
4. 点击 **连接测试** 确认 API 配置正确

### 11.2 AI 配置

| 提供商 | 配置项 | 说明 |
|--------|--------|------|
| OpenAI | API Key | 支持 GPT-4o / GPT-4 |
| 通义千问 | API Key | 阿里云 DashScope API |
| 文心一言 | API Key | 百度 API |
| DeepSeek | API Key | DeepSeek API |
| 本地 Llama | 地址 | 默认 `http://localhost:11434` |
| 自定义 | 地址 + Key | 任意 OpenAI 兼容 API |

### 11.3 日常写作

1. 在侧边栏点击 **书稿管理**，创建/切换书稿
2. 在编辑器中直接写作，支持富文本格式化
3. 选中文本后弹出**悬浮工具栏**，可一键调用 AI 润色/扩写/精简/改写
4. 按 `Ctrl+Shift+A` 打开 **AI 助手**面板，使用 11 项 AI 功能
5. 内容自动保存（默认 5 秒间隔）

### 11.4 书籍管理

1. 点击侧边栏 **书籍管理** 面板
2. 创建书籍 → 添加卷 → 添加章节
3. 支持拖拽排序和书签标记
4. 按书籍切换工作区，章节内容独立编辑

### 11.5 AI 剧情工具箱

1. 点击 AI 助手面板中的 **剧情工具箱** 标签
2. **剧情校验**：粘贴全文，AI 自动检测逻辑 BUG
3. **伏笔检测**：扫描伏笔、统计未回收线索
4. **多结局生成**：选择风格，一键生成 5 种结局

### 11.6 数据导出

1. 点击菜单 **文件 > 导出**（或使用导出快捷键）
2. 选择导出格式：TXT / Markdown / EPUB / JSON
3. 选择保存路径

### 11.7 版本管理

1. 点击侧边栏 **版本历史** 面板
2. 手动创建版本快照，或等待自动快照（默认 5 分钟）
3. 支持版本恢复、差异对比、标记命名
4. 支持创建分支尝试不同故事走向

### 11.8 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+N` | 新建书稿 |
| `Ctrl+S` | 保存 |
| `Ctrl+Shift+A` | 打开 AI 助手 |
| `ESC` | 进入/退出极简写作模式 |
| `F12` | 打开开发者工具 |
| `Ctrl+R` | 重新加载 |

更多快捷键可在 **设置 > 快捷键管理** 中自定义配置。

---

## 附录：项目技术指标

| 指标 | 数值 |
|------|------|
| 源文件总数 | 82 JS + 23 CSS + 1 HTML |
| 主进程模块 | 18 个 JS 文件 |
| 渲染进程组件 | 22 个组件模块 |
| IPC 通道 | 76 个常量 |
| AI 功能 | 11 项（3 经典 + 8 新增） |
| AI 模型支持 | 6 家提供商 |
| 插件权限 | 10 种 |
| 插件 Hook | 12 种 |
| 导出格式 | 4 种（TXT / MD / EPUB / JSON） |
| 内置主题 | 4 套 |
| 可配置快捷键 | 11 个动作 |
| localStorage 键 | ~15 个 |
| 运行时依赖 | 零（纯原生 JS） |
| 前端构建产物 | 318 KB（gzip: 82 KB） |
| 打包产物 | ~78-162 MB（含 Electron 运行时） |
