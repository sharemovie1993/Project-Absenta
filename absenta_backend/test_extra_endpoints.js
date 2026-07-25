const axios = require('axios');

async function testExtraEndpoints() {
  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: 'ajeng@gmail.com',
    identifier: 'ajeng@gmail.com',
    password: 'admin1234'
  });

  const token = loginRes.data?.data?.token;
  const tenantId = loginRes.data?.data?.user?.tenant_id;
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  console.log('=== TESTING EXTRA MASTER ENDPOINTS ===');

  const testList = [
    '/api/academic/guru',
    '/api/academic/jurusan',
    '/api/academic/tahun-pelajaran',
    '/api/academic/semester'
  ];

  for (const ep of testList) {
    try {
      const res = await axios.get(`http://10.10.10.250:3004${ep}`, { headers });
      console.log(`✅ [FOUND] GET ${ep}: Status`, res.status, 'Count:', Array.isArray(res.data?.data) ? res.data.data.length : typeof res.data?.data);
      if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
        console.log(' Sample item:', JSON.stringify(res.data.data[0], null, 2));
      }
    } catch (e) {
      console.log(`❌ [ERR] GET ${ep}:`, e.response?.status, e.response?.data?.message || e.message);
    }
  }
}

testExtraEndpoints().catch(console.error);
