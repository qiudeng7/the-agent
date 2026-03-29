/**
 * @module plugins/db-init
 * @description 数据库初始化插件
 *              在 Nitro 服务启动时检查并初始化测试数据
 */
import { getDb, users, tasks } from '~/db'
import { hashPassword } from '~/utils/crypto'
import { nanoid } from 'nanoid'
import { eq } from 'drizzle-orm'

let initialized = false

async function initDatabase() {
  if (initialized) return

  const db = getDb()

  console.log('[DB Init] Checking database status...')

  // 检查是否已有用户
  const existingUsers = await db.select().from(users)

  if (existingUsers.length > 0) {
    console.log('[DB Init] Database already has data, skipping initialization...')
    initialized = true
    return
  }

  console.log('[DB Init] Creating initial users...')

  const now = new Date()
  const adminId = nanoid()
  const employeeId = nanoid()

  // 创建管理员用户
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

  console.log('[DB Init] Users created')

  // 创建测试任务
  console.log('[DB Init] Creating test tasks...')

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
  initialized = true
  console.log('[DB Init] Database initialization completed!')
}

// Nitro 3 plugin format
export default () => {
  initDatabase().catch((error) => {
    console.error('[DB Init] Failed to initialize database:', error)
  })
}