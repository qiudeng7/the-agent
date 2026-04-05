import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AdminService', () => {
  let service: AdminService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hash',
    nickname: 'Test',
    role: 'ADMIN',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  const mockTask = {
    id: 1,
    title: 'Test Task',
    category: null,
    tag: null,
    description: null,
    status: 'TODO',
    createdByUserId: 'user-123',
    assignedToUserId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  const mockPrisma = {
    user: {
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      createManyAndReturn: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      createManyAndReturn: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTableData', () => {
    it('should return users data', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);

      const result = await service.getTableData('users');

      expect(result).toHaveLength(1);
      expect((result[0] as { email: string }).email).toBe('test@example.com');
    });

    it('should return tasks data', async () => {
      mockPrisma.task.findMany.mockResolvedValue([mockTask]);

      const result = await service.getTableData('tasks');

      expect(result).toHaveLength(1);
      expect((result[0] as { title: string }).title).toBe('Test Task');
    });

    it('should throw for invalid table', async () => {
      await expect(service.getTableData('invalid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateTableRecord', () => {
    it('should update user record', async () => {
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        nickname: 'Updated',
      });

      const result = await service.updateTableRecord('users', 'user-123', {
        nickname: 'Updated',
      });

      expect((result as { nickname: string | null }).nickname).toBe('Updated');
    });

    it('should update task record', async () => {
      mockPrisma.task.update.mockResolvedValue({
        ...mockTask,
        status: 'DONE',
      });

      const result = await service.updateTableRecord('tasks', 1, {
        status: 'DONE',
      });

      expect((result as { status: string }).status).toBe('DONE');
    });
  });

  describe('deleteTableRecord', () => {
    it('should soft delete user', async () => {
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      await service.deleteTableRecord('users', 'user-123');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('createTasksBatch', () => {
    it('should create multiple tasks', async () => {
      mockPrisma.task.createManyAndReturn.mockResolvedValue([
        mockTask,
        { ...mockTask, id: 2 },
      ]);

      const result = await service.createTasksBatch('admin-123', {
        tasks: [{ title: 'Task 1' }, { title: 'Task 2' }],
      });

      expect(result.created).toBe(2);
    });

    it('should throw if tasks array is empty', async () => {
      await expect(
        service.createTasksBatch('admin-123', { tasks: [] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteTasksBatch', () => {
    it('should soft delete multiple tasks', async () => {
      mockPrisma.task.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.deleteTasksBatch([1, 2]);

      expect(result.deleted).toBe(2);
    });
  });

  describe('createUsersBatch', () => {
    it('should create multiple users', async () => {
      mockPrisma.user.createManyAndReturn.mockResolvedValue([
        mockUser,
        { ...mockUser, id: 'user-456' },
      ]);

      const result = await service.createUsersBatch(
        {
          users: [
            { email: 'test1@example.com', password: 'pass' },
            { email: 'test2@example.com', password: 'pass' },
          ],
        },
        async (p) => `hashed-${p}`,
      );

      expect(result.created).toBe(2);
    });

    it('should throw if users array is empty', async () => {
      await expect(
        service.createUsersBatch({ users: [] }, async (p) => p),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteUsersBatch', () => {
    it('should soft delete multiple users', async () => {
      mockPrisma.user.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.deleteUsersBatch(['user-1', 'user-2']);

      expect(result.deleted).toBe(2);
    });
  });
});