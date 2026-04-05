import { IsEnum, IsOptional, IsArray, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @IsEnum(['SYSTEM', 'ZH', 'JA', 'EN'])
  @IsOptional()
  language?: string;

  @IsEnum(['SYSTEM', 'LIGHT', 'DARK'])
  @IsOptional()
  theme?: string;

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