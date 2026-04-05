import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';

export type PermissionMode =
  | 'default'
  | 'acceptEdits'
  | 'bypassPermissions'
  | 'dontAsk';

export class UpdateSettingsDto {
  @IsEnum(['system', 'zh', 'ja', 'en'])
  @IsOptional()
  language?: 'system' | 'zh' | 'ja' | 'en';

  @IsEnum(['system', 'light', 'dark'])
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

  @IsEnum(['default', 'acceptEdits', 'bypassPermissions', 'dontAsk'])
  @IsOptional()
  permissionMode?: PermissionMode;
}
