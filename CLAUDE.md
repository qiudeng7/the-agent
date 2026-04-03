# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Electron + Vite + Vue 3 + TypeScript 的 Agent 桌面应用，后端使用 Nitro + Cloudflare Workers。

## 开发命令

### 客户端（在 client/ 目录下）

```bash
pnpm run dev        # 启动开发服务器（Vite + Electron）
pnpm run make       # 构建 macOS arm
pnpm run make:win   # 构建 Windows x86
```

开发模式下 Electron 会启动远程调试端口 **9223**，可用 electron-devtools MCP 访问。

### 服务端（在 server/ 目录下）

```bash
pnpm run dev        # 启动 Nitro 开发服务器（better-sqlite3 内存数据库）
pnpm run build      # 构建 Cloudflare Workers
pnpm run deploy     # 部署到 Cloudflare Workers
pnpm run db:generate        # 生成迁移文件
pnpm run db:migrate:d1     # 应用迁移到 D1
```

## 目录结构

```
client/              # Electron + Vue 前端
├── electron/        # 主进程（main、preload）
├── claude/          # Claude Agent SDK 集成（provider、runner、transport）
├── src/             # Vue 渲染进程
│   ├── views/       # 页面组件
│   ├── stores/      # Pinia 状态管理
│   ├── di/          # 依赖注入接口和实现
│   ├── events/      # 事件总线（mitt）
│   └── composables/ # Vue Composition API
server/              # Nitro 后端
├── api/             # API 路由
├── db/              # Drizzle ORM schema 和连接
└── plugins/         # Nitro 插件（db-init 初始化测试数据）
docs/                # 文档和 Changelog
```

## 架构

### 前端分层

渲染进程通过 **依赖注入** 解耦 Electron API：

```
di/interfaces.ts   ← 定义接口（IAgentTransportClient、IStorage、ISystemService）
di/electron.ts     ← Electron 环境实现
main.ts            ← provide 注入依赖
stores/*.ts        ← inject 获取依赖
```

事件总线（mitt）用于跨模块通信，命名规范：`模块名:动作名`（如 `agent:done`、`auth:logout`）。

### IPC 通信

```
渲染进程                    主进程
  │                            │
  │ agentRun(options)          │
  │───────────────────────────►│  ClaudeAgentProvider
  │                            │      │
  │ onAgentEvent(handler)      │      ▼
  │◄───────────────────────────│  SDK query()
        ClaudeEvent            │
```

### 模块别名

| Alias | 作用域 |
|-------|--------|
| `@/*` | 渲染进程 |
| `#agent/*` | 主进程 |
| `#claude/*` | 主进程 |
| `#electron/*` | 主进程 |

### 后端数据库


运行时通过 db0 获取数据库连接(cloudflare d1 或者 sqlite), 然后集成到 drizzle orm, 业务层用 drizzle 的 API 访问数据库.

开发环境:
1. 用 better-sqlote3 创建一个内存中的 sqlite
2. 通过 nitro plugin 在启动服务时填入少量测试数据.

生产环境:
1. 通过 drizzle-kit 生成 migration
2. 用 wrangler 应用 migration

## 版本发布

1. 修改 `client/package.json` 的 `version`
2. 更新 `docs/5.changelog.md`
3. 部署服务端：`cd server && pnpm run deploy && pnpm run db:migrate:d1`
4. 提交并打 tag：`git commit -m "chore: release vX.Y.Z" && git tag vX.Y.Z`
5. 推送到 GitHub：`git push origin main && git push origin --tags`
6. 发布 Electron 应用：`cd client && pnpm run publish`

**注意**：发布前需确保 `client/.env` 中已设置 `GITHUB_TOKEN`（需要 `repo` 权限）。

## Claude Code 二进制预置

构建时 Forge 会从 Anthropic GCS 下载 Claude Code 二进制到 `claude-code-installation-assets/{platform}/`，打包进 app。运行时主进程检测并注入给 ClaudeAgentProvider。

windows 还需要打包 git for windows portable.

## 开发流程注意事项

启动开发环境前建议先运行类型检查，确保代码无类型错误：

```bash
cd client

# 先终止已有的 Electron 进程
pkill -9 -f "Electron" 2>/dev/null; pkill -9 -f "electron" 2>/dev/null

# 运行类型检查
npx tsc --noEmit --project tsconfig.node.json

# 类型检查通过后再启动开发服务器
pnpm run dev
```

## 代码质量检查

**依赖倒置原则**：高层模块不应依赖低层实现，应依赖抽象接口。
- Store 应通过 inject 获取依赖，而非直接 import 实现
- 新增外部依赖时，先在 `di/interfaces.ts` 定义接口

**权责边界**：每个模块应只有一个变更理由。
- Store 只管理状态，不处理 IPC 细节
- 组件只负责 UI 渲染，业务逻辑放 store 或 service
- 事件总线用于跨模块通信，避免 store 间直接依赖

## 依赖管理

添加新依赖时，使用 pnpm 命令安装，不要直接修改 package.json 中的版本号：

```bash
pnpm add <package-name>        # 运行时依赖
pnpm add -D <package-name>     # 开发依赖
```