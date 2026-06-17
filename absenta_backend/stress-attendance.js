const axios = require('axios');

const TOTAL = Number(process.env.TOTAL || 10000);
const RATE = Number(process.env.RATE || 200);
const BASE_URL = String(process.env.BASE_URL || 'http://localhost:3001').trim().replace(/\/+$/, '');
const URL = String(process.env.URL || `${BASE_URL}/stress/attendance/session`).trim();
const TOKEN = String(process.env.STRESS_TOKEN || '').trim();
const STRESS_SECRET =
  String(process.env.STRESS_SECRET || '').trim() ||
  ((/localhost|127\.0\.0\.1/i.test(BASE_URL) || BASE_URL.includes('://0.0.0.0')) ? 'local-stress' : '');
const SESSION_ID = String(process.env.SESSION_ID || 'stress-session').trim();
const MS = Number(process.env.JOB_MS || 250);

const http = axios.create({
  timeout: Number(process.env.TIMEOUT_MS || 15000),
  headers: {
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    ...(STRESS_SECRET ? { 'x-stress-secret': STRESS_SECRET } : {}),
    'Content-Type': 'application/json',
  },
});

async function sendJob(i) {
  try {
    await http.post(URL, {
      studentId: `stress-${i}`,
      sessionId: SESSION_ID,
      ms: MS,
    });
    return { ok: true };
  } catch (e) {
    const status = e && e.response && e.response.status ? Number(e.response.status) : null;
    return { ok: false, status };
  }
}

async function run() {
  const total = Number.isFinite(TOTAL) ? Math.max(1, Math.floor(TOTAL)) : 10000;
  const rate = Number.isFinite(RATE) ? Math.max(1, Math.floor(RATE)) : 200;
  console.log(`Starting stress test: total=${total} rate=${rate}/sec url=${URL}`);
  if (!TOKEN && !STRESS_SECRET) {
    console.log('WARN: no auth token and no stress secret provided');
  }
  let ok = 0;
  let fail = 0;
  const failByStatus = {};
  for (let i = 0; i < total; i += rate) {
    const batch = [];
    const limit = Math.min(rate, total - i);
    for (let j = 0; j < limit; j++) batch.push(sendJob(i + j));
    const results = await Promise.all(batch);
    for (const r of results) {
      if (r && r.ok) ok += 1;
      else {
        fail += 1;
        const s = r && r.status != null ? String(r.status) : 'NO_RESPONSE';
        failByStatus[s] = (failByStatus[s] || 0) + 1;
      }
    }
    console.log(`sent ${Math.min(i + rate, total)}/${total} ok=${ok} fail=${fail} failByStatus=${JSON.stringify(failByStatus)}`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log('done');
}

run();
