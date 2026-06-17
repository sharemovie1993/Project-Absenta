const path = require('path');
const { spawnSync } = require('child_process');
const { createPrompter, readJson, writeJson, normalizeBaseUrl } = require('./tools/_lib');
const { prepareDataset } = require('./tools/prepare-dataset');
const { createSessionAndUpdateDataset } = require('./tools/create-session');
const { warmupGate } = require('./tools/warmup-gate');

const DATASET_PATH = path.resolve(__dirname, 'datasets', 'attendance_dataset.json');

function runK6(scriptRelPath, env) {
  const scriptPath = path.resolve(__dirname, scriptRelPath);
  const result = spawnSync('k6', ['run', scriptPath], { stdio: 'inherit', env: { ...process.env, ...(env || {}) } });
  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(`k6 failed: ${scriptRelPath} (exit=${result.status})`);
  }
}

async function main() {
  const prompter = createPrompter();
  try {
    const baseUrl = normalizeBaseUrl(await prompter.prompt('baseUrl', { defaultValue: 'http://10.60.0.1:3001' }));
    const tenantDomain = await prompter.prompt('tenantDomain (opsional; dipakai saat login resolve tenant)', { defaultValue: '' });
    const gateDevice = await prompter.prompt('device_id', { defaultValue: 'GATE-01' });

    const scenario = await prompter.promptInt(
      'Select load test scenario: 1=Gate Arrival, 2=Session Spike, 3=Stress Test, 4=Full Simulation',
      { defaultValue: 4, min: 1, max: 4 },
    );

    const emailGuru = await prompter.prompt('email guru gerbang (untuk login)', { required: true });
    const passwordGuru = await prompter.prompt('password guru gerbang', { required: true });
    const siswaCount = await prompter.promptInt('jumlah siswa yang dipakai dari API', { defaultValue: 200, min: 1, max: 50000 });
    const kelasId = await prompter.prompt('kelasId (opsional; filter siswa)', { defaultValue: '' });
    const petugasEmailsRaw = await prompter.prompt('email petugas kelas (opsional; pisahkan dengan koma)', { defaultValue: '' });
    const petugasEmails = petugasEmailsRaw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const petugasPassword = petugasEmails.length > 0 ? await prompter.prompt('password petugas (kosong=pakai password guru)', { defaultValue: '' }) : '';

    await prepareDataset({
      baseUrl,
      tenantDomain,
      guruEmail: emailGuru,
      guruPassword: passwordGuru,
      gateDevice,
      siswaCount,
      kelasId,
      siswaStatus: 'AKTIF',
      petugasEmails,
      petugasPassword,
    });

    const dataset = readJson(DATASET_PATH);
    dataset.baseUrl = normalizeBaseUrl(baseUrl);
    dataset.gateDevice = gateDevice;
    writeJson(DATASET_PATH, dataset);

    if (scenario === 1) {
      const stage1Target = await prompter.promptInt('stage1 target rps', { defaultValue: 5, min: 0, max: 50000 });
      const stage1Duration = await prompter.prompt('stage1 duration', { defaultValue: '30s' });
      const stage2Target = await prompter.promptInt('stage2 target rps', { defaultValue: 20, min: 0, max: 50000 });
      const stage2Duration = await prompter.prompt('stage2 duration', { defaultValue: '5m' });
      const stage3Target = await prompter.promptInt('stage3 target rps', { defaultValue: 40, min: 0, max: 50000 });
      const stage3Duration = await prompter.prompt('stage3 duration', { defaultValue: '5m' });

      runK6('scripts/k6-gerbang-load.js', {
        STAGE1_TARGET: String(stage1Target),
        STAGE1_DURATION: String(stage1Duration),
        STAGE2_TARGET: String(stage2Target),
        STAGE2_DURATION: String(stage2Duration),
        STAGE3_TARGET: String(stage3Target),
        STAGE3_DURATION: String(stage3Duration),
        STUDENT_COUNT: String(siswaCount),
      });
      return;
    }

    if (scenario === 3) {
      const rate = await prompter.promptInt('target rps', { defaultValue: 100, min: 1, max: 50000 });
      const duration = await prompter.prompt('duration', { defaultValue: '60s' });
      runK6('scripts/k6-stress.js', {
        RATE: String(rate),
        DURATION: String(duration),
        STUDENT_COUNT: String(siswaCount),
      });
      return;
    }

    const createSession = await prompter.promptConfirm('Create new attendance session?', { defaultValue: true });
    if (createSession) {
      const emailSession = await prompter.prompt('email pembuat sesi (guru/admin)', { defaultValue: emailGuru });
      const passwordSession = await prompter.prompt('password pembuat sesi', { defaultValue: passwordGuru });
      const kelasSearch = await prompter.prompt('kelas search (opsional)', { defaultValue: '' });
      const jenisKegiatan = await prompter.prompt('jenis_kegiatan', { defaultValue: 'KBM' });
      const startOffsetMinutes = await prompter.promptInt('startOffsetMinutes (waktu_mulai = now - offset)', { defaultValue: 5, min: 0, max: 600 });
      const durationMinutes = await prompter.promptInt('durationMinutes', { defaultValue: 60, min: 1, max: 720 });
      await createSessionAndUpdateDataset({
        baseUrl,
        tenantDomain,
        email: emailSession,
        password: passwordSession,
        kelasSearch,
        kelasId: kelasId || '',
        jenisKegiatan,
        startOffsetMinutes,
        durationMinutes,
      });
    }

    const doWarmup = await prompter.promptConfirm('Warmup gate (tap GERBANG_DATANG untuk semua siswa di dataset)?', { defaultValue: true });
    if (doWarmup) {
      const concurrency = await prompter.promptInt('warmup concurrency', { defaultValue: 20, min: 1, max: 200 });
      await warmupGate({ tenantDomain, concurrency, gateDevice });
    }

    const sessionId = readJson(DATASET_PATH).sessionId;
    if (!sessionId || String(sessionId).includes('<')) {
      throw new Error('Dataset sessionId masih placeholder. Jalankan create-session atau isi sessionId.');
    }

    if (scenario === 2) {
      const vus = await prompter.promptInt('VUs', { defaultValue: 30, min: 1, max: 5000 });
      const iterations = await prompter.promptInt('iterations', { defaultValue: 30, min: 1, max: 500000 });
      const maxDuration = await prompter.prompt('maxDuration', { defaultValue: '10s' });
      runK6('scripts/k6-sesi-spike.js', {
        VUS: String(vus),
        ITERATIONS: String(iterations),
        MAX_DURATION: String(maxDuration),
        SESSION_ID: String(sessionId),
        STUDENT_COUNT: String(siswaCount),
      });
      return;
    }

    runK6('scripts/k6-gerbang-load.js', {
      STUDENT_COUNT: String(siswaCount),
    });
    runK6('scripts/k6-sesi-spike.js', {
      SESSION_ID: String(sessionId),
      STUDENT_COUNT: String(siswaCount),
    });
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
