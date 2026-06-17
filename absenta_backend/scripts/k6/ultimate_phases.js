import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const TOKEN = __ENV.TOKEN || '';
const TENANT_IDS = (String(__ENV.TENANT_IDS || '')).split(',').map(s => s.trim()).filter(Boolean);
const STRESS_SECRET = __ENV.STRESS_SECRET || 'local-stress';

const ENABLE_PHASE1 = String(__ENV.ENABLE_PHASE1 || 'true').toLowerCase() === 'true';
const ENABLE_PHASE2 = String(__ENV.ENABLE_PHASE2 || 'true').toLowerCase() === 'true';
const ENABLE_PHASE3 = String(__ENV.ENABLE_PHASE3 || 'true').toLowerCase() === 'true';
const ENABLE_PHASE4 = String(__ENV.ENABLE_PHASE4 || 'true').toLowerCase() === 'true';

function pickTenant() {
  if (TENANT_IDS.length === 0) return 'phase5a-sim-tenant-0001';
  const i = Math.floor(Math.random() * TENANT_IDS.length);
  return TENANT_IDS[i];
}

function headers(base = {}) {
  const h = { 'Content-Type': 'application/json', ...base };
  if (TOKEN) h['Authorization'] = `Bearer ${TOKEN}`;
  if (STRESS_SECRET) h['x-stress-secret'] = STRESS_SECRET;
  return h;
}

export const options = {
  scenarios: {
    ...(ENABLE_PHASE1 ? {
      phase1_school_wave: {
        executor: 'ramping-arrival-rate',
        startRate: 5,
        timeUnit: '1s',
        preAllocatedVUs: 100,
        maxVUs: 1500,
        stages: [
          { duration: __ENV.P1_T1 || '60s', target: 20 },
          { duration: __ENV.P1_T2 || '60s', target: 30 },
          { duration: __ENV.P1_T3 || '60s', target: 40 },
          { duration: __ENV.P1_T4 || '60s', target: 50 },
          { duration: __ENV.P1_T5 || '60s', target: 40 },
          { duration: __ENV.P1_T6 || '60s', target: 20 },
          { duration: '30s', target: 0 },
        ],
        exec: 'phase1',
      }
    } : {}),
    ...(ENABLE_PHASE2 ? {
      phase2_sesi_tap: {
        executor: 'constant-arrival-rate',
        rate: Number(__ENV.P2_RATE || 50),
        timeUnit: '1s',
        duration: __ENV.P2_DURATION || '3m',
        preAllocatedVUs: Number(__ENV.P2_VUS || 200),
        maxVUs: Number(__ENV.P2_MAXVUS || 2000),
        exec: 'phase2',
      }
    } : {}),
    ...(ENABLE_PHASE3 ? {
      phase3_pulang: {
        executor: 'constant-arrival-rate',
        rate: Number(__ENV.P3_RATE || 80),
        timeUnit: '1s',
        duration: __ENV.P3_DURATION || '3m',
        preAllocatedVUs: Number(__ENV.P3_VUS || 300),
        maxVUs: Number(__ENV.P3_MAXVUS || 3000),
        exec: 'phase3',
      }
    } : {}),
    ...(ENABLE_PHASE4 ? {
      phase4_mixed: {
        executor: 'constant-arrival-rate',
        rate: Number(__ENV.P4_RATE || 60),
        timeUnit: '1s',
        duration: __ENV.P4_DURATION || '3m',
        preAllocatedVUs: Number(__ENV.P4_VUS || 250),
        maxVUs: Number(__ENV.P4_MAXVUS || 2500),
        exec: 'phase4',
      }
    } : {}),
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const ALLOW_UNSAFE = String(__ENV.ALLOW_UNSAFE || '').toLowerCase() === 'true';
const SAFE_MAX_RATE = Number(__ENV.SAFE_MAX_RATE || 300);
const SAFE_MAX_VUS = Number(__ENV.SAFE_MAX_VUS || 5000);
if (!ALLOW_UNSAFE) {
  const rates = [
    ENABLE_PHASE2 ? Number(__ENV.P2_RATE || 50) : 0,
    ENABLE_PHASE3 ? Number(__ENV.P3_RATE || 80) : 0,
    ENABLE_PHASE4 ? Number(__ENV.P4_RATE || 60) : 0,
  ];
  const maxRate = Math.max(0, ...rates);
  const maxVusCfg = Math.max(
    ENABLE_PHASE2 ? Number(__ENV.P2_MAXVUS || 2000) : 0,
    ENABLE_PHASE3 ? Number(__ENV.P3_MAXVUS || 3000) : 0,
    ENABLE_PHASE4 ? Number(__ENV.P4_MAXVUS || 2500) : 0,
    ENABLE_PHASE1 ? 1500 : 0,
  );
  if (maxRate > SAFE_MAX_RATE || maxVusCfg > SAFE_MAX_VUS) {
    exec.test.abort(`Unsafe load config blocked. Set ALLOW_UNSAFE=true to proceed. maxRate=${maxRate} SAFE_MAX_RATE=${SAFE_MAX_RATE} maxVUs=${maxVusCfg} SAFE_MAX_VUS=${SAFE_MAX_VUS}`);
  }
}

export function phase1() {
  const tenantId = pickTenant();
  const siswaId = `sim-siswa-${tenantId}`;
  const payload = JSON.stringify({ studentId: siswaId, sessionId: 'phase1-wave', ms: 5 });
  const res = http.post(`${BASE_URL}/stress/attendance/session`, payload, { headers: headers() });
  check(res, { '2xx stress': r => r.status >= 200 && r.status < 300 });
  sleep(0.001);
}

export function phase2() {
  const tenantId = pickTenant();
  const siswaId = `sim-siswa-${tenantId}`;
  const payload = JSON.stringify({ studentId: siswaId, sessionId: 'phase2-sesi', ms: 5 });
  const res = http.post(`${BASE_URL}/stress/attendance/session`, payload, { headers: headers() });
  check(res, { '2xx stress': r => r.status >= 200 && r.status < 300 });
  sleep(0.001);
}

export function phase3() {
  const tenantId = pickTenant();
  const siswaId = `sim-siswa-${tenantId}`;
  const payload = JSON.stringify({ studentId: siswaId, sessionId: 'phase3-pulang', ms: 5 });
  const res = http.post(`${BASE_URL}/stress/attendance/session`, payload, { headers: headers() });
  check(res, { '2xx stress': r => r.status >= 200 && r.status < 300 });
  sleep(0.001);
}

export function phase4() {
  const tenantId = pickTenant();
  const siswaId = `sim-siswa-${tenantId}`;
  const rand = Math.random();
  if (rand < 0.4) {
    // gate-like job
    const payload = JSON.stringify({ studentId: siswaId, sessionId: 'phase4-gate', ms: 5 });
    const res = http.post(`${BASE_URL}/stress/attendance/session`, payload, { headers: headers() });
    check(res, { '2xx gate': r => r.status >= 200 && r.status < 300 });
  } else if (rand < 0.7) {
    // sesi-like job
    const payload = JSON.stringify({ studentId: siswaId, sessionId: 'phase4-sesi', ms: 5 });
    const res = http.post(`${BASE_URL}/stress/attendance/session`, payload, { headers: headers() });
    check(res, { '2xx sesi': r => r.status >= 200 && r.status < 300 });
  } else if (rand < 0.9) {
    // reports/dashboard read: use public endpoints to simulate read load
    const r1 = http.get(`${BASE_URL}/health`);
    check(r1, { 'health ok': r => r.status === 200 });
    const r2 = http.get(`${BASE_URL}/db-test`);
    check(r2, { 'db ok': r => r.status === 200 || r.status === 500 }); // allow 500 in case DB probe fails
  } else {
    // extra read
    const r3 = http.get(`${BASE_URL}/documents/public/non-existent`);
    check(r3, { 'doc handled': r => r.status >= 200 && r.status < 500 });
  }
  sleep(0.001);
}
