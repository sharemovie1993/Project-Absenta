const path = require('path');
const {
  createPrompter,
  createApiClient,
  login,
  fetchAllPages,
  pickStudents,
  ensureRfid,
  writeJson,
  normalizeBaseUrl,
} = require('./_lib');

const DATASET_PATH = path.resolve(__dirname, '..', 'datasets', 'attendance_dataset.json');

async function prepareDataset(opts) {
  const baseUrl = normalizeBaseUrl(opts.baseUrl);
  const tenantDomain = String(opts.tenantDomain || '').trim();

  const gateDevice = String(opts.gateDevice || 'GATE-01').trim();
  const deviceId = gateDevice;
  const siswaCount = Number.isFinite(opts.siswaCount) ? Math.max(1, opts.siswaCount) : 200;
  const kelasId = String(opts.kelasId || '').trim() || null;
  const siswaStatus = String(opts.siswaStatus || 'AKTIF').trim();

  const guruLogin = await login(baseUrl, tenantDomain, opts.guruEmail, opts.guruPassword);
  const guruToken = String(guruLogin.token || '').trim();
  if (!guruToken) throw new Error('Missing token from guru login');

  const petugasEmails = Array.isArray(opts.petugasEmails) ? opts.petugasEmails.filter(Boolean) : [];
  const petugasTokens = [];
  for (const email of petugasEmails) {
    const pw = String(opts.petugasPassword || opts.guruPassword || '').trim();
    if (!pw) continue;
    const r = await login(baseUrl, tenantDomain, email, pw);
    if (r.token) petugasTokens.push(String(r.token));
  }
  if (petugasTokens.length === 0) petugasTokens.push(guruToken);

  const client = createApiClient(baseUrl, guruToken, { tenantDomain });
  const siswaRows = await fetchAllPages(client, '/api/academic/siswa', {
    ...(kelasId ? { kelas_id: kelasId } : {}),
    ...(siswaStatus ? { status: siswaStatus } : {}),
  });

  const selected = ensureRfid(pickStudents(siswaRows, siswaCount));
  if (selected.length === 0) throw new Error('No students returned from API');

  const dataset = {
    baseUrl,
    gateDevice: deviceId,
    sessionId: '<sesi-absensi-id>',
    guruGerbangToken: guruToken,
    petugasKelasTokens: petugasTokens,
    students: selected,
  };

  writeJson(DATASET_PATH, dataset);
  return { datasetPath: DATASET_PATH, dataset };
}

async function main() {
  const prompter = createPrompter();
  try {
    const baseUrl = await prompter.prompt('baseUrl', { defaultValue: 'http://10.60.0.1:3001' });
    const tenantDomain = await prompter.prompt('tenantDomain (opsional; dipakai saat login resolve tenant)', { defaultValue: '' });
    const guruEmail = await prompter.prompt('email guru gerbang', { required: true });
    const guruPassword = await prompter.prompt('password', { required: true });
    const gateDevice = await prompter.prompt('device_id', { defaultValue: 'GATE-01' });
    const siswaCount = await prompter.promptInt('jumlah siswa (max diambil dari API per kelas/tenant)', { defaultValue: 200, min: 1, max: 50000 });
    const kelasId = await prompter.prompt('kelasId (opsional; filter siswa)', { defaultValue: '' });
    const siswaStatus = await prompter.prompt('status siswa (opsional)', { defaultValue: 'AKTIF' });
    const petugasEmailsRaw = await prompter.prompt('email petugas kelas (opsional; pisahkan dengan koma)', { defaultValue: '' });
    const petugasEmails = petugasEmailsRaw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const petugasPassword = petugasEmails.length > 0 ? await prompter.prompt('password petugas (kosong=pakai password guru)', { defaultValue: '' }) : '';

    const result = await prepareDataset({
      baseUrl,
      tenantDomain,
      guruEmail,
      guruPassword,
      gateDevice,
      siswaCount,
      kelasId,
      siswaStatus,
      petugasEmails,
      petugasPassword,
    });

    console.log(`Dataset written: ${result.datasetPath}`);
    console.log(`Students: ${result.dataset.students.length}`);
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

module.exports = { prepareDataset };

