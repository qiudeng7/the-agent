# The Agent

Electron + Vite + Vue 3 + TypeScript Agent 应用模板

## 技术栈

- **Electron** - 跨平台桌面应用框架
- **Vite** - 快速构建工具
- **Vue 3** - 渐进式 JavaScript 框架（Composition API）
- **TypeScript** - 类型安全的 JavaScript 超集
- **Pinia** - Vue 3 官方推荐的状态管理库
- **Vue Router** - Vue.js 官方路由管理器

## 项目结构

```
the-agent/
├── electron/
│   ├── main/          # Electron 主进程代码
│   │   └── index.ts
│   └── preload/       # 预加载脚本
│       └── index.ts
├── src/
│   ├── assets/        # 静态资源
│   ├── components/    # Vue 组件
│   ├── router/        # 路由配置
│   ├── stores/        # Pinia 状态管理
│   ├── views/         # 页面视图
│   ├── App.vue        # 根组件
│   └── main.ts        # 应用入口
├── public/            # 公共静态资源
├── index.html         # HTML 模板
├── package.json       # 项目依赖和脚本
├── tsconfig.json      # TypeScript 配置
├── vite.config.ts     # Vite 配置
└── electron-builder.json # Electron 打包配置
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
# 使用 npm scripts
npm run electron:dev

# 或者分别启动 Vite 和 Electron
npm run dev          # 启动 Vite 开发服务器
# 在另一个终端
npx electron .       # 启动 Electron
```

### 构建应用

```bash
# 构建并打包
npm run build

# 仅构建，不打包
npm run build:dir
```

## 功能特性

- ✅ 热模块替换 (HMR) 开发体验
- ✅ TypeScript 类型支持
- ✅ Vue Router 路由管理
- ✅ Pinia 状态管理
- ✅ Electron IPC 通信示例
- ✅ 深色主题 UI
- ✅ 响应式设计

## 自定义开发

### 添加新的路由

在 `src/router/index.ts` 中添加路由配置：

```typescript
{
  path: '/your-path',
  name: 'your-name',
  component: () => import('@/views/YourView.vue'),
}
```

### 添加新的 Store

在 `src/stores/` 目录下创建新的 store 文件：

```typescript
import { defineStore } from 'pinia'

export const useYourStore = defineStore('your-store', () => {
  // state, getters, actions
})
```

### Electron IPC 通信

主进程 (`electron/main/index.ts`):

```typescript
ipcMain.handle('your-channel', async (event, data) => {
  // 处理逻辑
  return result
})
```

渲染进程 (Vue 组件):

```typescript
const result = await window.electronAPI.yourMethod()
```

## License

MIT
