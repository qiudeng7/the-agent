/**
 * @module api/admin/database/[table]
 * @description 创建数据库记录 API
 *              POST /api/admin/database/:table
 *              需要 admin 权限
 */
import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { db, users, tasks } from '~/db'
import { requireAdmin } from '~/utils/auth'
import { hashPassword } from '~/utils/crypto'
import { nanoid } from 'nanoid'

interface CreateUserBody {
  email: string
  password: string
  nickname?: string
  role?: 'admin' | 'employee'
}

interface CreateTaskBody {
  title: string
  category?: string
  tag?: string
  description?: string
  status?: 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled'
  assignedToUserId?: string
}

interface CreateUserResult {
  id: string
  email: string
  nickname: string | null
  role: string
  createdAt: Date
}

interface CreateTaskResult {
  id: number
  title: string
  category: string | null
  status: string
  createdAt: Date
}

type CreateResultItem = CreateUserResult | CreateTaskResult
type CreateResult = CreateResultItem[]

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const tableName = getRouterParam(event, 'table')
  const body = await readBody<CreateUserBody | CreateTaskBody>(event)

  if (!tableName) {
    throw createError({
      statusCode: 400,
      message: 'Table name is required',
    })
  }

  const now = new Date()
  let result: CreateResult

  switch (tableName) {
    case 'users': {
      const userBody = body as CreateUserBody
      if (!userBody.email || !userBody.password) {
        throw createError({
          statusCode: 400,
          message: 'Email and password are required',
        })
      }
      const userId = nanoid()
      const passwordHash = await hashPassword(userBody.password)
      result = await db
        .insert(users)
        .values({
          id: userId,
          email: userBody.email,
          passwordHash,
          nickname: userBody.nickname || null,
          role: userBody.role || 'employee',
          createdAt: now,
          updatedAt: now,
        })
        .returning()
      break
    }

    case 'tasks': {
      const taskBody = body as CreateTaskBody
      if (!taskBody.title) {
        throw createError({
          statusCode: 400,
          message: 'Task title is required',
        })
      }
      const authUser = await requireAdmin(event)
      result = await db
        .insert(tasks)
        .values({
          title: taskBody.title,
          category: taskBody.category || null,
          tag: taskBody.tag || null,
          description: taskBody.description || null,
          status: taskBody.status || 'todo',
          createdByUserId: authUser.userId,
          assignedToUserId: taskBody.assignedToUserId || null,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
      break
    }

    default:
      throw createError({
        statusCode: 400,
        message: 'Invalid table name',
      })
  }

  return {
    success: true,
    data: result[0],
  }
})