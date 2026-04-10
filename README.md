README.md

Cookie - 多模态智能分析与对话平台

项目简介

Cookie 是一个基于 Google Gemini 3 Flash 模型构建的高性能多模态分析平台。它采用双 Agent 架构，提供深度文件解析、视频链接分析以及通用的知识问答服务。

详细项目结构

/
├── components/             UI 组件库
│   └── ui/                 基础 UI 组件
├── lib/                    公共工具库
├── src/                    源代码目录
│   ├── components/         业务组件
│   │   ├── agents/         核心 Agent 模块
│   │   │   ├── AnalysisAgent.tsx  千析模块实现
│   │   │   └── QAAgent.tsx        百闻模块实现
│   │   └── SettingsPanel.tsx      系统设置面板
│   ├── lib/                前端工具类
│   │   ├── i18n.ts         国际化配置
│   │   └── utils.ts        通用工具函数
│   ├── services/           后端服务对接
│   │   ├── geminiService.ts       Gemini API 对接
│   │   └── storageService.ts      IndexedDB 存储逻辑
│   ├── App.tsx             应用主入口
│   ├── index.css           全局样式与 Tailwind 配置
│   ├── main.tsx            React 渲染入口
│   └── types.ts            TypeScript 类型定义
├── index.html              HTML 模板
├── metadata.json           应用元数据配置
├── package.json            项目依赖与脚本
├── postcss.config.js       PostCSS 插件配置
├── tsconfig.json           TypeScript 编译配置
└── vite.config.ts          Vite 构建与兼容性配置

核心功能

1. 千析 (Analysis Agent)
- 支持多种格式：PDF、Word、MP4、MOV 等。
- 深度解析：自动提取核心要点，重构逻辑结构。
- 链接分析：支持在线视频链接的深度内容提取。
- 报告导出：支持将分析结果一键导出为 Word 文档。
- 历史记录：自动保存分析历史，支持随时回溯。

2. 百闻 (QA Agent)
- 智能对话：基于 Gemini 3 Flash 的全场景对话。
- 实时热点：自动获取并推荐当前热门话题。
- 知识交互：支持复杂问题的逻辑推理与创意写作。

技术栈

- 前端框架：React 19
- 构建工具：Vite 6
- 样式处理：Tailwind CSS 3.4
- 动画库：Motion
- 图标库：Lucide React
- AI 模型：Google Gemini 3 Flash
- 数据持久化：IndexedDB

快速开始

1. 环境要求
- Node.js 18 或更高版本
- npm 或 yarn 包管理器

2. 安装依赖
npm install

3. 配置环境
在项目根目录创建 .env 文件并添加您的 Gemini API 密钥：
GEMINI_API_KEY=您的密钥

4. 启动开发服务器
npm run dev

使用指南

1. 进入应用后，左侧导航栏可切换“百闻”与“千析”模块。
2. 在“百闻”模块，您可以直接输入问题或点击下方的热门话题进行对话。
3. 在“千析”模块，您可以拖拽本地文件或粘贴视频链接，点击“开始千析”生成报告。
4. 生成报告后，点击“导出 Word”即可下载本地文档。

在线打包优化说明

为了确保在 demo2apk.lasuo.ai 等在线打包平台顺利构建，项目已进行了以下优化：
- 降级至 Tailwind CSS 3.4 以获得最佳兼容性。
- 移除了所有冗余的 Capacitor 和 Cordova 插件。
- 简化了 Vite 配置，仅保留核心构建逻辑。
- 移除了 android 和 ios 目录，由打包平台自动生成。

许可证

Apache-2.0 License
