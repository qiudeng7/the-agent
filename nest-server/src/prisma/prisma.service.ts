import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // 测试环境使用内存数据库，开发环境使用文件数据库
    const dbUrl = process.env.NODE_ENV === 'test' ? ':memory:' : (process.env.DATABASE_PATH ?? './dev.db');
    const adapter = new PrismaBetterSqlite3({ url: dbUrl });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    // 测试环境不断开连接，保留内存数据库
    if (process.env.NODE_ENV !== 'test') {
      await this.$disconnect();
    }
  }
}