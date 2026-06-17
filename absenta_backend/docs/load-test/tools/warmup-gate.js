const path = require('path');
const {
  createApiClient,
  readJson,
  normalizeBaseUrl,
  createPrompter,
} = require('./_lib');

const DATASET_PATH = path.resolve(__dirname, '..', 'datasets', 'attendance_dataset.json');

async function warmupGate(opts) {
  const datasetPath = opts.datasetPath ? path.resolve(opts.datasetPath) : DATASET_PATH;
  const dataset = readJson(datasetPath);
  const baseUrl = normalizeBaseUrl(dataset.baseUrl || opts.baseUrl);
  const tenantDomain = String(opts.tenantDomain || '').trim();
  const token = String(dataset.guruGerbangToken || '').trim();
  if (!token) throw new Error('Missing guruGerbangToken in dataset');
  const gateDevice = String(opts.gateDevice || dataset.gateDevice || 'GATE-01').trim();
  const students = Array.isArray(dataset.students) ? dataset.students : [];
  const concurrency = Number.isFinite(opts.concurrency) ? Math.max(1, Math.min(200, opts.concurrency)) : 20;

  const client = createApiClient(baseUrl, token, { tenantDomain, timeoutMs: 60000 });

  let ok = 0;
  let fail = 0;
  let i = 0;
  while (i < students.length) {
    const batch = students.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (s) => {
        const payload = { siswa_id: String(s.id), arah: 'GERBANG_DATANG', device_id: gateDevice, rfid: String(s.rfid || '') || undefined };
        const res = await client.post('/api/attendance/gerbang/tap', payload);
        return { status: res.status, data: res.data };
      }),
    );
    for (const r of results) {
      if ([200, 201, 409].includes(r.status)) ok++;
      else fail++;
    }
    i += batch.length;
    if (i % 200 === 0 || i >= students.length) {
      console.log(`Warmup progress: ${i}/${students.length} ok=${ok} fail=${fail}`);
    }
  }

  return { ok, fail, total: students.length, datasetPath };
}

async function main() {
  const prompter = createPrompter();
  try {
    const tenantDomain = await prompter.prompt('tenantDomain (opsional)', { defaultValue: '' });
    const concurrency = await prompter.promptInt('concurrency', { defaultValue: 20, min: 1, max: 200 });
    const gateDevice = await prompter.prompt('device_id override (kosong=pakai dari dataset)', { defaultValue: '' });

    const r = await warmupGate({ tenantDomain, concurrency, ...(gateDevice ? { gateDevice } : {}) });
    console.log(`Warmup done: ok=${r.ok} fail=${r.fail} total=${r.total}`);
  } finally {
    prompter.close();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e?.message || String(e));
    process.exitCode = 1;
  });
}

module.exports = { warmupGate };

