/**
 * @module utils/auth
 * @description JWT 认证中间件和工具函数
 */
import * as jose from 'jose'
import type { H3Event } from 'h3'
import { getHeader, createError } from 'h3'

// ─────────────────────────────────────────────────────────────────────────────
// JWT 配置
// ─────────────────────────────────────────────────────────────────────────────

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required')
  }
  return new TextEncoder().encode(secret)
}

// JWT 有效期：7天
const JWT_EXPIRES_IN = '7d'

// ─────────────────────────────────────────────────────────────────────────────
// JWT 生成
// ─────────────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string
  email: string
  role: string
}

export async function generateToken(user: { id: string; email: string; role: string }): Promise<string> {
  const secret = getJwtSecret()
  return new jose.SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secret)
}

// ─────────────────────────────────────────────────────────────────────────────
// JWT 验证
// ─────────────────────────────────────────────────────────────────────────────

export async function verifyToken(token: string): Promise<JwtPayload> {
  const secret = getJwtSecret()
  const { payload } = await jose.jwtVerify(token, secret)
  return {
    userId: payload.userId as string,
    email: payload.email as string,
    role: payload.role as string,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 认证中间件
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 从请求头提取并验证 JWT，返回用户信息
 * 无效时抛出 401 错误
 */
export async function requireAuth(event: H3Event): Promise<JwtPayload> {
  const authHeader = getHeader(event, 'Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      message: 'Missing or invalid Authorization header',
    })
  }

  const token = authHeader.slice(7) // 去掉 'Bearer '

  try {
    return await verifyToken(token)
  } catch (err) {
    throw createError({
      statusCode: 401,
      message: 'Invalid or expired token',
    })
  }
}

/**
 * 可选认证：有 token 则验证，无 token 则返回 null
 */
export async function optionalAuth(
  event: H3Event,
): Promise<JwtPayload | null> {
  const authHeader = getHeader(event, 'Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)

  try {
    return await verifyToken(token)
  } catch {
    return null
  }
}

/**
 * 验证管理员权限
 * 无权限时抛出 403 错误
 */
export async function requireAdmin(event: H3Event): Promise<JwtPayload> {
  const payload = await requireAuth(event)

  if (payload.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: 'Admin access required',
    })
  }

  return payload
}