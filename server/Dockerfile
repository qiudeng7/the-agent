# The Agent API Server - Dockerfile
# 用于 standalone 模式的单机部署
#
# 构建步骤：
# 1. 先在本地构建：pnpm run build:standalone
# 2. 构建 Docker 镜像：docker build -t the-agent-api .

# 阶段1：安装并编译原生模块
FROM node:20-alpine AS builder

# 安装编译依赖
RUN apk add --no-cache python3 make g++

WORKDIR /build

# 复制 package.json 用于安装依赖
COPY .output/server/package.json ./

# 安装 better-sqlite3（会自动编译）
RUN npm install better-sqlite3 --build-from-source

# 阶段2：运行环境
FROM node:20-alpine

WORKDIR /app

# 复制构建产物（排除 Windows 编译的 better-sqlite3）
COPY .output/server/ ./

# 从 builder 阶段复制正确编译的 better-sqlite3
COPY --from=builder /build/node_modules/better-sqlite3 ./node_modules/better-sqlite3

# 复制迁移文件
COPY db/migrations ./db/migrations/

# 创建数据目录
RUN mkdir -p /data

# 环境变量默认值（可在运行时覆盖）
ENV NODE_ENV=production
ENV DEPLOY_MODE=standalone
ENV DATABASE_PATH=/data/data.db

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["node", "index.mjs"]