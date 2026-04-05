import type { TaskStatus } from '@prisma/client';

/** 任务响应 */
export class TaskResponseDto {
  id!: number;
  title!: string;
  category!: string | null;
  tag!: string | null;
  description!: string | null;
  status!: TaskStatus;
  createdByUserId!: string;
  assignedToUserId!: string | null;
  createdAt!: number;
  updatedAt!: number;
}

/** 任务列表数据 */
export class TaskListDataDto {
  tasks!: TaskResponseDto[];
  total!: number;
  page!: number;
  pageSize!: number;
}

/** 任务列表响应 */
export class TaskListResponseDto {
  success!: boolean;
  data!: TaskListDataDto;
}

/** 单个任务响应 */
export class TaskResponseDtoWrapper {
  success!: boolean;
  data!: TaskResponseDto;
}

/** 任务统计数据 */
export class TaskStatsDataDto {
  todo!: number;
  in_progress!: number;
  in_review!: number;
  done!: number;
  cancelled!: number;
  total!: number;
}

/** 任务统计响应 */
export class TaskStatsResponseDto {
  success!: boolean;
  data!: TaskStatsDataDto;
}
