import { getTestApp, createTestToken, testRequest } from './helpers/test-app.helper';
import { FastifyInstance } from 'fastify';

describe('Domain 03: Academic & Kurikulum Merdeka 360° CRUD E2E Tests', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let kurikulumToken: string;

  beforeAll(async () => {
    app = await getTestApp();
    adminToken = createTestToken('ADMIN');
    kurikulumToken = createTestToken('KURIKULUM');
  });

  describe('1. Program Keahlian & Jurusan CRUD', () => {
    it('READ: GET /api/v1/academic/program-keahlian -> list vocational majors', async () => {
      const res = await testRequest(app, 'GET', '/api/v1/academic/program-keahlian', { token: kurikulumToken });
      expect([200, 204]).toContain(res.statusCode);
    });
  });

  describe('2. Mata Pelajaran & Jadwal KBM CRUD', () => {
    it('READ: GET /api/v1/kurikulum/struktur-kurikulum -> list curriculum structures', async () => {
      const res = await testRequest(app, 'GET', '/api/v1/kurikulum/struktur-kurikulum', { token: kurikulumToken });
      expect([200, 204]).toContain(res.statusCode);
    });

    it('READ: GET /api/v1/kurikulum/kalender-akademik -> list academic events', async () => {
      const res = await testRequest(app, 'GET', '/api/v1/kurikulum/kalender-akademik', { token: kurikulumToken });
      expect([200, 204]).toContain(res.statusCode);
    });
  });
});
