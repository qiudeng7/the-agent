import { IsString, IsEnum, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsEnum(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  content!: string;

  @IsString()
  @IsOptional()
  model?: string;
}