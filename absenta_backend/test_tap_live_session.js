const axios = require('axios');

async function testTapLiveSession() {
  console.log('=== TESTING LIVE SESSION CREATION & TAP ===');

  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: '2526100115', identifier: '2526100115', password: '11223344'
  });
  const token = loginRes.data?.data?.token;
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  // 1. Get a valid guru_id
  const guruRes = await axios.get('http://10.10.10.250:3004/api/academic/guru?limit=1', { headers });
  const guruId = guruRes.data?.data?.[0]?.id;
  console.log('Guru ID:', guruId);

  // 2. Format SQL Datetime YYYY-MM-DD HH:mm:ss
  const todayStr = new Date().toISOString().split('T')[0];
  const startStr = `${todayStr} 07:00:00`;
  const endStr = `${todayStr} 15:00:00`;

  const createRes = await axios.post('http://10.10.10.250:3004/api/attendance/sesi-absensi', {
    kelas_id: '99c4545f-76ca-41ee-a502-77fcd58b9875',
    guru_id: guruId,
    jenis_kegiatan: 'KBM',
    waktu_mulai: startStr,
    waktu_selesai: endStr
  }, { headers });

  console.log('Live Sesi Created:', createRes.data);
  const sesiId = createRes.data?.data?.id;

  // 3. Test GET /api/attendance/sesi-absensi/{id}/absen-siswa
  const siswaRes = await axios.get(`http://10.10.10.250:3004/api/attendance/sesi-absensi/${sesiId}/absen-siswa`, { headers });
  console.log('Live Sesi Student Count:', siswaRes.data?.data?.length);
  const sampleStudent = siswaRes.data?.data?.[0];

  // 4. Test Tap with NIS (2526100115)
  try {
    const tapNis = await axios.post(`http://10.10.10.250:3004/api/attendance/sesi-absensi/${sesiId}/tap-siswa`, {
      siswa_id: '2526100115',
      status: 'HADIR'
    }, { headers });
    console.log('Tap with raw NIS 2526100115 Result:', tapNis.data);
  } catch (e) {
    console.log('Tap with raw NIS Error:', e.response?.status, e.response?.data);
  }
}

testTapLiveSession().catch(console.error);
