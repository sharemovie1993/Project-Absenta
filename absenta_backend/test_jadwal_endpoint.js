const axios = require('axios');

async function testJadwalEndpoint() {
  console.log('=== TESTING JADWAL KBM ENDPOINTS ===');

  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';

  // 1. Test Siswa/Petugas Kelas
  const pkLogin = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: '2526100115', identifier: '2526100115', password: '11223344'
  });
  const pkHeaders = { 'Authorization': `Bearer ${pkLogin.data?.data?.token}`, 'x-tenant-id': tenantId };

  const resSiswaMy = await axios.get('http://10.10.10.250:3004/api/kurikulum/jadwal-kbm/my', { headers: pkHeaders });
  console.log('Siswa /my schedule count:', resSiswaMy.data?.data?.length);

  // 2. Test Guru
  const guruLogin = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: 'ai@gmail.com', identifier: 'ai@gmail.com', password: 'admin1234'
  });
  const guruHeaders = { 'Authorization': `Bearer ${guruLogin.data?.data?.token}`, 'x-tenant-id': tenantId };

  const resGuruMy = await axios.get('http://10.10.10.250:3004/api/kurikulum/jadwal-kbm/my', { headers: guruHeaders });
  console.log('Guru /my schedule count:', resGuruMy.data?.data?.length);
  if (resGuruMy.data?.data?.length > 0) {
    console.log('Guru Schedule 0:', resGuruMy.data.data[0]);
  }
}

testJadwalEndpoint().catch(console.error);
