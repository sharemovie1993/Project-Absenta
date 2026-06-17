import http from 'k6/http';
import { check, sleep } from 'k6';

function buildStages(level) {
  const lvl = String(level || 'BASELINE').toUpperCase();
  if (lvl === 'STRESS') {
    return [
      { duration: '1m', target: 20 },
      { duration: '3m', target: 100 },
      { duration: '3m', target: 200 },
      { duration: '5m', target: 300 },
      { duration: '2m', target: 0 },
    ];
  }
  if (lvl === 'PEAK') {
    return [
      { duration: '1m', target: 5 },
      { duration: '3m', target: 50 },
      { duration: '4m', target: 100 },
      { duration: '2m', target: 0 },
    ];
  }
  return [
    { duration: '1m', target: 1 },
    { duration: '4m', target: 5 },
    { duration: '2m', target: 0 },
  ];
}

const LEVEL = __ENV.K6_LEVEL || 'BASELINE';

export const options = {
  scenarios: {
    attendance_mixed: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 500,
      stages: buildStages(LEVEL),
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.K6_TOKEN || '';
const TENANT_IDS = (__ENV.K6_TENANT_IDS || 'tenant_dev_1').split(',');
const SESSION_IDS = (__ENV.K6_SESSION_IDS || '').split(',').filter((x) => x);

const TOTAL_SISWA = Number(__ENV.K6_TOTAL_SISWA || 2000);
const HOT_POOL_SIZE = Number(__ENV.K6_HOT_POOL_SIZE || 50);
const DUP_RATIO = Number(__ENV.K6_DUP_RATIO || 0.15);
const GATE_RATIO = Number(__ENV.K6_GATE_RATIO || 0.6);

const allSiswaIds = Array.from({ length: TOTAL_SISWA }, (_, i) => `siswa-${i + 1}`);
const hotSiswaIds = allSiswaIds.slice(0, HOT_POOL_SIZE);

function pickTenantId() {
  if (TENANT_IDS.length === 0) return 'tenant_dev_1';
  const idx = Math.floor(Math.random() * TENANT_IDS.length);
  return TENANT_IDS[idx];
}

function pickSiswaId() {
  const useHotPool = Math.random() < DUP_RATIO;
  if (useHotPool) {
    const idx = Math.floor(Math.random() * hotSiswaIds.length);
    return hotSiswaIds[idx];
  }
  const idx = Math.floor(Math.random() * allSiswaIds.length);
  return allSiswaIds[idx];
}

function randomArah() {
  return Math.random() < 0.7 ? 'GERBANG_DATANG' : 'GERBANG_PULANG';
}

function randomStatus() {
  const r = Math.random();
  if (r < 0.75) return 'HADIR';
  if (r < 0.85) return 'TERLAMBAT';
  if (r < 0.9) return 'SAKIT';
  if (r < 0.95) return 'IZIN';
  return 'ALPA';
}

export default function () {
  const tenantId = pickTenantId();
  const siswaId = pickSiswaId();
  const useGate = Math.random() < GATE_RATIO || SESSION_IDS.length === 0;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: TOKEN ? `Bearer ${TOKEN}` : '',
    'X-Tenant-ID': tenantId,
  };

  if (useGate) {
    const arah = randomArah();
    const gateIdx = Math.floor(Math.random() * 5) + 1;
    const payload = JSON.stringify({
      siswa_id: siswaId,
      arah,
      device_id: `GATE_${gateIdx.toString().padStart(3, '0')}`,
      rfid: String(1000000000 + Math.floor(Math.random() * 900000000)),
    });

    const res = http.post(`${BASE_URL}/api/attendance/gerbang/tap`, payload, { headers });
    check(res, {
      'gate status 2xx or 409': (r) =>
        (r.status >= 200 && r.status < 300) || r.status === 409,
    });
  } else {
    const sesiIdx = Math.floor(Math.random() * SESSION_IDS.length);
    const sesiId = SESSION_IDS[sesiIdx];
    const payload = JSON.stringify({
      siswa_id: siswaId,
      status: randomStatus(),
    });

    const res = http.post(
      `${BASE_URL}/api/attendance/sesi-absensi/${sesiId}/tap-siswa`,
      payload,
      { headers },
    );
    check(res, {
      'sesi status 2xx': (r) => r.status >= 200 && r.status < 300,
    });
  }

  sleep(0.005);
}

