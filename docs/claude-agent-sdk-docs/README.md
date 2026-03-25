# Claude Agent SDK 文档

从 [platform.claude.com](https://platform.claude.com/docs/en/agent-sdk/overview) 爬取的官方文档，共 28 篇。

## 目录结构

```
claude-agent-sdk-docs/
├── 01-Getting-Started/          # 入门指南
│   ├── 01-overview.md           # 概述
│   ├── 02-quickstart.md         # 快速开始
│   └── 03-agent-loop.md         # Agent 循环工作原理
│
├── 02-Core-Concepts/            # 核心概念
│   ├── 01-claude-code-features.md  # 使用 Claude Code 功能
│   └── 02-sessions.md              # Session 工作
│
├── 03-Guides/                   # 使用指南
│   ├── 01-streaming-vs-single-mode.md    # 流式输入 vs 单次模式
│   ├── 02-streaming-output.md            # 实时流式响应
│   ├── 03-mcp.md                         # 连接 MCP 服务器
│   ├── 04-custom-tools.md                # 定义自定义工具
│   ├── 05-tool-search.md                 # 工具搜索
│   ├── 06-permissions.md                 # 权限处理
│   ├── 07-user-input.md                  # 用户审批和输入
│   ├── 08-hooks.md                       # 使用 Hooks 控制执行
│   ├── 09-file-checkpointing.md          # 文件检查点
│   ├── 10-structured-outputs.md          # 结构化输出
│   ├── 11-hosting.md                     # 托管 Agent SDK
│   ├── 12-secure-deployment.md           # 安全部署 AI Agent
│   ├── 13-modifying-system-prompts.md    # 修改系统提示
│   ├── 14-subagents.md                   # 子 Agent
│   ├── 15-slash-commands.md              # 斜杠命令
│   ├── 16-skills.md                      # Agent Skills
│   ├── 17-cost-tracking.md               # 跟踪成本和用量
│   ├── 18-todo-tracking.md               # Todo 列表
│   └── 19-plugins.md                     # 插件
│
├── 04-SDK-References/           # SDK 参考
│   ├── 01-typescript.md              # TypeScript SDK
│   ├── 02-typescript-v2-preview.md   # TypeScript V2 (预览版)
│   ├── 03-python.md                  # Python SDK
│   └── 04-migration-guide.md         # 迁移指南
│
└── README.md
```

## 分类说明

| 分类 | 文件数 | 说明 |
|------|--------|------|
| 01-Getting-Started | 3 | 入门基础，了解 Agent SDK 是什么以及如何开始 |
| 02-Core-Concepts | 2 | 核心概念，Claude Code 功能和 Session 机制 |
| 03-Guides | 19 | 详细使用指南，涵盖各种功能和最佳实践 |
| 04-SDK-References | 4 | SDK API 参考文档 |

## 爬取工具

`crawl-agent-sdk-docs.js`