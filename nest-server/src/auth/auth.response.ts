import type { Role } from '@prisma/client';

/** 用户响应 */
export class UserResponseDto {
  id!: string;
  email!: string;
  nickname!: string | null;
  role!: Role;
  createdAt!: number;
}

/** 认证响应 */
export class AuthDataDto {
  token!: string;
  user!: UserResponseDto;
}

/** 注册/登录响应 */
export class AuthResponseDto {
  success!: boolean;
  data!: AuthDataDto;
}

/** 当前用户响应 */
export class MeResponseDto {
  success!: boolean;
  data!: { user: UserResponseDto };
}
