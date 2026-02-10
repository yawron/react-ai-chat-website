# React AI Chat Website

基于 Monorepo 架构的全栈 AI 对话应用，集成 React 前端与 NestJS 后端，支持流式对话、多会话管理及文件上传分析。

## 🛠 技术栈

- **Frontend**: React 18, TypeScript, Ant Design 5, Tailwind CSS, Zustand, Vite
- **Backend**: NestJS, TypeORM, MySQL, Redis, OpenAI SDK (兼容阿里云百炼)
- **Monorepo**: pnpm workspace
- **Tools**: ESLint, Prettier, Husky, Commitlint

## 📂 项目结构

```
.
├── apps
│   ├── web-pc      # PC 端前端应用 (@ai-chat/pc)
│   ├── backend     # 后端 API 服务 (@ai-chat/backend)
│   └── web-plug    # 浏览器插件/扩展 (待开发)
├── packages
│   ├── eslint-config # 共享 ESLint 配置
│   └── tsconfig      # 共享 TypeScript 配置
```

## 🚀 快速开始

### 前置要求
- Node.js >= 18
- pnpm >= 8
- MySQL & Redis 服务已启动

### 安装依赖

```bash
pnpm install
```

### 启动项目

```bash
# 同时启动前端和后端（开发模式）
pnpm dev

# 单独启动前端
pnpm --filter @ai-chat/pc run dev

# 单独启动后端
pnpm --filter @ai-chat/backend run dev
```

## ✨ 主要功能

- 🤖 **AI 对话**: 支持流式响应 (SSE)、Markdown 渲染
- 📁 **文件处理**: 支持大文件分片上传、断点续传、文件内容分析
- 💬 **会话管理**: 多会话历史记录、搜索、管理
- 🔐 **用户系统**: 登录/注册、权限验证 (JWT)
- ⚡ **性能优化**: 虚拟滚动、防抖节流、Web Worker 文件哈希计算
