const axios = require('axios');

async function testAll10Points() {
  console.log('=== TESTING ALL 10 OPERATIONAL POINTS ===');

  // 1. Test Petugas Kelas Login (2526100115 / 11223344)
  const pkLogin = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: '2526100115', identifier: '2526100115', password: '11223344'
  });
  const pkToken = pkLogin.data?.data?.token || pkLogin.data?.data?.accessToken;
  const tenantId = pkLogin.data?.data?.user?.tenantId || 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const pkHeaders = { 'Authorization': `Bearer ${pkToken}`, 'x-tenant-id': tenantId };

  // 2. Test Petugas Gerbang Login (suhermat@gmail.com / admin1234)
  const pgLogin = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: 'suhermat@gmail.com', identifier: 'suhermat@gmail.com', password: 'admin1234'
  });
  const pgToken = pgLogin.data?.data?.token || pgLogin.data?.data?.accessToken;
  const pgHeaders = { 'Authorization': `Bearer ${pgToken}`, 'x-tenant-id': tenantId };

  // 3. Test Guru Login (ai@gmail.com / admin1234)
  const guruLogin = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: 'ai@gmail.com', identifier: 'ai@gmail.com', password: 'admin1234'
  });
  const guruToken = guruLogin.data?.data?.token || guruLogin.data?.data?.accessToken;
  const guruHeaders = { 'Authorization': `Bearer ${guruToken}`, 'x-tenant-id': tenantId };

  console.log('--- 1. Testing Petugas Check & Managed Class ---');
  const checkRes = await axios.get('http://10.10.10.250:3004/api/attendance/sesi-absensi/petugas/check', { headers: pkHeaders });
  console.log('Petugas Check:', checkRes.data?.data);
  const kelasId = checkRes.data?.data?.managed_kelas_ids?.[0];

  console.log('--- 2. Testing Not Present Students & NIS/NISN ---');
  const notPresentRes = await axios.get(`http://10.10.10.250:3004/api/attendance/gerbang/not-present?kelas_id=${kelasId}`, { headers: pkHeaders });
  console.log('Not Present count:', notPresentRes.data?.data?.length);
  if (notPresentRes.data?.data?.length > 0) {
    const s = notPresentRes.data.data[0];
    console.log('Student 0:', s.nama_siswa, 'nis:', s.nis, 'nisn:', s.nisn, 'nis property keys:', Object.keys(s));
  }

  console.log('--- 3. Testing Present / Siap Belajar Count via Guru ---');
  const presentRes = await axios.get(`http://10.10.10.250:3004/api/attendance/gerbang/present?kelas_id=${kelasId}`, { headers: guruHeaders });
  console.log('Present count:', presentRes.data?.data?.length);

  console.log('--- 4. Testing SmartStudentPicker Gerbang Tap via Petugas Gerbang ---');
  const searchSiswa = await axios.get('http://10.10.10.250:3004/api/academic/siswa?search=SYARIF', { headers: pgHeaders });
  const syarif = searchSiswa.data?.data?.[0];
  console.log('Resolved Syarif ID:', syarif?.id);

  if (syarif) {
    const tapRes = await axios.post('http://10.10.10.250:3004/api/attendance/gerbang/tap', {
      siswa_id: syarif.id, arah: 'GERBANG_DATANG'
    }, { headers: pgHeaders });
    console.log('Gerbang Tap Status:', tapRes.status, 'Message:', tapRes.data?.message);
  }

  console.log('--- 5. Testing Profile Photo URL ---');
  const meRes = await axios.get('http://10.10.10.250:3004/api/auth/me', { headers: pkHeaders });
  console.log('Profile Photo URL:', meRes.data?.data?.photo_url, meRes.data?.data?.foto_url);

  console.log('--- 6. Testing Schedule Endpoint for Guru & Siswa ---');
  const scheduleGuru = await axios.get('http://10.10.10.250:3004/api/academic/schedules', { headers: guruHeaders });
  console.log('Guru Schedule count:', scheduleGuru.data?.data?.length);

  const scheduleSiswa = await axios.get('http://10.10.10.250:3004/api/academic/schedules', { headers: pkHeaders });
  console.log('Siswa Schedule count:', scheduleSiswa.data?.data?.length);
}

testAll10Points().catch(console.error);
