# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 设置 corepack 国内镜像（仅下载 pnpm）
# ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com
RUN corepack enable && corepack prepare pnpm@latest --activate
# npm 包用腾讯云镜像（同步更完整）
# RUN pnpm config set registry https://mirrors.cloud.tencent.com/npm/

# 复制 package.json 和 lock 文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制 prisma schema 并生成 Client（利用 Docker 缓存）
COPY prisma ./prisma/
# Prisma 引擎使用腾讯云镜像
# ENV PRISMA_ENGINES_MIRROR=https://mirrors.cloud.tencent.com/prisma
# ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
RUN pnpm prisma generate

# 复制源代码并构建
COPY . .
RUN pnpm build

# 生产阶段
FROM node:20-alpine AS production

WORKDIR /app

# 安装 better-sqlite3 构建依赖
RUN apk add --no-cache python3 make g++ sqlite-dev

# 复制必要文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

# 重新构建 better-sqlite3（native addon 需要在目标环境编译）
RUN npm rebuild better-sqlite3

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/src/main.js"]