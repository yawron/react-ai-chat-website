# web-pc 项目目录结构

```
web-pc/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── tailwind.config.js
├── eslint.config.js
├── public/                      # 静态资源
└── src/
    ├── main.tsx                 # 入口文件
    ├── App.tsx                  # 根组件
    ├── vite-env.d.ts
    ├── app/
    │   └── router.tsx           # 路由配置
    ├── apis/                    # API 接口
    │   ├── chat.ts
    │   ├── session.ts
    │   └── user.ts
    ├── types/                   # 类型定义
    │   ├── agent.ts
    │   ├── chat.ts
    │   ├── common.ts
    │   ├── session.ts
    │   └── user.ts
    ├── locales/                 # 国际化
    │   ├── index.ts
    │   ├── zh-CN.ts
    │   └── en-US.ts
    ├── utils/                   # 工具函数
    │   ├── index.ts
    │   ├── judgeImage.ts
    │   ├── antdGlobal.tsx
    │   └── request.ts           # 请求封装
    ├── store/                   # Zustand 状态管理
    │   ├── index.ts
    │   ├── useUserStore.ts
    │   ├── useChatStore.ts
    │   ├── useThemeStore.ts
    │   ├── useLocaleStore.ts
    │   └── useConversationStore.ts
    ├── services/                # 业务服务
    │   └── userService.ts
    ├── constant/                # 常量
    │   └── index.ts
    ├── workers/                 # Web Worker
    │   └── fileHash.worker.ts
    ├── features/                # 功能模块
    │   ├── auth/
    │   │   ├── pages/
    │   │   │   ├── Login/
    │   │   │   └── CreateAccount/
    │   │   └── components/
    │   │       └── Author/
    │   │           ├── AuthLayout.tsx
    │   │           ├── AuthLink.tsx
    │   │           ├── EmailForm.tsx
    │   │           ├── RegisterForm.tsx
    │   │           ├── UserAvatar.tsx
    │   │           └── AuthLanguageSwitch.tsx
    │   ├── chat/
    │   │   ├── pages/
    │   │   │   └── Home/
    │   │   │       └── index.tsx
    │   │   └── components/
    │   │       ├── Bubble/
    │   │       │   ├── bubble.tsx
    │   │       │   └── content.tsx
    │   │       ├── ChatInput/
    │   │       │   ├── index.tsx
    │   │       │   ├── types/
    │   │       │   │   └── index.ts
    │   │       │   ├── utils/
    │   │       │   │   ├── file-config.ts
    │   │       │   │   ├── file-utils.ts
    │   │       │   │   └── upload-core.ts
    │   │       │   └── hooks/
    │   │       │       ├── index.ts
    │   │       │       ├── use-file-upload.ts
    │   │       │       └── use-chat-send.ts
    │   │       ├── Conversation/
    │   │       │   ├── ConversationSidebar.tsx
    │   │       │   ├── ShareDialog.tsx
    │   │       │   └── hooks/
    │   │       │       └── useConversationActions.ts
    │   │       └── Search/
    │   │           └── SearchButton.tsx
    │   ├── agents/
    │   │   └── pages/
    │   │       └── Agents/
    │   │           └── index.tsx
    │   └── shared-chat/
    │       └── pages/
    │           └── SharedChat/
    │               └── index.tsx
    └── shared/                  # 共享组件
        ├── components/
        │   ├── ErrorBoundary/
        │   │   ├── ErrorBoundary.tsx
        │   │   └── index.ts
        │   ├── Layout/
        │   │   └── LayoutWithSidebar.tsx
        │   ├── PageTransition/
        │   │   └── PageTransition.tsx
        │   ├── ThemeToggle.tsx
        │   └── WithPermission/
        │       ├── WithPermission.tsx
        │       └── index.ts
```

## 目录说明

| 目录 | 用途 |
|------|------|
| `apis/` | API 接口封装 |
| `types/` | TypeScript 类型定义 |
| `locales/` | 国际化文案 |
| `utils/` | 工具函数（请求、图片判断等） |
| `store/` | Zustand 状态管理 |
| `services/` | 业务逻辑服务 |
| `constant/` | 常量配置 |
| `workers/` | Web Worker |
| `features/` | 按功能模块划分的页面和组件 |
| `shared/` | 跨模块复用的组件 |
```
