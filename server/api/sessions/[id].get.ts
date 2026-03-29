/**
 * @module api/sessions/[id]
 * @description 获取单个会话详情（包含消息） API
 *              GET /api/sessions/:id
 *              需要 Authorization: Bearer <token>
 */
import { defineEventHandler, createError, getRouterParam } from 'h3'
import { db, chatSessions, messages } from '~/db'
import { requireAuth } from '~/utils/auth'
import { eq, asc } from 'drizzle-orm'

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

  // 获取消息
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.timestamp))

  // 返回会话和消息
  return {
    session: {
      id: session.id,
      title: session.title,
      model: session.model,
      taskId: session.taskId,
      createdAt: session.createdAt.getTime(),
      updatedAt: session.updatedAt.getTime(),
    },
    messages: msgs.map((m) => ({
      id: m.id,
      role: m.role,
      content: JSON.parse(m.content),
      model: m.model,
      timestamp: m.timestamp.getTime(),
    })),
  }
})