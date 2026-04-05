import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Task, TaskStatus } from '@prisma/client';
import type { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from './tasks.dto';

// 小写 -> Prisma 大写转换
function toPrismaStatus(
  status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled',
): TaskStatus {
  const map: Record<string, TaskStatus> = {
    todo: 'TODO',
    in_progress: 'IN_PROGRESS',
    in_review: 'IN_REVIEW',
    done: 'DONE',
    cancelled: 'CANCELLED',
  };
  return map[status];
}

// Prisma 大写 -> 小写转换
function toLowerStatus(status: TaskStatus): string {
  return status.toLowerCase();
}

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取任务列表
   * - admin: 查看自己创建的任务
   * - employee: 查看分配给自己的任务
   */
  async findAll(userId: string, role: string, query: TaskQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;

    const where: any = {
      deletedAt: null,
    };

    // 根据角色设置不同的查询条件
    if (role === 'EMPLOYEE') {
      where.assignedToUserId = userId;
    } else {
      where.createdByUserId = userId;
    }

    if (query.status) {
      where.status = toPrismaStatus(query.status);
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      success: true,
      data: {
        tasks: tasks.map((task: Task) => ({
          ...task,
          status: toLowerStatus(task.status),
          createdAt: task.createdAt.getTime(),
          updatedAt: task.updatedAt.getTime(),
          deletedAt: task.deletedAt?.getTime() || null,
        })),
        total,
        page,
        pageSize,
      },
    };
  }

  /**
   * 获取单个任务
   */
  async findOne(id: number, userId: string, role: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task || task.deletedAt) {
      return null;
    }

    // 验证权限
    if (role === 'EMPLOYEE' && task.assignedToUserId !== userId) {
      return null;
    }
    if (role === 'ADMIN' && task.createdByUserId !== userId) {
      return null;
    }

    return {
      success: true,
      data: {
        task: {
          ...task,
          status: toLowerStatus(task.status),
          createdAt: task.createdAt.getTime(),
          updatedAt: task.updatedAt.getTime(),
          deletedAt: null,
        },
      },
    };
  }

  /**
   * 创建任务
   */
  async create(userId: string, data: CreateTaskDto) {
    const now = new Date();
    const task = await this.prisma.task.create({
      data: {
        title: data.title,
        category: data.category || null,
        tag: data.tag || null,
        description: data.description || null,
        status: 'TODO',
        createdByUserId: userId,
        assignedToUserId: data.assignedToUserId || null,
        createdAt: now,
        updatedAt: now,
      },
    });

    return {
      success: true,
      data: {
        task: {
          ...task,
          status: toLowerStatus(task.status),
          createdAt: task.createdAt.getTime(),
          updatedAt: task.updatedAt.getTime(),
          deletedAt: task.deletedAt?.getTime() || null,
        },
      },
    };
  }

  /**
   * 更新任务
   */
  async update(id: number, userId: string, role: string, data: UpdateTaskDto) {
    // 验证任务存在且有权限
    const existing = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!existing || existing.deletedAt) {
      return null;
    }

    // 验证权限
    if (role === 'EMPLOYEE' && existing.assignedToUserId !== userId) {
      return null;
    }
    if (role === 'ADMIN' && existing.createdByUserId !== userId) {
      return null;
    }

    // 构建更新数据，转换 status
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.tag !== undefined) updateData.tag = data.tag;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.status !== undefined)
      updateData.status = toPrismaStatus(data.status);
    if (data.assignedToUserId !== undefined)
      updateData.assignedToUserId = data.assignedToUserId;

    const task = await this.prisma.task.update({
      where: { id },
      data: updateData,
    });

    return {
      success: true,
      data: {
        task: {
          ...task,
          status: toLowerStatus(task.status),
          createdAt: task.createdAt.getTime(),
          updatedAt: task.updatedAt.getTime(),
          deletedAt: task.deletedAt?.getTime() || null,
        },
      },
    };
  }

  /**
   * 删除任务（软删除）
   * 只有 ADMIN 可以删除自己创建的任务
   */
  async remove(id: number, userId: string, role: string) {
    // 只有 admin 可以删除任务
    if (role !== 'ADMIN') {
      return null;
    }

    // 验证任务存在且有权限
    const existing = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!existing || existing.deletedAt) {
      return null;
    }

    // 验证是自己创建的任务
    if (existing.createdByUserId !== userId) {
      return null;
    }

    await this.prisma.task.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * 获取任务统计
   */
  async getStats(userId: string, role: string) {
    const where: any = {
      deletedAt: null,
    };

    if (role === 'EMPLOYEE') {
      where.assignedToUserId = userId;
    } else {
      where.createdByUserId = userId;
    }

    const [todo, in_progress, in_review, done, cancelled] = await Promise.all([
      this.prisma.task.count({ where: { ...where, status: 'TODO' } }),
      this.prisma.task.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      this.prisma.task.count({ where: { ...where, status: 'IN_REVIEW' } }),
      this.prisma.task.count({ where: { ...where, status: 'DONE' } }),
      this.prisma.task.count({ where: { ...where, status: 'CANCELLED' } }),
    ]);

    return {
      success: true,
      data: {
        todo,
        in_progress,
        in_review,
        done,
        cancelled,
        total: todo + in_progress + in_review + done + cancelled,
      },
    };
  }
}
