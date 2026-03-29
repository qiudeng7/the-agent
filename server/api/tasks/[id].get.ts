/**
 * @module api/tasks/[id]
 * @description 获取任务详情 API
 *              GET /api/tasks/:id
 */
import { defineEventHandler, createError, getRouterParam } from 'h3'
import { db, tasks } from '~/db'
import { requireAuth } from '~/utils/auth'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event)
  const taskId = getRouterParam(event, 'id')

  if (!taskId) {
    throw createError({
      statusCode: 400,
      message: 'Task ID is required',
    })
  }

  // 查询任务
  const result = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, parseInt(taskId)), isNull(tasks.deletedAt)))
    .limit(1)

  const task = result[0]

  if (!task) {
    throw createError({
      statusCode: 404,
      message: 'Task not found',
    })
  }

  // 权限检查
  if (authUser.role === 'employee' && task.assignedToUserId !== authUser.userId) {
    throw createError({
      statusCode: 403,
      message: 'Access denied',
    })
  }

  if (authUser.role === 'admin' && task.createdByUserId !== authUser.userId) {
    throw createError({
      statusCode: 403,
      message: 'Access denied',
    })
  }

  return {
    success: true,
    data: {
      task: {
        ...task,
        createdAt: task.createdAt.getTime(),
        updatedAt: task.updatedAt.getTime(),
      },
    },
  }
})