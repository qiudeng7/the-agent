# Fastify Server 重构规格文档

## 概述

将现有 Nitro + Cloudflare Workers 服务端重构为 Fastify + Node.js 纯独立部署架构。

**重构目标**：
- 简化部署流程，移除 Cloudflare 配置和 wrangler 工具链
- 采用 Fastify 插件化架构，符合 Node.js 最佳实践
- 保持现有数据库层（SQLite + Drizzle ORM）和认证方案（JWT）

---

## 项目结构

```
server/
├── src/
│   ├── app.ts                   # Fastify 应用入口
│   ├── config/
│   │   └── env.ts               # 环境变量配置
│   ├── db/
│   │   ├── index.ts             # 数据库连接 + migrate()
│   │   ├── schema.ts            # Drizzle schema（保持不变）
│   │   └── migrations/          # drizzle-kit generate 生成
│   │       ├── 0000_initial.sql
│   │       └── meta/
│   │           ├── 0000_snapshot.json
│   │           └── _journal.json
│   ├── plugins/                 # Fastify 插件
│   │   ├── auth.ts              # JWT 认证装饰器
│   │   ├── cors.ts              # CORS 配置
│   │   └── db-init.ts           # 初始化管理员数据
│   ├── routes/                  # 路由模块
│   │   ├── auth.ts              # /api/auth/* 路由
│   │   ├── sessions.ts          # /api/sessions/* 路由
│   │   ├── messages.ts          # /api/messages/* 路由
│   │   ├── tasks.ts             # /api/tasks/* 路由
│   │   ├── settings.ts          # /api/settings/* 路由
│   │   └── admin.ts             # /api/admin/* 路由
│   ├── utils/
│   │   ├── crypto.ts            # 密码哈希（保持不变）
│   │   ├── rate-limit.ts        # 速率限制
│   │   └── errors.ts            # 错误定义
│   └── types/
│   │   └── index.ts             # 共享类型定义
├── test/                        # 测试目录
│   ├── unit/                    # 单元测试
│   │   ├── crypto.test.ts       # 密码哈希测试
│   │   ├── auth.test.ts         # JWT 认证测试
│   │   └── rate-limit.test.ts   # 速率限制测试
│   └── e2e/                     # 端到端测试
│   │   ├── auth.test.ts         # 认证流程测试
│   │   ├── sessions.test.ts     # 会话 API 测试
│   │   ├── tasks.test.ts        # 任务 API 测试
│   │   └── admin.test.ts        # 管理 API 测试
│   ├── setup.ts                 # 测试环境设置
│   └── helpers.ts               # 测试辅助函数
├── package.json
├── tsconfig.json
├── vitest.config.ts             # Vitest 配置
├── tsup.config.ts
├── drizzle.config.ts
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

**移除的文件/目录**：
- `.nitro/`、`.output/`、`.wrangler/`（Nitro 构建产物）
- `wrangler.toml`、`worker-configuration.d.ts`（Cloudflare 配置）
- `api/` 目录（Nitro 文件路由）
- `middleware/` 目录（Nitro 中间件）
- `plugins/db-init.ts`（Nitro 插件）
- `db/migrations/all.sql`、`d1-init.sql`（手动合并的迁移）

---

## 数据库层

### 迁移方式

采用 Drizzle 文件迁移方式（类似 Django）：

1. 修改 `src/db/schema.ts` 定义数据模型
2. 执行 `pnpm run db:generate` 生成迁移文件
3. 服务启动时 `migrate()` 自动执行未执行的迁移

**不需要** `drizzle-kit push` 命令。

### src/db/index.ts

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import Database from 'better-sqlite3'
import * as schema from './schema'

const dbPath = process.env.DATABASE_PATH || './data.db'
const sqlite = new Database(dbPath)

export const db = drizzle(sqlite, { schema })

// 自动执行迁移
migrate(db, { migrationsFolder: './src/db/migrations' })

export * from './schema'
```

### drizzle.config.ts

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite'
})
```

### schema.ts

保持现有的表结构定义不变：
- `users` - 用户表
- `chatSessions` - 聊天会话表
- `messages` - 消息表
- `userSettings` - 用户设置表
- `tasks` - 任务表

---

## 插件系统

### src/plugins/auth.ts

JWT 认证装饰器，扩展 Fastify 实例：

```typescript
declare module 'fastify' {
  interface FastifyInstance {
    jwt: {
      sign: (payload: { userId: string; email: string; role: string }) => Promise<string>
      verify: (token: string) => Promise<JwtPayload>
    }
    authenticate: (request: FastifyRequest) => Promise<JwtPayload>
    requireAdmin: (request: FastifyRequest) => Promise<JwtPayload>
  }
}
```

功能：
- `fastify.jwt.sign()` - 生成 JWT（7天有效期）
- `fastify.jwt.verify()` - 验证 JWT
- `fastify.authenticate()` - 从请求头提取并验证 JWT
- `fastify.requireAdmin()` - 验证管理员权限

使用 jose 库实现，保持现有认证逻辑不变。

### src/plugins/cors.ts

使用 `@fastify/cors` 插件：

```typescript
fastify.register(cors, {
  origin: true,  // 允许所有来源
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
})
```

### src/plugins/db-init.ts

首次启动时创建管理员：
- 检查数据库是否有用户
- 从环境变量 `ADMIN_EMAIL`、`ADMIN_PASSWORD` 创建管理员
- 开发环境不再创建测试数据（简化）

---

## 路由模块

### 路由映射

现有 Nitro 文件路由 → Fastify 路由模块：

| Nitro 文件路由 | Fastify 模块 | 路径前缀 |
|---------------|-------------|---------|
| `api/auth/*.ts` | `routes/auth.ts` | `/api/auth` |
| `api/sessions/*.ts` | `routes/sessions.ts` | `/api/sessions` |
| `api/messages/*.ts` | `routes/messages.ts` | `/api/messages` |
| `api/tasks/*.ts` | `routes/tasks.ts` | `/api/tasks` |
| `api/settings/*.ts` | `routes/settings.ts` | `/api/settings` |
| `api/admin/*.ts` | `routes/admin.ts` | `/api/admin` |

### 路由示例

```typescript
// src/routes/auth.ts
export default async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/login
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body as LoginBody
    // ... 登录逻辑
    const token = await fastify.jwt.sign({ userId, email, role })
    return { success: true, data: { token, user } }
  })

  // GET /api/auth/me（需要认证）
  fastify.get('/me', {
    onRequest: async (request) => await fastify.authenticate(request)
  }, async (request) => {
    // ... 返回用户信息
  })
}
```

### 认证使用方式

```typescript
// 方式一：onRequest 钩子
fastify.get('/protected', {
  onRequest: async (request) => await fastify.authenticate(request)
}, async (request) => { ... })

// 方式二：在处理函数内调用
fastify.post('/action', async (request) => {
  const payload = await fastify.authenticate(request)
  // ...
})

// 管理员权限
fastify.get('/admin-only', async (request) => {
  const payload = await fastify.requireAdmin(request)
  // ...
})
```

---

## 应用入口

### src/app.ts

```typescript
import Fastify from 'fastify'
import corsPlugin from './plugins/cors'
import authPlugin from './plugins/auth'
import dbInitPlugin from './plugins/db-init'

import authRoutes from './routes/auth'
import sessionRoutes from './routes/sessions'
import messageRoutes from './routes/messages'
import taskRoutes from './routes/tasks'
import settingsRoutes from './routes/settings'
import adminRoutes from './routes/admin'

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' }
      : undefined
  }
})

// 注册插件
fastify.register(corsPlugin)
fastify.register(authPlugin)
fastify.register(dbInitPlugin)

// 注册路由
fastify.register(authRoutes, { prefix: '/api/auth' })
fastify.register(sessionRoutes, { prefix: '/api/sessions' })
fastify.register(messageRoutes, { prefix: '/api/messages' })
fastify.register(taskRoutes, { prefix: '/api/tasks' })
fastify.register(settingsRoutes, { prefix: '/api/settings' })
fastify.register(adminRoutes, { prefix: '/api/admin' })

// 全局错误处理
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error)
  reply.status(error.statusCode || 500).send({
    success: false,
    error: error.message
  })
})

// 启动服务
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000')
    await fastify.listen({ port, host: '0.0.0.0' })
    fastify.log.info(`Server running on port ${port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
```

---

## 测试

### 测试框架

使用 **Vitest** 作为测试框架：
- 与 Vite 生态一致，配置简单
- 原生支持 TypeScript
- 内置断言、Mock、覆盖率
- 支持 ESM 开箱即用

### 单元测试

单元测试覆盖独立的工具函数和逻辑模块，不涉及数据库和网络。

**test/unit/crypto.test.ts**：
```typescript
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../src/utils/crypto'

describe('crypto', () => {
  it('should hash password', async () => {
    const password = 'test123'
    const hash = await hashPassword(password)
    expect(hash).toBeDefined()
    expect(hash).toContain(':')  // iterations:salt:hash
  })

  it('should verify correct password', async () => {
    const password = 'test123'
    const hash = await hashPassword(password)
    const isValid = await verifyPassword(password, hash)
    expect(isValid).toBe(true)
  })

  it('should reject wrong password', async () => {
    const password = 'test123'
    const hash = await hashPassword(password)
    const isValid = await verifyPassword('wrong', hash)
    expect(isValid).toBe(false)
  })
})
```

**test/unit/auth.test.ts**：
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { buildTestApp } from '../helpers'

describe('JWT Plugin', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
  })

  it('should sign and verify token', async () => {
    const payload = { userId: '123', email: 'test@test.com', role: 'user' }
    const token = await app.jwt.sign(payload)
    const decoded = await app.jwt.verify(token)
    expect(decoded.userId).toBe('123')
    expect(decoded.email).toBe('test@test.com')
  })

  it('should reject invalid token', async () => {
    await expect(app.jwt.verify('invalid-token')).rejects.toThrow()
  })
})
```

**test/unit/rate-limit.test.ts**：
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit, recordSuccess, clearRateLimit } from '../src/utils/rate-limit'

describe('rate-limit', () => {
  beforeEach(() => {
    clearRateLimit()
  })

  it('should allow requests within limit', () => {
    const key = 'test:127.0.0.1'
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(key, { max: 5, windowMs: 60000 })
      expect(result.allowed).toBe(true)
    }
  })

  it('should block requests over limit', () => {
    const key = 'test:127.0.0.1'
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, { max: 5, windowMs: 60000 })
    }
    const result = checkRateLimit(key, { max: 5, windowMs: 60000 })
    expect(result.allowed).toBe(false)
  })
})
```

### 端到端测试

端到端测试覆盖完整的 API 流程，使用独立的测试数据库。

**test/helpers.ts**：
```typescript
import Fastify from 'fastify'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import corsPlugin from '../src/plugins/cors'
import authPlugin from '../src/plugins/auth'
import * as schema from '../src/db/schema'

// 构建测试用 Fastify 应用
export async function buildTestApp() {
  const app = Fastify({ logger: false })

  // 使用内存数据库
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite, { schema })

  // 执行迁移
  migrate(db, { migrationsFolder: './src/db/migrations' })

  // 注册插件
  app.decorate('db', db)
  await app.register(corsPlugin)
  await app.register(authPlugin)

  return app
}

// 测试用户创建
export async function createTestUser(db: any, overrides = {}) {
  const { nanoid } = await import('nanoid')
  const { hashPassword } = await import('../src/utils/crypto')

  const id = nanoid()
  const now = new Date()

  await db.insert(schema.users).values({
    id,
    email: `test-${id}@test.com`,
    passwordHash: await hashPassword('test123'),
    nickname: 'Test User',
    role: 'employee',
    createdAt: now,
    updatedAt: now,
    ...overrides
  })

  return id
}
```

**test/e2e/auth.test.ts**：
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildTestApp, createTestUser } from '../helpers'
import authRoutes from '../../src/routes/auth'

describe('Auth API', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildTestApp()
    await app.register(authRoutes, { prefix: '/api/auth' })
  })

  afterEach(async () => {
    await app.close()
  })

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      const userId = await createTestUser(app.db, { email: 'test@test.com' })

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@test.com', password: 'test123' }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.token).toBeDefined()
    })

    it('should reject wrong password', async () => {
      await createTestUser(app.db, { email: 'test@test.com' })

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@test.com', password: 'wrong' }
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return user info with valid token', async () => {
      const userId = await createTestUser(app.db, { email: 'test@test.com' })
      const token = await app.jwt.sign({ userId, email: 'test@test.com', role: 'employee' })

      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { Authorization: `Bearer ${token}` }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.email).toBe('test@test.com')
    })

    it('should reject without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me'
      })

      expect(response.statusCode).toBe(401)
    })
  })
})
```

**test/e2e/tasks.test.ts**：
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildTestApp, createTestUser } from '../helpers'
import taskRoutes from '../../src/routes/tasks'

describe('Tasks API', () => {
  let app: FastifyInstance
  let adminToken: string
  let employeeToken: string

  beforeEach(async () => {
    app = await buildTestApp()
    await app.register(taskRoutes, { prefix: '/api/tasks' })

    const adminId = await createTestUser(app.db, { email: 'admin@test.com', role: 'admin' })
    const employeeId = await createTestUser(app.db, { email: 'emp@test.com', role: 'employee' })

    adminToken = await app.jwt.sign({ userId: adminId, email: 'admin@test.com', role: 'admin' })
    employeeToken = await app.jwt.sign({ userId: employeeId, email: 'emp@test.com', role: 'employee' })
  })

  afterEach(async () => {
    await app.close()
  })

  describe('GET /api/tasks', () => {
    it('should return tasks list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tasks',
        headers: { Authorization: `Bearer ${employeeToken}` }
      })

      expect(response.statusCode).toBe(200)
    })
  })

  describe('POST /api/tasks', () => {
    it('should create task', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks',
        headers: { Authorization: `Bearer ${adminToken}` },
        payload: { title: 'New Task', description: 'Test task' }
      })

      expect(response.statusCode).toBe(201)
    })
  })
})
```

### 测试配置

**vitest.config.ts**：
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/db/migrations/**']
    },
    testTimeout: 10000,
    hookTimeout: 10000
  }
})
```

### 测试命令

```bash
pnpm run test              # 运行所有测试
pnpm run test:unit         # 只运行单元测试
pnpm run test:e2e          # 只运行端到端测试
pnpm run test:coverage     # 运行测试并生成覆盖率报告
pnpm run test:watch        # 监听模式运行测试
```

---

## 构建与部署

### package.json

```json
{
  "name": "@the-agent/server",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/app.ts",
    "build": "tsup",
    "start": "node dist/index.js",
    "db:generate": "drizzle-kit generate",
    "test": "vitest run",
    "test:unit": "vitest run test/unit",
    "test:e2e": "vitest run test/e2e",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest",
    "docker:build": "docker build -t the-agent-server .",
    "docker:tag": "docker tag the-agent-server crpi-hvru9zd4pbpi8a42.cn-shanghai.personal.cr.aliyuncs.com/qiudeng-private/the-agent-server:latest",
    "docker:push": "docker push crpi-hvru9zd4pbpi8a42.cn-shanghai.personal.cr.aliyuncs.com/qiudeng-private/the-agent-server:latest",
    "docker:deploy": "pnpm run docker:build && pnpm run docker:tag && pnpm run docker:push"
  },
  "dependencies": {
    "fastify": "^5.0.0",
    "@fastify/cors": "^10.0.0",
    "better-sqlite3": "^12.8.0",
    "drizzle-orm": "^0.40.0",
    "jose": "^5.9.6",
    "nanoid": "^5.1.2",
    "pino-pretty": "^11.0.0"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "tsx": "^4.21.0",
    "typescript": "~5.7.2",
    "drizzle-kit": "^0.30.0",
    "@types/better-sqlite3": "^7.6.13",
    "@types/node": "^25.5.0",
    "vitest": "^3.0.0",
    "@vitest/coverage-v8": "^3.0.0"
  }
}
```

### tsup.config.ts

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/app.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  minify: true,
  sourcemap: true
})
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "~/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Dockerfile

```dockerfile
# 阶段1：构建
FROM node:20-alpine AS builder
WORKDIR /build
RUN apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# 阶段2：运行环境
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /build/dist ./dist
COPY --from=builder /build/package.json ./
COPY --from=builder /build/node_modules ./node_modules
COPY src/db/migrations ./migrations

RUN mkdir -p /data

ENV NODE_ENV=production
ENV DATABASE_PATH=/data/data.db

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### docker-compose.yml

```yaml
services:
  the-agent-server:
    image: crpi-hvru9zd4pbpi8a42.cn-shanghai.personal.cr.aliyuncs.com/qiudeng-private/the-agent-server:latest
    container_name: the-agent-server
    restart: unless-stopped
    ports:
      - "3030:3000"
    volumes:
      - ./data:/data
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/data/data.db
      - JWT_SECRET=${JWT_SECRET}
      - ADMIN_EMAIL=${ADMIN_EMAIL}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
```

### 环境变量

`.env.example`:
```
JWT_SECRET=your-secret-key
DATABASE_PATH=./data.db
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-password
PORT=3000
```

---

## 迁移执行计划

### 步骤 1：创建新项目结构

- 清理 server/ 目录，移除 Nitro 相关文件
- 创建 `src/` 子目录结构

### 步骤 2：迁移数据库层

- 复制 `db/schema.ts` → `src/db/schema.ts`
- 删除现有迁移文件，重新生成
- 实现 `src/db/index.ts`（简化版，只用 better-sqlite3）

### 步骤 3：迁移工具函数

- 复制 `utils/crypto.ts` → `src/utils/crypto.ts`（保持不变）
- 复制 `utils/rate-limit.ts` → `src/utils/rate-limit.ts`
- 创建 `src/utils/errors.ts`

### 步骤 4：实现插件系统

- 创建 `src/plugins/auth.ts`
- 创建 `src/plugins/cors.ts`
- 创建 `src/plugins/db-init.ts`（简化版）

### 步骤 5：迁移路由

- 将 22 个 Nitro 文件路由合并为 6 个路由模块
- 调整认证方式为 `fastify.authenticate()`

### 步骤 6：创建应用入口

- 创建 `src/app.ts`
- 创建 `src/config/env.ts`

### 步骤 7：配置构建和部署

- 更新 `package.json`
- 创建 `tsup.config.ts`
- 更新 `tsconfig.json`
- 更新 `Dockerfile`
- 更新 `docker-compose.yml`
- 更新 `drizzle.config.ts`

### 步骤 8：配置测试环境

- 创建 `vitest.config.ts`
- 创建 `test/setup.ts` 和 `test/helpers.ts`
- 配置测试数据库（内存数据库）

### 步骤 9：编写单元测试

- 创建 `test/unit/crypto.test.ts`（密码哈希测试）
- 创建 `test/unit/auth.test.ts`（JWT 测试）
- 创建 `test/unit/rate-limit.test.ts`（速率限制测试）

### 步骤 10：编写端到端测试

- 创建 `test/e2e/auth.test.ts`（认证流程测试）
- 创建 `test/e2e/sessions.test.ts`（会话 API 测试）
- 创建 `test/e2e/tasks.test.ts`（任务 API 测试）
- 创建 `test/e2e/admin.test.ts`（管理 API 测试）

### 步骤 11：验证和部署

- 运行 `pnpm run test` 确保所有测试通过
- 运行 `pnpm run test:coverage` 确保覆盖率达标
- 运行 `pnpm run dev` 启动开发服务
- 构建 Docker 镜像并部署测试

---

## API 端点清单

保持现有 22 个 API 端点不变：

### 认证 `/api/auth`
- POST `/login` - 登录
- POST `/register` - 注册
- GET `/me` - 获取当前用户信息

### 会话 `/api/sessions`
- GET `/` - 获取用户所有会话
- POST `/` - 创建新会话
- GET `/:id` - 获取单个会话详情
- PUT `/:id` - 更新会话
- DELETE `/:id` - 删除会话

### 消息 `/api/messages`
- POST `/:sessionId` - 发送消息

### 任务 `/api/tasks`
- GET `/` - 获取任务列表
- GET `/stats` - 获取任务统计
- POST `/` - 创建任务
- GET `/:id` - 获取单个任务
- PATCH `/:id` - 更新任务
- DELETE `/:id` - 删除任务

### 设置 `/api/settings`
- GET `/` - 获取用户设置
- PUT `/` - 更新用户设置

### 管理 `/api/admin`
- GET `/database/:table` - 获取表数据
- POST `/database/:table` - 创建记录
- DELETE `/database/:table/:id` - 删除记录
- PATCH `/database/:table/:id` - 更新记录
- POST `/tasks/batch` - 批量创建任务
- DELETE `/tasks/batch` - 批量删除任务
- POST `/users/batch` - 批量创建用户
- DELETE `/users/batch` - 批量删除用户

---

## 保留不变的部分

- **数据模型**：`schema.ts` 表结构定义
- **密码哈希**：`crypto.ts` PBKDF2 实现
- **JWT 认证**：jose 库，7天有效期
- **速率限制**：登录速率限制逻辑
- **API 行为**：请求/响应格式保持一致

---

## 总结

此重构将 Nitro + Cloudflare Workers 架构转换为 Fastify + Node.js 纯独立部署架构，主要变化：

1. **框架切换**：Nitro → Fastify
2. **路由组织**：文件路由 → 插件模块化路由
3. **中间件**：Nitro middleware → Fastify plugins
4. **数据库**：移除 D1 支持，只用 better-sqlite3
5. **迁移**：移除手动合并，使用 drizzle-kit generate
6. **部署**：移除 Cloudflare，使用阿里云镜像仓库
7. **构建**：tsup + ES Module
8. **测试**：Vitest 单元测试 + 端到端测试

API 行为和数据结构保持不变，客户端无需修改。