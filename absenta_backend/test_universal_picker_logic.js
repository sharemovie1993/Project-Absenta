const axios = require('axios');

async function testUniversalPickerLogic() {
  console.log('=== TESTING UNIVERSAL SMART STUDENT PICKER LOGIC (PETUGAS GERBANG) ===');

  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: 'suhermat@gmail.com', password: 'admin1234'
  });
  const token = loginRes.data?.data?.token;
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  console.log('Petugas Gerbang Token Acquired');

  // Test 1: Search by NIS "2526100115"
  const nisRes = await axios.get('http://10.10.10.250:3004/api/academic/universal-search?q=2526100115', { headers });
  console.log('Search Results for 2526100115:', nisRes.data?.data?.map(d => ({ name: d.name, nis: d.identifier, kelas: d.kelas, id: d.id })));

  const studentMatch = nisRes.data?.data?.[0];
  if (studentMatch) {
    // Gate Tap with Petugas Gerbang token
    const tapRes = await axios.post('http://10.10.10.250:3004/api/attendance/gerbang/tap', {
      siswa_id: studentMatch.id,
      token: studentMatch.identifier,
      arah: 'GERBANG_DATANG'
    }, { headers });
    console.log('🎉🎉🎉 Gate Tap SUCCESS! Status:', tapRes.status, 'Message:', tapRes.data?.message, 'Siswa:', tapRes.data?.data?.siswa_info);
  }
}

testUniversalPickerLogic().catch(console.error);
