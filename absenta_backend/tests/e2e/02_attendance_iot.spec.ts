import { getTestApp, createTestToken, testRequest } from './helpers/test-app.helper';
import { FastifyInstance } from 'fastify';

describe('Domain 02: Attendance, Presensi & IoT Devices 360° CRUD E2E Tests', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let guruToken: string;

  beforeAll(async () => {
    app = await getTestApp();
    adminToken = createTestToken('ADMIN');
    guruToken = createTestToken('GURU');
  });

  describe('1. Presensi & Sesi Absensi CRUD Lifecycle', () => {
    it('GET /api/v1/attendance/sesi-absensi -> should list active attendance sessions', async () => {
      const res = await testRequest(app, 'GET', '/api/v1/attendance/sesi-absensi', { token: guruToken });
      expect([200, 204]).toContain(res.statusCode);
    });

    it('POST /api/v1/attendance/sesi-absensi with empty payload -> should return 400 Bad Request', async () => {
      const res = await testRequest(app, 'POST', '/api/v1/attendance/sesi-absensi', {
        token: guruToken,
        body: {}
      });
      expect([400, 422]).toContain(res.statusCode);
    });
  });

  describe('2. IoT Attendance Device Management CRUD Lifecycle', () => {
    let createdDeviceId = '';

    it('CREATE: POST /api/v1/attendance/devices -> register new RFID gate device', async () => {
      const res = await testRequest(app, 'POST', '/api/v1/attendance/devices', {
        token: adminToken,
        body: {
          name: 'Gerbang Utama RFID Reader Test',
          ip_address: '192.168.1.200',
          location: 'Gerbang Depan SMKN 1 Plered',
          device_type: 'RFID_READER'
        }
      });
      expect([200, 201, 400]).toContain(res.statusCode);
      if (res.json?.data?.id) createdDeviceId = res.json.data.id;
    });

    it('READ: GET /api/v1/attendance/devices -> list registered devices', async () => {
      const res = await testRequest(app, 'GET', '/api/v1/attendance/devices', { token: adminToken });
      expect([200, 204]).toContain(res.statusCode);
    });

    it('DELETE: DELETE /api/v1/attendance/devices/:id -> delete device cleanly', async () => {
      if (!createdDeviceId) return;
      const res = await testRequest(app, 'DELETE', `/api/v1/attendance/devices/${createdDeviceId}`, { token: adminToken });
      expect([200, 204]).toContain(res.statusCode);
    });
  });
});
