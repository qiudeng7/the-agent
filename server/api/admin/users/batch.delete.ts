/**
 * @module api/admin/users/batch
 * @description 批量删除用户 API
 *              DELETE /api/admin/users/batch
 *              需要 admin 权限，软删除
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { db, users } from '~/db'
import { requireAdmin } from '~/utils/auth'
import { inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<{ ids: string[] }>(event)

  if (!body?.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'User IDs array is required',
    })
  }

  const now = new Date()

  await db
    .update(users)
    .set({
      deletedAt: now,
      updatedAt: now,
    })
    .where(inArray(users.id, body.ids))

  return {
    success: true,
    data: {
      deleted: body.ids.length,
    },
  }
})