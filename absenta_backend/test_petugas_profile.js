const axios = require('axios');

async function testPetugasProfile() {
  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: '2526100115',
    identifier: '2526100115',
    password: '11223344'
  });

  const token = loginRes.data?.data?.token || loginRes.data?.data?.accessToken;
  const tenantId = loginRes.data?.data?.user?.tenantId || 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  const meRes = await axios.get('http://10.10.10.250:3004/api/auth/me', { headers });
  console.log('meRes.data:', JSON.stringify(meRes.data, null, 2));
}

testPetugasProfile().catch(console.error);
