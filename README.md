# The Agent

Electron + Vite + Vue 3 + TypeScript Agent 桌面应用。

## 技术栈

- **Electron** - 跨平台桌面应用框架
- **Vite** - 快速构建工具（vite-plugin-electron 双进程构建）
- **Vue 3** - 渐进式 JavaScript 框架（Composition API + `<script setup>`）
- **TypeScript** - 类型安全
- **Pinia** - 状态管理
- **Vue Router** - 路由（hash 模式，兼容 Electron file://）
- **@anthropic-ai/sdk** - Claude API 流式调用

## 快速开始

```bash
pnpm install     # 安装依赖
pnpm run dev     # 启动开发服务器
pnpm run make    # 构建 macOS ARM
pnpm run make:win # 构建 Windows x86
```

开发模式下 Electron 会自动启动远程调试端口 **9223**，可用 electron-devtools MCP 访问。

## 文件结构

```
the-agent/
├── src/                    # 渲染进程（Vue 应用）
│   ├── views/              # 页面组件（Home / Chat / Apps / Settings）
│   ├── components/         # 通用组件（Layout / Chat / Sidebar / Apps）
│   ├── stores/             # Pinia stores（chat / agent / settings）
│   ├── router/             # Vue Router 配置
│   └── utils/              # 工具函数
├── electron/               # 主进程
│   ├── main/               # BrowserWindow 创建、IPC handlers
│   ├── preload/            # contextBridge API 暴露
│   ├── agent-transport.ts  # IAgentTransport 的 Electron IPC 实现
│   └── electron.d.ts       # window.electronAPI 类型声明
├── agent/                  # Agent 核心（provider-agnostic）
│   ├── types.ts            # 共享类型（AgentMessage / AgentEvent / ToolDefinition）
│   ├── interfaces/         # 抽象接口（IAgentProvider / ITool / IAgentTransport）
│   ├── providers/claude/   # Claude provider 实现
│   ├── runner.ts           # AgentRunner（连接 provider + registry + transport）
│   └── tool-registry.ts    # IToolRegistry 实现
├── vite.config.ts          # Vite + electron 插件配置，模块 alias
└── tsconfig.*.json         # TypeScript 配置（renderer / main process 分离）
```

## 架构说明

### 三层架构

```
┌─────────────────────────────────────────────────────────────┐
│                     渲染进程（Vue）                          │
│  views / components / stores                                │
│  通过 window.electronAPI 调用 IPC                           │
└───────────────────────┬─────────────────────────────────────┘
                        │ IPC (agent:run / agent:event)
┌───────────────────────▼─────────────────────────────────────┐
│                     主进程（Electron）                       │
│  ElectronAgentTransport ←→ AgentRunner                      │
│                              ↓                              │
│  ClaudeProvider + ToolRegistry                              │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS (Anthropic API)
┌───────────────────────▼─────────────────────────────────────┐
│                     Claude API                               │
│  流式返回 text_delta / thinking_delta / tool_use            │
└─────────────────────────────────────────────────────────────┘
```

### Agent 模块设计

`agent/` 目录独立于 Electron，可移植到其他宿主（HTTP Server、CLI）：

| 接口 | 职责 | 实现 |
|------|------|------|
| `IAgentProvider` | 执行 agentic loop，产出流式事件 | `ClaudeProvider` |
| `IToolRegistry` | 注册/查找工具 | `ToolRegistry` |
| `IAgentTransport` | 接收 run/abort 指令，推送事件 | `ElectronAgentTransport` |
| `AgentRunner` | 组装三者，驱动循环 | — |

### 模块别名

| Alias | 作用域 | 构建系统 |
|-------|--------|----------|
| `@/*` | 渲染进程 | Vite top-level + tsconfig.json |
| `#agent/*` | 主进程 + 渲染进程（type-only） | electron 子 vite + tsconfig.node.json |
| `#electron/*` | 主进程 | electron 子 vite + tsconfig.node.json |

### 构建输出

- `dist/` - Vite 构建的渲染进程资源
- `dist-electron/` - 编译后的主进程和预加载脚本
- `out/` - Electron Forge 打包的最终产品