const axios = require('axios');

async function testPetugasCheck() {
  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: '2526100115',
    identifier: '2526100115',
    password: '11223344'
  });

  const token = loginRes.data?.data?.token || loginRes.data?.data?.accessToken;
  const tenantId = loginRes.data?.data?.user?.tenantId || 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  const checkRes = await axios.get('http://10.10.10.250:3004/api/attendance/sesi-absensi/petugas/check', { headers });
  console.log('Petugas Check Data:', JSON.stringify(checkRes.data, null, 2));
}

testPetugasCheck().catch(console.error);
