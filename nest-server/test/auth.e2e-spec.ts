import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
import request from 'supertest';
import {
  createTestApp,
  cleanDatabase,
  initTestUsers,
  closeTestApp,
  TestContext,
} from './test-utils';

describe('Auth E2E', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    // 清空用户表
    await ctx.prisma.user.deleteMany();
  });

  describe('/api/auth/register', () => {
    it('should register first user as admin', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'first@example.com', password: 'password123' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('first@example.com');
      expect(res.body.data.user.role).toBe('ADMIN');
      expect(res.body.data.token).toBeDefined();
    });

    it('should register second user as employee', async () => {
      // 先创建管理员
      await request(ctx.app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'admin@example.com', password: 'password123' });

      const res = await request(ctx.app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'employee@example.com', password: 'password123' })
        .expect(201);

      expect(res.body.data.user.role).toBe('EMPLOYEE');
    });

    it('should reject duplicate email', async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      await request(ctx.app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(409);
    });

    it('should reject invalid email', async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'invalid', password: 'password123' })
        .expect(400);
    });

    it('should reject short password', async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'short' })
        .expect(400);
    });
  });

  describe('/api/auth/login', () => {
    beforeEach(async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'login@example.com', password: 'password123' });
    });

    it('should login with valid credentials', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'password123' })
        .expect(201);

      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('login@example.com');
    });

    it('should reject wrong password', async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' })
        .expect(401);
    });
  });

  describe('/api/auth/me', () => {
    let token: string;

    beforeEach(async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'me@example.com', password: 'password123' });
      token = res.body.data.token;
    });

    it('should return user info with valid token', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.user.email).toBe('me@example.com');
    });

    it('should reject without token', async () => {
      await request(ctx.app.getHttpServer()).get('/api/auth/me').expect(401);
    });

    it('should reject invalid token', async () => {
      await request(ctx.app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
