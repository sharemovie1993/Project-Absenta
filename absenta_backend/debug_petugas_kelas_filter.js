const axios = require('axios');

async function debugPetugasFilter() {
  console.log('=== DEBUGGING PETUGAS KELAS KELAS_ID FILTER ===');

  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: '2526100115',
    identifier: '2526100115',
    password: '11223344'
  });

  const token = loginRes.data?.data?.token || loginRes.data?.data?.accessToken;
  const tenantId = loginRes.data?.data?.user?.tenantId || 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  const meRes = await axios.get('http://10.10.10.250:3004/api/auth/me', { headers });
  console.log('meRes data:', meRes.data?.data?.siswa_id, meRes.data?.data?.Siswa);

  // If siswa_id is present, get student detail to find kelas_id
  const siswaId = meRes.data?.data?.siswa_id;
  if (siswaId) {
    const studentRes = await axios.get(`http://10.10.10.250:3004/api/academic/siswa/${siswaId}`, { headers });
    console.log('Student Detail status:', studentRes.status, 'Kelas:', studentRes.data?.data?.kelas_id, studentRes.data?.data?.Kelas?.nama_kelas);

    const notPresentRes = await axios.get(`http://10.10.10.250:3004/api/attendance/gerbang/not-present?kelas_id=${studentRes.data?.data?.kelas_id}`, { headers });
    console.log('Not Present count with kelas_id:', notPresentRes.data?.data?.length);
  }
}

debugPetugasFilter().catch(console.error);
