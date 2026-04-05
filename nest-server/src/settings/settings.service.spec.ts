import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SettingsService', () => {
  let service: SettingsService;

  const mockSettings = {
    userId: 'user-123',
    language: 'ZH',
    theme: 'DARK',
    customModelConfigs: '[{"name":"custom-model"}]',
    enabledModels: '["model1","model2"]',
    defaultModel: 'default',
    updatedAt: new Date('2024-01-01'),
  };

  const mockPrisma = {
    userSettings: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return user settings', async () => {
      mockPrisma.userSettings.findUnique.mockResolvedValue(mockSettings);

      const result = await service.findOne('user-123');

      expect(result.language).toBe('ZH');
      expect(result.theme).toBe('DARK');
      expect(result.customModelConfigs).toEqual([{ name: 'custom-model' }]);
    });

    it('should return default settings if not found', async () => {
      mockPrisma.userSettings.findUnique.mockResolvedValue(null);

      const result = await service.findOne('user-123');

      expect(result.language).toBe('SYSTEM');
      expect(result.theme).toBe('SYSTEM');
      expect(result.customModelConfigs).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update existing settings', async () => {
      mockPrisma.userSettings.findUnique.mockResolvedValue(mockSettings);
      mockPrisma.userSettings.update.mockResolvedValue({
        ...mockSettings,
        language: 'EN',
        theme: 'LIGHT',
      });

      const result = await service.update('user-123', {
        language: 'EN',
        theme: 'LIGHT',
      });

      expect(mockPrisma.userSettings.update).toHaveBeenCalled();
      expect(result.language).toBe('EN');
    });

    it('should create settings if not exists', async () => {
      mockPrisma.userSettings.findUnique.mockResolvedValue(null);
      mockPrisma.userSettings.create.mockResolvedValue({
        ...mockSettings,
        language: 'EN',
        theme: 'LIGHT',
      });

      const result = await service.update('user-123', {
        language: 'EN',
        theme: 'LIGHT',
      });

      expect(mockPrisma.userSettings.create).toHaveBeenCalled();
      expect(result.language).toBe('EN');
    });
  });
});