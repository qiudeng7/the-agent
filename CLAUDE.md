# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Electron + Vite + Vue 3 + TypeScript 的 Agent 桌面应用。

**后端架构**：
- `server/`：Nitro + Cloudflare Workers（旧版，将废弃）
- `nest-server/`：NestJS + Prisma（新版，推荐使用）

## 开发命令

### 客户端（在 client/ 目录下）

```bash
pnpm run dev        # 启动开发服务器（Vite + Electron）
pnpm run make       # 构建 macOS arm
pnpm run make:win   # 构建 Windows x86
```

开发模式下 Electron 会启动远程调试端口 **9223**，可用 electron-devtools MCP 访问。

### 服务端（在 server/ 目录下）

> **注意**：server/ 是旧版 Nitro 后端，将逐步废弃。新开发请使用 nest-server/。

#### Cloudflare Workers 模式（默认）

```bash
pnpm run dev        # 启动 Nitro 开发服务器（better-sqlite3 内存数据库）
pnpm run build      # 构建 Cloudflare Workers
pnpm run deploy     # 部署到 Cloudflare Workers
pnpm run db:generate        # 生成迁移文件
pnpm run db:migrate:d1     # 应用迁移到 D1
```

#### Standalone 单机模式

```bash
pnpm run dev:standalone    # 启动开发服务器（SQLite 文件数据库）
pnpm run build:standalone  # 构建 Node.js 服务
pnpm run start:standalone  # 运行构建后的服务
pnpm run db:migrate:local  # 手动执行本地迁移
```

**环境变量配置**（创建 `.env` 文件）：
```
JWT_SECRET=your-secret-key
DATABASE_PATH=./data.db       # 数据库路径
ADMIN_EMAIL=admin@example.com # 首次启动创建管理员
ADMIN_PASSWORD=your-password
```

#### Docker 部署

```bash
pnpm run build:standalone  # 先构建
pnpm run docker:build      # 构建镜像
pnpm run docker:run        # 启动容器
```

### NestJS 后端（在 nest-server/ 目录下）

```bash
pnpm run dev        # 启动开发服务器（watch 模式）
pnpm run debug      # 启动调试模式（带 debugger）
pnpm run start      # 运行生产服务（需先 build）
pnpm run build      # 构建生产版本
pnpm run test       # 运行单元测试（Vitest）
```

**数据库**：开发环境使用 `dev.db`（SQLite 文件），自动创建。生产环境可配置 LibURL adapter 连接远程数据库。

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
server/              # Nitro 后端（旧版，将废弃）
├── api/             # API 路由
├── db/              # Drizzle ORM schema 和连接
└── plugins/         # Nitro 插件（db-init 初始化测试数据）
nest-server/         # NestJS 后端（新版）
├── src/
│   ├── main.ts                 # 入口，Fastify adapter + CORS
│   ├── app.module.ts           # 根模块，聚合所有业务模块
│   ├── prisma/                 # 数据库层
│   │   ├── prisma.module.ts    # 全局模块，导出 PrismaService
│   │   └── prisma.service.ts   # PrismaClient + LibSQL adapter
│   ├── auth/                   # 认证模块
│   │   ├── auth.module.ts      # 导出 guards 供其他模块使用
│   │   ├── auth.controller.ts  # /auth/register, /auth/login, /auth/me
│   │   ├── auth.service.ts     # 用户 CRUD，首个用户自动为 ADMIN
│   │   ├── crypto.service.ts   # PBKDF2 密码哈希（Web Crypto API）
│   │   ├── jwt.service.ts      # JWT 签发/验证（jose 库）
│   │   ├── guards/             # 认证守卫
│   │   │   ├── jwt-auth.guard.ts   # Bearer token 验证，注入 user 到 request
│   │   │   └── roles.guard.ts      # @Roles() 装饰器配合，检查用户角色
│   │   └── decorators/         # 自定义装饰器
│   │       ├── current-user.decorator.ts  # @CurrentUser() 提取 request.user
│   │       └── roles.decorator.ts         # @Roles('ADMIN') 标记需要的角色
│   ├── tasks/                  # 任务模块
│   │   ├── tasks.controller.ts # CRUD + /tasks/stats
│   │   └── tasks.service.ts    # ADMIN 看自己创建的，EMPLOYEE 看分配给自己的
│   ├── agent-session/          # Agent 会话模块
│   │   ├── agent-session.controller.ts  # /sessions CRUD，含 messagesCount
│   │   └── agent-session.service.ts    # 关联 messages 表计数
│   ├── agent-message/          # Agent 消息模块
│   │   ├── agent-message.controller.ts  # /messages/:sessionId 创建和查询
│   │   └── agent-message.service.ts    # MessageRole 大小写转换（user→USER）
│   ├── settings/               # 用户设置模块
│   │   ├── settings.controller.ts  # GET/PUT /settings
│   │   ├── settings.service.ts     # JSON 字段解析，不存在返回默认值
│   └── admin/                  # 管理员模块
│       ├── admin.controller.ts # /admin/database/:table, /admin/tasks/batch
│       ├── admin.service.ts    # 表数据查询/更新/软删除，批量操作
├── prisma/
│   └── schema.prisma           # 数据模型定义，snake_case 字段映射
docs/                # 文档和 Changelog
```

## 架构

### NestJS 后端（nest-server）

#### 模块设计原则

**扁平结构**：所有业务模块扁平排列，不嵌套。每个模块独立管理自己的依赖：

```
模块 A imports: [PrismaModule, AuthModule]  ← 自己导入需要的依赖
模块 B imports: [PrismaModule, AuthModule]  ← 不依赖父模块传递
```

**AuthModule 作为共享模块**：导出 `JwtAuthGuard`、`RolesGuard`、`CryptoService`、`JwtService`，其他模块导入后可直接使用。

#### 数据库层

使用 **Prisma 7.x + LibSQL adapter**（不使用传统 `DATABASE_URL`）：

```typescript
// prisma.service.ts
const adapter = new PrismaLibSql({ url: 'file:./dev.db' });
super({ adapter });  // Prisma 7.x 必须用 adapter 模式
```

**Schema 映射**：Prisma 用 camelCase，数据库用 snake_case：

```prisma
passwordHash String @map("password_hash")  // 字段映射
@@map("users")                             // 表名映射
```

#### 认证机制

**JWT + Guards + Decorators 三层结构**：

```
Controller                          Guard                    Decorator
@UseGuards(JwtAuthGuard)     →     验证 Bearer token     →   request.user = payload
@Roles('ADMIN')              →     RolesGuard 检查角色   →   无权限抛 403
@CurrentUser('id')           →     从 request.user 提取  →   直接获取用户信息
```

**密码哈希**：PBKDF2（100000 iterations），与旧 Nitro 后端兼容。

#### 角色权限

- **ADMIN**：看自己创建的任务，可访问 /admin 接口
- **EMPLOYEE**：只看分配给自己的任务

#### API 设计约定

- 时间戳：数据库存 `DateTime`，API 返回 `number`（毫秒）
- 软删除：`deletedAt` 字段，查询时过滤 `deletedAt: null`
- 批量操作：`createManyAndReturn`（Prisma），返回创建的记录列表

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

**部署模式**：
- `cloudflare`（默认）：Cloudflare Workers + D1
- `standalone`：Node.js 服务 + SQLite 文件数据库（通过 `DEPLOY_MODE` 环境变量切换）

开发环境:
1. 用 better-sqlote3 创建一个内存中的 sqlite
2. 通过 nitro plugin 在启动服务时填入少量测试数据.

生产环境（Cloudflare）:
1. 通过 drizzle-kit 生成 migration
2. 用 wrangler 应用 migration

单机部署（Standalone）:
1. 首次启动自动执行迁移（读取 `db/migrations/all.sql`）
2. 通过环境变量配置管理员账号（`ADMIN_EMAIL`、`ADMIN_PASSWORD`）
3. 数据库文件路径通过 `DATABASE_PATH` 配置

## 版本发布

推送到 GitHub 后，GitHub Actions 会自动构建并发布到 Releases。

**发布流程**：
1. 修改 `client/package.json` 的 `version`
2. 提交并打 tag：`git commit -m "chore: release vX.Y.Z" && git tag vX.Y.Z`
3. 推送到 GitHub：`git push github main && git push github --tags`

**查看构建状态**：`gh run list --repo qiudeng7/the-agent`

**Git Remote**：
- `origin` → Gitea 自建仓库
- `github` → https://github.com/qiudeng7/the-agent

## pnpm 配置注意事项

Electron Forge 需要 `node-linker=hoisted`，已在 `client/.npmrc` 配置：
```
node-linker=hoisted
```

删除此配置会导致 `electron-forge make` 失败。

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

## Commit 规范

格式：`type(scope): 中文描述`

- **scope**：两级模块路径，如 `client/claude`、`server/db`、`client/src`
- **跨多个 scope**：不写 scope，直接 `type: 中文描述`
- **type**：`feat`、`fix`、`refactor`、`chore`、`docs`、`test`

示例：
- `feat(client/claude): 添加工具调用结果实时渲染`
- `fix(server/db): 修复用户查询的参数绑定`
- `refactor: 提取通用 UI 组件`

## 依赖管理

添加新依赖时，使用 pnpm 命令安装，不要直接修改 package.json 中的版本号：

```bash
pnpm add <package-name>        # 运行时依赖
pnpm add -D <package-name>     # 开发依赖
```