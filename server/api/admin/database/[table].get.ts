/**
 * @module api/admin/database/[table]
 * @description 获取数据库表数据 API
 *              GET /api/admin/database/:table
 *              需要 admin 权限
 */
import { defineEventHandler, createError, getRouterParam } from 'h3'
import { db, users, tasks } from '~/db'
import { requireAdmin } from '~/utils/auth'
import { isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const tableName = getRouterParam(event, 'table')

  if (!tableName) {
    throw createError({
      statusCode: 400,
      message: 'Table name is required',
    })
  }

  let data: any[] = []

  switch (tableName) {
    case 'users':
      data = await db.select().from(users).where(isNull(users.deletedAt))
      break

    case 'tasks':
      data = await db.select().from(tasks).where(isNull(tasks.deletedAt))
      break

    default:
      throw createError({
        statusCode: 400,
        message: 'Invalid table name',
      })
  }

  return {
    success: true,
    data,
  }
})