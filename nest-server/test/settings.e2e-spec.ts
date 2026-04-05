import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
import request from 'supertest';
import {
  createTestApp,
  cleanDatabase,
  initTestUsers,
  closeTestApp,
  TestContext,
} from './test-utils';

describe('Settings E2E', () => {
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

  describe('/api/settings', () => {
    describe('GET', () => {
      it('should return default settings for new user', async () => {
        const res = await request(ctx.app.getHttpServer())
          .get('/api/settings')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .expect(200);

        expect(res.body.language).toBe('SYSTEM');
        expect(res.body.theme).toBe('SYSTEM');
        expect(res.body.customModelConfigs).toEqual([]);
      });

      it('should reject unauthorized request', async () => {
        await request(ctx.app.getHttpServer()).get('/api/settings').expect(401);
      });
    });

    describe('PUT', () => {
      it('should update settings', async () => {
        const res = await request(ctx.app.getHttpServer())
          .put('/api/settings')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ language: 'ZH', theme: 'DARK' })
          .expect(200);

        expect(res.body.language).toBe('ZH');
        expect(res.body.theme).toBe('DARK');
      });

      it('should update customModelConfigs', async () => {
        const res = await request(ctx.app.getHttpServer())
          .put('/api/settings')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({
            customModelConfigs: [
              { name: 'custom-model', baseUrl: 'https://api.example.com' },
            ],
          })
          .expect(200);

        expect(res.body.customModelConfigs).toHaveLength(1);
        expect(res.body.customModelConfigs[0].name).toBe('custom-model');
      });

      it('should persist settings across requests', async () => {
        await request(ctx.app.getHttpServer())
          .put('/api/settings')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ language: 'EN', theme: 'LIGHT' });

        const res = await request(ctx.app.getHttpServer())
          .get('/api/settings')
          .set('Authorization', `Bearer ${ctx.adminToken}`);

        expect(res.body.language).toBe('EN');
        expect(res.body.theme).toBe('LIGHT');
      });

      it('should have separate settings per user', async () => {
        // 管理员设置
        await request(ctx.app.getHttpServer())
          .put('/api/settings')
          .set('Authorization', `Bearer ${ctx.adminToken}`)
          .send({ language: 'ZH' });

        // 员工设置
        await request(ctx.app.getHttpServer())
          .put('/api/settings')
          .set('Authorization', `Bearer ${ctx.employeeToken}`)
          .send({ language: 'EN' });

        // 验证管理员设置
        const adminRes = await request(ctx.app.getHttpServer())
          .get('/api/settings')
          .set('Authorization', `Bearer ${ctx.adminToken}`);

        // 验证员工设置
        const employeeRes = await request(ctx.app.getHttpServer())
          .get('/api/settings')
          .set('Authorization', `Bearer ${ctx.employeeToken}`);

        expect(adminRes.body.language).toBe('ZH');
        expect(employeeRes.body.language).toBe('EN');
      });
    });
  });
});
