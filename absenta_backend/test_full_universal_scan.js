const axios = require('axios');

async function testFullUniversalScan() {
  console.log('=== TESTING FULL UNIVERSAL SCAN FLOW ===');

  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: 'neple@gmail.com', password: 'admin1234'
  });
  const token = loginRes.data?.data?.token;
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  // 1. Universal Search NIS 2526100115
  const searchRes = await axios.get('http://10.10.10.250:3004/api/academic/universal-search?q=2526100115', { headers });
  const matchedStudent = searchRes.data?.data?.[0];
  console.log('Universal Search Result:', matchedStudent?.name, 'ID:', matchedStudent?.id, 'Kelas:', matchedStudent?.kelas);

  if (matchedStudent) {
    // 2. Get guru_id
    const guruRes = await axios.get('http://10.10.10.250:3004/api/academic/guru?limit=1', { headers });
    const guruId = guruRes.data?.data?.[0]?.id;

    // 3. Create live session for X TE 4 (99c4545f-76ca-41ee-a502-77fcd58b9875) for today
    const now = new Date();
    const startIso = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    const endIso = new Date(now.getTime() + 180 * 60 * 1000).toISOString();

    const createRes = await axios.post('http://10.10.10.250:3004/api/attendance/sesi-absensi', {
      kelas_id: '99c4545f-76ca-41ee-a502-77fcd58b9875',
      guru_id: guruId,
      jenis_kegiatan: 'KBM',
      waktu_mulai: startIso,
      waktu_selesai: endIso
    }, { headers });

    const te4SesiId = createRes.data?.data?.id;
    console.log('Live X TE 4 Sesi Created ID:', te4SesiId);

    // 4. Tap student UUID returned from universalSearch into live session!
    try {
      const tapRes = await axios.post(`http://10.10.10.250:3004/api/attendance/sesi-absensi/${te4SesiId}/tap-siswa`, {
        siswa_id: matchedStudent.id,
        status: 'HADIR'
      }, { headers });
      console.log('🎉🎉🎉 POST /api/attendance/sesi-absensi/{id}/tap-siswa 100% SUCCESS!', tapRes.data);
    } catch (e) {
      console.log('❌ Tap Error:', e.response?.status, e.response?.data);
    }
  }
}

testFullUniversalScan().catch(console.error);
