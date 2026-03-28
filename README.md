# The Agent

Electron + Vite + Vue 3 + TypeScript Agent 桌面应用，支持云端数据同步。

## 技术栈

### 前端
- **Electron** - 跨平台桌面应用框架
- **Vite** - 快速构建工具（vite-plugin-electron 双进程构建）
- **Vue 3** - 渐进式 JavaScript 框架（Composition API + `<script setup>`）
- **TypeScript** - 类型安全
- **Pinia** - 状态管理
- **Vue Router** - 路由（hash 模式，兼容 Electron file://）

### 后端
- **Nitro 3** - UnJS 全栈服务器框架
- **Cloudflare D1** - Cloudflare Workers 原生 SQLite 数据库
- **Drizzle ORM** - TypeScript-first ORM
- **JWT (jose)** - 身份认证

## 快速开始

```bash
pnpm install           # 安装依赖（包括前后端）
pnpm run dev           # 启动前端开发服务器
pnpm --filter server dev    # 启动后端开发服务器
pnpm run make          # 构建 macOS ARM
pnpm run make:win      # 构建 Windows x86
```

### 后端命令

```bash
cd server
pnpm run dev           # 启动本地开发服务器（better-sqlite3）
pnpm run build         # 构建生产版本
pnpm run deploy        # 部署到 Cloudflare Workers
pnpm run db:studio     # 打开 Drizzle Studio 查看数据库
```

开发模式下 Electron 会自动启动远程调试端口 **9223**，可用 electron-devtools MCP 访问。

## 文件结构

```
the-agent/
├── src/                    # 渲染进程（Vue 应用）
│   ├── views/              # 页面组件（Home / Chat / Login / Register / Settings）
│   ├── components/         # 通用组件（Layout / Chat / Sidebar / Apps）
│   ├── stores/             # Pinia stores（chat / agent / settings / auth）
│   ├── services/           # 后端 API 服务封装
│   ├── router/             # Vue Router 配置（含登录守卫）
│   └── utils/              # 工具函数
├── server/                 # Nitro 后端服务
│   ├── api/                # API 路由（auth / sessions / messages / settings）
│   ├── db/                 # 数据库 schema 和连接
│   ├── utils/              # 工具函数（JWT / 密码哈希）
│   └── wrangler.toml       # Cloudflare Workers 配置
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

### 四层架构

```
┌─────────────────────────────────────────────────────────────┐
│                     渲染进程（Vue）                          │
│  views / components / stores                                │
│  通过 fetch 调用后端 API，通过 IPC 调用 Agent                │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │ fetch (API)                   │ IPC (agent:run)
        ▼                               ▼
┌───────────────────────┐   ┌───────────────────────────────────┐
│   Nitro 后端服务       │   │        主进程（Electron）          │
│   Cloudflare Workers  │   │   ElectronAgentTransport          │
│   D1 + Drizzle ORM    │   │          ↓                        │
│   账户 / 会话 / 设置    │   │   AgentRunner + ClaudeProvider   │
└───────────────────────┘   └───────────────────────────────────┘
                                            │ HTTPS (Anthropic API)
                                            ▼
                            ┌───────────────────────────────────┐
                            │        Claude API                  │
                            │   流式 text_delta / thinking_delta │
                            └───────────────────────────────────┘
```

### 数据流

- **用户数据**（账户、会话、消息、设置）→ 存储在 Cloudflare D1
- **Agent 执行** → 在 Electron 主进程运行，调用 Claude API
- **前端** → 通过 fetch 与后端通信，通过 IPC 与 Agent 通信

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
| `~/*` | 后端（Nitro） | nitro.config.ts |

### 构建输出

- `dist/` - Vite 构建的渲染进程资源
- `dist-electron/` - 编译后的主进程和预加载脚本
- `out/` - Electron Forge 打包的最终产品
- `server/.output/` - Nitro 构建输出

## 部署

### Cloudflare Workers

1. 安装 wrangler：`pnpm add -g wrangler`
2. 登录：`wrangler login`
3. 创建 D1 数据库：`wrangler d1 create the-agent-db`
4. 更新 `server/wrangler.toml` 中的 `database_id`
5. 运行迁移：`cd server && pnpm run db:migrate`
6. 设置 JWT 密钥：`wrangler secret put JWT_SECRET`
7. 部署：`pnpm run deploy`

### 环境变量

| 变量 | 说明 | 位置 |
|------|------|------|
| `JWT_SECRET` | JWT 签名密钥 | Cloudflare Workers Secret |
| `VITE_API_BASE` | 后端 API 地址 | `.env.production` |