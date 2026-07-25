const axios = require('axios');

async function testTapSiswaSesi() {
  console.log('=== TESTING TAP SISWA SESI ENDPOINT ===');

  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: '2526100115', identifier: '2526100115', password: '11223344'
  });
  const token = loginRes.data?.data?.token;
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  // Use an active session ID directly
  const activeSesiId = 'c42dd704-771d-4a32-818b-390c88ffd056';

  // 1. Fetch students of session
  const studentsRes = await axios.get(`http://10.10.10.250:3004/api/attendance/sesi-absensi/${activeSesiId}/absen-siswa`, { headers });
  console.log('Absen Siswa Count:', studentsRes.data?.data?.length);
  const sampleStudent = studentsRes.data?.data?.[0];

  // 2. Test tap with siswa_id (UUID)
  try {
    const tapUuid = await axios.post(`http://10.10.10.250:3004/api/attendance/sesi-absensi/${activeSesiId}/tap-siswa`, {
      siswa_id: sampleStudent.siswa_id,
      status: 'HADIR'
    }, { headers });
    console.log('Tap with UUID Success:', tapUuid.data);
  } catch (e) {
    console.log('Tap with UUID Error:', e.response?.status, e.response?.data);
  }

  // 3. Test tap with NIS (e.g. 2526100115)
  try {
    const tapNis = await axios.post(`http://10.10.10.250:3004/api/attendance/sesi-absensi/${activeSesiId}/tap-siswa`, {
      siswa_id: '2526100115',
      status: 'HADIR'
    }, { headers });
    console.log('Tap with raw NIS Success:', tapNis.data);
  } catch (e) {
    console.log('Tap with raw NIS Error:', e.response?.status, e.response?.data);
  }
}

testTapSiswaSesi().catch(console.error);
