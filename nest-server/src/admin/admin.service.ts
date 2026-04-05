import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Task, User } from '@prisma/client';
import { BatchTasksDto, BatchUsersDto } from './admin.dto';

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
        createdAt: t.createdAt.getTime(),
        updatedAt: t.updatedAt.getTime(),
      }));
    }

    return [];
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
      return this.prisma.user.update({
        where: { id: String(id) },
        data: { ...data, updatedAt: new Date() },
      });
    }

    if (table === 'tasks') {
      return this.prisma.task.update({
        where: { id: Number(id) },
        data: { ...data, updatedAt: new Date() },
      });
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
    const { nanoid } = await import('nanoid');

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
        role: u.role,
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