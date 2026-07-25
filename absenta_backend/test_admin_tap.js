const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAdminTap() {
  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: 'smp5@gmail.com',
    identifier: 'smp5@gmail.com',
    password: 'admin1234'
  });

  const token = loginRes.data?.data?.token;
  const tenantId = loginRes.data?.data?.user?.tenant_id;
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  const siswa = await prisma.siswa.findFirst({
    where: { status: 'AKTIF' },
    select: { id: true, nama_siswa: true, nis: true }
  });

  console.log('Testing Tap for Siswa:', siswa.nama_siswa, siswa.id);

  const tapRes = await axios.post('http://10.10.10.250:3004/api/attendance/gerbang/tap', {
    siswa_id: siswa.id,
    arah: 'GERBANG_DATANG',
    rfid: siswa.nis
  }, { headers });

  console.log('Tap Response Status:', tapRes.status);
  console.log('Tap Response Data:', JSON.stringify(tapRes.data, null, 2));
}

testAdminTap()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
