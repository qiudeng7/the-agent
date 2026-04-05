import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Language, Theme, PermissionMode } from '@prisma/client';
import type { UpdateSettingsDto } from './settings.dto';

export interface UserSettingsResponse {
  language: string;
  theme: string;
  customModelConfigs: unknown[];
  enabledModels: string[];
  defaultModel: string;
  permissionMode: string;
  updatedAt: number;
}

// 小写 -> Prisma 大写转换
function toPrismaLanguage(lang: string): Language {
  const map: Record<string, Language> = {
    system: 'SYSTEM',
    zh: 'ZH',
    ja: 'JA',
    en: 'EN',
  };
  return map[lang] || 'SYSTEM';
}

function toPrismaTheme(theme: string): Theme {
  const map: Record<string, Theme> = {
    system: 'SYSTEM',
    light: 'LIGHT',
    dark: 'DARK',
  };
  return map[theme] || 'SYSTEM';
}

// Prisma 大写 -> 小写转换
function toLowerLanguage(lang: Language): string {
  return lang.toLowerCase();
}

function toLowerTheme(theme: Theme): string {
  return theme.toLowerCase();
}

// permissionMode: 前端小写驼峰 <-> Prisma 大写下划线
function toPrismaPermissionMode(mode: string): PermissionMode {
  const map: Record<string, PermissionMode> = {
    default: 'DEFAULT',
    acceptEdits: 'ACCEPT_EDITS',
    bypassPermissions: 'BYPASS_PERMISSIONS',
    dontAsk: 'DONT_ASK',
  };
  return map[mode] || 'DEFAULT';
}

function toLowerPermissionMode(mode: PermissionMode): string {
  // Prisma ACCEPT_EDITS -> 前端 acceptEdits
  const map: Record<PermissionMode, string> = {
    DEFAULT: 'default',
    ACCEPT_EDITS: 'acceptEdits',
    BYPASS_PERMISSIONS: 'bypassPermissions',
    DONT_ASK: 'dontAsk',
  };
  return map[mode];
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
        language: 'system',
        theme: 'system',
        customModelConfigs: [],
        enabledModels: [],
        defaultModel: '',
        permissionMode: 'default',
        updatedAt: Date.now(),
      };
    }

    return {
      language: toLowerLanguage(settings.language),
      theme: toLowerTheme(settings.theme),
      customModelConfigs: settings.customModelConfigs
        ? JSON.parse(settings.customModelConfigs)
        : [],
      enabledModels: settings.enabledModels
        ? JSON.parse(settings.enabledModels)
        : [],
      defaultModel: settings.defaultModel || '',
      permissionMode: toLowerPermissionMode(settings.permissionMode),
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
          language: data.language
            ? toPrismaLanguage(data.language)
            : existing.language,
          theme: data.theme ? toPrismaTheme(data.theme) : existing.theme,
          customModelConfigs: data.customModelConfigs
            ? JSON.stringify(data.customModelConfigs)
            : existing.customModelConfigs,
          enabledModels: data.enabledModels
            ? JSON.stringify(data.enabledModels)
            : existing.enabledModels,
          defaultModel: data.defaultModel || existing.defaultModel,
          permissionMode: data.permissionMode
            ? toPrismaPermissionMode(data.permissionMode)
            : existing.permissionMode,
          updatedAt: now,
        },
      });

      return {
        language: toLowerLanguage(updated.language),
        theme: toLowerTheme(updated.theme),
        customModelConfigs: updated.customModelConfigs
          ? JSON.parse(updated.customModelConfigs)
          : [],
        enabledModels: updated.enabledModels
          ? JSON.parse(updated.enabledModels)
          : [],
        defaultModel: updated.defaultModel || '',
        permissionMode: toLowerPermissionMode(updated.permissionMode),
        updatedAt: updated.updatedAt.getTime(),
      };
    } else {
      const created = await this.prisma.userSettings.create({
        data: {
          userId,
          language: data.language ? toPrismaLanguage(data.language) : 'SYSTEM',
          theme: data.theme ? toPrismaTheme(data.theme) : 'SYSTEM',
          customModelConfigs: data.customModelConfigs
            ? JSON.stringify(data.customModelConfigs)
            : null,
          enabledModels: data.enabledModels
            ? JSON.stringify(data.enabledModels)
            : null,
          defaultModel: data.defaultModel || null,
          permissionMode: data.permissionMode
            ? toPrismaPermissionMode(data.permissionMode)
            : 'DEFAULT',
          updatedAt: now,
        },
      });

      return {
        language: toLowerLanguage(created.language),
        theme: toLowerTheme(created.theme),
        customModelConfigs: created.customModelConfigs
          ? JSON.parse(created.customModelConfigs)
          : [],
        enabledModels: created.enabledModels
          ? JSON.parse(created.enabledModels)
          : [],
        defaultModel: created.defaultModel || '',
        permissionMode: toLowerPermissionMode(created.permissionMode),
        updatedAt: created.updatedAt.getTime(),
      };
    }
  }
}
