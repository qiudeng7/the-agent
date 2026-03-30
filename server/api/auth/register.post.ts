/**
 * @module api/auth/register
 * @description 用户注册 API
 *              POST /api/auth/register
 */
import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { nanoid } from 'nanoid'
import { db, users } from '~/db'
import { hashPassword } from '~/utils/crypto'
import { generateToken } from '~/utils/auth'
import { checkRateLimit, recordSuccess } from '~/utils/rate-limit'
import { eq } from 'drizzle-orm'

interface RegisterBody {
  email: string
  password: string
  nickname?: string
}

export default defineEventHandler(async (event) => {
  // 速率限制检查（基于 IP）
  const ip = getHeader(event, 'x-forwarded-for') || getHeader(event, 'x-real-ip') || 'unknown'
  const rateCheck = checkRateLimit(`register:${ip}`, { windowMs: 60000, max: 3 })
  if (!rateCheck.allowed) {
    throw createError({
      statusCode: 429,
      message: `Too many registration attempts. Please wait ${rateCheck.retryAfter} seconds.`,
    })
  }

  const body = await readBody<RegisterBody>(event)

  // 验证必填字段
  if (!body.email || !body.password) {
    throw createError({
      statusCode: 400,
      message: 'Email and password are required',
    })
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(body.email)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid email format',
    })
  }

  // 验证密码长度
  if (body.password.length < 6) {
    throw createError({
      statusCode: 400,
      message: 'Password must be at least 6 characters',
    })
  }

  // 检查邮箱是否已存在
  const existing = await db.select().from(users).where(eq(users.email, body.email)).limit(1)
  if (existing.length > 0) {
    throw createError({
      statusCode: 409,
      message: 'Email already registered',
    })
  }

  // 检查是否是第一个用户（自动成为 admin）
  const userCount = await db.select({ id: users.id }).from(users)
  const isFirstUser = userCount.length === 0
  const role = isFirstUser ? 'admin' : 'employee'

  // 创建用户
  const now = new Date()
  const userId = nanoid()
  const passwordHash = await hashPassword(body.password)

  await db.insert(users).values({
    id: userId,
    email: body.email,
    passwordHash,
    nickname: body.nickname || null,
    role,
    createdAt: now,
    updatedAt: now,
  })

  // 生成 JWT
  const token = await generateToken({
    id: userId,
    email: body.email,
    role,
  })

  // 记录成功注册
  recordSuccess(`register:${ip}`, 10000)

  // 返回结果
  return {
    success: true,
    data: {
      token,
      user: {
        id: userId,
        email: body.email,
        nickname: body.nickname || null,
        role,
        createdAt: now.getTime(),
      },
    },
  }
})