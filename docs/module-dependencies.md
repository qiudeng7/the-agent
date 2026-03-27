# 模块依赖分析

## 当前架构

```
src/
├── composables/    ← 新增：纯 Vue composables，可跨项目复用
├── stores/         ← Pinia stores，依赖 agent types
├── views/          ← 页面组件
├── components/     ← UI 组件
├── utils/          ← 工具函数
└── router/         ← 路由配置

agent/              ← 主进程 Agent 模块，完全独立
electron/           ← Electron 主进程代码
```

## 模块依赖关系

### 1. composables/ (依赖: 仅 Vue)
```
useAutoResize.ts     → vue
useLocalStorage.ts   → vue
useSystemTheme.ts    → vue
useFormatTime.ts     → vue
```
**结论**: 完全解耦，可独立发布为 npm 包

### 2. utils/ (依赖: Vue 运行时)
```
icons.ts             → vue (运行时 template 编译)
```
**结论**: 纯工具函数，已解耦

### 3. stores/ (依赖: Pinia + Vue + agent types)
```
settings.ts          → vue, pinia
chat.ts              → vue, pinia, #agent/types
agent.ts             → vue, pinia, #agent/types, ./chat, ./settings
```
**结论**: settings.ts 不依赖 agent types，可进一步解耦

### 4. agent/ (依赖: Node.js + @anthropic-ai/sdk)
```
types.ts             → 无依赖
interfaces/          → ./types
providers/claude/    → @anthropic-ai/sdk, ./types, ./interfaces
runner.ts            → ./types, ./interfaces, ./providers
```
**结论**: 完全独立于前端，可独立使用

### 5. electron/ (依赖: Node.js + agent)
```
electron.d.ts        → #agent/types
agent-transport.ts   → #agent
main/                → electron, #agent
preload/             → electron, #agent/types
```
**结论**: Electron 特有，与前端通过 IPC 解耦

## 可复用模块清单

| 模块 | 依赖 | 可复用范围 |
|------|------|-----------|
| composables/* | Vue | 任意 Vue 3 项目 |
| utils/icons.ts | Vue 运行时 | 任意 Vue 3 项目 |
| agent/types.ts | 无 | 任意 TypeScript 项目 |
| agent/interfaces/* | types.ts | 任意 TypeScript/Node 项目 |
| agent/providers/claude | @anthropic-ai/sdk | Node.js 项目 |

## 建议的改进

### 已完成
- [x] 创建 composables 目录
- [x] 抽取 useAutoResize
- [x] 抽取 useLocalStorage
- [x] 抽取 useSystemTheme
- [x] 抽取 useFormatTime

### 可选改进（未实施）
- [ ] settings.ts 中的 BUNDLE_MODELS 可移到独立配置文件
- [ ] 可考虑将 stores/chat.ts 中的类型定义移到 types/ 目录
- [ ] agent/types.ts 可考虑发布为独立 npm 包

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
│    stores/      │     │    composables/         │
│  (Pinia状态)    │────▶│  (Vue composables)      │
│  chat,agent,    │     │  useAutoResize,         │
│  settings       │     │  useLocalStorage,       │
└────────┬────────┘     │  useSystemTheme,        │
         │              │  useFormatTime          │
         ▼              └─────────────────────────┘
┌─────────────────┐
│ agent/types.ts  │  ← 纯类型定义，无运行时依赖
│ (共享类型)      │
└─────────────────┘

【主进程 - 完全独立】
┌─────────────────────────────────────────────────────────────┐
│                      agent/                                  │
│   types.ts → interfaces/ → providers/claude/ → runner.ts    │
│                                                              │
│   依赖: @anthropic-ai/sdk, Node.js                           │
│   与前端通信: Electron IPC                                   │
└─────────────────────────────────────────────────────────────┘
```