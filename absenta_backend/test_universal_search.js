const axios = require('axios');

async function testUniversalSearch() {
  console.log('=== TESTING UNIVERSAL SEARCH ENDPOINT ===');

  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: '2526100115', identifier: '2526100115', password: '11223344'
  });
  const token = loginRes.data?.data?.token;
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  // 1. Test searching NIS 2526100115
  try {
    const res = await axios.get('http://10.10.10.250:3004/api/academic/universal-search?q=2526100115', { headers });
    console.log('GET /api/academic/universal-search?q=2526100115 Status:', res.status);
    console.log('Data:', JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.log('Universal Search Error:', e.response?.status, e.response?.data);
  }
}

testUniversalSearch().catch(console.error);
