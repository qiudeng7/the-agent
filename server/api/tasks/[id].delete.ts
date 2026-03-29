/**
 * @module api/tasks/[id]
 * @description 删除任务 API
 *              DELETE /api/tasks/:id
 *              需要 admin 权限，软删除
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

  // 只有 admin 可以删除任务
  if (authUser.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Admin access required',
    })
  }

  // 查询任务
  const existingResult = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, parseInt(taskId)), isNull(tasks.deletedAt)))
    .limit(1)

  const existingTask = existingResult[0]

  if (!existingTask) {
    throw createError({
      statusCode: 404,
      message: 'Task not found',
    })
  }

  // 权限检查：只能删除自己创建的任务
  if (existingTask.createdByUserId !== authUser.userId) {
    throw createError({
      statusCode: 403,
      message: 'Access denied',
    })
  }

  // 软删除
  await db
    .update(tasks)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, parseInt(taskId)))

  return {
    success: true,
  }
})