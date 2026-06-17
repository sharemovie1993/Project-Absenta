const axios = require('axios');

function parseArgs() {
  const args = process.argv.slice(2);
  const map = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('-') ? args[i + 1] : 'true';
      map[key] = val;
      if (val !== 'true') i++;
    } else if (a.startsWith('-')) {
      const key = a.slice(1);
      const val = args[i + 1] && !args[i + 1].startsWith('-') ? args[i + 1] : 'true';
      map[key] = val;
      if (val !== 'true') i++;
    }
  }
  return map;
}

function ensureApiBase(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  return u.endsWith('/api') ? u : (u.replace(/\/+$/, '') + '/api');
}

function formatDateYYYYMMDD(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function run() {
  const args = parseArgs();
  const email = args.email || args.e || process.env.TEST_EMAIL;
  const password = args.password || args.p || process.env.TEST_PASSWORD;
  const baseUrlInput = args.url || args.u || process.env.API_BASE_URL || 'https://smkn1pld.absenta.id/api';
  const baseUrl = ensureApiBase(baseUrlInput);
  const tanggalParam = args.tanggal || args.t || formatDateYYYYMMDD(new Date());
  const kelasId = args.kelas || args.k || '';
  const tahunPelajaranId = args.tahun_pelajaran_id || args.tahun || '';
  const semesterId = args.semester_id || args.semester || '';

  if (!email || !password) {
    console.error('Email dan password wajib diisi. Gunakan --email dan --password.');
    process.exit(1);
  }
  if (!baseUrl) {
    console.error('Base URL tidak valid.');
    process.exit(1);
  }

  try {
    const loginRes = await axios.post(`${baseUrl}/auth/login`, { email, password }, { headers: { 'Content-Type': 'application/json' }, withCredentials: true });
    if (!loginRes.data?.success) {
      console.error('Login gagal:', loginRes.data?.message || 'Unknown error');
      process.exit(1);
    }
    const token = loginRes.data.data?.token || loginRes.data.data?.access_token || '';
    const user = loginRes.data.data?.user || {};
    const tenantId = user?.tenant_id || '';
    const roleName = user?.role?.name || '';
    const attendanceMode = user?.tenant?.absensi_mode || '';

    console.log('Login OK');
    console.log(`User: ${user?.email || ''}`);
    console.log(`Role: ${roleName}`);
    console.log(`Tenant: ${tenantId}`);
    console.log(`Mode: ${attendanceMode}`);

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    if (tenantId) headers['X-Tenant-ID'] = tenantId;

    const checkParams = {};
    if (kelasId) checkParams.kelas_id = kelasId;
    const petugasCheck = await axios.get(`${baseUrl}/attendance/sesi-absensi/petugas/check`, { headers, params: checkParams, withCredentials: true });
    const petugasActive = !!(petugasCheck.data?.data?.active);
    console.log(`Petugas aktif: ${petugasActive}`);

    const listParams = { tanggal: tanggalParam };
    if (kelasId) listParams.kelas_id = kelasId;
    if (tahunPelajaranId) listParams.tahun_pelajaran_id = tahunPelajaranId;
    if (semesterId) listParams.semester_id = semesterId;
    const listRes = await axios.get(`${baseUrl}/attendance/sesi-absensi`, { headers, params: listParams, withCredentials: true });
    const sessions = listRes.data?.data || [];
    console.log(`Total sesi: ${Array.isArray(sessions) ? sessions.length : 0}`);
    const preview = Array.isArray(sessions) ? sessions.slice(0, 5).map(s => ({
      id: s.id,
      tanggal: s.tanggal,
      waktu_mulai: s.waktu_mulai,
      waktu_selesai: s.waktu_selesai,
      kelas: s.Kelas?.nama_kelas || s.kelas_nama_snapshot || null,
      guru: s.Guru?.nama_guru || null,
      jenis_kegiatan: s.jenis_kegiatan,
      status: s.status
    })) : [];
    console.log(JSON.stringify({ success: true, message: 'Daftar sesi', count: Array.isArray(sessions) ? sessions.length : 0, preview }, null, 2));
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.error('Request gagal', status || '', data?.message || err.message);
    if (data) {
      try { console.error(JSON.stringify(data, null, 2)); } catch {}
    }
    process.exit(1);
  }
}

if (require.main === module) {
  run();
}
