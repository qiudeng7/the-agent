# 模块依赖分析

## 当前架构

```
src/
├── di/             ← 依赖注入：接口定义 + 容器 + 实现
├── composables/    ← 纯 Vue composables，可跨项目复用
├── stores/         ← Pinia stores，纯业务逻辑（依赖注入）
├── views/          ← 页面组件
├── components/     ← UI 组件
├── utils/          ← 工具函数
└── router/         ← 路由配置

agent/              ← 主进程 Agent 模块，完全独立
electron/           ← Electron 主进程代码
```

## 依赖注入架构

```
┌─────────────────────────────────────────────────────────────┐
│                      main.ts (启动)                          │
│  initDependencies(createElectronDependencies())             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    di/container.ts                           │
│  存储全局依赖，提供 getDependencies() 给 stores 使用          │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ agent.ts     │  │ settings.ts  │  │ (其他 store) │
│              │  │              │  │              │
│ transport    │  │ storage      │  │              │
│ ───────────► │  │ systemService│  │              │
│ IAgentTrans- │  │ ───────────► │  │              │
│ port         │  │ IStorage,    │  │              │
│              │  │ ISystemServ- │  │              │
│              │  │ ice          │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

## 依赖接口定义

```typescript
// IAgentTransport - Agent 传输接口
interface IAgentTransport {
  run(options): Promise<void>
  abort(taskId: string): Promise<void>
  onEvent(handler): () => void
}

// IStorage - 存储接口
interface IStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

// ISystemService - 系统服务接口
interface ISystemService {
  getAppVersion(): Promise<string>
  getPlatform(): Promise<string>
  theme: IThemeDetector    // 主题检测
  language: ILanguageDetector  // 语言检测
}
```

## 模块依赖关系

### 1. di/ (依赖注入层)
```
interfaces.ts        → #agent/types (类型)
container.ts         → ./interfaces
providers/electron.ts → vue (响应式), ./interfaces
```
**结论**: 完全独立，可在任意环境替换实现

### 2. stores/ (依赖: Pinia + Vue + di)
```
settings.ts          → vue, pinia, @/di (storage, systemService)
chat.ts              → vue, pinia, #agent/types (类型)
agent.ts             → vue, pinia, #agent/types, @/di (transport), ./chat, ./settings
```
**结论**: stores 现在通过 di 访问外部依赖，业务逻辑与实现解耦

### 3. composables/ (依赖: 仅 Vue)
```
useAutoResize.ts     → vue
useLocalStorage.ts   → vue
useSystemTheme.ts    → vue
useFormatTime.ts     → vue
```
**结论**: 完全解耦，可独立发布为 npm 包

### 4. agent/ (依赖: Node.js + @anthropic-ai/sdk)
```
types.ts             → 无依赖
interfaces/          → ./types
providers/claude/    → @anthropic-ai/sdk, ./types, ./interfaces
runner.ts            → ./types, ./interfaces, ./providers
```
**结论**: 完全独立于前端，可独立使用

## 好处

1. **测试友好**: 可以轻松 mock 依赖进行单元测试
2. **平台无关**: stores 可以在 Web/Electron/其他环境复用
3. **职责清晰**: stores 专注于业务逻辑，不关心具体实现
4. **依赖透明**: 所有外部依赖都在 di/interfaces.ts 中明确定义

## 可复用模块清单

| 模块 | 依赖 | 可复用范围 |
|------|------|-----------|
| di/interfaces.ts | 类型 | 任意 TypeScript 项目 |
| composables/* | Vue | 任意 Vue 3 项目 |
| utils/icons.ts | Vue 运行时 | 任意 Vue 3 项目 |
| stores/* | Vue + Pinia + di | 任意 Vue 3 项目（注入不同依赖） |
| agent/types.ts | 无 | 任意 TypeScript 项目 |
| agent/interfaces/* | types.ts | 任意 TypeScript/Node 项目 |

## 依赖图

```
┌─────────────────────────────────────────────────────────────┐
│                      views/ (页面)                           │
│    Home.vue, Chat.vue, Settings.vue, Apps.vue               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   components/ (UI组件)                       │
│    ChatInput, SessionList, Sidebar, AppCard...              │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌─────────────────┐     ┌─────────────────────────┐
│    stores/      │────▶│    di/ (依赖注入)        │
│  (业务逻辑)     │     │  interfaces, container, │
│  chat,agent,    │     │  providers              │
│  settings       │     └─────────────────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────────────┐
│ agent/types.ts  │     │    composables/         │
│ (共享类型)      │     │  (Vue composables)      │
└─────────────────┘     └─────────────────────────┘

【主进程 - 完全独立】
┌─────────────────────────────────────────────────────────────┐
│                      agent/                                  │
│   types.ts → interfaces/ → providers/claude/ → runner.ts    │
│                                                              │
│   依赖: @anthropic-ai/sdk, Node.js                           │
│   与前端通信: Electron IPC                                   │
└─────────────────────────────────────────────────────────────┘
```