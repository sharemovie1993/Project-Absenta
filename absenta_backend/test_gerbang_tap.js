const axios = require('axios');

async function testGerbangTapActive() {
  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: 'suhermat@gmail.com',
    identifier: 'suhermat@gmail.com',
    password: 'admin1234'
  });

  const token = loginRes.data?.data?.token || loginRes.data?.data?.accessToken;
  const tenantId = loginRes.data?.data?.user?.tenantId || 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  // Search active student "A. SYARIF HIDAYAT"
  const searchRes = await axios.get('http://10.10.10.250:3004/api/academic/siswa?search=SYARIF', { headers });
  console.log('Search Result:', searchRes.data?.data);

  const activeStudent = searchRes.data?.data?.[0];
  if (activeStudent) {
    const tapRes = await axios.post('http://10.10.10.250:3004/api/attendance/gerbang/tap', {
      siswa_id: activeStudent.id,
      arah: 'GERBANG_DATANG'
    }, { headers });
    console.log('Tap Result Status:', tapRes.status, 'Data:', tapRes.data);
  }
}

testGerbangTapActive().catch(console.error);
