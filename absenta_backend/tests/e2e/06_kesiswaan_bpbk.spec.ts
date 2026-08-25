import { getTestApp, createTestToken, testRequest } from './helpers/test-app.helper';
import { FastifyInstance } from 'fastify';

describe('Domain 06: Kesiswaan, BP/BK & Disiplin 360° CRUD E2E Tests', () => {
  let app: FastifyInstance;
  let kesiswaanToken: string;

  beforeAll(async () => {
    app = await getTestApp();
    kesiswaanToken = createTestToken('KESISWAAN');
  });

  describe('1. Poin Pelanggaran & Prestasi Siswa', () => {
    it('READ: GET /api/v1/kesiswaan/jenis-pelanggaran -> list violation types', async () => {
      const res = await testRequest(app, 'GET', '/api/v1/kesiswaan/jenis-pelanggaran', { token: kesiswaanToken });
      expect([200, 204]).toContain(res.statusCode);
    });

    it('READ: GET /api/v1/kesiswaan/prestasi -> list student achievements', async () => {
      const res = await testRequest(app, 'GET', '/api/v1/kesiswaan/prestasi', { token: kesiswaanToken });
      expect([200, 204]).toContain(res.statusCode);
    });
  });

  describe('2. Bimbingan Konseling & Kasus BK', () => {
    it('READ: GET /api/v1/bpbk/dashboard-stats -> get counseling stats', async () => {
      const res = await testRequest(app, 'GET', '/api/v1/bpbk/dashboard-stats', { token: kesiswaanToken });
      expect([200, 204]).toContain(res.statusCode);
    });
  });
});
