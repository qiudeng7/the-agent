---
name: publish-to-gitea
description: 发布构建产物到自建 Gitea Releases，自动保留最近 5 个版本
---

## 任务

将 Electron 应用的构建产物发布到 Gitea 自建仓库的 Releases，并清理旧版本（只保留最近 5 个）。

当前项目的 repo 为 `qiudeng/the-agent`.

```bash
tea logins ls                          # 查看登录状态
tea releases ls -R <repo>              # 列出 releases
tea release create -R <repo> <tag>     # 创建 release
tea release upload -R <repo> <tag> <file>  # 上传文件
tea release delete -R <repo> <tag>     # 删除 release
```
