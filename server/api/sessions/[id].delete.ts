/**
 * @module api/sessions/[id].delete
 * @description 删除会话 API
 *              DELETE /api/sessions/:id
 *              需要 Authorization: Bearer <token>
 */
import { defineEventHandler, createError, getRouterParam } from 'h3'
import { db, chatSessions } from '~/db'
import { requireAuth } from '~/utils/auth'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // 验证 JWT
  const payload = await requireAuth(event)

  // 获取会话 ID
  const sessionId = getRouterParam(event, 'id')
  if (!sessionId) {
    throw createError({
      statusCode: 400,
      message: 'Session ID is required',
    })
  }

  // 查找会话
  const sessionResult = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1)

  const session = sessionResult[0]

  if (!session) {
    throw createError({
      statusCode: 404,
      message: 'Session not found',
    })
  }

  // 验证所有权
  if (session.userId !== payload.userId) {
    throw createError({
      statusCode: 403,
      message: 'Access denied',
    })
  }

  // 删除会话（消息会级联删除）
  await db.delete(chatSessions).where(eq(chatSessions.id, sessionId))

  // 返回结果
  return {
    success: true,
    id: sessionId,
  }
})