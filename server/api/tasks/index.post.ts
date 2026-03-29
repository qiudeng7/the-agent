/**
 * @module api/tasks/index
 * @description 创建任务 API
 *              POST /api/tasks
 *              需要 admin 权限
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { db, tasks } from '~/db'
import { requireAuth } from '~/utils/auth'

interface CreateTaskBody {
  title: string
  category?: string
  tag?: string
  description?: string
  assignedToUserId?: string
}

export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event)
  const body = await readBody<CreateTaskBody>(event)

  // 验证必填字段
  if (!body?.title) {
    throw createError({
      statusCode: 400,
      message: 'Task title is required',
    })
  }

  const now = new Date()

  // 创建任务
  const result = await db
    .insert(tasks)
    .values({
      title: body.title,
      category: body.category || null,
      tag: body.tag || null,
      description: body.description || null,
      status: 'todo',
      createdByUserId: authUser.userId,
      assignedToUserId: body.assignedToUserId || null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  const newTask = result[0]

  return {
    success: true,
    data: {
      task: {
        ...newTask,
        createdAt: newTask.createdAt.getTime(),
        updatedAt: newTask.updatedAt.getTime(),
      },
    },
  }
})