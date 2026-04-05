import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
import request from 'supertest';
import { createTestApp, cleanDatabase, initTestUsers, closeTestApp, TestContext } from './test-utils';

describe('Sessions E2E', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
    await initTestUsers(ctx);
  });

  afterAll(async () => {
    await closeTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma, true);
    await initTestUsers(ctx);
  });

  describe('/api/sessions', () => {
    describe('GET', () => {
      it('should return empty array when no sessions', async () => {
        const res = await request(ctx.app.getHttpServer())
          .get('/api/sessions')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .expect(200);

        expect(res.body).toEqual([]);
      });

      it('should return user sessions', async () => {
        await request(ctx.app.getHttpServer())
          .post('/api/sessions')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ title: 'Test Session', model: 'claude-3' });

        const res = await request(ctx.app.getHttpServer())
          .get('/api/sessions')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .expect(200);

        expect(res.body).toHaveLength(1);
        expect(res.body[0].title).toBe('Test Session');
      });

      it('should not return other user sessions', async () => {
        // 管理员创建 session
        await request(ctx.app.getHttpServer())
          .post('/api/sessions')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ title: 'Admin Session', model: 'claude-3' });

        // 员工查看自己的 sessions
        const res = await request(ctx.app.getHttpServer())
          .get('/api/sessions')
          .set('Authorization', `Bearer ${ctx.employeeToken}`)
          .expect(200);

        expect(res.body).toHaveLength(0);
      });
    });

    describe('POST', () => {
      it('should create session', async () => {
        const res = await request(ctx.app.getHttpServer())
          .post('/api/sessions')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ title: 'New Session', model: 'claude-3' })
          .expect(201);

        expect(res.body.title).toBe('New Session');
        expect(res.body.model).toBe('claude-3');
        expect(res.body.id).toBeDefined();
      });

      it('should reject without title', async () => {
        await request(ctx.app.getHttpServer())
          .post('/api/sessions')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ model: 'claude-3' })
          .expect(400);
      });

      it('should reject without model', async () => {
        await request(ctx.app.getHttpServer())
          .post('/api/sessions')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ title: 'Session' })
          .expect(400);
      });
    });

    describe('GET /api/sessions/:id', () => {
      let sessionId: string;

      beforeEach(async () => {
        const res = await request(ctx.app.getHttpServer())
          .post('/api/sessions')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ title: 'Test Session', model: 'claude-3' });
        sessionId = res.body.id;
      });

      it('should return session by id', async () => {
        const res = await request(ctx.app.getHttpServer())
          .get(`/api/sessions/${sessionId}`)
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .expect(200);

        expect(res.body.title).toBe('Test Session');
      });

      it('should return 404 for non-existent session', async () => {
        await request(ctx.app.getHttpServer())
          .get('/api/sessions/non-existent-id')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .expect(404);
      });

      it('should not allow access to other user session', async () => {
        await request(ctx.app.getHttpServer())
          .get(`/api/sessions/${sessionId}`)
          .set('Authorization', `Bearer ${ctx.employeeToken}`)
          .expect(404);
      });
    });

    describe('PUT /api/sessions/:id', () => {
      let sessionId: string;

      beforeEach(async () => {
        const res = await request(ctx.app.getHttpServer())
          .post('/api/sessions')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ title: 'Session to Update', model: 'claude-3' });
        sessionId = res.body.id;
      });

      it('should update session', async () => {
        const res = await request(ctx.app.getHttpServer())
          .put(`/api/sessions/${sessionId}`)
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ title: 'Updated Title' })
          .expect(200);

        expect(res.body.title).toBe('Updated Title');
      });
    });

    describe('DELETE /api/sessions/:id', () => {
      let sessionId: string;

      beforeEach(async () => {
        const res = await request(ctx.app.getHttpServer())
          .post('/api/sessions')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ title: 'Session to Delete', model: 'claude-3' });
        sessionId = res.body.id;
      });

      it('should delete session', async () => {
        await request(ctx.app.getHttpServer())
          .delete(`/api/sessions/${sessionId}`)
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .expect(200);

        const res = await request(ctx.app.getHttpServer())
          .get('/api/sessions')
          .set('Authorization', `Bearer ${ctx.adminToken}`);

        expect(res.body).toHaveLength(0);
      });
    });
  });
});