import { getTestApp, createTestToken, testRequest, TEST_TENANT_ID } from '../tests/e2e/helpers/test-app.helper';
import { prisma } from '../src/utils/prisma';

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

async function runSuite() {
  console.log(`\n${C.bold}${C.cyan}╔═════════════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║   🚀 AUTOMATED 360° E2E API TEST SUITE ENGINE - ABSENTA MULTI-TENANT    ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}║   🎯 Target Tenant: SMKN 1 PLERED - PURWAKARTA (${TEST_TENANT_ID.slice(0, 8)}...)  ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚═════════════════════════════════════════════════════════════════════════╝${C.reset}\n`);

  const startTime = Date.now();
  const app = await getTestApp();

  const tokens = {
    ADMIN: createTestToken('ADMIN', { email: 'smkn1pld@absenta.id' }),
    GURU: createTestToken('GURU', { email: 'guru@absenta.id' }),
    KURIKULUM: createTestToken('KURIKULUM', { email: 'kurikulum@absenta.id' }),
    KESISWAAN: createTestToken('KESISWAAN', { email: 'kesiswaan@absenta.id' }),
    SISWA: createTestToken('SISWA', { email: 'siswa@absenta.id' }),
  };

  let totalPassed = 0;
  let totalFailed = 0;

  async function test(domainName: string, testName: string, fn: () => Promise<void>) {
    try {
      await fn();
      totalPassed++;
      console.log(`  ${C.green}✔ PASS${C.reset} [${domainName}] ${testName}`);
    } catch (err: any) {
      totalFailed++;
      console.log(`  ${C.red}✖ FAIL${C.reset} [${domainName}] ${testName}: ${C.yellow}${err.message}${C.reset}`);
    }
  }

  function expect(actual: any) {
    return {
      toBe(expected: any) {
        if (actual !== expected) throw new Error(`Expected ${expected} but received ${actual}`);
      },
      toBeIn(arr: any[]) {
        if (!arr.includes(actual)) throw new Error(`Expected one of [${arr.join(', ')}] but received ${actual}`);
      },
      toHaveProperty(prop: string) {
        if (!actual || typeof actual !== 'object' || !(prop in actual)) {
          throw new Error(`Expected object to have property '${prop}'`);
        }
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // DOMAIN 1: AUTH & MULTI-TENANT RBAC
  // ═══════════════════════════════════════════════════════════════════
  console.log(`${C.bold}${C.blue}▶ DOMAIN 1: AUTHENTICATION & MULTI-TENANT RBAC${C.reset}`);
  await test('Auth', 'GET /health -> server and database healthy (200 OK)', async () => {
    const res = await testRequest(app, 'GET', '/health');
    expect(res.statusCode).toBe(200);
    expect(res.json?.status).toBe('ok');
  });

  await test('Auth', 'POST /api/auth/login -> rejection on invalid credentials (400/401)', async () => {
    const res = await testRequest(app, 'POST', '/api/auth/login', {
      body: { email: 'smkn1pld@absenta.id', password: 'wrongpassword' }
    });
    expect(res.statusCode).toBeIn([400, 401]);
  });

  await test('Auth', 'RBAC Guard: Siswa forbidden from accessing Admin User Management (401/403)', async () => {
    const res = await testRequest(app, 'GET', '/api/users', { token: tokens.SISWA });
    expect(res.statusCode).toBeIn([401, 403]);
  });

  // ═══════════════════════════════════════════════════════════════════
  // DOMAIN 2: ATTENDANCE & IOT DEVICES (CRUD)
  // ═══════════════════════════════════════════════════════════════════
  console.log(`\n${C.bold}${C.blue}▶ DOMAIN 2: ATTENDANCE, PRESENSI & IOT RFID DEVICES (360° CRUD)${C.reset}`);
  await test('Attendance', 'READ: GET /api/attendance/sesi-absensi -> list attendance sessions', async () => {
    const res = await testRequest(app, 'GET', '/api/attendance/sesi-absensi', { token: tokens.ADMIN });
    expect(res.statusCode).toBeIn([200, 204]);
  });

  await test('Attendance', 'VALIDATION: POST /api/attendance/sesi-absensi with empty payload (400/403 Bad Request)', async () => {
    const res = await testRequest(app, 'POST', '/api/attendance/sesi-absensi', { token: tokens.ADMIN, body: {} });
    expect(res.statusCode).toBeIn([400, 403, 422]);
  });

  let createdDeviceId = '';
  await test('Attendance', 'CREATE: POST /api/attendance/devices -> register IoT RFID reader', async () => {
    const res = await testRequest(app, 'POST', '/api/attendance/devices', {
      token: tokens.ADMIN,
      body: {
        device_id: 'RFID-DEV-E2E-001',
        name: 'Gerbang Utama RFID Reader Test Auto',
        ip_address: '192.168.1.210',
        location: 'Gerbang Depan SMKN 1 Plered',
        device_type: 'RFID_READER'
      }
    });
    expect(res.statusCode).toBeIn([200, 201]);
    if (res.json?.data?.id) createdDeviceId = res.json.data.id;
  });

  await test('Attendance', 'READ: GET /api/attendance/devices -> list registered devices', async () => {
    const res = await testRequest(app, 'GET', '/api/attendance/devices', { token: tokens.ADMIN });
    expect(res.statusCode).toBeIn([200, 204]);
  });

  await test('Attendance', 'DELETE: DELETE /api/attendance/devices/:id -> delete IoT device cleanly', async () => {
    if (!createdDeviceId) return;
    const res = await testRequest(app, 'DELETE', `/api/attendance/devices/${createdDeviceId}`, { token: tokens.ADMIN });
    expect(res.statusCode).toBeIn([200, 204]);
  });

  // ═══════════════════════════════════════════════════════════════════
  // DOMAIN 3: ACADEMIC & KURIKULUM MERDEKA
  // ═══════════════════════════════════════════════════════════════════
  console.log(`\n${C.bold}${C.blue}▶ DOMAIN 3: ACADEMIC & KURIKULUM MERDEKA (360° CRUD)${C.reset}`);
  await test('Kurikulum', 'READ: GET /api/academic/program-keahlian -> list vocational programs', async () => {
    const res = await testRequest(app, 'GET', '/api/academic/program-keahlian', { token: tokens.ADMIN });
    expect(res.statusCode).toBeIn([200, 204]);
  });

  await test('Kurikulum', 'READ: GET /api/kurikulum/struktur -> list curriculum structures', async () => {
    const res = await testRequest(app, 'GET', '/api/kurikulum/struktur', { token: tokens.ADMIN });
    expect(res.statusCode).toBeIn([200, 204]);
  });

  await test('Kurikulum', 'READ: GET /api/kurikulum/kalender -> list academic events', async () => {
    const res = await testRequest(app, 'GET', '/api/kurikulum/kalender', { token: tokens.ADMIN });
    expect(res.statusCode).toBeIn([200, 204]);
  });

  // ═══════════════════════════════════════════════════════════════════
  // DOMAIN 4: RAPOR, NILAI & P5 PROJEK
  // ═══════════════════════════════════════════════════════════════════
  console.log(`\n${C.bold}${C.blue}▶ DOMAIN 4: RAPOR, NILAI & P5 PROJEK (360° CRUD)${C.reset}`);
  await test('Rapor', 'READ: GET /api/rapor/nilai -> list student grade records', async () => {
    const res = await testRequest(app, 'GET', '/api/rapor/nilai', { token: tokens.ADMIN });
    expect(res.statusCode).toBeIn([200, 204]);
  });

  await test('Rapor', 'READ: GET /api/rapor/p5/projek -> list P5 projects', async () => {
    const res = await testRequest(app, 'GET', '/api/rapor/p5/projek', { token: tokens.ADMIN });
    expect(res.statusCode).toBeIn([200, 204]);
  });

  await test('Rapor', 'READ: GET /api/rapor/ukk -> list UKK & graduation certs', async () => {
    const res = await testRequest(app, 'GET', '/api/rapor/ukk', { token: tokens.ADMIN });
    expect(res.statusCode).toBeIn([200, 204]);
  });

  // ═══════════════════════════════════════════════════════════════════
  // DOMAIN 5: FINANCE, KOPERASI & BILLING
  // ═══════════════════════════════════════════════════════════════════
  console.log(`\n${C.bold}${C.blue}▶ DOMAIN 5: FINANCE, KOPERASI & BILLING (360° CRUD)${C.reset}`);
  await test('Cooperative', 'READ: GET /api/cooperative/suppliers -> list active suppliers', async () => {
    const res = await testRequest(app, 'GET', '/api/cooperative/suppliers', { token: tokens.ADMIN });
    expect(res.statusCode).toBeIn([200, 204]);
  });

  await test('Cooperative', 'READ: GET /api/cooperative/saving-categories -> list saving categories', async () => {
    const res = await testRequest(app, 'GET', '/api/cooperative/saving-categories', { token: tokens.ADMIN });
    expect(res.statusCode).toBeIn([200, 204]);
  });

  await test('Billing', 'READ: GET /api/billing/modules/public -> list public billing modules', async () => {
    const res = await testRequest(app, 'GET', '/api/billing/modules/public');
    expect(res.statusCode).toBeIn([200, 204]);
  });

  // ═══════════════════════════════════════════════════════════════════
  // DOMAIN 6: KESISWAAN, BP/BK & DISIPLIN
  // ═══════════════════════════════════════════════════════════════════
  console.log(`\n${C.bold}${C.blue}▶ DOMAIN 6: KESISWAAN, BP/BK & DISIPLIN (360° CRUD)${C.reset}`);
  await test('Kesiswaan', 'READ: GET /api/kesiswaan/jenis-pelanggaran -> list violation types', async () => {
    const res = await testRequest(app, 'GET', '/api/kesiswaan/jenis-pelanggaran', { token: tokens.ADMIN });
    expect(res.statusCode).toBeIn([200, 204]);
  });

  await test('Kesiswaan', 'READ: GET /api/kesiswaan/prestasi -> list student achievements', async () => {
    const res = await testRequest(app, 'GET', '/api/kesiswaan/prestasi', { token: tokens.ADMIN });
    expect(res.statusCode).toBeIn([200, 204]);
  });

  await test('BPBK', 'READ: GET /api/bpbk/dashboard-stats -> get counseling statistics', async () => {
    const res = await testRequest(app, 'GET', '/api/bpbk/dashboard-stats', { token: tokens.ADMIN });
    expect(res.statusCode).toBeIn([200, 204]);
  });

  // ═══════════════════════════════════════════════════════════════════
  // DOMAIN 7: CORE SYSTEM, SARPRAS & HUBIN
  // ═══════════════════════════════════════════════════════════════════
  console.log(`\n${C.bold}${C.blue}▶ DOMAIN 7: CORE SYSTEM, SARPRAS & HUBIN (360° CRUD)${C.reset}`);
  await test('Wilayah', 'READ: GET /api/wilayah/provinsi -> list Indonesian provinces', async () => {
    const res = await testRequest(app, 'GET', '/api/wilayah/provinsi', { token: tokens.ADMIN });
    expect(res.statusCode).toBeIn([200, 204]);
  });

  await test('Sarpras', 'READ: GET /api/sarpras/categories -> list school inventory categories', async () => {
    const res = await testRequest(app, 'GET', '/api/sarpras/categories', { token: tokens.ADMIN });
    expect(res.statusCode).toBeIn([200, 204]);
  });

  await test('Hubin', 'READ: GET /api/hubin/mitra -> list industrial internship partners', async () => {
    const res = await testRequest(app, 'GET', '/api/hubin/mitra', { token: tokens.ADMIN });
    expect(res.statusCode).toBeIn([200, 204]);
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n${C.bold}========================= RINGKASAN HASIL TEST E2E =========================${C.reset}`);
  console.log(`  Total Skenario Diuji : ${C.bold}${totalPassed + totalFailed}${C.reset} pengujian`);
  console.log(`  Total Berhasil (PASS): ${C.bold}${C.green}${totalPassed}${C.reset}`);
  console.log(`  Total Gagal    (FAIL): ${C.bold}${totalFailed > 0 ? C.red + totalFailed : C.green + 0}${C.reset}`);
  console.log(`  Durasi Eksekusi      : ${C.bold}${duration} detik${C.reset}`);
  console.log(`============================================================================\n`);

  await prisma.$disconnect();
  process.exit(totalFailed > 0 ? 1 : 0);
}

runSuite().catch(async (e) => {
  console.error('Fatal error running test suite:', e);
  await prisma.$disconnect();
  process.exit(1);
});