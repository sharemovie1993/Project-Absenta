const path = require('path');
const {
  createPrompter,
  createApiClient,
  login,
  readJson,
  writeJson,
  normalizeBaseUrl,
} = require('./_lib');

const DATASET_PATH = path.resolve(__dirname, '..', 'datasets', 'attendance_dataset.json');

function toIsoWithOffset(d, offset) {
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}.000${offset}`;
}

function guessOffset() {
  const tz = String(process.env.TZ || '').trim();
  if (tz === 'Asia/Makassar') return '+08:00';
  if (tz === 'Asia/Jayapura') return '+09:00';
  return '+07:00';
}

async function createSessionAndUpdateDataset(opts) {
  const baseUrl = normalizeBaseUrl(opts.baseUrl);
  const tenantDomain = String(opts.tenantDomain || '').trim();

  const actor = await login(baseUrl, tenantDomain, opts.email, opts.password);
  const token = String(actor.token || '').trim();
  const userId = actor.user?.id ? String(actor.user.id) : null;
  if (!token) throw new Error('Missing token from login');

  const client = createApiClient(baseUrl, token, { tenantDomain });

  const kelasSearch = String(opts.kelasSearch || '').trim();
  const kelasRes = await client.get('/api/academic/kelas', { params: { page: 1, limit: 50, ...(kelasSearch ? { search: kelasSearch } : {}) } });
  if (kelasRes.status !== 200 || !kelasRes.data || kelasRes.data.success !== true) {
    const msg = kelasRes?.data?.message || `Failed to list kelas (status=${kelasRes.status})`;
    throw new Error(msg);
  }
  const kelasList = Array.isArray(kelasRes.data.data) ? kelasRes.data.data : [];
  if (kelasList.length === 0) throw new Error('No kelas returned from API');

  const kelasId = String(opts.kelasId || '').trim() || String(kelasList[0].id);
  const jenisKegiatan = String(opts.jenisKegiatan || 'KBM').trim();
  const requiresGuru = jenisKegiatan.toUpperCase().startsWith('KBM') || jenisKegiatan.toUpperCase() === 'ESKUL';

  let guruId = String(opts.guruId || '').trim() || null;
  if (!guruId && requiresGuru && userId) {
    const guruRes = await client.get('/api/academic/guru', { params: { page: 1, limit: 1, user_id: userId } });
    if (guruRes.status === 200 && guruRes.data && guruRes.data.success === true) {
      const rows = Array.isArray(guruRes.data.data) ? guruRes.data.data : [];
      if (rows.length > 0 && rows[0].id) {
        guruId = String(rows[0].id);
      }
    }
  }

  const now = new Date();
  const offset = guessOffset();
  const start = new Date(now.getTime() - Math.max(0, Number(opts.startOffsetMinutes || 5)) * 60 * 1000);
  const end = new Date(start.getTime() + Math.max(1, Number(opts.durationMinutes || 60)) * 60 * 1000);
  const day = new Date(start);
  day.setHours(0, 0, 0, 0);

  const payload = {
    kelas_id: kelasId,
    guru_id: guruId,
    jenis_kegiatan: jenisKegiatan,
    tanggal: toIsoWithOffset(day, offset),
    waktu_mulai: toIsoWithOffset(start, offset),
    waktu_selesai: toIsoWithOffset(end, offset),
    sumber_sesi: 'MANUAL',
  };

  const res = await client.post('/api/attendance/sesi-absensi', payload);
  if (res.status !== 200 && res.status !== 201) {
    const msg = res?.data?.message || `Create sesi failed (status=${res.status})`;
    throw new Error(msg);
  }

  const created = res.data?.data || res.data;
  const sessionId = created?.id ? String(created.id) : null;
  if (!sessionId) throw new Error('Missing sessionId from response');

  const dataset = readJson(DATASET_PATH);
  dataset.baseUrl = normalizeBaseUrl(dataset.baseUrl || baseUrl);
  dataset.sessionId = sessionId;
  writeJson(DATASET_PATH, dataset);

  return { sessionId, datasetPath: DATASET_PATH, kelasId, guruId, jenisKegiatan };
}

async function main() {
  const prompter = createPrompter();
  try {
    const baseUrl = await prompter.prompt('baseUrl', { defaultValue: 'http://10.60.0.1:3001' });
    const tenantDomain = await prompter.prompt('tenantDomain (opsional; dipakai saat login resolve tenant)', { defaultValue: '' });
    const email = await prompter.prompt('email pembuat sesi (guru/admin)', { required: true });
    const password = await prompter.prompt('password', { required: true });
    const kelasSearch = await prompter.prompt('kelas search (opsional)', { defaultValue: '' });
    const kelasId = await prompter.prompt('kelasId (kosong=ambil result pertama)', { defaultValue: '' });
    const jenisKegiatan = await prompter.prompt('jenis_kegiatan', { defaultValue: 'KBM' });
    const guruId = await prompter.prompt('guruId (opsional; kosong=auto resolve jika login sebagai GURU dan jenis_kegiatan KBM/ESKUL)', { defaultValue: '' });
    const startOffsetMinutes = await prompter.promptInt('startOffsetMinutes (waktu_mulai = now - offset)', { defaultValue: 5, min: 0, max: 600 });
    const durationMinutes = await prompter.promptInt('durationMinutes', { defaultValue: 60, min: 1, max: 720 });

    const r = await createSessionAndUpdateDataset({
      baseUrl,
      tenantDomain,
      email,
      password,
      kelasSearch,
      kelasId,
      jenisKegiatan,
      guruId,
      startOffsetMinutes,
      durationMinutes,
    });
    console.log(`Session created: ${r.sessionId}`);
    console.log(`Dataset updated: ${r.datasetPath}`);
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

module.exports = { createSessionAndUpdateDataset };

