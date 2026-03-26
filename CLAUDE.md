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

## 版本发布

发布新版本时需要：

1. 修改 `package.json` 中的 `version` 字段
2. 更新 `docs/5.changelog.md` 添加版本记录
3. 提交更改并创建 git tag

```bash
# 示例：发布 v0.2.1
git add .
git commit -m "chore: release v0.2.1"
git tag v0.2.1
git push && git push --tags
```