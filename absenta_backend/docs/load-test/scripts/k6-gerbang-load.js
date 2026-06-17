import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const dataset = new SharedArray('dataset', () => {
  const raw = open('../datasets/attendance_dataset.json');
  return [JSON.parse(raw)];
})[0];

function envInt(name, fallback) {
  const v = __ENV[name];
  if (v === undefined || v === null || String(v).trim() === '') return fallback;
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : fallback;
}

function randomIntBetween(min, max) {
  const a = Math.min(min, max);
  const b = Math.max(min, max);
  return Math.floor(a + Math.random() * (b - a + 1));
}

function randomItem(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[randomIntBetween(0, arr.length - 1)];
}

export const options = {
  scenarios: {
    gerbang_ramp: {
      executor: 'ramping-arrival-rate',
      startRate: envInt('START_RATE', 0),
      timeUnit: '1s',
      preAllocatedVUs: envInt('PRE_ALLOCATED_VUS', 200),
      maxVUs: envInt('MAX_VUS', 2000),
      stages: [
        { target: envInt('STAGE1_TARGET', 5), duration: __ENV.STAGE1_DURATION || '30s' },
        { target: envInt('STAGE2_TARGET', 20), duration: __ENV.STAGE2_DURATION || '5m' },
        { target: envInt('STAGE3_TARGET', 40), duration: __ENV.STAGE3_DURATION || '5m' },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
  },
};

function buildHeaders() {
  return {
    Authorization: `Bearer ${dataset.guruGerbangToken}`,
    'Content-Type': 'application/json',
  };
}

export default function () {
  const studentCount = envInt('STUDENT_COUNT', 0);
  const students = Array.isArray(dataset.students) ? dataset.students : [];
  const pool = studentCount > 0 ? students.slice(0, Math.min(studentCount, students.length)) : students;
  const student = randomItem(pool) || randomItem(students);
  const payload = JSON.stringify({
    siswa_id: student.id,
    arah: 'GERBANG_DATANG',
    device_id: dataset.gateDevice,
    rfid: student.rfid,
  });

  const res = http.post(`${dataset.baseUrl}/api/attendance/gerbang/tap`, payload, { headers: buildHeaders() });
  check(res, {
    'status is 200/409/403/401': (r) => [200, 409, 403, 401].includes(r.status),
  });

  const jitterMin = envInt('JITTER_MIN_MS', 100);
  const jitterMax = envInt('JITTER_MAX_MS', 800);
  sleep(randomIntBetween(jitterMin, jitterMax) / 1000);
}
