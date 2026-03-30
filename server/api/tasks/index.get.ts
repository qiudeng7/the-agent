/**
 * @module api/tasks/index
 * @description 获取任务列表 API
 *              GET /api/tasks
 *              - admin: 查看自己创建的任务
 *              - employee: 查看分配给自己的任务
 */
import { defineEventHandler, getQuery } from 'h3'
import { db, tasks, type Task } from '~/db'
import { requireAuth } from '~/utils/auth'
import { eq, and, like, or, isNull, sql } from 'drizzle-orm'

type TaskStatusType = 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled'

export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event)
  const query = getQuery(event)

  const page = parseInt((query.page as string) || '1')
  const pageSize = parseInt((query.pageSize as string) || '10')
  const status = query.status as TaskStatusType | undefined
  const category = query.category as string | undefined
  const search = query.search as string | undefined

  // 构建查询条件
  const conditions = [isNull(tasks.deletedAt)]

  // 根据角色设置不同的查询条件
  if (authUser.role === 'employee') {
    // 员工只能看到分配给自己的任务
    conditions.push(eq(tasks.assignedToUserId, authUser.userId))
  } else {
    // admin 看到自己创建的任务
    conditions.push(eq(tasks.createdByUserId, authUser.userId))
  }

  if (status) {
    conditions.push(eq(tasks.status, status))
  }

  if (category) {
    conditions.push(eq(tasks.category, category))
  }

  if (search) {
    conditions.push(
      or(
        like(tasks.title, `%${search}%`),
        like(tasks.description, `%${search}%`)
      )!
    )
  }

  // 查询任务列表
  const taskList = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  // 查询总数
  const countResult = await (db as any)
    .select({ total: sql<number>`count(*)` })
    .from(tasks)
    .where(and(...conditions))

  const total = countResult[0]?.total || 0

  return {
    success: true,
    data: {
      tasks: taskList.map((task: Task) => ({
        ...task,
        createdAt: task.createdAt.getTime(),
        updatedAt: task.updatedAt.getTime(),
      })),
      total,
      page,
      pageSize,
    },
  }
})