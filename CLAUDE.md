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
3. 提交更改并创建 git tag
4. 推送到 Gitea

```bash
# 示例：发布 v0.9.0
# 1. 更新版本号和 changelog 后
git add .
git commit -m "chore: release v0.9.0"
git tag v0.9.0
git push && git push --tags

# 推送到 Gitea（远程名为 gitea）
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