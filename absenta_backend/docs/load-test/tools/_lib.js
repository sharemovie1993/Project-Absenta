const fs = require('fs');
const path = require('path');
const readline = require('readline');
const axios = require('axios');

function normalizeBaseUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) return 'http://10.60.0.1:3001';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw.replace(/\/+$/, '');
  return `http://${raw}`.replace(/\/+$/, '');
}

function ensureDir(absPath) {
  fs.mkdirSync(absPath, { recursive: true });
}

function readJson(absPath) {
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function writeJson(absPath, data) {
  ensureDir(path.dirname(absPath));
  fs.writeFileSync(absPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function createPrompter() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) =>
    new Promise((resolve) => {
      rl.question(q, (ans) => resolve(ans));
    });

  return {
    async prompt(label, opts = {}) {
      const { defaultValue, required } = opts;
      while (true) {
        const suffix = typeof defaultValue !== 'undefined' ? ` (default: ${defaultValue})` : '';
        const ans = await ask(`${label}${suffix}: `);
        const v = String(ans || '').trim();
        if (v) return v;
        if (typeof defaultValue !== 'undefined') return String(defaultValue);
        if (!required) return '';
      }
    },
    async promptInt(label, opts = {}) {
      const { defaultValue, min, max } = opts;
      while (true) {
        const raw = await this.prompt(label, { defaultValue });
        const n = Number.parseInt(String(raw), 10);
        if (!Number.isFinite(n)) continue;
        if (typeof min === 'number' && n < min) continue;
        if (typeof max === 'number' && n > max) continue;
        return n;
      }
    },
    async promptConfirm(label, opts = {}) {
      const { defaultValue } = opts;
      const def = typeof defaultValue === 'boolean' ? defaultValue : true;
      while (true) {
        const suffix = def ? ' (Y/n)' : ' (y/N)';
        const ans = String(await ask(`${label}${suffix}: `))
          .trim()
          .toLowerCase();
        if (!ans) return def;
        if (ans === 'y' || ans === 'yes') return true;
        if (ans === 'n' || ans === 'no') return false;
      }
    },
    close() {
      rl.close();
    },
  };
}

function createApiClient(baseUrl, token, opts = {}) {
  const tenantDomain = String(opts.tenantDomain || '').trim();
  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : 30000;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  headers['Content-Type'] = 'application/json';
  if (tenantDomain) headers['X-Tenant-Domain'] = tenantDomain;

  return axios.create({
    baseURL: normalizeBaseUrl(baseUrl),
    timeout: timeoutMs,
    headers,
    validateStatus: () => true,
  });
}

async function login(baseUrl, tenantDomain, email, password) {
  const client = createApiClient(baseUrl, null, { tenantDomain });
  const res = await client.post('/api/auth/login', { email, password });
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    const msg = res?.data?.message || `Login failed (status=${res.status})`;
    throw new Error(msg);
  }
  return {
    token: res.data?.data?.token,
    refreshToken: res.data?.data?.refreshToken,
    user: res.data?.data?.user,
  };
}

async function fetchAllPages(client, path, params) {
  const all = [];
  let page = 1;
  while (true) {
    const res = await client.get(path, { params: { ...(params || {}), page, limit: 100 } });
    if (res.status !== 200 || !res.data || res.data.success !== true) {
      const msg = res?.data?.message || `Fetch failed ${path} (status=${res.status})`;
      throw new Error(msg);
    }
    const rows = Array.isArray(res.data.data) ? res.data.data : [];
    all.push(...rows);
    const totalPages = res?.data?.pagination?.totalPages;
    if (typeof totalPages === 'number') {
      if (page >= totalPages) break;
    } else if (rows.length < 100) {
      break;
    }
    page++;
    if (page > 1000) break;
  }
  return all;
}

function pickStudents(rawStudents, count) {
  const uniq = new Map();
  for (const s of rawStudents || []) {
    if (!s || !s.id) continue;
    if (uniq.has(s.id)) continue;
    const rfid = (s.no_rfid || s.rfid || '').toString().trim();
    uniq.set(String(s.id), { id: String(s.id), rfid: rfid || null });
  }
  return Array.from(uniq.values()).slice(0, Math.max(0, count));
}

function ensureRfid(students) {
  return (students || []).map((s, idx) => ({
    id: String(s.id),
    rfid: String(s.rfid || `RFID${String(idx + 1).padStart(4, '0')}`),
  }));
}

module.exports = {
  normalizeBaseUrl,
  ensureDir,
  readJson,
  writeJson,
  createPrompter,
  createApiClient,
  login,
  fetchAllPages,
  pickStudents,
  ensureRfid,
};

