import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  adminToken: string;
  employeeToken: string;
  adminId: string;
  employeeId: string;
}

/**
 * 动态读取所有迁移文件并执行
 */
async function initSchema(prisma: PrismaService): Promise<void> {
  const migrationsDir = join(process.cwd(), 'prisma/migrations');
  const entries = readdirSync(migrationsDir);

  // 只处理目录（排除 migration_lock.toml 等文件）
  const migrationFolders = entries
    .filter((name) => statSync(join(migrationsDir, name)).isDirectory())
    .sort();

  for (const folder of migrationFolders) {
    const migrationPath = join(migrationsDir, folder, 'migration.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    // 移除注释行，然后分割语句
    const cleanSql = sql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');

    const statements = cleanSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
    }
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

  return {
    app,
    prisma,
    adminToken: '',
    employeeToken: '',
    adminId: '',
    employeeId: '',
  };
}

/**
 * 清空数据库（可选保留用户）
 */
export async function cleanDatabase(
  prisma: PrismaService,
  keepUsers = false,
): Promise<void> {
  await prisma.message.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.userSettings.deleteMany();
  await prisma.task.deleteMany();

  if (!keepUsers) {
    await prisma.user.deleteMany();
  }
}

/**
 * 初始化测试用户并获取 token
 * 如果用户已存在，会重新获取 token
 */
export async function initTestUsers(ctx: TestContext): Promise<void> {
  // 检查用户是否存在
  const existingUsers = await ctx.prisma.user.findMany();

  if (existingUsers.length === 0) {
    // 创建管理员
    const adminRes = await request(ctx.app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'test-admin@example.com',
        password: 'admin123',
        nickname: 'TestAdmin',
      });

    ctx.adminId = adminRes.body.data?.user?.id || '';
    ctx.adminToken = adminRes.body.data?.token || '';

    // 创建员工
    const employeeRes = await request(ctx.app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'test-employee@example.com',
        password: 'employee123',
        nickname: 'TestEmployee',
      });

    ctx.employeeId = employeeRes.body.data?.user?.id || '';
    ctx.employeeToken = employeeRes.body.data?.token || '';
  } else {
    // 用户已存在，登录获取 token
    const adminRes = await request(ctx.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'test-admin@example.com', password: 'admin123' });

    ctx.adminId = adminRes.body.data?.user?.id || '';
    ctx.adminToken = adminRes.body.data?.token || '';

    const employeeRes = await request(ctx.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'test-employee@example.com', password: 'employee123' });

    ctx.employeeId = employeeRes.body.data?.user?.id || '';
    ctx.employeeToken = employeeRes.body.data?.token || '';
  }
}

/**
 * 关闭测试应用
 */
export async function closeTestApp(ctx: TestContext): Promise<void> {
  await ctx.app.close();
}
