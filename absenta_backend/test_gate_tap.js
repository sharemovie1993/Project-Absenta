const axios = require('axios');

async function testGateTap() {
  console.log('=== TESTING GATE TAP ENDPOINT (POST /api/attendance/gerbang/tap) ===');

  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: 'suhermat@gmail.com', password: 'admin1234'
  });
  const token = loginRes.data?.data?.token;
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  console.log('Petugas Gerbang Logged In:', loginRes.data?.data?.user?.nama_lengkap);

  // 1. Test Gate Tap with NIS "2526100115"
  try {
    const tapNisRes = await axios.post('http://10.10.10.250:3004/api/attendance/gerbang/tap', {
      siswa_id: '2526100115',
      token: '2526100115',
      arah: 'GERBANG_DATANG'
    }, { headers });
    console.log('✅ Gate Tap with NIS "2526100115" Status:', tapNisRes.status, 'Response:', JSON.stringify(tapNisRes.data, null, 2));
  } catch (e) {
    console.log('❌ Gate Tap with NIS Error:', e.response?.status, e.response?.data);
  }

  // 2. Test Gate Tap with Student UUID "7c60f896-259b-46b4-b7b1-af89bb294732"
  try {
    const tapUuidRes = await axios.post('http://10.10.10.250:3004/api/attendance/gerbang/tap', {
      siswa_id: '7c60f896-259b-46b4-b7b1-af89bb294732',
      token: '7c60f896-259b-46b4-b7b1-af89bb294732',
      arah: 'GERBANG_DATANG'
    }, { headers });
    console.log('✅ Gate Tap with UUID Status:', tapUuidRes.status, 'Response:', JSON.stringify(tapUuidRes.data, null, 2));
  } catch (e) {
    console.log('❌ Gate Tap with UUID Error:', e.response?.status, e.response?.data);
  }
}

testGateTap().catch(console.error);
