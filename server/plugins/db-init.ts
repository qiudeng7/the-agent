/**
 * @module plugins/db-init
 * @description 数据库初始化插件
 *              在 Nitro 服务启动时检查并初始化数据
 *
 *              初始化逻辑：
 *              - D1 环境：跳过（通过迁移初始化）
 *              - Standalone 模式：通过环境变量创建管理员（ADMIN_EMAIL、ADMIN_PASSWORD）
 *              - 开发环境：创建默认测试数据
 */
import { db, users, tasks } from '~/db'
import { hashPassword } from '~/utils/crypto'
import { nanoid } from 'nanoid'

let initialized = false

async function initDatabase() {
  if (initialized) return

  // 检查部署模式
  const deployMode = process.env.DEPLOY_MODE || 'cloudflare'
  const env = (globalThis as any).__env__

  // D1 环境：跳过初始化（通过 D1 迁移）
  if (deployMode === 'cloudflare' && env?.DB) {
    console.log('[DB Init] D1 mode: skipping initialization')
    initialized = true
    return
  }

  console.log('[DB Init] Checking database status...')

  // 检查是否已有用户
  const existingUsers = await db.select().from(users)

  if (existingUsers.length > 0) {
    console.log('[DB Init] Database already has users, skipping initialization')
    initialized = true
    return
  }

  // 根据部署模式决定初始化方式
  if (deployMode === 'standalone') {
    // Standalone 模式：通过环境变量创建管理员
    await initStandaloneAdmin()
  } else {
    // 开发环境：创建测试数据
    await initDevData()
  }

  initialized = true
  console.log('[DB Init] Database initialization completed!')
}

/**
 * Standalone 模式：通过环境变量创建管理员
 */
async function initStandaloneAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    console.log('[DB Init] No ADMIN_EMAIL/ADMIN_PASSWORD configured, skipping admin creation')
    console.log('[DB Init] You can create admin via API: POST /api/auth/register')
    return
  }

  console.log(`[DB Init] Creating admin user: ${adminEmail}`)

  const now = new Date()
  const adminId = nanoid()

  await db.insert(users).values({
    id: adminId,
    email: adminEmail,
    passwordHash: await hashPassword(adminPassword),
    nickname: 'Admin',
    role: 'admin',
    createdAt: now,
    updatedAt: now,
  })

  console.log('[DB Init] Admin user created successfully')
}

/**
 * 开发环境：创建测试数据
 */
async function initDevData() {
  console.log('[DB Init] Creating development test data...')

  const now = new Date()
  const adminId = nanoid()
  const employeeId = nanoid()

  // 创建管理员和员工用户
  await db.insert(users).values([
    {
      id: adminId,
      email: 'admin@the-console.com',
      passwordHash: await hashPassword('admin123'),
      nickname: 'Admin',
      role: 'admin',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: employeeId,
      email: 'employee@the-console.com',
      passwordHash: await hashPassword('employee123'),
      nickname: 'Employee',
      role: 'employee',
      createdAt: now,
      updatedAt: now,
    },
  ])

  console.log('[DB Init] Test users created')

  // 创建测试任务
  await db.insert(tasks).values([
    {
      title: '测试任务1 - UI测试',
      category: 'testing',
      tag: 'UI测试',
      description:
        '执行UI测试用例并记录结果\n1. 检查页面布局\n2. 测试表单提交\n3. 验证响应式设计',
      status: 'todo',
      createdByUserId: adminId,
      assignedToUserId: employeeId,
      createdAt: now,
      updatedAt: now,
    },
    {
      title: '测试任务2 - API测试',
      category: 'testing',
      tag: 'API测试',
      description:
        '测试API接口功能\n- GET /api/tasks\n- POST /api/tasks\n- PATCH /api/tasks/[id]',
      status: 'todo',
      createdByUserId: adminId,
      assignedToUserId: employeeId,
      createdAt: now,
      updatedAt: now,
    },
    {
      title: '测试任务3 - 性能测试',
      category: 'testing',
      tag: '性能测试',
      description:
        '测试系统性能指标\n- 页面加载时间\n- API响应时间\n- 并发处理能力',
      status: 'in_progress',
      createdByUserId: adminId,
      assignedToUserId: employeeId,
      createdAt: now,
      updatedAt: now,
    },
  ])

  console.log('[DB Init] Test tasks created')
}

// Nitro 3 plugin format
export default () => {
  initDatabase().catch((error) => {
    console.error('[DB Init] Failed to initialize database:', error)
  })
}