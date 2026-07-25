const axios = require('axios');

async function testGerbangStats() {
  console.log('=== TESTING GERBANG STATS BACKEND ===');

  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: '2526100115', identifier: '2526100115', password: '11223344'
  });
  const headers = { 'Authorization': `Bearer ${loginRes.data?.data?.token}`, 'x-tenant-id': tenantId };

  const statsRes = await axios.get('http://10.10.10.250:3004/api/attendance/gerbang/stats?kelas_id=99c4545f-76ca-41ee-a502-77fcd58b9875', { headers });
  console.log('Stats Response:', statsRes.data);
}

testGerbangStats().catch(console.error);
