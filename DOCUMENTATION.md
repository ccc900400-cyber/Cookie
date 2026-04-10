技术文档与使用说明

1. 项目概述

Cookie 是一款集成式 AI 应用，旨在通过先进的语言模型简化复杂信息的处理流程。它将长文档、长视频转化为结构化的知识报告，并提供即时的问答支持。

2. 详细功能说明

2.1 千析模块 (Analysis Agent)
- 文件导入：用户可以通过点击或拖拽方式上传本地文件。
- 链接解析：输入合法的视频 URL，系统将尝试提取视频内容并进行总结。
- 智能报告：AI 会根据预设的专业分析提示词，生成包含内容概览、核心要点、深度分析和结论建议的报告。
- 导出功能：利用 Blob 技术在前端生成 Word 兼容格式的文档。

2.2 百闻模块 (QA Agent)
- 对话流：支持上下文关联的连续对话。
- 建议系统：系统会定期更新热点话题，引导用户进行探索。
- 消息管理：支持消息复制、清空历史记录等操作。

3. 技术实现细节

3.1 AI 服务集成
应用使用 @google/genai SDK 与 Gemini 3 Flash 模型通信。针对大文件，采用流式传输技术确保前端界面的实时响应。

3.2 数据存储方案
- IndexedDB：用于存储大量的聊天记录和分析历史，确保刷新页面后数据不丢失。
- LocalStorage：用于存储用户偏好设置（如语言、主题）以及短期的热点话题缓存。

3.3 主题与国际化
- 主题系统：支持白天、黑夜及护眼模式，通过 CSS 变量和 Tailwind 类名动态切换。
- 国际化 (i18n)：支持简体中文、繁体中文和英文，通过自定义 hook 实现即时切换。

4. 部署与维护

4.1 环境变量
- GEMINI_API_KEY：必需。用于身份验证。

4.2 构建生产版本
运行 npm run build 将生成优化后的静态资源到 dist 目录。

5. 常见问题排查

- 权限问题：本应用已移除麦克风等敏感权限请求，确保用户隐私。
- 响应超时：若遇到网络波动，系统内置了自动重试机制（最多 3 次）。
- 文件限制：单个文件建议不超过 100MB 以获得最佳解析效果。

6. Android 打包重复类冲突解决 (Duplicate Classes)

如果在打包过程中遇到 checkDebugDuplicateClasses 错误，说明项目中存在重复的依赖类。请参考以下步骤解决：

6.1 启用 Jetifier
由于部分旧插件仍在使用 Android Support 库，需要使用 Jetifier 将其转换为 AndroidX：
- 安装：npm install jetifier
- 运行：npx jetifier

6.2 清理 Gradle 缓存
进入 android 目录并执行清理操作：
- 命令：cd android && ./gradlew clean
- 同步：npx cap sync android

6.3 强制统一依赖版本
如果发现特定的库冲突，可以在 android/app/build.gradle 文件的末尾添加以下配置：
configurations.all {
    resolutionStrategy {
        failOnVersionConflict() 
    }
}

6.4 检查版本管理
确保 android/variables.gradle 中的版本号保持最新且一致。

