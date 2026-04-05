import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Language, Theme } from '@prisma/client';

export interface UpdateSettingsDto {
  language?: Language;
  theme?: Theme;
  customModelConfigs?: unknown[];
  enabledModels?: string[];
  defaultModel?: string;
}

export interface UserSettingsResponse {
  language: string;
  theme: string;
  customModelConfigs: unknown[];
  enabledModels: string[];
  defaultModel: string;
  updatedAt: number;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取用户设置
   */
  async findOne(userId: string): Promise<UserSettingsResponse> {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return {
        language: 'SYSTEM',
        theme: 'SYSTEM',
        customModelConfigs: [],
        enabledModels: [],
        defaultModel: '',
        updatedAt: Date.now(),
      };
    }

    return {
      language: settings.language,
      theme: settings.theme,
      customModelConfigs: settings.customModelConfigs
        ? JSON.parse(settings.customModelConfigs)
        : [],
      enabledModels: settings.enabledModels
        ? JSON.parse(settings.enabledModels)
        : [],
      defaultModel: settings.defaultModel || '',
      updatedAt: settings.updatedAt.getTime(),
    };
  }

  /**
   * 更新用户设置
   */
  async update(
    userId: string,
    data: UpdateSettingsDto,
  ): Promise<UserSettingsResponse> {
    const existing = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    const now = new Date();

    if (existing) {
      const updated = await this.prisma.userSettings.update({
        where: { userId },
        data: {
          language: data.language || existing.language,
          theme: data.theme || existing.theme,
          customModelConfigs: data.customModelConfigs
            ? JSON.stringify(data.customModelConfigs)
            : existing.customModelConfigs,
          enabledModels: data.enabledModels
            ? JSON.stringify(data.enabledModels)
            : existing.enabledModels,
          defaultModel: data.defaultModel || existing.defaultModel,
          updatedAt: now,
        },
      });

      return {
        language: updated.language,
        theme: updated.theme,
        customModelConfigs: updated.customModelConfigs
          ? JSON.parse(updated.customModelConfigs)
          : [],
        enabledModels: updated.enabledModels
          ? JSON.parse(updated.enabledModels)
          : [],
        defaultModel: updated.defaultModel || '',
        updatedAt: updated.updatedAt.getTime(),
      };
    } else {
      const created = await this.prisma.userSettings.create({
        data: {
          userId,
          language: data.language || 'SYSTEM',
          theme: data.theme || 'SYSTEM',
          customModelConfigs: data.customModelConfigs
            ? JSON.stringify(data.customModelConfigs)
            : null,
          enabledModels: data.enabledModels
            ? JSON.stringify(data.enabledModels)
            : null,
          defaultModel: data.defaultModel || null,
          updatedAt: now,
        },
      });

      return {
        language: created.language,
        theme: created.theme,
        customModelConfigs: created.customModelConfigs
          ? JSON.parse(created.customModelConfigs)
          : [],
        enabledModels: created.enabledModels
          ? JSON.parse(created.enabledModels)
          : [],
        defaultModel: created.defaultModel || '',
        updatedAt: created.updatedAt.getTime(),
      };
    }
  }
}