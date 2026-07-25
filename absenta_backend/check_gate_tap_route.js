const axios = require('axios');

async function testGateTapRoutes() {
  console.log('=== TESTING GATE TAP ENDPOINTS IN ABSENTA_BACKEND ===');
  
  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: 'ajeng@gmail.com',
    identifier: 'ajeng@gmail.com',
    password: 'admin1234'
  });

  const token = loginRes.data?.data?.token;
  const tenantId = loginRes.data?.data?.user?.tenant_id;
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  const endpoints = [
    '/api/attendance/gerbang/tap',
    '/api/attendance/tap-gerbang',
    '/api/attendance/tap-siswa',
    '/api/attendance/tap'
  ];

  for (const ep of endpoints) {
    try {
      const res = await axios.post(`http://10.10.10.250:3004${ep}`, {
        identifier: '2526100001', // NIS / NISN / RFID
        nisn: '2526100001',
        type: 'AUTO'
      }, { headers });
      console.log(`✅ [FOUND] POST ${ep}:`, res.status, res.data);
    } catch (e) {
      console.log(`❌ [ERR] POST ${ep}:`, e.response?.status, e.response?.data?.message || e.message);
    }
  }
}

testGateTapRoutes().catch(console.error);
