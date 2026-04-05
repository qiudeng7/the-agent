import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpdateSettingsDto {
  @IsString()
  @IsOptional()
  language?: 'system' | 'zh' | 'ja' | 'en';

  @IsString()
  @IsOptional()
  theme?: 'system' | 'light' | 'dark';

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