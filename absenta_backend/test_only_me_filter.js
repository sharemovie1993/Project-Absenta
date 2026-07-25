const axios = require('axios');

async function testOnlyMeFilter() {
  console.log('====================================================');
  console.log('=== TEST SUITE: FILTER SESI SAYA (only_me=true) ===');
  console.log('====================================================\n');

  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';

  // 1. Login as aher@gmail.com
  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: 'aher@gmail.com', password: 'admin1234'
  });
  const token = loginRes.data?.data?.token;
  const user = loginRes.data?.data?.user;
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  console.log('✅ 1. Login Success:', {
    user_id: user?.id,
    email: user?.email,
    role: user?.Role?.name || user?.role
  });

  // Get aher's guru record ID
  const guruRes = await axios.get('http://10.10.10.250:3004/api/academic/guru?limit=1000', { headers });
  const aherGuruRecord = (guruRes.data?.data || []).find(g => g.user_id === user?.id || g.nama_guru?.toLowerCase().includes('aher') || g.email === 'aher@gmail.com');
  console.log('✅ Aher Guru Record:', {
    id: aherGuruRecord?.id,
    nama_guru: aherGuruRecord?.nama_guru,
    user_id: aherGuruRecord?.user_id
  });

  // 2. Fetch Sesi WITHOUT filter (only_me not set)
  const allSesiRes = await axios.get('http://10.10.10.250:3004/api/attendance/sesi-absensi?summary=true', { headers });
  const allSesi = allSesiRes.data?.data || [];
  console.log(`\n📋 2. GET /api/attendance/sesi-absensi (WITHOUT FILTER): ${allSesi.length} total sessions returned`);

  // 3. Fetch Sesi WITH filter only_me=true
  const onlyMeRes = await axios.get('http://10.10.10.250:3004/api/attendance/sesi-absensi?summary=true&only_me=true', { headers });
  const onlyMeSesi = onlyMeRes.data?.data || [];
  console.log(`\n📋 3. GET /api/attendance/sesi-absensi?only_me=true: ${onlyMeSesi.length} sessions returned`);
  console.log('Sample Guru IDs in response:', onlyMeSesi.slice(0, 5).map(s => ({
    sesi_id: s.id,
    guru_id: s.guru_id,
    guru_nama: s.guru_nama || s.Guru?.nama_guru,
    nama_sesi: s.namaSesi || s.Mapel?.nama_mapel
  })));

  // Verification check: All sessions in onlyMeSesi MUST have guru_id === aherGuruRecord.id
  const nonAher = onlyMeSesi.filter(s => s.guru_id !== aherGuruRecord?.id);
  if (nonAher.length === 0) {
    console.log('\n🎉🎉🎉 VERIFICATION PASSED: ALL 100% SESSIONS BELONG TO AHER!');
  } else {
    console.log(`\n❌ VERIFICATION FAILED: Found ${nonAher.length} sessions belonging to other teachers!`);
  }
}

testOnlyMeFilter().catch(console.error);
