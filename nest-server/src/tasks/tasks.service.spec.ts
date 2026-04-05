import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TasksService', () => {
  let service: TasksService;

  const mockTask = {
    id: 1,
    title: 'Test Task',
    category: 'work',
    tag: 'urgent',
    description: 'Test description',
    status: 'TODO' as const,
    createdByUserId: 'user-123',
    assignedToUserId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  const mockPrisma = {
    task: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return tasks for admin (created by user)', async () => {
      mockPrisma.task.findMany.mockResolvedValue([mockTask]);
      mockPrisma.task.count.mockResolvedValue(1);

      const result = await service.findAll('user-123', 'ADMIN', {});

      expect(result.success).toBe(true);
      expect(result.data.tasks).toHaveLength(1);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdByUserId: 'user-123',
            deletedAt: null,
          }),
        }),
      );
    });

    it('should return tasks for employee (assigned to user)', async () => {
      mockPrisma.task.findMany.mockResolvedValue([mockTask]);
      mockPrisma.task.count.mockResolvedValue(1);

      await service.findAll('user-123', 'EMPLOYEE', {});

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedToUserId: 'user-123',
            deletedAt: null,
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);

      await service.findAll('user-123', 'ADMIN', { status: 'todo' });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'TODO',
          }),
        }),
      );
    });

    it('should search by title and description', async () => {
      mockPrisma.task.findMany.mockResolvedValue([]);
      mockPrisma.task.count.mockResolvedValue(0);

      await service.findAll('user-123', 'ADMIN', { search: 'test' });

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'test' } },
              { description: { contains: 'test' } },
            ],
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a task for admin', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(mockTask);

      const result = await service.findOne(1, 'user-123', 'ADMIN');

      expect(result?.success).toBe(true);
      expect(result?.data.task.id).toBe(1);
    });

    it('should return null for non-existent task', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      const result = await service.findOne(999, 'user-123', 'ADMIN');

      expect(result).toBeNull();
    });

    it('should return null for deleted task', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
        ...mockTask,
        deletedAt: new Date(),
      });

      const result = await service.findOne(1, 'user-123', 'ADMIN');

      expect(result).toBeNull();
    });

    it('should return null if employee not assigned', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(mockTask);

      const result = await service.findOne(1, 'other-user', 'EMPLOYEE');

      expect(result).toBeNull();
    });

    it('should return null if admin not creator', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(mockTask);

      const result = await service.findOne(1, 'other-user', 'ADMIN');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a task', async () => {
      mockPrisma.task.create.mockResolvedValue(mockTask);

      const result = await service.create('user-123', {
        title: 'Test Task',
        description: 'Test description',
      });

      expect(result.success).toBe(true);
      expect(result.data.task.title).toBe('Test Task');
      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Test Task',
            status: 'TODO',
            createdByUserId: 'user-123',
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(mockTask);
      mockPrisma.task.update.mockResolvedValue({
        ...mockTask,
        status: 'IN_PROGRESS',
      });

      const result = await service.update(1, 'user-123', 'ADMIN', {
        status: 'in_progress',
      });

      expect(result?.success).toBe(true);
      expect(result?.data.task.status).toBe('in_progress');
    });

    it('should return null for non-existent task', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      const result = await service.update(999, 'user-123', 'ADMIN', {
        status: 'in_progress',
      });

      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should soft delete a task', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(mockTask);
      mockPrisma.task.update.mockResolvedValue({
        ...mockTask,
        deletedAt: new Date(),
      });

      const result = await service.remove(1, 'user-123', 'ADMIN');

      expect(result?.success).toBe(true);
      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should return null for non-existent task', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      const result = await service.remove(999, 'user-123', 'ADMIN');

      expect(result).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return task statistics', async () => {
      mockPrisma.task.count
        .mockResolvedValueOnce(5) // todo
        .mockResolvedValueOnce(3) // in_progress
        .mockResolvedValueOnce(2) // in_review
        .mockResolvedValueOnce(10) // done
        .mockResolvedValueOnce(1); // cancelled

      const result = await service.getStats('user-123', 'ADMIN');

      expect(result.success).toBe(true);
      expect(result.data.todo).toBe(5);
      expect(result.data.in_progress).toBe(3);
      expect(result.data.total).toBe(21);
    });
  });
});