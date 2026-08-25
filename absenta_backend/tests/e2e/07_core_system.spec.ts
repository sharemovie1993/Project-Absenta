import { getTestApp, createTestToken, testRequest } from './helpers/test-app.helper';
import { FastifyInstance } from 'fastify';

describe('Domain 07: Core System, Sarpras, Hubin & Wilayah 360° CRUD E2E Tests', () => {
  let app: FastifyInstance;
  let adminToken: string;

  beforeAll(async () => {
    app = await getTestApp();
    adminToken = createTestToken('ADMIN');
  });

  describe('1. Master Wilayah Indonesia', () => {
    it('GET /api/v1/wilayah/provinsi -> list all provinces', async () => {
      const res = await testRequest(app, 'GET', '/api/v1/wilayah/provinsi', { token: adminToken });
      expect([200, 204]).toContain(res.statusCode);
    });
  });

  describe('2. Sarpras & Asset Management', () => {
    it('GET /api/v1/sarpras -> list school inventory assets', async () => {
      const res = await testRequest(app, 'GET', '/api/v1/sarpras', { token: adminToken });
      expect([200, 204]).toContain(res.statusCode);
    });
  });

  describe('3. Hubin & Prakerin PKL', () => {
    it('GET /api/v1/hubin -> list industrial internship records', async () => {
      const res = await testRequest(app, 'GET', '/api/v1/hubin', { token: adminToken });
      expect([200, 204]).toContain(res.statusCode);
    });
  });
});
