import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { TaskStatus } from '@prisma/client';

export class CreateTaskDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  tag?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  assignedToUserId?: string;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  tag?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'])
  @IsOptional()
  status?: TaskStatus;

  @IsString()
  @IsOptional()
  assignedToUserId?: string | null;
}

export class TaskQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number = 10;

  @IsEnum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'])
  @IsOptional()
  status?: TaskStatus;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  search?: string;
}