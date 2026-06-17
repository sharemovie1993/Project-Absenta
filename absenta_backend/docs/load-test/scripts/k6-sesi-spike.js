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
    sesi_spike: {
      executor: 'shared-iterations',
      vus: envInt('VUS', 30),
      iterations: envInt('ITERATIONS', 30),
      maxDuration: __ENV.MAX_DURATION || '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};

function buildHeaders() {
  const tokens = Array.isArray(dataset.petugasKelasTokens) && dataset.petugasKelasTokens.length > 0 ? dataset.petugasKelasTokens : [dataset.guruGerbangToken];
  const token = tokens.length === 1 ? tokens[0] : tokens[randomIntBetween(0, tokens.length - 1)];
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export default function () {
  const studentCount = envInt('STUDENT_COUNT', 0);
  const students = Array.isArray(dataset.students) ? dataset.students : [];
  const pool = studentCount > 0 ? students.slice(0, Math.min(studentCount, students.length)) : students;
  const student = randomItem(pool) || randomItem(students);
  const payload = JSON.stringify({ siswa_id: student.id });
  const sessionId = __ENV.SESSION_ID && String(__ENV.SESSION_ID).trim() ? String(__ENV.SESSION_ID).trim() : dataset.sessionId;
  const res = http.post(`${dataset.baseUrl}/api/attendance/sesi-absensi/${sessionId}/tap-siswa`, payload, { headers: buildHeaders() });
  check(res, {
    'status is 200/409/400/403/401': (r) => [200, 409, 400, 403, 401].includes(r.status),
  });
  const jitterMin = envInt('JITTER_MIN_MS', 100);
  const jitterMax = envInt('JITTER_MAX_MS', 800);
  sleep(randomIntBetween(jitterMin, jitterMax) / 1000);
}
