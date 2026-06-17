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
    stress_100_rps: {
      executor: 'constant-arrival-rate',
      rate: envInt('RATE', 100),
      timeUnit: '1s',
      duration: __ENV.DURATION || '60s',
      preAllocatedVUs: envInt('PRE_ALLOCATED_VUS', 200),
      maxVUs: envInt('MAX_VUS', 2000),
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
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
