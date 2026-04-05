import { IsString, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class TaskBatchItem {
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

class UserBatchItem {
  @IsString()
  email!: string;

  @IsString()
  password!: string;

  @IsString()
  @IsOptional()
  nickname?: string;

  @IsEnum(['ADMIN', 'EMPLOYEE'])
  @IsOptional()
  role?: string;
}

export class BatchTasksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskBatchItem)
  tasks!: TaskBatchItem[];
}

export class BatchUsersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserBatchItem)
  users!: UserBatchItem[];
}

export class BatchDeleteDto {
  @IsArray()
  ids!: (string | number)[];
}