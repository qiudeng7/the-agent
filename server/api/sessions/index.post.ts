/**
 * @module api/sessions/index.post
 * @description 创建会话 API
 *              POST /api/sessions
 *              需要 Authorization: Bearer <token>
 */
import { defineEventHandler, readBody } from 'h3'
import { nanoid } from 'nanoid'
import { db, chatSessions } from '~/db'
import { requireAuth } from '~/utils/auth'

interface CreateSessionBody {
  title?: string
  model?: string
}

export default defineEventHandler(async (event) => {
  // 验证 JWT
  const payload = await requireAuth(event)
  const body = await readBody<CreateSessionBody>(event)

  const now = new Date()
  const sessionId = nanoid()

  // 创建会话
  await db.insert(chatSessions).values({
    id: sessionId,
    userId: payload.userId,
    title: body.title || '新会话',
    model: body.model || 'default',
    createdAt: now,
    updatedAt: now,
  })

  // 返回创建的会话
  return {
    id: sessionId,
    title: body.title || '新会话',
    model: body.model || 'default',
    createdAt: now.getTime(),
    updatedAt: now.getTime(),
    messageCount: 0,
  }
})