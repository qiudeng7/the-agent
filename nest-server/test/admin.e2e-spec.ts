import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp, cleanDatabase, initTestUsers, closeTestApp, TestContext } from './test-utils';

describe('Admin E2E', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
    await initTestUsers(ctx);
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma, true); // 保留测试用户
  });

  describe('Authorization', () => {
    it('should allow admin access', async () => {
      await request(ctx.app.getHttpServer())
        .get('/api/admin/database/users')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .expect(200);
    });

    it('should reject employee access', async () => {
      await request(ctx.app.getHttpServer())
        .get('/api/admin/database/users')
        .set('Authorization', `Bearer ${ctx.employeeToken}`)
        .expect(403);
    });

    it('should reject unauthorized access', async () => {
      await request(ctx.app.getHttpServer())
        .get('/api/admin/database/users')
        .expect(401);
    });
  });

  describe('/api/admin/database/:table', () => {
    describe('GET', () => {
      it('should return users data', async () => {
        const res = await request(ctx.app.getHttpServer())
          .get('/api/admin/database/users')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should return tasks data', async () => {
        // 创建一个任务
        await request(ctx.app.getHttpServer())
          .post('/api/tasks')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ title: 'Test Task' });

        const res = await request(ctx.app.getHttpServer())
          .get('/api/admin/database/tasks')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .expect(200);

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].title).toBe('Test Task');
      });

      it('should reject invalid table name', async () => {
        await request(ctx.app.getHttpServer())
          .get('/api/admin/database/invalid')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .expect(400);
      });
    });

    describe('PATCH', () => {
      it('should update user record', async () => {
        const res = await request(ctx.app.getHttpServer())
          .patch(`/api/admin/database/users/${ctx.adminId}`)
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ nickname: 'Updated Admin' })
          .expect(200);

        expect(res.body.success).toBe(true);
      });

      it('should update task record', async () => {
        // 创建任务
        const taskRes = await request(ctx.app.getHttpServer())
          .post('/api/tasks')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ title: 'Task to Update' });
        const taskId = taskRes.body.data.id;

        const res = await request(ctx.app.getHttpServer())
          .patch(`/api/admin/database/tasks/${taskId}`)
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ status: 'DONE' })
          .expect(200);

        expect(res.body.success).toBe(true);
      });
    });

    describe('DELETE', () => {
      it('should soft delete user', async () => {
        await request(ctx.app.getHttpServer())
          .delete(`/api/admin/database/users/${ctx.employeeId}`)
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .expect(200);

        // 验证用户不在列表中
        const res = await request(ctx.app.getHttpServer())
          .get('/api/admin/database/users')
          .set('Authorization', `Bearer ${ctx.adminToken}`);

        const userIds = res.body.data.map((u: { id: string }) => u.id);
        expect(userIds).not.toContain(ctx.employeeId);
      });
    });
  });

  describe('/api/admin/tasks/batch', () => {
    describe('POST', () => {
      it('should create multiple tasks', async () => {
        const res = await request(ctx.app.getHttpServer())
          .post('/api/admin/tasks/batch')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({
            tasks: [
              { title: 'Batch Task 1' },
              { title: 'Batch Task 2' },
              { title: 'Batch Task 3' }
            ]
          })
          .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.data.created).toBe(3);
        expect(res.body.data.tasks).toHaveLength(3);
      });

      it('should reject empty tasks array', async () => {
        await request(ctx.app.getHttpServer())
          .post('/api/admin/tasks/batch')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ tasks: [] })
          .expect(400);
      });
    });

    describe('DELETE', () => {
      it('should delete multiple tasks', async () => {
        // 创建任务
        const task1 = await request(ctx.app.getHttpServer())
          .post('/api/tasks')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ title: 'Task 1' });

        const task2 = await request(ctx.app.getHttpServer())
          .post('/api/tasks')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ title: 'Task 2' });

        const res = await request(ctx.app.getHttpServer())
          .delete('/api/admin/tasks/batch')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ ids: [task1.body.data.id, task2.body.data.id] })
          .expect(200);

        expect(res.body.data.deleted).toBe(2);
      });
    });
  });

  describe('/api/admin/users/batch', () => {
    describe('POST', () => {
      it('should create multiple users', async () => {
        const res = await request(ctx.app.getHttpServer())
          .post('/api/admin/users/batch')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({
            users: [
              { email: 'batch1@example.com', password: 'password123' },
              { email: 'batch2@example.com', password: 'password123' }
            ]
          })
          .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.data.created).toBe(2);
      });

      it('should reject empty users array', async () => {
        await request(ctx.app.getHttpServer())
          .post('/api/admin/users/batch')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ users: [] })
          .expect(400);
      });
    });

    describe('DELETE', () => {
      it('should delete multiple users', async () => {
        // 创建用户
        const user1 = await request(ctx.app.getHttpServer())
          .post('/api/auth/register')
          .send({ email: 'delete1@example.com', password: 'password123' });

        const user2 = await request(ctx.app.getHttpServer())
          .post('/api/auth/register')
          .send({ email: 'delete2@example.com', password: 'password123' });

        const res = await request(ctx.app.getHttpServer())
          .delete('/api/admin/users/batch')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ ids: [user1.body.data.user.id, user2.body.data.user.id] })
          .expect(200);

        expect(res.body.data.deleted).toBe(2);
      });
    });
  });
});