<div align="center">

# ✦ 卿辰 Mercey

**一款为小说创作者打造的本地独立写作客户端**

*纯本地运行 · 零依赖服务 · AI 创作辅助 · 四套治愈主题*

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

- 🖊️ **沉浸式写作** — 纯净编辑器，宋体排版，专注创作本身
- 🎨 **四套治愈主题** — 奶薄荷绿 / 暖调米杏纸 / 冷调雾蓝灰 / 淡奶芋紫，一键切换
- 🤖 **AI 创作助手** — 续写、大纲生成、润色，对接任意 OpenAI 兼容私有云 API
- 💾 **离线可用** — 所有文稿本地存储，断网不影响基础写作
- 🔒 **隐私优先** — 零服务端，数据不离开你的电脑
- 📐 **智能排版** — 自定义标题栏，窗口状态自动记忆
- ⌨️ **快捷键支持** — Ctrl+S 保存 / Ctrl+N 新建 / Ctrl+B 加粗 / Ctrl+I 斜体
- 📦 **开箱即用** — 提供 Windows 安装包 + 绿色免安装版

---

## 项目结构

```
qingchen-writer/
├── electron/                # Electron 主进程
│   ├── main.js              # 窗口管理 + IPC 监听 + 安全配置
│   └── preload.js           # contextBridge 安全暴露 API
├── src/                     # 渲染进程（前端界面）
│   ├── index.html           # 入口页面
│   ├── style.css            # 全局样式 + 四套主题变量
│   └── app.js               # 界面构建 + 窗口控制 + AI 请求
├── public/                  # 静态资源
│   └── favicon.svg          # 应用图标
├── build/icons/             # 打包图标
│   └── app.ico              # Windows 图标
├── package.json
├── vite.config.js
├── electron-builder.yml
└── .gitignore
```

---

## 前置依赖

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| [Node.js](https://nodejs.org/) | ≥ 18.0 | 推荐使用 LTS 版本 |
| [npm](https://www.npmjs.com/) | ≥ 9.0 | 随 Node.js 自带 |

> 💡 国内用户建议配置 npm 镜像加速：
> ```bash
> npm config set registry https://registry.npmmirror.com
> ```

---

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/muchenqing/qingchen-writer.git
cd qingchen-writer
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发服务器

```bash
npm run dev
```

启动后访问 http://localhost:5173 预览界面。

---

## 打包构建

### 构建前端资源

```bash
npm run build
```

产物输出到 `dist/` 目录。

### 打包 Windows 应用

```bash
npm run electron:build
```

该命令会依次执行：
1. `vite build` — 构建前端资源到 `dist/`
2. `electron-builder` — 打包为 Windows 可执行文件

产物输出到 `release/` 目录：

| 产物 | 说明 |
|------|------|
| `卿辰-1.0.0-setup.exe` | NSIS 安装包，双击安装，自动创建桌面图标 |
| `卿辰-1.0.0-portable.exe` | 绿色免安装版，双击即用 |
| `win-unpacked/` | 解压版，可直接运行 `卿辰.exe` |

---

## 编译配置说明

打包行为由 `electron-builder.yml` 控制：

```yaml
appId: com.qingchen.mercey        # 应用唯一标识
productName: 卿辰                  # 产品名称
copyright: Copyright © 2026 卿辰工作室

directories:
  output: release                  # 打包产物输出目录

files:                             # 打包包含的文件
  - dist/**/*                      #   前端构建产物
  - electron/**/*.js               #   Electron 主进程
  - package.json

win:
  icon: build/icons/app.ico        # Windows 图标（.ico 格式）
  executableName: 卿辰              # EXE 文件名

portable:                          # 绿色免安装版配置
  artifactName: 卿辰-${version}-portable.exe

nsis:                              # NSIS 安装包配置
  oneClick: false                  #   非一键安装（允许自定义路径）
  perMachine: false                #   仅当前用户安装
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true      #   创建桌面快捷方式
  createStartMenuShortcut: true    #   创建开始菜单
  shortcutName: 卿辰 Mercey
  artifactName: 卿辰-${version}-setup.exe
```

### 自定义图标

替换 `build/icons/app.ico` 为你的图标文件，然后重新打包即可。

> 推荐使用 [RealFaviconGenerator](https://realfavicongenerator.net/) 或 [IconWorkshop](https://www.axialis.com/iconworkshop/) 生成 `.ico` 文件。

---

## 技术架构

```
┌─────────────────────────────────────────────┐
│              Electron 主进程                  │
│  main.js: 窗口管理 / IPC / CSP / 菜单        │
└────────────┬────────────────────┬───────────┘
             │ contextBridge      │ IPC
┌────────────▼────────────────────▼───────────┐
│            预加载脚本 (preload.js)            │
│  安全暴露 window.electronAPI                 │
└────────────┬────────────────────────────────┘
             │
┌────────────▼────────────────────────────────┐
│            渲染进程 (src/)                    │
│  index.html + style.css + app.js             │
│  纯原生 JS，零框架依赖                        │
│  本地存储: localStorage                      │
│  AI 请求: fetch → OpenAI 兼容 API            │
└─────────────────────────────────────────────┘
```

---

## AI 私有云 API 配置

卿辰支持对接任意 OpenAI 兼容的 API 服务。在应用内点击 ⚙️ 设置按钮：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| API 地址 | 你的 API 服务地址 | `https://api.example.com` |
| API 密钥 | 访问令牌 | `sk-xxxxxxxx` |
| 模型名称 | 模型标识 | `gpt-4o` |

支持的功能：
- **续写** — 基于已有内容自动续写
- **大纲生成** — 分析内容生成结构化大纲
- **润色** — 提升文字表达和文学性

---

## 贡献指南

欢迎提交 Issue 和 Pull Request！

### 如何贡献

1. Fork 本仓库
2. 创建你的特性分支：`git checkout -b feature/amazing-feature`
3. 提交你的修改：`git commit -m 'feat: 添加某个功能'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

### 提交规范

请遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` — 新功能
- `fix:` — 修复 Bug
- `docs:` — 文档变更
- `style:` — 代码格式调整
- `refactor:` — 代码重构
- `perf:` — 性能优化
- `chore:` — 构建/工具变更

---

## 开源协议

本项目基于 [MIT License](LICENSE) 开源。

```
MIT License

Copyright (c) 2026 卿辰工作室

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<div align="center">

**用 ✦ 卿辰，写你的故事**

</div>
