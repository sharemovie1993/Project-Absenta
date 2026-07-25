const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSesiOps() {
  console.log('=== TESTING SESI ABSENSI OPS ENDPOINTS ===');

  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: 'ajeng@gmail.com',
    identifier: 'ajeng@gmail.com',
    password: 'admin1234'
  });

  const token = loginRes.data?.data?.token;
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  // 1. List Sesi
  const listRes = await axios.get('http://10.10.10.250:3004/api/attendance/sesi-absensi', { headers });
  console.log('1. List Sesi Status:', listRes.status, 'Count:', listRes.data?.data?.length);

  let sesiId = listRes.data?.data?.[0]?.id;

  if (!sesiId) {
    // Get a class ID
    const kelas = await prisma.kelas.findFirst({ where: { tenant_id: tenantId } });
    const createRes = await axios.post('http://10.10.10.250:3004/api/attendance/sesi-absensi', {
      nama_sesi: 'KBM Sesi Pagi',
      tanggal: '2026-07-24',
      kelas_id: kelas.id
    }, { headers });
    console.log('2. Created New Sesi:', createRes.status, createRes.data?.data?.id);
    sesiId = createRes.data?.data?.id;
  }

  // 3. Detail Sesi
  if (sesiId) {
    const detailRes = await axios.get(`http://10.10.10.250:3004/api/attendance/sesi-absensi/${sesiId}`, { headers });
    console.log('3. Sesi Detail Status:', detailRes.status, 'Nama Sesi:', detailRes.data?.data?.nama_sesi);
  }
}

testSesiOps()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
