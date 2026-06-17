import http from 'k6/http';
import { check, sleep, group } from 'k6';
import exec from 'k6/execution';

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------
const RESOLVE_IP = __ENV.K6_RESOLVE_IP || '';
const OVERRIDE_HOST = __ENV.K6_HOST || '';
const BASE_URL = (RESOLVE_IP ? `https://${RESOLVE_IP}` : (__ENV.K6_BASE_URL || 'https://www.absenta.id'));
const EMAIL = __ENV.K6_EMAIL || '';
const PASSWORD = __ENV.K6_PASSWORD || '';
const PREFLIGHT = String(__ENV.K6_PREFLIGHT || 'true').toLowerCase() === 'true';
const DEBUG_ERRORS = String(__ENV.K6_DEBUG_ERRORS || 'false').toLowerCase() === 'true';
const MAX_ERROR_LOGS = Number(__ENV.K6_MAX_ERROR_LOGS || 5);

const TENANT_IDS = (String(__ENV.K6_TENANT_IDS || '')).split(',').map(s => s.trim()).filter(Boolean);
const SESSION_IDS = (String(__ENV.K6_SESSION_IDS || '')).split(',').map(s => s.trim()).filter(Boolean);

// Arrival rates per phase (tune according to target)
const GERBANG_RATE = Number(__ENV.K6_GATE_RATE || 300);    // req/s
const GERBANG_DURATION = __ENV.K6_GATE_DURATION || '3m';
const SESI_RATE = Number(__ENV.K6_SESI_RATE || 150);       // req/s
const SESI_DURATION = __ENV.K6_SESI_DURATION || '3m';
const PULANG_RATE = Number(__ENV.K6_PULANG_RATE || 250);   // req/s
const PULANG_DURATION = __ENV.K6_PULANG_DURATION || '3m';
const PHASE2_START = __ENV.K6_PHASE2_START || '3m';
const PHASE3_START = __ENV.K6_PHASE3_START || '6m';

const PRE_VUS = Number(__ENV.K6_PRE_VUS || 500);
const MAX_VUS = Number(__ENV.K6_MAX_VUS || 5000);

const TOTAL_SISWA = Number(__ENV.K6_TOTAL_SISWA || 2000);
const HOT_POOL_SIZE = Number(__ENV.K6_HOT_POOL_SIZE || 100);
const DUP_RATIO = Number(__ENV.K6_DUP_RATIO || 0.1);        // probability using hot pool ids
const GATE_FIRST_IN_SESI = String(__ENV.K6_GATE_FIRST_IN_SESI || 'true').toLowerCase() === 'true';

// -----------------------------------------------------------------------------
// K6 OPTIONS
// -----------------------------------------------------------------------------
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
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.02'],
  },
};

// -----------------------------------------------------------------------------
// DATA & HELPERS
// -----------------------------------------------------------------------------
const allSiswaIds = Array.from({ length: TOTAL_SISWA }, (_, i) => `siswa-${i + 1}`);
const hotSiswaIds = allSiswaIds.slice(0, HOT_POOL_SIZE);

function pickTenantId() {
  if (TENANT_IDS.length === 0) return '';
  const idx = Math.floor(Math.random() * TENANT_IDS.length);
  return TENANT_IDS[idx];
}

function pickSiswaId() {
  const useHot = Math.random() < DUP_RATIO;
  if (useHot) {
    const i = Math.floor(Math.random() * hotSiswaIds.length);
    return hotSiswaIds[i];
  }
  const i = Math.floor(Math.random() * allSiswaIds.length);
  return allSiswaIds[i];
}

function randomStatus() {
  const r = Math.random();
  if (r < 0.8) return 'HADIR';
  if (r < 0.85) return 'TERLAMBAT';
  if (r < 0.9) return 'SAKIT';
  if (r < 0.95) return 'IZIN';
  return 'ALPA';
}

function h(token, tenantId) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (tenantId) headers['X-Tenant-ID'] = tenantId;
  if (OVERRIDE_HOST) headers['Host'] = OVERRIDE_HOST;
  return headers;
}

let errorLogs = 0;
function logErrorOnce(prefix, res) {
  if (!DEBUG_ERRORS) return;
  if (errorLogs >= MAX_ERROR_LOGS) return;
  errorLogs += 1;
  const body = typeof res?.body === 'string' ? res.body.slice(0, 500) : '';
  console.warn(`${prefix} status=${res?.status} url=${res?.url} body=${body}`);
}

// -----------------------------------------------------------------------------
// SETUP: Login to get token (supports superadmin@system.com)
// -----------------------------------------------------------------------------
export function setup() {
  if (!EMAIL || !PASSWORD) {
    console.warn('K6_EMAIL/K6_PASSWORD not provided — running without Authorization header');
    return { token: '' };
  }
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'login has token': (r) => !!r.json('data.token'),
  }) || exec.test.abort('Login failed, aborting test');
  const token = loginRes.json('data.token');

  // Warm-up request
  http.get(`${BASE_URL}/api/system/config`);

  if (PREFLIGHT) {
    const tenantId = TENANT_IDS[0] || '';
    const siswaId = `preflight-siswa-${Date.now()}`;
    const payload = JSON.stringify({
      siswa_id: siswaId,
      arah: 'GERBANG_DATANG',
      device_id: 'K6_PREFLIGHT',
      rfid: '9999999999',
    });
    const res = http.post(`${BASE_URL}/api/attendance/gerbang/tap`, payload, { headers: h(token, tenantId) });
    const ok = (res.status >= 200 && res.status < 300) || res.status === 409;
    if (!ok) {
      const body = typeof res?.body === 'string' ? res.body.slice(0, 800) : '';
      const hint = TENANT_IDS.length === 0 ? 'TENANT_IDS kosong; coba isi K6_TENANT_IDS' : '';
      exec.test.abort(`Preflight failed: status=${res.status} url=${res.url} ${hint} body=${body}`);
    }
  }

  return { token };
}

// -----------------------------------------------------------------------------
// SCENARIOS
// -----------------------------------------------------------------------------
export function gerbangDatang(data) {
  const token = data?.token || '';
  const tenantId = pickTenantId();
  const siswaId = pickSiswaId();
  const payload = JSON.stringify({
    siswa_id: siswaId,
    arah: 'GERBANG_DATANG',
    device_id: 'GATE_DEVICE_EDGE_1',
    rfid: String(1000000000 + Math.floor(Math.random() * 900000000)),
  });
  const res = http.post(`${BASE_URL}/api/attendance/gerbang/tap`, payload, { headers: h(token, tenantId) });
  const ok = (res.status >= 200 && res.status < 300) || res.status === 409;
  if (!ok) logErrorOnce('gate datang failed', res);
  check(res, { 'gate datang 2xx/409': () => ok });
  sleep(0.003);
}

export function tapSesi(data) {
  const token = data?.token || '';
  const tenantId = pickTenantId();
  const siswaId = pickSiswaId();

  if (GATE_FIRST_IN_SESI) {
    const pre = JSON.stringify({
      siswa_id: siswaId,
      arah: 'GERBANG_DATANG',
      device_id: 'GATE_DEVICE_EDGE_1',
      rfid: String(1000000000 + Math.floor(Math.random() * 900000000)),
    });
    http.post(`${BASE_URL}/api/attendance/gerbang/tap`, pre, { headers: h(token, tenantId) });
  }

  // If SESSION_IDS empty, fallback to gate-only flow
  if (SESSION_IDS.length === 0) {
    sleep(0.005);
    return;
  }

  const sesiIdx = Math.floor(Math.random() * SESSION_IDS.length);
  const sesiId = SESSION_IDS[sesiIdx];
  const payload = JSON.stringify({
    siswa_id: siswaId,
    status: randomStatus(),
  });
  const res = http.post(`${BASE_URL}/api/attendance/sesi-absensi/${sesiId}/tap-siswa`, payload, { headers: h(token, tenantId) });
  const ok = res.status >= 200 && res.status < 300;
  if (!ok) logErrorOnce('sesi tap failed', res);
  check(res, { 'sesi 2xx': () => ok });
  sleep(0.003);
}

export function gerbangPulang(data) {
  const token = data?.token || '';
  const tenantId = pickTenantId();
  const siswaId = pickSiswaId();
  const payload = JSON.stringify({
    siswa_id: siswaId,
    arah: 'GERBANG_PULANG',
    device_id: 'GATE_DEVICE_EDGE_1',
    rfid: String(1000000000 + Math.floor(Math.random() * 900000000)),
  });
  const res = http.post(`${BASE_URL}/api/attendance/gerbang/tap`, payload, { headers: h(token, tenantId) });
  const ok = (res.status >= 200 && res.status < 300) || res.status === 409;
  if (!ok) logErrorOnce('gate pulang failed', res);
  check(res, { 'gate pulang 2xx/409': () => ok });
  sleep(0.003);
}
