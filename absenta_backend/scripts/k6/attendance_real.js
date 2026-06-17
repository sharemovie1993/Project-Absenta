import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const TOKEN = __ENV.TOKEN || '';
const TENANT_IDS = (String(__ENV.TENANT_IDS || '')).split(',').map(s => s.trim()).filter(Boolean);

const GERBANG_RATE = Number(__ENV.GERBANG_RATE || 50);
const GERBANG_DURATION = __ENV.GERBANG_DURATION || '5m';
const SESI_RATE = Number(__ENV.SESI_RATE || 20);
const SESI_DURATION = __ENV.SESI_DURATION || '5m';
const PULANG_RATE = Number(__ENV.PULANG_RATE || 40);
const PULANG_DURATION = __ENV.PULANG_DURATION || '5m';
const PHASE2_START = __ENV.PHASE2_START || '5m';
const PHASE3_START = __ENV.PHASE3_START || '10m';

const PRE_VUS = Number(__ENV.PRE_VUS || 200);
const MAX_VUS = Number(__ENV.MAX_VUS || 2000);
const SESSION_PRETAP_GATE = String(__ENV.SESSION_PRETAP_GATE || 'true').toLowerCase() === 'true';

const ALLOW_UNSAFE = String(__ENV.ALLOW_UNSAFE || '').toLowerCase() === 'true';
const SAFE_MAX_RATE = Number(__ENV.SAFE_MAX_RATE || 300);
const SAFE_MAX_VUS = Number(__ENV.SAFE_MAX_VUS || 5000);
if (!ALLOW_UNSAFE) {
  const maxRate = Math.max(GERBANG_RATE, SESI_RATE, PULANG_RATE);
  if (maxRate > SAFE_MAX_RATE || MAX_VUS > SAFE_MAX_VUS || PRE_VUS > SAFE_MAX_VUS) {
    exec.test.abort(`Unsafe load config blocked. Set ALLOW_UNSAFE=true to proceed. maxRate=${maxRate} SAFE_MAX_RATE=${SAFE_MAX_RATE} PRE_VUS=${PRE_VUS} MAX_VUS=${MAX_VUS} SAFE_MAX_VUS=${SAFE_MAX_VUS}`);
  }
}

function randomTenant() {
  if (TENANT_IDS.length === 0) return 'phase5a-sim-tenant-0001';
  const i = Math.floor(Math.random() * TENANT_IDS.length);
  return TENANT_IDS[i];
}

function headers(tenantId) {
  const h = { 'Content-Type': 'application/json' };
  if (TOKEN) h['Authorization'] = `Bearer ${TOKEN}`;
  if (tenantId) h['X-Tenant-ID'] = tenantId;
  return h;
}

function pickSiswa(tenantId) {
  const idx = Math.floor(Math.random() * 1000) + 1;
  return `sim-siswa-${tenantId}-${idx}`;
}

function pickSesi(tenantId) {
  const idx = Math.floor(Math.random() * 5) + 1;
  return `sim-real-sesi-${tenantId}-${idx}`;
}

export const options = {
  scenarios: {
    phase1_datang: {
      executor: 'constant-arrival-rate',
      rate: GERBANG_RATE,
      timeUnit: '1s',
      duration: GERBANG_DURATION,
      preAllocatedVUs: PRE_VUS,
      maxVUs: MAX_VUS,
      exec: 'gerbangDatang'
    },
    phase2_sesi: {
      startTime: PHASE2_START,
      executor: 'constant-arrival-rate',
      rate: SESI_RATE,
      timeUnit: '1s',
      duration: SESI_DURATION,
      preAllocatedVUs: PRE_VUS,
      maxVUs: MAX_VUS,
      exec: 'tapSesi'
    },
    phase3_pulang: {
      startTime: PHASE3_START,
      executor: 'constant-arrival-rate',
      rate: PULANG_RATE,
      timeUnit: '1s',
      duration: PULANG_DURATION,
      preAllocatedVUs: PRE_VUS,
      maxVUs: MAX_VUS,
      exec: 'gerbangPulang'
    }
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export function gerbangDatang() {
  const tenantId = randomTenant();
  const siswaId = pickSiswa(tenantId);
  const body = JSON.stringify({
    siswa_id: siswaId,
    arah: 'GERBANG_DATANG',
    device_id: 'GATE_DEVICE_1',
    rfid: String(1000000000 + Math.floor(Math.random() * 900000000)),
  });
  const res = http.post(`${BASE_URL}/api/attendance/gerbang/tap`, body, { headers: headers(tenantId) });
  check(res, {
    'gerbang datang ok or 409': r => (r.status >= 200 && r.status < 300) || r.status === 409
  });
  sleep(0.001);
}

export function tapSesi() {
  const tenantId = randomTenant();
  const siswaId = pickSiswa(tenantId);
  const sesiId = pickSesi(tenantId);
  if (SESSION_PRETAP_GATE) {
    const gateBody = JSON.stringify({
      siswa_id: siswaId,
      arah: 'GERBANG_DATANG',
      device_id: 'GATE_DEVICE_1',
      rfid: String(1000000000 + Math.floor(Math.random() * 900000000)),
    });
    http.post(`${BASE_URL}/api/attendance/gerbang/tap`, gateBody, { headers: headers(tenantId) });
  }
  const body = JSON.stringify({
    siswa_id: siswaId,
    status: 'HADIR'
  });
  const res = http.post(`${BASE_URL}/api/attendance/sesi-absensi/${sesiId}/tap-siswa`, body, { headers: headers(tenantId) });
  check(res, {
    'sesi tap ok': r => r.status >= 200 && r.status < 300
  });
  sleep(0.001);
}

export function gerbangPulang() {
  const tenantId = randomTenant();
  const siswaId = pickSiswa(tenantId);
  const body = JSON.stringify({
    siswa_id: siswaId,
    arah: 'GERBANG_PULANG',
    device_id: 'GATE_DEVICE_1',
    rfid: String(1000000000 + Math.floor(Math.random() * 900000000)),
  });
  const res = http.post(`${BASE_URL}/api/attendance/gerbang/tap`, body, { headers: headers(tenantId) });
  check(res, {
    'gerbang pulang ok or 409': r => (r.status >= 200 && r.status < 300) || r.status === 409
  });
  sleep(0.001);
}
