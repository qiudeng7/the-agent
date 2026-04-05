import type { Role } from '@prisma/client';

/** 批量创建任务数据 */
export class BatchCreateTasksDataDto {
  created!: number;
  tasks!: Array<{
    id: number;
    title: string;
    status: string;
    createdAt: number;
    updatedAt: number;
  }>;
}

/** 批量创建任务响应 */
export class BatchCreateTasksResponseDto {
  success!: boolean;
  data!: BatchCreateTasksDataDto;
}

/** 批量删除数据 */
export class BatchDeleteDataDto {
  deleted!: number;
}

/** 批量删除响应 */
export class BatchDeleteResponseDto {
  success!: boolean;
  data!: BatchDeleteDataDto;
}

/** 批量创建用户数据 */
export class BatchCreateUsersDataDto {
  created!: number;
  users!: Array<{
    id: string;
    email: string;
    nickname: string | null;
    role: Role;
    createdAt: number;
  }>;
}

/** 批量创建用户响应 */
export class BatchCreateUsersResponseDto {
  success!: boolean;
  data!: BatchCreateUsersDataDto;
}