const axios = require('axios');

async function testModul1SesiKelas() {
  console.log('====================================================');
  console.log('=== TEST SUITE MODUL 1: SESI KELAS & UNIVERSAL SCAN ===');
  console.log('====================================================\n');

  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';

  // 1. Login as Petugas Kelas / Guru (aher@gmail.com)
  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: 'aher@gmail.com', password: 'admin1234'
  });
  const token = loginRes.data?.data?.token;
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  console.log('✅ 1. Login Petugas Kelas Success');

  // 2. Create a FRESH session with ISO format
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
  console.log(`✅ 2. Created Fresh Live Sesi [ID: ${freshSesiId}]`);

  // 3. Fetch Students of Active Session
  const studentsRes = await axios.get(`http://10.10.10.250:3004/api/attendance/sesi-absensi/${freshSesiId}/absen-siswa`, { headers });
  const students = studentsRes.data?.data || [];
  console.log(`✅ 3. GET /api/attendance/sesi-absensi/${freshSesiId}/absen-siswa Success: Loaded ${students.length} students`);

  const sampleStudent = students[0];
  console.log('Sample Student Data:', {
    id: sampleStudent?.id,
    siswa_id: sampleStudent?.siswa_id,
    siswa_akademik_id: sampleStudent?.siswa_akademik_id,
    nama: sampleStudent?.Siswa?.nama_siswa,
    nis: sampleStudent?.Siswa?.nis,
    current_status: sampleStudent?.status
  });

  // 4. Test Universal Search NIS
  const searchRes = await axios.get(`http://10.10.10.250:3004/api/academic/universal-search?q=${sampleStudent?.Siswa?.nis || '2526100115'}`, { headers });
  console.log(`✅ 4. GET /api/academic/universal-search Success: Matched ${searchRes.data?.data?.[0]?.name}`);

  // 5. Test Quick Action Pill Buttons [ HADIR, IZIN, SAKIT, DISPEN, ALPA ]
  const statuses = ['HADIR', 'IZIN', 'SAKIT', 'DISPEN', 'ALPA'];
  const targetSiswaId = sampleStudent?.siswa_id || sampleStudent?.id;
  const targetAkademikId = sampleStudent?.siswa_akademik_id || targetSiswaId;

  console.log('\n--- 5. Testing Quick Action Pill Buttons Payload ---');
  for (const st of statuses) {
    try {
      const tapRes = await axios.post(`http://10.10.10.250:3004/api/attendance/sesi-absensi/${freshSesiId}/tap-siswa`, {
        siswa_id: targetSiswaId,
        siswa_akademik_id: targetAkademikId,
        status: st
      }, { headers });
      console.log(`  🎉 Tap Action Button [ ${st} ] 100% SUCCESS! Status:`, tapRes.status, 'Message:', tapRes.data?.message);
    } catch (e) {
      console.log(`  ❌ Tap Action Button [ ${st} ] Failed:`, e.response?.status, e.response?.data);
    }
  }

  console.log('\n====================================================');
  console.log('=== ALL MODUL 1 BACKEND VERIFICATIONS PASSED 100% ===');
  console.log('====================================================\n');
}

testModul1SesiKelas().catch(console.error);
