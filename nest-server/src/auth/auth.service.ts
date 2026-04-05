import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { nanoid } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from './crypto.service';
import { JwtService } from './jwt.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * 用户注册
   */
  async register(data: {
    email: string;
    password: string;
    nickname?: string;
  }) {
    // 检查邮箱是否已存在
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // 检查是否是第一个用户（自动成为 admin）
    const userCount = await this.prisma.user.count();
    const role = userCount === 0 ? 'ADMIN' : 'EMPLOYEE';

    // 创建用户
    const now = new Date();
    const userId = nanoid();
    const passwordHash = await this.crypto.hashPassword(data.password);

    const user = await this.prisma.user.create({
      data: {
        id: userId,
        email: data.email,
        passwordHash,
        nickname: data.nickname || null,
        role,
        createdAt: now,
        updatedAt: now,
      },
    });

    // 生成 JWT
    const token = await this.jwt.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          role: user.role.toLowerCase(),
          createdAt: user.createdAt.getTime(),
        },
      },
    };
  }

  /**
   * 用户登录
   */
  async login(data: { email: string; password: string }) {
    // 查找用户
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 检查用户是否被禁用
    if (user.deletedAt) {
      throw new ForbiddenException('User account has been disabled');
    }

    // 验证密码
    const isValid = await this.crypto.verifyPassword(
      data.password,
      user.passwordHash,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 生成 JWT
    const token = await this.jwt.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          role: user.role.toLowerCase(),
          createdAt: user.createdAt.getTime(),
        },
      },
    };
  }

  /**
   * 获取当前用户信息
   */
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.deletedAt) {
      throw new ForbiddenException('User account has been disabled');
    }

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          role: user.role.toLowerCase(),
          createdAt: user.createdAt.getTime(),
          updatedAt: user.updatedAt.getTime(),
        },
      },
    };
  }
}