/**
 * @module api/admin/database/[table]/[id]
 * @description 删除数据库记录 API
 *              DELETE /api/admin/database/:table/:id
 *              需要 admin 权限，软删除
 */
import { defineEventHandler, createError, getRouterParam } from 'h3'
import { db, users, tasks } from '~/db'
import { requireAdmin } from '~/utils/auth'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const tableName = getRouterParam(event, 'table')
  const recordId = getRouterParam(event, 'id')

  if (!tableName || !recordId) {
    throw createError({
      statusCode: 400,
      message: 'Table name and record ID are required',
    })
  }

  const now = new Date()

  switch (tableName) {
    case 'users':
      await db
        .update(users)
        .set({
          deletedAt: now,
          updatedAt: now,
        })
        .where(eq(users.id, recordId))
      break

    case 'tasks':
      await db
        .update(tasks)
        .set({
          deletedAt: now,
          updatedAt: now,
        })
        .where(eq(tasks.id, parseInt(recordId)))
      break

    default:
      throw createError({
        statusCode: 400,
        message: 'Invalid table name',
      })
  }

  return {
    success: true,
  }
})