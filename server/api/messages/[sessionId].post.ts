/**
 * @module api/messages/[sessionId]
 * @description 添加消息 API
 *              POST /api/messages/:sessionId
 *              需要 Authorization: Bearer <token>
 */
import { defineEventHandler, readBody, createError, getRouterParam } from 'h3'
import { nanoid } from 'nanoid'
import { db, chatSessions, messages } from '~/db'
import { requireAuth } from '~/utils/auth'
import { eq } from 'drizzle-orm'

interface AddMessageBody {
  id?: string
  role: 'user' | 'assistant'
  content: string | Record<string, unknown>[] // string | ContentBlock[]
  model?: string
  timestamp?: number
}

export default defineEventHandler(async (event) => {
  // 验证 JWT
  const payload = await requireAuth(event)

  // 获取会话 ID
  const sessionId = getRouterParam(event, 'sessionId')
  if (!sessionId) {
    throw createError({
      statusCode: 400,
      message: 'Session ID is required',
    })
  }

  const body = await readBody<AddMessageBody>(event)

  // 验证必填字段
  if (!body.role || !body.content) {
    throw createError({
      statusCode: 400,
      message: 'Role and content are required',
    })
  }

  if (body.role !== 'user' && body.role !== 'assistant') {
    throw createError({
      statusCode: 400,
      message: 'Role must be user or assistant',
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

  // 创建消息
  const now = new Date()
  const messageId = body.id || nanoid()
  const timestamp = body.timestamp ? new Date(body.timestamp) : now

  await db.insert(messages).values({
    id: messageId,
    sessionId,
    role: body.role,
    content: JSON.stringify(body.content),
    model: body.model || null,
    timestamp,
  })

  // 更新会话的 updatedAt
  await db
    .update(chatSessions)
    .set({ updatedAt: now })
    .where(eq(chatSessions.id, sessionId))

  // 如果是第一条用户消息，更新会话标题
  if (body.role === 'user') {
    const existingMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))

    if (existingMessages.length === 1) {
      // 只有一条消息（刚添加的），提取标题
      let text = ''
      if (typeof body.content === 'string') {
        text = body.content
      } else if (Array.isArray(body.content)) {
        const textBlock = body.content.find((b: Record<string, unknown>) => b.type === 'text')
        text = (textBlock?.text as string) || ''
      }

      const title = text.slice(0, 30) + (text.length > 30 ? '...' : '')
      await db
        .update(chatSessions)
        .set({ title })
        .where(eq(chatSessions.id, sessionId))
    }
  }

  // 返回创建的消息
  return {
    id: messageId,
    sessionId,
    role: body.role,
    content: body.content,
    model: body.model,
    timestamp: timestamp.getTime(),
  }
})