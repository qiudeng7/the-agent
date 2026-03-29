/**
 * @module api/tasks/[id]
 * @description 更新任务 API
 *              PATCH /api/tasks/:id
 */
import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { db, tasks } from '~/db'
import { requireAuth } from '~/utils/auth'
import { eq, and, isNull } from 'drizzle-orm'

interface UpdateTaskBody {
  title?: string
  category?: string
  tag?: string
  description?: string
  status?: 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled'
  assignedToUserId?: string | null
}

export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event)
  const taskId = getRouterParam(event, 'id')
  const body = await readBody<UpdateTaskBody>(event)

  if (!taskId) {
    throw createError({
      statusCode: 400,
      message: 'Task ID is required',
    })
  }

  if (!body) {
    throw createError({
      statusCode: 400,
      message: 'Request body is required',
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

  // 权限检查
  if (authUser.role === 'employee') {
    // 员工只能更新分配给自己的任务，且只能更新状态和描述
    if (existingTask.assignedToUserId !== authUser.userId) {
      throw createError({
        statusCode: 403,
        message: 'Access denied',
      })
    }
    // 员工只能更新状态和描述
    const allowedUpdates: Partial<UpdateTaskBody> = {}
    if (body.status) allowedUpdates.status = body.status
    if (body.description !== undefined) allowedUpdates.description = body.description

    const now = new Date()
    const result = await db
      .update(tasks)
      .set({
        ...allowedUpdates,
        updatedAt: now,
      })
      .where(eq(tasks.id, parseInt(taskId)))
      .returning()

    return {
      success: true,
      data: {
        task: {
          ...result[0],
          createdAt: result[0].createdAt.getTime(),
          updatedAt: result[0].updatedAt.getTime(),
        },
      },
    }
  }

  // Admin 可以更新所有字段
  const now = new Date()
  const updateData: Record<string, any> = {
    updatedAt: now,
  }

  if (body.title !== undefined) updateData.title = body.title
  if (body.category !== undefined) updateData.category = body.category
  if (body.tag !== undefined) updateData.tag = body.tag
  if (body.description !== undefined) updateData.description = body.description
  if (body.status !== undefined) updateData.status = body.status
  if (body.assignedToUserId !== undefined) updateData.assignedToUserId = body.assignedToUserId

  const result = await db
    .update(tasks)
    .set(updateData)
    .where(eq(tasks.id, parseInt(taskId)))
    .returning()

  return {
    success: true,
    data: {
      task: {
        ...result[0],
        createdAt: result[0].createdAt.getTime(),
        updatedAt: result[0].updatedAt.getTime(),
      },
    },
  }
})