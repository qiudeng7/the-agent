/**
 * @module api/admin/tasks/batch
 * @description 批量删除任务 API
 *              DELETE /api/admin/tasks/batch
 *              需要 admin 权限，软删除
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { db, tasks } from '~/db'
import { requireAdmin } from '~/utils/auth'
import { inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<{ ids: number[] }>(event)

  if (!body?.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Task IDs array is required',
    })
  }

  const now = new Date()

  await db
    .update(tasks)
    .set({
      deletedAt: now,
      updatedAt: now,
    })
    .where(inArray(tasks.id, body.ids))

  return {
    success: true,
    data: {
      deleted: body.ids.length,
    },
  }
})