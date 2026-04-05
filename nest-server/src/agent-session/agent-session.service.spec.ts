import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { AgentSessionService } from './agent-session.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AgentSessionService', () => {
  let service: AgentSessionService;

  const mockSession = {
    id: 'session-123',
    userId: 'user-123',
    title: 'Test Session',
    model: 'claude-3',
    taskId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPrisma = {
    chatSession: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    message: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentSessionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AgentSessionService>(AgentSessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return sessions with message counts', async () => {
      mockPrisma.chatSession.findMany.mockResolvedValue([mockSession]);
      mockPrisma.message.count.mockResolvedValue(5);

      const result = await service.findAll('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].messageCount).toBe(5);
    });

    it('should return empty array when no sessions', async () => {
      mockPrisma.chatSession.findMany.mockResolvedValue([]);

      const result = await service.findAll('user-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return a session with messages', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.message.findMany.mockResolvedValue([]);

      const result = await service.findOne('session-123', 'user-123');

      expect(result?.session.id).toBe('session-123');
      expect(result?.messages).toEqual([]);
    });

    it('should return null for non-existent session', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(null);

      const result = await service.findOne('not-found', 'user-123');

      expect(result).toBeNull();
    });

    it('should return null if user does not own session', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(mockSession);

      const result = await service.findOne('session-123', 'other-user');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a session', async () => {
      mockPrisma.chatSession.create.mockResolvedValue(mockSession);

      const result = await service.create('user-123', {
        title: 'Test Session',
        model: 'claude-3',
      });

      expect(result.title).toBe('Test Session');
      expect(mockPrisma.chatSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            title: 'Test Session',
            model: 'claude-3',
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update a session', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.chatSession.update.mockResolvedValue({
        ...mockSession,
        title: 'Updated',
      });

      const result = await service.update('session-123', 'user-123', {
        title: 'Updated',
      });

      expect(result?.title).toBe('Updated');
    });

    it('should return null for non-existent session', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(null);

      const result = await service.update('not-found', 'user-123', {
        title: 'Updated',
      });

      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should delete a session', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.chatSession.delete.mockResolvedValue(mockSession);

      const result = await service.remove('session-123', 'user-123');

      expect(result?.success).toBe(true);
    });

    it('should return null for non-existent session', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(null);

      const result = await service.remove('not-found', 'user-123');

      expect(result).toBeNull();
    });
  });
});
