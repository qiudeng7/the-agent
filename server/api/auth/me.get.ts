/**
 * @module api/auth/me
 * @description 获取当前用户信息 API
 *              GET /api/auth/me
 *              需要 Authorization: Bearer <token>
 */
import { defineEventHandler, createError } from 'h3'
import { db, users } from '~/db'
import { requireAuth } from '~/utils/auth'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // 验证 JWT
  const payload = await requireAuth(event)

  // 查找用户
  const result = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1)
  const user = result[0]

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found',
    })
  }

  // 返回用户信息（不含密码）
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    createdAt: user.createdAt.getTime(),
    updatedAt: user.updatedAt.getTime(),
  }
})