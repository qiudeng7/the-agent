/**
 * @module api/sessions/[id].put
 * @description 更新会话标题 API
 *              PUT /api/sessions/:id
 *              需要 Authorization: Bearer <token>
 */
import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { db, chatSessions } from '~/db'
import { requireAuth } from '~/utils/auth'
import { eq } from 'drizzle-orm'

interface UpdateSessionBody {
  title: string
}

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

  const body = await readBody<UpdateSessionBody>(event)
  if (!body) {
    throw createError({
      statusCode: 400,
      message: 'Request body is required',
    })
  }
  if (!body.title) {
    throw createError({
      statusCode: 400,
      message: 'Title is required',
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

  // 更新会话
  const now = new Date()
  await db
    .update(chatSessions)
    .set({
      title: body.title,
      updatedAt: now,
    })
    .where(eq(chatSessions.id, sessionId))

  // 返回更新后的会话
  return {
    id: sessionId,
    title: body.title,
    model: session.model,
    createdAt: session.createdAt.getTime(),
    updatedAt: now.getTime(),
  }
})