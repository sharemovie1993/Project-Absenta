const axios = require('axios');

async function testJsonStructure() {
  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: 'ajeng@gmail.com',
    identifier: 'ajeng@gmail.com',
    password: 'admin1234'
  });

  const token = loginRes.data?.data?.token;
  const tenantId = loginRes.data?.data?.user?.tenant_id;
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  console.log('=== 1. KELAS ITEM SAMPLE ===');
  const resKelas = await axios.get('http://10.10.10.250:3004/api/academic/kelas', { headers });
  console.log(JSON.stringify(resKelas.data?.data?.[0], null, 2));

  console.log('\n=== 2. MAPEL ITEM SAMPLE ===');
  const resMapel = await axios.get('http://10.10.10.250:3004/api/academic/mapel', { headers });
  console.log(JSON.stringify(resMapel.data?.data?.[0], null, 2));

  console.log('\n=== 3. JENIS PELANGGARAN ITEM SAMPLE ===');
  const resPelanggaran = await axios.get('http://10.10.10.250:3004/api/kesiswaan/jenis-pelanggaran', { headers });
  console.log(JSON.stringify(resPelanggaran.data?.data?.[0], null, 2));

  console.log('\n=== 4. SISWA ITEM SAMPLE ===');
  const resSiswa = await axios.get('http://10.10.10.250:3004/api/academic/siswa', { headers });
  console.log(JSON.stringify(resSiswa.data?.data?.[0], null, 2));
}

testJsonStructure().catch(console.error);
