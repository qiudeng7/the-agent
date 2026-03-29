/**
 * @module api/admin/users/batch
 * @description 批量创建用户 API
 *              POST /api/admin/users/batch
 *              需要 admin 权限
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { db, users } from '~/db'
import { requireAdmin } from '~/utils/auth'
import { hashPassword } from '~/utils/crypto'
import { nanoid } from 'nanoid'

interface BatchUserItem {
  email: string
  password: string
  nickname?: string
  role?: 'admin' | 'employee'
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody<{ users: BatchUserItem[] }>(event)

  if (!body?.users || !Array.isArray(body.users) || body.users.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Users array is required',
    })
  }

  const now = new Date()
  const usersToCreate = await Promise.all(
    body.users.map(async (user) => {
      const passwordHash = await hashPassword(user.password)
      return {
        id: nanoid(),
        email: user.email,
        passwordHash,
        nickname: user.nickname || null,
        role: user.role || 'employee',
        createdAt: now,
        updatedAt: now,
      }
    })
  )

  const result = await db.insert(users).values(usersToCreate).returning()

  return {
    success: true,
    data: {
      created: result.length,
      users: result.map((u) => ({
        id: u.id,
        email: u.email,
        nickname: u.nickname,
        role: u.role,
        createdAt: u.createdAt.getTime(),
      })),
    },
  }
})