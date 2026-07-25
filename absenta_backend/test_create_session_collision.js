const axios = require('axios');

async function testCreateSessionCollision() {
  console.log('=== TESTING MANUAL SESSION CREATION WITH DD/MM/YYYY FORMAT ===');

  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const loginRes = await axios.post('http://localhost:3004/api/auth/login', {
    email: 'neple@gmail.com', password: 'admin1234'
  });
  const token = loginRes.data?.data?.token;
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  // 1. Get a valid guru_id
  const guruRes = await axios.get('http://localhost:3004/api/academic/guru?limit=1', { headers });
  const validGuruId = guruRes.data?.data?.[0]?.id;

  // 2. Test sending DD/MM/YYYY date format as seen in screenshot: "24/07/2026"
  console.log('Testing payload with DD/MM/YYYY date format...');
  try {
    const res = await axios.post('http://localhost:3004/api/attendance/sesi-absensi', {
      kelas_id: '99c4545f-76ca-41ee-a502-77fcd58b9875',
      guru_id: validGuruId,
      jenis_kegiatan: 'KBM',
      tanggal: '24/07/2026',
      waktu_mulai: '24/07/2026 08:09',
      waktu_selesai: '24/07/2026 09:10'
    }, { headers });
    console.log('🎉🎉🎉 SUCCESS! Response Status:', res.status, 'Data:', res.data);
  } catch (e) {
    console.log('❌ Error Status:', e.response?.status, 'Data:', e.response?.data);
  }
}

testCreateSessionCollision().catch(console.error);
