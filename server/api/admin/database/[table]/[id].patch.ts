/**
 * @module api/admin/database/[table]/[id]
 * @description 更新数据库记录 API
 *              PATCH /api/admin/database/:table/:id
 *              需要 admin 权限
 */
import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { db, users, tasks } from '~/db'
import { requireAdmin } from '~/utils/auth'
import { eq } from 'drizzle-orm'

interface UpdateUserBody {
  email?: string
  nickname?: string
  role?: 'admin' | 'employee'
}

interface UpdateTaskBody {
  title?: string
  category?: string
  tag?: string
  description?: string
  status?: 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled'
  assignedToUserId?: string | null
}

type UpdateBody = UpdateUserBody & UpdateTaskBody

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const tableName = getRouterParam(event, 'table')
  const recordId = getRouterParam(event, 'id')
  const body = await readBody<UpdateBody>(event)

  if (!tableName || !recordId) {
    throw createError({
      statusCode: 400,
      message: 'Table name and record ID are required',
    })
  }

  if (!body) {
    throw createError({
      statusCode: 400,
      message: 'Request body is required',
    })
  }

  const now = new Date()
  let result: any

  switch (tableName) {
    case 'users': {
      const updateData: Record<string, any> = { updatedAt: now }
      if (body.email !== undefined) updateData.email = body.email
      if (body.nickname !== undefined) updateData.nickname = body.nickname
      if (body.role !== undefined) updateData.role = body.role

      result = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, recordId))
        .returning()
      break
    }

    case 'tasks': {
      const updateData: Record<string, any> = { updatedAt: now }
      if (body.title !== undefined) updateData.title = body.title
      if (body.category !== undefined) updateData.category = body.category
      if (body.tag !== undefined) updateData.tag = body.tag
      if (body.description !== undefined) updateData.description = body.description
      if (body.status !== undefined) updateData.status = body.status
      if (body.assignedToUserId !== undefined) updateData.assignedToUserId = body.assignedToUserId

      result = await db
        .update(tasks)
        .set(updateData)
        .where(eq(tasks.id, parseInt(recordId)))
        .returning()
      break
    }

    default:
      throw createError({
        statusCode: 400,
        message: 'Invalid table name',
      })
  }

  if (!result || result.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'Record not found',
    })
  }

  return {
    success: true,
    data: result[0],
  }
})