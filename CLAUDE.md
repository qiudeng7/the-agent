# CLAUDE.md - The Agent 项目规范

## 项目概述

Electron + Vite + Vue 3 + TypeScript Agent 应用模板

## 开发命令

```bash
pnpm run dev      # 启动开发服务器（Vite + Electron）
pnpm run make     # 构建 macos arm
pnpm run make:win # 构建 windows x86
```

## 技术栈

- **Electron 34** - 桌面应用框架
- **Vite 6** - 构建工具
- **Vue 3.5** - UI 框架（Composition API）
- **TypeScript 5.7** - 类型系统
- **Pinia 3** - 状态管理
- **Vue Router 4** - 路由管理
- **Electron Forge 7** - 打包工具

## 目录结构

```
the-agent/
├── electron/
│   ├── main/index.ts      # Electron 主进程
│   └── preload/index.ts   # 预加载脚本（IPC 桥接）
├── src/
│   ├── views/             # 页面组件
│   ├── stores/            # Pinia 状态
│   ├── router/            # 路由配置
│   ├── assets/            # 静态资源
│   └── main.ts            # Vue 入口
├── docs/                  # 文档
├── forge.config.ts        # Electron Forge 配置
├── vite.config.ts         # Vite 配置
└── package.json
```

## Chrome DevTools MCP 集成

开发模式下 (`pnpm run dev`)，Electron 会自动启动远程调试端口 **9223**。

然后就可以用项目级的 electron-devtools mcp 访问electron 应用了.

## 构建说明

- `dist/` - Vite 构建的渲染进程资源
- `dist-electron/` - 编译后的主进程和预加载脚本
- `out/` - Electron Forge 打包的最终产品