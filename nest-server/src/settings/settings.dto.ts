import { IsEnum, IsOptional, IsArray, IsString } from 'class-validator';
import type { Language, Theme } from '@prisma/client';

export class UpdateSettingsDto {
  @IsEnum(['SYSTEM', 'ZH', 'JA', 'EN'])
  @IsOptional()
  language?: Language;

  @IsEnum(['SYSTEM', 'LIGHT', 'DARK'])
  @IsOptional()
  theme?: Theme;

  @IsArray()
  @IsOptional()
  customModelConfigs?: unknown[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  enabledModels?: string[];

  @IsString()
  @IsOptional()
  defaultModel?: string;
}