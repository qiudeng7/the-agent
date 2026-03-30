/**
 * @module api/auth/login
 * @description 用户登录 API
 *              POST /api/auth/login
 */
import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { db, users } from '~/db'
import { verifyPassword } from '~/utils/crypto'
import { generateToken } from '~/utils/auth'
import { checkRateLimit, recordSuccess } from '~/utils/rate-limit'
import { eq } from 'drizzle-orm'

interface LoginBody {
  email: string
  password: string
}

export default defineEventHandler(async (event) => {
  // 速率限制检查（基于 IP）
  const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'
  const rateCheck = checkRateLimit(`login:${ip}`, { windowMs: 60000, max: 5 })
  if (!rateCheck.allowed) {
    throw createError({
      statusCode: 429,
      message: `Too many login attempts. Please wait ${rateCheck.retryAfter} seconds.`,
    })
  }

  const body = await readBody<LoginBody>(event)

  // 验证必填字段
  if (!body.email || !body.password) {
    throw createError({
      statusCode: 400,
      message: 'Email and password are required',
    })
  }

  // 查找用户
  const result = await db.select().from(users).where(eq(users.email, body.email)).limit(1)
  const user = result[0]

  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Invalid email or password',
    })
  }

  // 检查用户是否被禁用
  if (user.deletedAt) {
    throw createError({
      statusCode: 403,
      message: 'User account has been disabled',
    })
  }

  // 验证密码
  const isValid = await verifyPassword(body.password, user.passwordHash)
  if (!isValid) {
    throw createError({
      statusCode: 401,
      message: 'Invalid email or password',
    })
  }

  // 生成 JWT
  const token = await generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  })

  // 记录成功登录，设置冷却期防止频繁登录
  recordSuccess(`login:${ip}`, 5000)

  // 返回结果
  return {
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
        createdAt: user.createdAt.getTime(),
      },
    },
  }
})