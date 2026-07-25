const axios = require('axios');

async function debugSesiDialog() {
  console.log('=== DEBUGGING SESI DIALOG BACKEND ENDPOINTS ===');

  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: '2526100115', identifier: '2526100115', password: '11223344'
  });
  const token = loginRes.data?.data?.token;
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  // 1. Get active sessions list
  const sesiListRes = await axios.get('http://10.10.10.250:3004/api/attendance/sesi-absensi?summary=true', { headers });
  console.log('Active Sessions Count:', sesiListRes.data?.data?.length);

  if (sesiListRes.data?.data?.length > 0) {
    const activeSesi = sesiListRes.data.data[0];
    console.log('Sample Sesi ID:', activeSesi.id, 'Nama Sesi:', activeSesi.nama_sesi, 'Kelas ID:', activeSesi.kelas_id);

    // 2. Test GET /api/attendance/sesi-absensi/{id}
    try {
      const detailRes = await axios.get(`http://10.10.10.250:3004/api/attendance/sesi-absensi/${activeSesi.id}`, { headers });
      console.log('GET /api/attendance/sesi-absensi/{id} Status:', detailRes.status);
      console.log('Detail Data Keys:', Object.keys(detailRes.data));
      console.log('Detail Data:', JSON.stringify(detailRes.data).slice(0, 300));
    } catch (e) {
      console.log('GET /api/attendance/sesi-absensi/{id} Error:', e.response?.status, e.response?.data);
    }

    // 3. Test GET /api/attendance/sesi-absensi/{id}/absen-siswa (Used in absenta_frontend!)
    try {
      const siswaRes = await axios.get(`http://10.10.10.250:3004/api/attendance/sesi-absensi/${activeSesi.id}/absen-siswa`, { headers });
      console.log('GET /api/attendance/sesi-absensi/{id}/absen-siswa Status:', siswaRes.status);
      console.log('Absen Siswa Count:', siswaRes.data?.data?.length);
      if (siswaRes.data?.data?.length > 0) {
        console.log('Sample Absen Siswa Item:', siswaRes.data.data[0]);
      }
    } catch (e) {
      console.log('GET /api/attendance/sesi-absensi/{id}/absen-siswa Error:', e.response?.status, e.response?.data);
    }

    // 4. Test Tap NIS/NISN to Session: POST /api/attendance/sesi-absensi/{id}/tap-siswa
    try {
      const tapRes = await axios.post(`http://10.10.10.250:3004/api/attendance/sesi-absensi/${activeSesi.id}/tap-siswa`, {
        siswa_id: '2526100115' // Testing raw NIS/NISN or siswa_id
      }, { headers });
      console.log('POST /api/attendance/sesi-absensi/{id}/tap-siswa Status:', tapRes.status, tapRes.data);
    } catch (e) {
      console.log('POST /api/attendance/sesi-absensi/{id}/tap-siswa Error:', e.response?.status, e.response?.data);
    }
  }
}

debugSesiDialog().catch(console.error);
