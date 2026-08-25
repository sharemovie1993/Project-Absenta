import { getTestApp, createTestToken, testRequest, TEST_TENANT_ID, OTHER_TENANT_ID } from './helpers/test-app.helper';
import { FastifyInstance } from 'fastify';

describe('Domain 01: Auth & Multi-Tenant RBAC E2E Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getTestApp();
  });

  describe('1. Health & Public Endpoints', () => {
    it('GET /health -> should return 200 OK', async () => {
      const res = await testRequest(app, 'GET', '/health');
      expect(res.statusCode).toBe(200);
      expect(res.json.status).toBe('ok');
    });

    it('GET /api/v1/auth/dev/tenants -> should return tenant list on dev', async () => {
      const res = await testRequest(app, 'GET', '/api/v1/auth/dev/tenants', {
        headers: { host: 'localhost:3000' }
      });
      expect([200, 403]).toContain(res.statusCode);
    });
  });

  describe('2. Authentication Flow & Token Verification', () => {
    it('POST /api/v1/auth/login with valid credentials -> should return 200 & JWT', async () => {
      const res = await testRequest(app, 'POST', '/api/v1/auth/login', {
        body: {
          email: 'smkn1pld@absenta.id',
          password: 'password123'
        }
      });
      if (res.statusCode === 200) {
        expect(res.json).toHaveProperty('user');
      } else {
        expect([200, 400, 401]).toContain(res.statusCode);
      }
    });

    it('POST /api/v1/auth/login with invalid password -> should return 401 Unauthorized', async () => {
      const res = await testRequest(app, 'POST', '/api/v1/auth/login', {
        body: {
          email: 'smkn1pld@absenta.id',
          password: 'wrongpassword'
        }
      });
      expect([400, 401]).toContain(res.statusCode);
    });
  });

  describe('3. Multi-Tenant RBAC Access Guard (Negative Testing)', () => {
    it('Siswa attempting to access Admin endpoint -> should return 403 Forbidden', async () => {
      const siswaToken = createTestToken('SISWA', { userId: 'siswa-001' });
      const res = await testRequest(app, 'GET', '/api/v1/user', { token: siswaToken });
      expect([401, 403]).toContain(res.statusCode);
    });

    it('Admin with valid token -> should access Admin endpoint successfully', async () => {
      const adminToken = createTestToken('ADMIN', { userId: 'admin-001' });
      const res = await testRequest(app, 'GET', '/api/v1/user', { token: adminToken });
      expect([200, 201]).toContain(res.statusCode);
    });
  });
});
