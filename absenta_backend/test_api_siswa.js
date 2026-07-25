const axios = require('axios');

async function testFullApi() {
  try {
    console.log('=== LOGIN AS SISWA 2526100001 ===');
    const res = await axios.post('http://10.10.10.250:3004/api/auth/login', {
      email: '2526100001',
      identifier: '2526100001',
      password: '11223344'
    });

    const data = res.data?.data;
    const token = data?.token;
    const refreshToken = data?.refreshToken;
    const tenantId = data?.user?.tenant_id;
    const user = data?.user;

    console.log('✅ LOGIN SUCCESS!');
    console.log('User Name:', user.full_name);
    console.log('Token extracted:', token ? token.substring(0, 25) + '...' : 'MISSING');
    console.log('Tenant ID extracted:', tenantId);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    };

    // 1. GET /api/auth/me
    console.log('\n--- 1. TESTING GET /api/auth/me ---');
    try {
      const meRes = await axios.get('http://10.10.10.250:3004/api/auth/me', { headers });
      console.log('ME RESULT Status:', meRes.status);
      console.log('ME DATA:', JSON.stringify(meRes.data, null, 2));
    } catch (err) {
      console.log('ME ERROR:', err.response?.status, err.response?.data || err.message);
    }

    // 2. GET /api/attendance/rekap/siswa/me/bulanan
    console.log('\n--- 2. TESTING GET /api/attendance/rekap/siswa/me/bulanan ---');
    try {
      const rekapRes = await axios.get('http://10.10.10.250:3004/api/attendance/rekap/siswa/me/bulanan?bulan=2026-07', { headers });
      console.log('REKAP RESULT Status:', rekapRes.status);
      console.log('REKAP DATA:', JSON.stringify(rekapRes.data, null, 2));
    } catch (err) {
      console.log('REKAP ERROR:', err.response?.status, err.response?.data || err.message);
    }

    // 3. GET /api/kesiswaan/pelanggaran
    console.log('\n--- 3. TESTING GET /api/kesiswaan/pelanggaran ---');
    try {
      const poinRes = await axios.get('http://10.10.10.250:3004/api/kesiswaan/pelanggaran', { headers });
      console.log('POIN RESULT Status:', poinRes.status);
      console.log('POIN DATA:', JSON.stringify(poinRes.data, null, 2));
    } catch (err) {
      console.log('POIN ERROR:', err.response?.status, err.response?.data || err.message);
    }

    // 4. GET /api/academic/my-schedule
    console.log('\n--- 4. TESTING GET /api/academic/my-schedule ---');
    try {
      const scheduleRes = await axios.get('http://10.10.10.250:3004/api/academic/my-schedule', { headers });
      console.log('SCHEDULE RESULT Status:', scheduleRes.status);
      console.log('SCHEDULE DATA:', JSON.stringify(scheduleRes.data, null, 2));
    } catch (err) {
      console.log('SCHEDULE ERROR:', err.response?.status, err.response?.data || err.message);
    }

  } catch (err) {
    console.error('TEST ERROR:', err.response?.status, err.response?.data || err.message);
  }
}

testFullApi();
