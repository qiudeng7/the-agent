/**
 * @module api/auth/login
 * @description 用户登录 API
 *              POST /api/auth/login
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { db, users } from '~/db'
import { verifyPassword } from '~/utils/crypto'
import { generateToken } from '~/utils/auth'
import { eq } from 'drizzle-orm'

interface LoginBody {
  email: string
  password: string
}

export default defineEventHandler(async (event) => {
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
    userId: user.id,
    email: user.email,
  })

  // 返回结果
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      createdAt: user.createdAt.getTime(),
    },
  }
})