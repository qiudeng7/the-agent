/**
 * @module api/sessions/index
 * @description 获取用户所有会话 API
 *              GET /api/sessions
 *              需要 Authorization: Bearer <token>
 */
import { defineEventHandler } from 'h3'
import { db, chatSessions, messages, type ChatSession } from '~/db'
import { requireAuth } from '~/utils/auth'
import { eq, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // 验证 JWT
  const payload = await requireAuth(event)

  // 获取用户所有会话，按更新时间倒序
  const sessions = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, payload.userId))
    .orderBy(desc(chatSessions.updatedAt))

  // 获取每个会话的消息数量（不加载消息内容，减少传输）
  const sessionsWithCounts = await Promise.all(
    sessions.map(async (session: ChatSession) => {
      const msgs = await db
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.sessionId, session.id))

      return {
        id: session.id,
        title: session.title,
        model: session.model,
        taskId: session.taskId,
        createdAt: session.createdAt.getTime(),
        updatedAt: session.updatedAt.getTime(),
        messageCount: msgs.length,
      }
    })
  )

  return sessionsWithCounts
})