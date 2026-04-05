import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp, cleanDatabase, initTestUsers, closeTestApp, TestContext } from './test-utils';

describe('Tasks E2E', () => {
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

  describe('/api/tasks', () => {
    describe('GET', () => {
      it('should return empty array when no tasks', async () => {
        const res = await request(ctx.app.getHttpServer())
          .get('/api/tasks')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.tasks).toEqual([]);
      });

      it('should return tasks created by admin', async () => {
        // 创建任务
        await request(ctx.app.getHttpServer())
          .post('/api/tasks')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ title: 'Admin Task' });

        const res = await request(ctx.app.getHttpServer())
          .get('/api/tasks')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .expect(200);

        expect(res.body.data.tasks).toHaveLength(1);
        expect(res.body.data.tasks[0].title).toBe('Admin Task');
      });

      it('should return tasks assigned to employee', async () => {
        // 管理员创建任务并分配给员工
        await request(ctx.app.getHttpServer())
          .post('/api/tasks')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ title: 'Assigned Task', assignedToUserId: ctx.employeeId });

        // 员工查看自己的任务
        const res = await request(ctx.app.getHttpServer())
          .get('/api/tasks')
          .set('Authorization', `Bearer ${ctx.employeeToken}`)
          .expect(200);

        expect(res.body.data.tasks).toHaveLength(1);
        expect(res.body.data.tasks[0].title).toBe('Assigned Task');
      });

      it('should reject unauthorized request', async () => {
        await request(ctx.app.getHttpServer())
          .get('/api/tasks')
          .expect(401);
      });
    });

    describe('POST', () => {
      it('should create task', async () => {
        const res = await request(ctx.app.getHttpServer())
          .post('/api/tasks')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ title: 'New Task', description: 'Task description' })
          .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.data.title).toBe('New Task');
        expect(res.body.data.description).toBe('Task description');
        expect(res.body.data.status).toBe('TODO');
      });

      it('should reject without title', async () => {
        await request(ctx.app.getHttpServer())
          .post('/api/tasks')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ description: 'Only description' })
          .expect(400);
      });
    });

    describe('GET /api/tasks/stats', () => {
      it('should return task statistics', async () => {
        // 创建多个任务
        await request(ctx.app.getHttpServer())
          .post('/api/tasks')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ title: 'Task 1' });

        await request(ctx.app.getHttpServer())
          .post('/api/tasks')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ title: 'Task 2' });

        // 更新第二个任务状态
        const taskRes = await request(ctx.app.getHttpServer())
          .get('/api/tasks')
          .set('Authorization', `Bearer ${ctx.adminToken}`);

        const task2Id = taskRes.body.data.tasks[0].id;

        await request(ctx.app.getHttpServer())
          .patch(`/api/tasks/${task2Id}`)
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ status: 'DONE' });

        const res = await request(ctx.app.getHttpServer())
          .get('/api/tasks/stats')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.todo).toBe(1);
        expect(res.body.data.done).toBe(1);
      });
    });

    describe('GET /api/tasks/:id', () => {
      let taskId: number;

      beforeEach(async () => {
        const res = await request(ctx.app.getHttpServer())
          .post('/api/tasks')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ title: 'Test Task' });
        taskId = res.body.data.id;
      });

      it('should return task by id', async () => {
        const res = await request(ctx.app.getHttpServer())
          .get(`/api/tasks/${taskId}`)
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.title).toBe('Test Task');
      });

      it('should return 404 for non-existent task', async () => {
        await request(ctx.app.getHttpServer())
          .get('/api/tasks/99999')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .expect(404);
      });
    });

    describe('PATCH /api/tasks/:id', () => {
      let taskId: number;

      beforeEach(async () => {
        const res = await request(ctx.app.getHttpServer())
          .post('/api/tasks')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ title: 'Task to Update' });
        taskId = res.body.data.id;
      });

      it('should update task', async () => {
        const res = await request(ctx.app.getHttpServer())
          .patch(`/api/tasks/${taskId}`)
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ status: 'IN_PROGRESS' })
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('IN_PROGRESS');
      });
    });

    describe('DELETE /api/tasks/:id', () => {
      let taskId: number;

      beforeEach(async () => {
        const res = await request(ctx.app.getHttpServer())
          .post('/api/tasks')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ title: 'Task to Delete' });
        taskId = res.body.data.id;
      });

      it('should soft delete task', async () => {
        await request(ctx.app.getHttpServer())
          .delete(`/api/tasks/${taskId}`)
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .expect(200);

        // 确认任务不在列表中
        const res = await request(ctx.app.getHttpServer())
          .get('/api/tasks')
          .set('Authorization', `Bearer ${ctx.adminToken}`);

        expect(res.body.data.tasks).toHaveLength(0);
      });
    });
  });
});