import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Task, User } from '@prisma/client';
import { BatchTasksDto, BatchUsersDto, CreateUserRecordDto, CreateTaskRecordDto } from './admin.dto';
import { nanoid } from 'nanoid';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Database operations
  // ─────────────────────────────────────────────────────────────────────────────

  async getTableData(table: string) {
    if (!['users', 'tasks'].includes(table)) {
      throw new BadRequestException('Invalid table name');
    }

    if (table === 'users') {
      const data = await this.prisma.user.findMany({
        where: { deletedAt: null },
      });
      return data.map((u: User) => ({
        ...u,
        role: u.role.toLowerCase(),
        createdAt: u.createdAt.getTime(),
        updatedAt: u.updatedAt.getTime(),
      }));
    }

    if (table === 'tasks') {
      const data = await this.prisma.task.findMany({
        where: { deletedAt: null },
      });
      return data.map((t: Task) => ({
        ...t,
        status: t.status.toLowerCase(),
        createdAt: t.createdAt.getTime(),
        updatedAt: t.updatedAt.getTime(),
      }));
    }

    return [];
  }

  async createTableRecord(
    table: string,
    data: CreateUserRecordDto | CreateTaskRecordDto,
    adminId: string,
    hashPassword: (p: string) => Promise<string>,
  ) {
    if (!['users', 'tasks'].includes(table)) {
      throw new BadRequestException('Invalid table name');
    }

    const now = new Date();

    if (table === 'users') {
      const userData = data as CreateUserRecordDto;
      const userId = nanoid();
      const passwordHash = await hashPassword(userData.password);
      const user = await this.prisma.user.create({
        data: {
          id: userId,
          email: userData.email,
          passwordHash,
          nickname: userData.nickname || null,
          role: (userData.role || 'employee').toUpperCase() as 'ADMIN' | 'EMPLOYEE',
          createdAt: now,
          updatedAt: now,
        },
      });
      return {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role.toLowerCase(),
        createdAt: user.createdAt.getTime(),
      };
    }

    if (table === 'tasks') {
      const taskData = data as CreateTaskRecordDto;
      const task = await this.prisma.task.create({
        data: {
          title: taskData.title,
          category: taskData.category || null,
          tag: taskData.tag || null,
          description: taskData.description || null,
          status: (taskData.status || 'todo').toUpperCase() as any,
          createdByUserId: adminId,
          assignedToUserId: taskData.assignedToUserId || null,
          createdAt: now,
          updatedAt: now,
        },
      });
      return {
        id: task.id,
        title: task.title,
        category: task.category,
        status: task.status.toLowerCase(),
        createdAt: task.createdAt.getTime(),
      };
    }

    return null;
  }

  async updateTableRecord(
    table: string,
    id: string | number,
    data: Record<string, unknown>,
  ) {
    if (!['users', 'tasks'].includes(table)) {
      throw new BadRequestException('Invalid table name');
    }

    if (table === 'users') {
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (data.email !== undefined) updateData.email = data.email;
      if (data.nickname !== undefined) updateData.nickname = data.nickname;
      if (data.role !== undefined) updateData.role = (data.role as string).toUpperCase();

      const user = await this.prisma.user.update({
        where: { id: String(id) },
        data: updateData,
      });
      return {
        ...user,
        role: user.role.toLowerCase(),
        createdAt: user.createdAt.getTime(),
        updatedAt: user.updatedAt.getTime(),
      };
    }

    if (table === 'tasks') {
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (data.title !== undefined) updateData.title = data.title;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.tag !== undefined) updateData.tag = data.tag;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.status !== undefined) updateData.status = (data.status as string).toUpperCase();
      if (data.assignedToUserId !== undefined) updateData.assignedToUserId = data.assignedToUserId;

      const task = await this.prisma.task.update({
        where: { id: Number(id) },
        data: updateData,
      });
      return {
        ...task,
        status: task.status.toLowerCase(),
        createdAt: task.createdAt.getTime(),
        updatedAt: task.updatedAt.getTime(),
      };
    }

    return null;
  }

  async deleteTableRecord(table: string, id: string | number) {
    if (!['users', 'tasks'].includes(table)) {
      throw new BadRequestException('Invalid table name');
    }

    if (table === 'users') {
      return this.prisma.user.update({
        where: { id: String(id) },
        data: { deletedAt: new Date() },
      });
    }

    if (table === 'tasks') {
      return this.prisma.task.update({
        where: { id: Number(id) },
        data: { deletedAt: new Date() },
      });
    }

    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Batch operations
  // ─────────────────────────────────────────────────────────────────────────────

  async createTasksBatch(adminId: string, dto: BatchTasksDto) {
    if (!dto.tasks || dto.tasks.length === 0) {
      throw new BadRequestException('Tasks array is required');
    }

    const now = new Date();
    const tasksToCreate = dto.tasks.map((task) => ({
      title: task.title,
      category: task.category || null,
      tag: task.tag || null,
      description: task.description || null,
      status: 'TODO' as const,
      createdByUserId: adminId,
      assignedToUserId: task.assignedToUserId || null,
      createdAt: now,
      updatedAt: now,
    }));

    const created = await this.prisma.task.createManyAndReturn({
      data: tasksToCreate,
    });

    return {
      created: created.length,
      tasks: created.map((t) => ({
        ...t,
        status: t.status.toLowerCase(),
        createdAt: t.createdAt.getTime(),
        updatedAt: t.updatedAt.getTime(),
      })),
    };
  }

  async deleteTasksBatch(ids: number[]) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('Ids array is required');
    }

    const result = await this.prisma.task.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date() },
    });

    return { deleted: result.count };
  }

  async createUsersBatch(dto: BatchUsersDto, hashPassword: (p: string) => Promise<string>) {
    if (!dto.users || dto.users.length === 0) {
      throw new BadRequestException('Users array is required');
    }

    const now = new Date();

    const usersToCreate = await Promise.all(
      dto.users.map(async (user) => ({
        id: nanoid(),
        email: user.email,
        passwordHash: await hashPassword(user.password),
        nickname: user.nickname || null,
        role: (user.role || 'EMPLOYEE') as 'ADMIN' | 'EMPLOYEE',
        createdAt: now,
        updatedAt: now,
      })),
    );

    const created = await this.prisma.user.createManyAndReturn({
      data: usersToCreate,
    });

    return {
      created: created.length,
      users: created.map((u) => ({
        id: u.id,
        email: u.email,
        nickname: u.nickname,
        role: u.role.toLowerCase(),
        createdAt: u.createdAt.getTime(),
      })),
    };
  }

  async deleteUsersBatch(ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('Ids array is required');
    }

    const result = await this.prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date() },
    });

    return { deleted: result.count };
  }
}