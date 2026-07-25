const axios = require('axios');

async function testTapActionButtonsOnActiveSession() {
  console.log('=== TESTING TAP ACTION BUTTONS WITH ISO TIME ===');

  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: 'aher@gmail.com', password: 'admin1234'
  });
  const token = loginRes.data?.data?.token;
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  // 1. Create a FRESH active session for today with valid ISO time
  const now = new Date();
  const startIso = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const endIso = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();

  const guruRes = await axios.get('http://10.10.10.250:3004/api/academic/guru?limit=1', { headers });
  const guruId = guruRes.data?.data?.[0]?.id;

  const createRes = await axios.post('http://10.10.10.250:3004/api/attendance/sesi-absensi', {
    kelas_id: '99c4545f-76ca-41ee-a502-77fcd58b9875',
    guru_id: guruId,
    jenis_kegiatan: 'KBM',
    waktu_mulai: startIso,
    waktu_selesai: endIso
  }, { headers });

  const freshSesiId = createRes.data?.data?.id;
  console.log('Fresh Sesi Created:', freshSesiId, 'Status:', createRes.data?.data?.status);

  // 2. Fetch students of fresh session
  const studentsRes = await axios.get(`http://10.10.10.250:3004/api/attendance/sesi-absensi/${freshSesiId}/absen-siswa`, { headers });
  const sampleStudent = studentsRes.data?.data?.[0];
  console.log('Sample Student Data:', {
    id: sampleStudent?.id,
    siswa_id: sampleStudent?.siswa_id,
    siswa_akademik_id: sampleStudent?.siswa_akademik_id,
    nama: sampleStudent?.Siswa?.nama_siswa
  });

  const targetSiswaAkademikId = sampleStudent?.siswa_akademik_id;
  const targetSiswaId = sampleStudent?.siswa_id;

  // 3. Test statuses HADIR, IZIN, SAKIT, DISPEN, ALPA
  const statuses = ['HADIR', 'IZIN', 'SAKIT', 'DISPEN', 'ALPA'];
  for (const st of statuses) {
    try {
      const tapRes = await axios.post(`http://10.10.10.250:3004/api/attendance/sesi-absensi/${freshSesiId}/tap-siswa`, {
        siswa_akademik_id: targetSiswaAkademikId,
        siswa_id: targetSiswaId,
        status: st
      }, { headers });
      console.log(`✅ Tap Action [ ${st} ] SUCCESS! Status:`, tapRes.status, 'Data:', tapRes.data);
    } catch (e) {
      console.log(`❌ Tap Action [ ${st} ] Error:`, e.response?.status, e.response?.data);
    }
  }
}

testTapActionButtonsOnActiveSession().catch(console.error);
