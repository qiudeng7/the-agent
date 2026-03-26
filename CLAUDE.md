# CLAUDE.md - The Agent 项目规范

## 项目概述

Electron + Vite + Vue 3 + TypeScript 的 Agent 应用.

## 开发命令

```bash
pnpm run dev      # 启动开发服务器（Vite + Electron）
pnpm run make     # 构建 macos arm
pnpm run make:win # 构建 windows x86
```

## Chrome DevTools MCP 集成

开发模式下 (`pnpm run dev`)，Electron 会自动启动远程调试端口 **9223**。

然后就可以用项目级的 electron-devtools mcp 访问electron 应用了.

## 构建说明

- `dist/` - Vite 构建的渲染进程资源
- `dist-electron/` - 编译后的主进程和预加载脚本
- `out/` - Electron Forge 打包的最终产品