import { getTestApp, createTestToken, testRequest } from './helpers/test-app.helper';
import { FastifyInstance } from 'fastify';

describe('Domain 05: Finance, Koperasi & Billing 360° CRUD E2E Tests', () => {
  let app: FastifyInstance;
  let adminToken: string;

  beforeAll(async () => {
    app = await getTestApp();
    adminToken = createTestToken('ADMIN');
  });

  describe('1. Koperasi POS & Master Supplier', () => {
    it('READ: GET /api/v1/cooperative/supplier -> list suppliers', async () => {
      const res = await testRequest(app, 'GET', '/api/v1/cooperative/supplier', { token: adminToken });
      expect([200, 204]).toContain(res.statusCode);
    });

    it('READ: GET /api/v1/cooperative/saving-category -> list saving categories', async () => {
      const res = await testRequest(app, 'GET', '/api/v1/cooperative/saving-category', { token: adminToken });
      expect([200, 204]).toContain(res.statusCode);
    });
  });

  describe('2. Billing & Subscription Modules', () => {
    it('READ: GET /api/v1/billing/modules/public -> list public billing plans', async () => {
      const res = await testRequest(app, 'GET', '/api/v1/billing/modules/public');
      expect([200, 204]).toContain(res.statusCode);
    });
  });
});
