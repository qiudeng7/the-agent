import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Task, TaskStatus } from '@prisma/client';

export interface CreateTaskDto {
  title: string;
  category?: string;
  tag?: string;
  description?: string;
  assignedToUserId?: string;
}

export interface UpdateTaskDto {
  title?: string;
  category?: string;
  tag?: string;
  description?: string;
  status?: TaskStatus;
  assignedToUserId?: string | null;
}

export interface TaskQueryDto {
  page?: number;
  pageSize?: number;
  status?: TaskStatus;
  category?: string;
  search?: string;
}

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取任务列表
   * - admin: 查看自己创建的任务
   * - employee: 查看分配给自己的任务
   */
  async findAll(
    userId: string,
    role: string,
    query: TaskQueryDto,
  ) {
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
      where.status = query.status;
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
        ...task,
        createdAt: task.createdAt.getTime(),
        updatedAt: task.updatedAt.getTime(),
        deletedAt: null,
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
        ...task,
        createdAt: task.createdAt.getTime(),
        updatedAt: task.updatedAt.getTime(),
        deletedAt: task.deletedAt?.getTime() || null,
      },
    };
  }

  /**
   * 更新任务
   */
  async update(
    id: number,
    userId: string,
    role: string,
    data: UpdateTaskDto,
  ) {
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

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      data: {
        ...task,
        createdAt: task.createdAt.getTime(),
        updatedAt: task.updatedAt.getTime(),
        deletedAt: task.deletedAt?.getTime() || null,
      },
    };
  }

  /**
   * 删除任务（软删除）
   */
  async remove(id: number, userId: string, role: string) {
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