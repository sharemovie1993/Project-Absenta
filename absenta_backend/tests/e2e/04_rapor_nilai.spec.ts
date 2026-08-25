import { getTestApp, createTestToken, testRequest } from './helpers/test-app.helper';
import { FastifyInstance } from 'fastify';

describe('Domain 04: Rapor, Nilai & P5 Projek 360° CRUD E2E Tests', () => {
  let app: FastifyInstance;
  let guruToken: string;

  beforeAll(async () => {
    app = await getTestApp();
    guruToken = createTestToken('GURU');
  });

  describe('1. Nilai Formatif, Sumatif & Leger', () => {
    it('READ: GET /api/v1/rapor/nilai -> list student grade records', async () => {
      const res = await testRequest(app, 'GET', '/api/v1/rapor/nilai', { token: guruToken });
      expect([200, 204]).toContain(res.statusCode);
    });

    it('READ: GET /api/v1/rapor/p5 -> list P5 projects', async () => {
      const res = await testRequest(app, 'GET', '/api/v1/rapor/p5', { token: guruToken });
      expect([200, 204]).toContain(res.statusCode);
    });

    it('READ: GET /api/v1/rapor/ukk-skl -> list UKK and graduation certificates', async () => {
      const res = await testRequest(app, 'GET', '/api/v1/rapor/ukk-skl', { token: guruToken });
      expect([200, 204]).toContain(res.statusCode);
    });
  });
});
