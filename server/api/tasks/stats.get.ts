/**
 * @module api/tasks/stats
 * @description 获取任务统计 API
 *              GET /api/tasks/stats
 */
import { defineEventHandler } from 'h3'
import { db, tasks } from '~/db'
import { requireAuth } from '~/utils/auth'
import { eq, and, isNull, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event)

  // 构建基础条件
  const baseConditions = [isNull(tasks.deletedAt)]

  if (authUser.role === 'employee') {
    baseConditions.push(eq(tasks.assignedToUserId, authUser.userId))
  } else {
    baseConditions.push(eq(tasks.createdByUserId, authUser.userId))
  }

  // 获取各状态数量
  const stats = await (db as any)
    .select({
      status: tasks.status,
      count: sql<number>`count(*)`,
    })
    .from(tasks)
    .where(and(...baseConditions))
    .groupBy(tasks.status)

  // 获取总数
  const totalResult = await (db as any)
    .select({ total: sql<number>`count(*)` })
    .from(tasks)
    .where(and(...baseConditions))

  const total = totalResult[0]?.total || 0

  // 整理统计数据
  const statusCounts: Record<string, number> = {
    todo: 0,
    in_progress: 0,
    in_review: 0,
    done: 0,
    cancelled: 0,
  }

  for (const stat of stats) {
    if (stat.status) {
      statusCounts[stat.status] = stat.count
    }
  }

  return {
    success: true,
    data: {
      total,
      ...statusCounts,
    },
  }
})