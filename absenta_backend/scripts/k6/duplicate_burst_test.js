import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 30,
  iterations: 30,
};

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3000';
const TOKEN = __ENV.K6_TOKEN || '';
const TENANT_ID = __ENV.K6_TENANT_ID || 'tenant_dev_1';
const SISWA_ID = __ENV.K6_SISWA_ID || 'siswa-duplicate-test';

export default function () {
  const payload = JSON.stringify({
    siswa_id: SISWA_ID,
    arah: 'GERBANG_DATANG',
    device_id: 'GATE_DUP_TEST',
    rfid: '9999999999',
  });

  const headers = {
    'Content-Type': 'application/json',
    Authorization: TOKEN ? `Bearer ${TOKEN}` : '',
    'X-Tenant-ID': TENANT_ID,
  };

  const res = http.post(`${BASE_URL}/api/attendance/gerbang/tap`, payload, { headers });

  check(res, {
    'status 2xx or 409': (r) =>
      (r.status >= 200 && r.status < 300) || r.status === 409,
  });
}

