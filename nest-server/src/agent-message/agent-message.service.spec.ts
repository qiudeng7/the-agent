import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { AgentMessageService } from './agent-message.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AgentMessageService', () => {
  let service: AgentMessageService;

  const mockSession = {
    id: 'session-123',
    userId: 'user-123',
    title: 'Test Session',
    model: 'claude-3',
    taskId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessage = {
    id: 'msg-123',
    sessionId: 'session-123',
    role: 'USER',
    content: '"Hello"', // JSON string
    model: null,
    timestamp: new Date('2024-01-01'),
  };

  const mockPrisma = {
    chatSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentMessageService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AgentMessageService>(AgentMessageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findBySession', () => {
    it('should return messages for a session', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.message.findMany.mockResolvedValue([mockMessage]);

      const result = await service.findBySession('session-123', 'user-123');

      expect(result).toHaveLength(1);
      expect(result?.[0].role).toBe('user');
    });

    it('should return null for non-existent session', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(null);

      const result = await service.findBySession('not-found', 'user-123');

      expect(result).toBeNull();
    });

    it('should return null if user does not own session', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(mockSession);

      const result = await service.findBySession('session-123', 'other-user');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a message', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.message.create.mockResolvedValue(mockMessage);
      mockPrisma.message.count.mockResolvedValue(1);
      mockPrisma.chatSession.update.mockResolvedValue(mockSession);

      const result = await service.create('session-123', 'user-123', {
        role: 'user',
        content: 'Hello',
      });

      expect(result?.content).toBe('Hello');
      expect(mockPrisma.chatSession.update).toHaveBeenCalled();
    });

    it('should return null for non-existent session', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(null);

      const result = await service.create('not-found', 'user-123', {
        role: 'user',
        content: 'Hello',
      });

      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should delete a message', async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        ...mockMessage,
        session: mockSession,
      });
      mockPrisma.message.delete.mockResolvedValue(mockMessage);

      const result = await service.remove('msg-123', 'user-123');

      expect(result?.success).toBe(true);
    });

    it('should return null for non-existent message', async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);

      const result = await service.remove('not-found', 'user-123');

      expect(result).toBeNull();
    });
  });
});