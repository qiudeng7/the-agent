import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  adminToken: string;
  employeeToken: string;
  adminId: string;
  employeeId: string;
}

// 读取迁移 SQL（只读一次）
let migrationSql: string | null = null;

function getMigrationSql(): string {
  if (!migrationSql) {
    const migrationPath = join(process.cwd(), 'prisma/migrations/20260405091553/migration.sql');
    migrationSql = readFileSync(migrationPath, 'utf-8');
  }
  return migrationSql;
}

/**
 * 初始化内存数据库的 schema
 */
async function initSchema(prisma: PrismaService): Promise<void> {
  const sql = getMigrationSql();
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}

/**
 * 创建测试应用上下文
 */
export async function createTestApp(): Promise<TestContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // 与 main.ts 保持一致的配置
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('api');

  await app.init();

  const prisma = app.get(PrismaService);

  // 初始化内存数据库 schema
  await initSchema(prisma);

  return { app, prisma, adminToken: '', employeeToken: '', adminId: '', employeeId: '' };
}

/**
 * 清空数据库（可选保留用户）
 */
export async function cleanDatabase(prisma: PrismaService, keepUsers = false): Promise<void> {
  try {
    await prisma.message.deleteMany();
  } catch {}
  try {
    await prisma.chatSession.deleteMany();
  } catch {}
  try {
    await prisma.userSettings.deleteMany();
  } catch {}
  try {
    await prisma.task.deleteMany();
  } catch {}
  if (!keepUsers) {
    try {
      await prisma.user.deleteMany();
    } catch {}
  }
}

/**
 * 初始化测试用户并获取 token
 */
export async function initTestUsers(ctx: TestContext): Promise<void> {
  // 创建管理员
  const adminRes = await request(ctx.app.getHttpServer())
    .post('/api/auth/register')
    .send({ email: 'test-admin@example.com', password: 'admin123', nickname: 'TestAdmin' });

  ctx.adminId = adminRes.body.data.user.id;
  ctx.adminToken = adminRes.body.data.token;

  // 创建员工
  const employeeRes = await request(ctx.app.getHttpServer())
    .post('/api/auth/register')
    .send({ email: 'test-employee@example.com', password: 'employee123', nickname: 'TestEmployee' });

  ctx.employeeId = employeeRes.body.data.user.id;
  ctx.employeeToken = employeeRes.body.data.token;
}

/**
 * 关闭测试应用
 */
export async function closeTestApp(ctx: TestContext): Promise<void> {
  await ctx.app.close();
}