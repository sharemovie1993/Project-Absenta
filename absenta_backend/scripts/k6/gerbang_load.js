import http from 'k6/http';
import { check, sleep } from 'k6';

function intEnv(name, fallback) {
  const v = Number(__ENV[name] || '');
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function strEnv(name, fallback) {
  const v = String(__ENV[name] || '').trim();
  return v ? v : fallback;
}

const BASE_URL = strEnv('BASE_URL', 'http://localhost:3001');
const TOKEN = strEnv('TOKEN', '');
const TENANT_IDS = strEnv('TENANT_IDS', '').split(',').map(s => s.trim()).filter(Boolean);
const DIRECTION = strEnv('DIRECTION', 'GERBANG_DATANG');
const MODE = strEnv('MODE', 'GERBANG');
const STRESS_SECRET = strEnv('STRESS_SECRET', '');
const TIME_UNIT = '1s';
const RATE = intEnv('RATE', 100);
const PRE_ALLOCATED_VUS = intEnv('VUS', Math.max(200, RATE * 2));
const MAX_VUS = intEnv('MAX_VUS', Math.max(PRE_ALLOCATED_VUS * 2, 1000));
const DURATION = strEnv('DURATION', '1m');

export const options = {
  scenarios: {
    gerbang: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: TIME_UNIT,
      duration: DURATION,
      preAllocatedVUs: PRE_ALLOCATED_VUS,
      maxVUs: MAX_VUS
    }
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.005']
  }
};

function pickTenant() {
  if (TENANT_IDS.length === 0) return 'phase5a-sim-tenant-0001';
  const i = Math.floor(Math.random() * TENANT_IDS.length);
  return TENANT_IDS[i];
}

export default function () {
  const tenantId = pickTenant();
  const siswaId = `sim-siswa-${tenantId}`;
  const arah = DIRECTION;
  const deviceId = `GATE_${String(Math.floor(Math.random() * 10) + 1).padStart(3, '0')}`;
  const headers = (function () {
    const h = { 'Content-Type': 'application/json' };
    if (TOKEN) h['Authorization'] = `Bearer ${TOKEN}`;
    if (tenantId) h['X-Tenant-ID'] = tenantId;
    if (MODE === 'STRESS' && STRESS_SECRET) h['x-stress-secret'] = STRESS_SECRET;
    return h;
  })();
  let url;
  let payload;
  if (MODE === 'STRESS') {
    url = `${BASE_URL}/stress/attendance/session`;
    payload = JSON.stringify({ studentId: siswaId, sessionId: 'stress-k6', ms: 5 });
  } else {
    url = `${BASE_URL}/api/attendance/gerbang/tap`;
    payload = JSON.stringify({
      siswa_id: siswaId,
      arah,
      device_id: deviceId,
      rfid: String(1000000000 + Math.floor(Math.random() * 900000000))
    });
  }
  const res = http.post(url, payload, { headers });
  check(res, {
    'status 2xx or 409': r => (r.status >= 200 && r.status < 300) || r.status === 409
  });
  sleep(0.001);
}
