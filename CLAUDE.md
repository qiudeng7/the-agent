# CLAUDE.md - The Agent 项目规范

## 项目概述

Electron + Vite + Vue 3 + TypeScript 的 Agent 应用。

## 目录结构

```
/
├── client/          # 客户端（Electron + Vue）
│   ├── electron/    # 主进程
│   ├── src/         # Vue 前端
│   ├── claude/      # Claude Agent SDK 集成
│   └── ...
├── server/          # 后端（Nitro + Cloudflare Workers）
├── docs/            # 文档
└── ...
```

## 开发命令

```bash
# 客户端开发（在 client/ 目录下）
cd client
pnpm run dev        # 启动开发服务器（Vite + Electron）
pnpm run make       # 构建 macOS arm
pnpm run make:win   # 构建 Windows x86

# 服务端开发（在 server/ 目录下）
cd server
pnpm run dev        # 启动 Nitro 开发服务器
pnpm run build      # 构建 Cloudflare Workers
```

## 开发流程注意事项

**启动开发环境前必须先运行类型检查**，确保代码无类型错误：

```bash
cd client

# 先终止已有的 Electron 进程
pkill -9 -f "Electron" 2>/dev/null; pkill -9 -f "electron" 2>/dev/null

# 运行类型检查
npx tsc --noEmit --project tsconfig.node.json

# 类型检查通过后再启动开发服务器
pnpm run dev
```

## Chrome DevTools MCP 集成

开发模式下 (`pnpm run dev`)，Electron 会自动启动远程调试端口 **9223**。

然后就可以用项目级的 electron-devtools mcp 访问 electron 应用了。

## 构建说明

- `client/dist/` - Vite 构建的渲染进程资源
- `client/dist-electron/` - 编译后的主进程和预加载脚本
- `client/out/` - Electron Forge 打包的最终产品

## 版本发布

发布新版本时需要：

1. 修改 `client/package.json` 中的 `version` 字段
2. 更新 `docs/5.changelog.md` 添加版本记录
3. 部署服务端到 Cloudflare（在 server 目录下）
   - 部署代码：`pnpm run deploy`
   - 迁移数据库：`pnpm run db:migrate:d1`（如有 schema 变更）
4. 提交更改并创建 git tag
5. 推送到 Gitea

```bash
# 示例：发布 v0.11.0
# 1. 更新版本号和 changelog 后

# 2. 部署服务端
cd server
pnpm run build           # 构建产物到 .output/
pnpm run deploy          # 部署到 Cloudflare Workers
pnpm run db:migrate:d1   # 运行数据库迁移（如有 schema 变更）
cd ..

# 3. 提交并打 tag
git add .
git commit -m "chore: release v0.11.0"
git tag v0.11.0

# 4. 推送到 Gitea（远程名为 gitea）
git push gitea main && git push gitea --tags
```

## 前端架构

### 分层结构

```
src/
├── views/           # 页面（Chat、Home、Settings 等）
├── components/      # 可复用组件
├── stores/          # Pinia 状态管理
├── di/              # 依赖注入（接口 + 实现）
├── events/          # 事件总线（mitt）
├── services/        # 后端 API 服务
└── router/          # Vue Router
```

### 依赖注入

通过 Vue provide/inject 解耦渲染进程与 Electron API：

```
di/interfaces.ts    ← 定义接口（IAgentTransportClient、IStorage、ISystemService）
di/electron.ts      ← Electron 环境实现
main.ts             ← provide 注入依赖
stores/*.ts         ← inject 获取依赖
```

**示例**：agent store 注入 transport

```typescript
// main.ts
app.provide(AGENT_TRANSPORT_KEY, createElectronAgentTransport())

// stores/agent/index.ts
const transport = inject<IAgentTransportClient>(AGENT_TRANSPORT_KEY)!
```

### 事件总线

使用 mitt 实现应用级事件解耦，避免 store 间直接依赖：

```typescript
// events/index.ts
export const emitter = mitt<AppEvents>()

// 命名规范：模块名:动作名
// agent:done - Agent 完成一轮对话
// auth:logout - 用户登出
// settings:changed - 设置变更
```

### IPC 通信

```
渲染进程                          主进程
    │                              │
    │  agentRun(options)           │
    │─────────────────────────────►│
    │                              │  ClaudeRunner
    │                              │      │
    │  onAgentEvent(handler)       │      ▼
    │◄─────────────────────────────│  ClaudeAgentProvider
    │       ClaudeEvent            │      │
    │                              │      ▼
    │                              │  SDK query()
```

- **渲染 → 主进程**：`window.electronAPI.agentRun()`、`window.electronAPI.agentAbort()`
- **主进程 → 渲染**：`window.electronAPI.onAgentEvent()` 推送流式事件

## 代码质量检查

当检查代码质量时，重点关注：

**依赖倒置原则**：高层模块不应依赖低层实现，应依赖抽象接口。
- Store 应通过 inject 获取依赖，而非直接 import 实现
- 新增外部依赖时，先在 `di/interfaces.ts` 定义接口

**权责边界**：每个模块应只有一个变更理由。
- Store 只管理状态，不处理 IPC 细节
- 组件只负责 UI 渲染，业务逻辑放 store 或 service
- 事件总线用于跨模块通信，避免 store 间直接依赖

**模块历史与注释**：
- 结合 Changelog 和 git log 理解模块发展历史：
  ```bash
  # 1. 从 Changelog 定位版本
  # 2. 查看该版本范围的提交
  git log --oneline v0.8.0..v0.9.0 -- client/claude/
  # 3. 查看关键提交详情
  git show <commit-hash> --stat
  ```
- 检查注释是否齐全，与实际功能是否对应
- 非一级业务模块需在文件头部解释其作用

## 依赖管理

**添加新依赖时，使用 pnpm 命令安装，不要直接修改 package.json 中的版本号**：

```bash
# 添加运行时依赖
pnpm add <package-name>

# 添加开发依赖
pnpm add -D <package-name>
```

这样可以确保安装最新稳定版本，避免手动指定过时的版本号。

## 后端数据库架构

### 架构概述

```
┌─────────────────────────────────────────────────────────────┐
│                    运行时数据库访问                           │
│  drizzle-orm + better-sqlite3 (dev) / d1 (prod)             │
│  - 开发环境：better-sqlite3 内存数据库                        │
│  - 生产环境：Cloudflare D1（通过 Nitro binding）              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    数据库迁移流程                             │
│  1. drizzle-kit generate → 生成迁移 SQL 文件                  │
│  2. wrangler d1 execute → 应用迁移到 D1                       │
│  （开发环境内存数据库无需迁移，每次启动自动初始化）              │
└─────────────────────────────────────────────────────────────┘
```

### 关键文件

| 文件 | 用途 |
|------|------|
| `server/nitro.config.ts` | Nitro 配置（experimental.database + D1 binding） |
| `server/db/index.ts` | 数据库连接层（drizzle-orm + better-sqlite3/d1） |
| `server/db/schema.ts` | Drizzle ORM Schema 定义 |
| `server/drizzle.config.ts` | Drizzle Kit 配置（只用于生成迁移文件） |
| `server/db/migrations/` | 迁移 SQL 文件目录 |
| `server/wrangler.toml` | Cloudflare D1 binding 配置 |

### 运行时数据库访问

使用 drizzle-orm 的原生驱动，根据环境自动切换：

```typescript
// server/db/index.ts
import { drizzle as drizzleD1 } from 'drizzle-orm/d1'
import { drizzle as drizzleBetterSqlite3 } from 'drizzle-orm/better-sqlite3'

// 生产环境：从 Nitro 的 D1 binding 获取
const env = globalThis.__env__
if (env?.DB) {
  return drizzleD1(env.DB, { schema })
}

// 开发环境：使用 better-sqlite3 内存数据库
const sqlite = new Database(':memory:')
return drizzleBetterSqlite3(sqlite, { schema })
```

**工作原理**：
- Nitro 的 `experimental.database: true` 确保 D1 binding 正确配置
- `database` 配置指定生产环境使用 `cloudflare-d1` connector
- D1 binding 会被放到 `globalThis.__env__.DB`
- 开发环境使用 better-sqlite3 内存数据库，通过 `initSchema()` 初始化表结构

### 数据库迁移

**开发环境**：使用内存数据库（`:memory:`），每次启动通过 `plugins/db-init.ts` 自动初始化测试数据，无需迁移。

**生产环境（D1）**：

```bash
# 1. 生成迁移文件（不需要数据库连接）
pnpm run db:generate

# 2. 应用迁移到 D1（需要 wrangler 登录）
pnpm run db:migrate:d1
```

**迁移文件管理**：
- `db/migrations/0000_xxx.sql`、`0001_xxx.sql` - drizzle-kit 生成的迁移文件
- `db/migrations/all.sql` - 合并所有迁移，用于一次性部署新环境

### 添加新表或字段

1. 修改 `server/db/schema.ts` 添加表定义或字段
2. 运行 `pnpm run db:generate` 生成迁移文件
3. 将新生成的迁移 SQL 追加到 `all.sql`
4. 同时更新 `server/db/index.ts` 中的 `initSchema()` 函数
5. 运行 `pnpm run db:migrate:d1` 应用到 D1
6. 开发环境重启即可（内存数据库自动重建）