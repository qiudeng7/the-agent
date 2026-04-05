import { IsString, IsEnum, IsOptional, ValidateIf } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsEnum(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @ValidateIf((o) => typeof o.content === 'string')
  @IsString()
  content!: string | Record<string, unknown>[];

  @IsString()
  @IsOptional()
  model?: string;

  @IsOptional()
  timestamp?: number;
}
