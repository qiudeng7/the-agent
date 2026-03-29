/**
 * @module api/admin/tasks/batch
 * @description 批量创建任务 API
 *              POST /api/admin/tasks/batch
 *              需要 admin 权限
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { db, tasks } from '~/db'
import { requireAdmin } from '~/utils/auth'

interface BatchTaskItem {
  title: string
  category?: string
  tag?: string
  description?: string
  assignedToUserId?: string
}

export default defineEventHandler(async (event) => {
  const authUser = await requireAdmin(event)
  const body = await readBody<{ tasks: BatchTaskItem[] }>(event)

  if (!body?.tasks || !Array.isArray(body.tasks) || body.tasks.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Tasks array is required',
    })
  }

  const now = new Date()
  const tasksToCreate = body.tasks.map((task) => ({
    title: task.title,
    category: task.category || null,
    tag: task.tag || null,
    description: task.description || null,
    status: 'todo' as const,
    createdByUserId: authUser.userId,
    assignedToUserId: task.assignedToUserId || null,
    createdAt: now,
    updatedAt: now,
  }))

  const result = await db.insert(tasks).values(tasksToCreate).returning()

  return {
    success: true,
    data: {
      created: result.length,
      tasks: result.map((t) => ({
        ...t,
        createdAt: t.createdAt.getTime(),
        updatedAt: t.updatedAt.getTime(),
      })),
    },
  }
})