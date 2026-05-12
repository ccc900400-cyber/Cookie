# Cookie AI 深度技术文档 (巨详细版)

## 1. 项目总结与定位
**Cookie AI** 是一款基于全栈架构开发的 AI 原生应用。它不仅仅是一个对话框，而是一个多 Agent 协作平台，旨在通过 Google 最前沿的 **Gemini 3 Flash** 模型，为用户提供实时、深度、多模态的处理能力。
项目核心解决三大高频需求：
- **实时知识对话**（百闻）：秒级响应，支持联网搜索。
- **文档链接深度解析**（千析）：突破跨域限制，支持长文档与音视频文件分析。
- **智能会议纪要**（纪要）：实时音频采集、角色转写与结构化输出。

---

## 2. 技术栈 (Technical Stack)

### 2.1 核心环境
- **前端运行环境**: React 18 (Hooks 模式)
- **后端运行环境**: Node.js 20+, Express.js (负责 API 代理与内容抓取)
- **构建工具**: Vite 6 (支持开发态 HMR 与 生产态 Tree Shaking)
- **语言**: TypeScript (严格模式，全链路类型安全)

### 2.2 前端工程化与 UI
- **样式方案**: Tailwind CSS (使用标准 `@import "tailwindcss";` 配置)
- **动画引擎**: Framer Motion (`motion/react`) - 负责路由切换、组件状态变换、呼吸灯特效。
- **图标系统**: Lucide React - 统一风格的矢量图标库。
- **Markdown 渲染**: `react-markdown` + `remark-gfm` - 支持表格、列表、任务列表等专家级格式。
- **排版**: Inter (Sans), JetBrains Mono (Code)

### 2.3 后端与爬虫技术
- **HTTP 客户端**: Axios (后端 fetch 网页源码)
- **HTML 解析器**: Cheerio (用于服务端 DOM 操作，精准提取网页正文)
- **服务运行器**: tsx (TypeScript 零配置执行器)

### 2.4 AI 与多媒体处理
- **AI SDK**: `@google/genai` (Google Generative AI SDK)
- **音频技术**: MediaRecorder API, Web Audio API (`AnalyserNode` 实现频谱可视化)
- **文档工程**: `docx` 库 (用于将 Markdown 转换为标准 .docx 格式)

---

## 3. 技术架构说明 (System Architecture)

### 3.1 全栈混合模式 (Full-Stack Hybrid)
为了解决跨域(CORS)以及 API Key 安全问题，项目采用了全栈架构：
1. **前端 (Vite)**: 负责所有状态逻辑、音频录制、文件 Base64 转换。
2. **后端 (Express)**: 
   - 在开发环境下作为 Vite 的中间件运行。
   - 提供 `/api/fetch-link` 接口，模拟浏览器 Headers 抓取外部网页（如微信公众号文章），提取正文后再返回给前端。
   - 生产环境下独立运行，托管静态资源并处理 API 请求。

### 3.2 组件常驻架构 (Persistent Mounting)
为了支持“多任务并行（纪要录制的同时进行对话）”，`App.tsx` 采用了特殊的渲染策略：
- 所有 Agent 组件（QA, Analysis, Minutes）在应用启动时**全量挂载**。
- 切换 Tab 时不销毁组件，而是通过 `display: none` 和 `visibility: hidden` 切换可见性。
- 优点：**后台录音不中断、分析任务不丢失、切换速度极致流畅**。

---

## 4. 核心模型 (Core Model)
项目统一调用 **`gemini-3-flash-preview`**。
- **优势**: 
  - 极低的延迟（Flash 系列）。
  - 超长上下文支持（处理长达数万字的文章）。
  - 原生多模态支持（同时分析文本、图片、音视频文件）。

---

## 5. 模块功能实现与技术细节

### 5.1 百闻 (QAAgent) - 实时对话
- **功能**: 无障碍智能问答，支持每日中国大陆实时热点推荐。
- **技术细节**: 
    - **热点预测**: 初始化时调用 Gemini 生成 Prompt，获取当前日期中国热点，缓存于 `localStorage`。
    - **流式响应**: 使用 `chatStream` 接口，逐字符渲染 Markdown 内容。
- **使用指南**: 直接输入问题，或点击顶部的“实时热点”磁贴快速发起查询。

### 5.2 千析 (Analysis Agent) - 深度解析
- **功能**: 支持 PDF/Docx/图片/音视频/网页链接解析，生成结构化报告。
- **技术原理**:
    - **文件处理**: 使用 `FileReader` 将多媒体文件转为 Base64，封装为 `inlineData` 传给模型。
    - **链接解析**: 链接 -> 后端 API (Axios+Cheerio) -> 正文提取 -> Gemini 总结。
    - **导出**: 解析生成的 Markdown 内部逻辑被映射到 `docx` 库的 Paragraph 结构中实现一键下载。
- **使用指南**: 拖入文件或粘贴网址（支持微信公众号），点击“开始千析”，系统会自动切换至结果页展示专家级报告。

### 5.3 纪要 (Minutes Agent) - 会议办公
- **功能**: 现场录音、转录、角色区分、自动生成待办事项。
- **技术原理**:
    - **录音流**: `navigator.mediaDevices.getUserMedia` 获取权限。
    - **可视化**: 将采集到的音频数据通过 `getByteFrequencyData` 绘制到 HTML5 Canvas 上，形成波形。
    - **智能处理**: 使用 Gemini 对长音频的识别能力，结合预设的 Workflow Prompt 提取核心结论。
- **使用指南**: 点击“立即开启”，录音过程中可切走。录音结束后点击停止，系统将输出“智能纪要”和“原始转录”两个版本。

---

## 6. 调用 API 与数据流说明

### 6.1 前端到 AI (Gemini API)
- **调用库**: `@google/genai`
- **主要方法**:
  - `generateContent`: 一次性获取完整响应。
  - `generateContentStream`: 流式获取结果（提升用户体验）。
- **作用**: 文本生成、多模态分析、音频转录。

### 6.2 前端到后端 (Internal API)
- **`/api/fetch-link`**:
  - **参数**: `{ url: string }`
  - **作用**: 绕过浏览器同源策略限制，抓取并清洗网页 HTML 内容。实现技术：`cheerio` 精准定位 `#js_content` (WeChat) 或 `article` 标签。
- **`/api/health`**: 用于监控云端服务状态。

---

## 7. 数据持久化 (Storage Design)
项目使用了 **IndexedDB** 实现海量数据的本地存储（基于 `idb` 库库）：
- **Store: `chat_history`**: 存储百闻对话历史。
- **Store: `analysis_history`**: 存储千析报告内容（大文本）。
- **Store: `minutes_history`**: 存储会议记录详情及音频原始 Blob 数据。
- **Store: `settings`**: 存储用户的主题和语言偏好。

---

## 8. 环境配置 (Env Configuration)

### 8.1 环境变量 (.env)
```env
GEMINI_API_KEY=YOUR_API_KEY_HERE
```

### 8.2 安装依赖
```bash
npm install
```

### 8.3 启动项目
```bash
# 开发环境 (包含后端接口监听)
npm run dev

# 生产构建
npm run build

# 生产运行
npm start
```

---

## 9. 项目总结 (Final Words)
**Cookie AI** 是一个充分发挥现代 Web 性能与 AI 模型能力的综合应用。通过**全栈链路**解决了数据获取难题，通过**组件常驻模式**解决了 Web 应用的任务连续性难题。它是工作、学习、会议场景下极具效率的智能化伴侣。
