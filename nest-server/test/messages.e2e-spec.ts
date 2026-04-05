import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
import request from 'supertest';
import {
  createTestApp,
  cleanDatabase,
  initTestUsers,
  closeTestApp,
  TestContext,
} from './test-utils';

describe('Messages E2E', () => {
  let ctx: TestContext;
  let sessionId: string;

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

    // 创建测试 session
    const res = await request(ctx.app.getHttpServer())
      .post('/api/sessions')
      .set('Authorization', `Bearer ${ctx.adminToken}`)
      .send({ title: 'Test Session', model: 'claude-3' });
    sessionId = res.body.id;
  });

  describe('/api/messages/:sessionId', () => {
    describe('GET', () => {
      it('should return empty array when no messages', async () => {
        const res = await request(ctx.app.getHttpServer())
          .get(`/api/messages/${sessionId}`)
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .expect(200);

        expect(res.body).toEqual([]);
      });

      it('should return messages for session', async () => {
        // 创建消息
        await request(ctx.app.getHttpServer())
          .post(`/api/messages/${sessionId}`)
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ role: 'user', content: 'Hello' });

        await request(ctx.app.getHttpServer())
          .post(`/api/messages/${sessionId}`)
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ role: 'assistant', content: 'Hi there', model: 'claude-3' });

        const res = await request(ctx.app.getHttpServer())
          .get(`/api/messages/${sessionId}`)
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .expect(200);

        expect(res.body).toHaveLength(2);
        expect(res.body[0].role).toBe('user');
        expect(res.body[1].role).toBe('assistant');
      });

      it('should return 404 for non-existent session', async () => {
        await request(ctx.app.getHttpServer())
          .get('/api/messages/non-existent-id')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .expect(404);
      });

      it('should not allow access to other user messages', async () => {
        await request(ctx.app.getHttpServer())
          .get(`/api/messages/${sessionId}`)
          .set('Authorization', `Bearer ${ctx.employeeToken}`)
          .expect(404);
      });
    });

    describe('POST', () => {
      it('should create user message', async () => {
        const res = await request(ctx.app.getHttpServer())
          .post(`/api/messages/${sessionId}`)
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ role: 'user', content: 'Test message' })
          .expect(201);

        expect(res.body.role).toBe('user');
        expect(res.body.content).toBe('Test message');
        expect(res.body.id).toBeDefined();
      });

      it('should create assistant message', async () => {
        const res = await request(ctx.app.getHttpServer())
          .post(`/api/messages/${sessionId}`)
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ role: 'assistant', content: 'Response', model: 'claude-3' })
          .expect(201);

        expect(res.body.role).toBe('assistant');
        expect(res.body.model).toBe('claude-3');
      });

      it('should reject without role', async () => {
        await request(ctx.app.getHttpServer())
          .post(`/api/messages/${sessionId}`)
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ content: 'Message without role' })
          .expect(400);
      });

      it('should reject without content', async () => {
        await request(ctx.app.getHttpServer())
          .post(`/api/messages/${sessionId}`)
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ role: 'user' })
          .expect(400);
      });

      it('should reject invalid role', async () => {
        await request(ctx.app.getHttpServer())
          .post(`/api/messages/${sessionId}`)
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ role: 'invalid', content: 'Test' })
          .expect(400);
      });
    });

    describe('DELETE /api/messages/:id', () => {
      let messageId: string;

      beforeEach(async () => {
        const res = await request(ctx.app.getHttpServer())
          .post(`/api/messages/${sessionId}`)
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ role: 'user', content: 'Message to delete' });
        messageId = res.body.id;
      });

      it('should delete message', async () => {
        await request(ctx.app.getHttpServer())
          .delete(`/api/messages/${messageId}`)
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .expect(200);

        const res = await request(ctx.app.getHttpServer())
          .get(`/api/messages/${sessionId}`)
          .set('Authorization', `Bearer ${ctx.adminToken}`);

        expect(res.body).toHaveLength(0);
      });

      it('should return 404 for non-existent message', async () => {
        await request(ctx.app.getHttpServer())
          .delete('/api/messages/non-existent-id')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .expect(404);
      });
    });
  });
});
