# CLAUDE.md - The Agent 项目规范

## 项目概述

Electron + Vite + Vue 3 + TypeScript Agent 应用模板

## 开发命令

```bash
pnpm run dev      # 启动开发服务器（Vite + Electron）
pnpm run build    # 构建生产版本
pnpm run make     # 构建安装包（DMG/EXE/DEB/RPM）
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

### 远程调试端口配置

开发模式下 (`pnpm run dev`)，Electron 会自动启动远程调试端口 **9223**。

### MCP 配置

配置已存在于项目根目录的 `.claude/settings.json`：

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@latest",
        "--browser-url=http://127.0.0.1:9223"
      ]
    }
  }
}
```

### 使用方式

1. **启动开发服务器**
   ```bash
   pnpm run dev
   ```
   Electron 应用启动后，会在控制台输出：`[Electron] DevTools 远程调试端口：http://127.0.0.1:9223`

2. **等待应用加载完成** - 确保 Electron 窗口已显示

3. **使用 MCP 工具** - 现在可以使用以下能力：
   - `take_snapshot` - 获取页面可访问性树
   - `take_screenshot` - 截取屏幕
   - `navigate_page` - 导航页面
   - `click` - 点击元素
   - `fill` - 填充表单
   - `list_network_requests` - 查看网络请求
   - `list_console_messages` - 查看控制台消息
   - `performance_start_trace` - 性能分析
   - 更多工具参考 chrome-devtools-mcp 文档

### 注意事项

- 必须在 `pnpm run dev` 模式下才能使用 MCP
- 生产构建版本 (`pnpm run build`) 不启用远程调试端口
- 如果端口 9223 被占用，可在 `electron/main/index.ts` 中修改端口号

## 构建输出

- `dist/` - Vite 构建的渲染进程资源
- `dist-electron/` - 编译后的主进程和预加载脚本
- `out/` - Electron Forge 打包的最终产品

## 代码风格

- 使用 TypeScript 严格模式
- Vue 组件使用 `<script setup lang="ts">` 语法
- 组件名使用 PascalCase
- 工具函数使用 camelCase
