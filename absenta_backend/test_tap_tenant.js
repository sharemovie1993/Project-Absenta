const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');

async function testTapTenant() {
  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';

  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: 'ajeng@gmail.com',
    identifier: 'ajeng@gmail.com',
    password: 'admin1234'
  });

  const token = loginRes.data?.data?.token;
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  const siswa = await prisma.siswa.findFirst({
    where: { tenant_id: tenantId, status: 'AKTIF' },
    select: { id: true, nama_siswa: true, nis: true }
  });

  console.log('Testing Tap for Siswa:', siswa.nama_siswa, siswa.id);

  // Check if we can search student by NIS / NISN / RFID in backend:
  const searchSiswa = await prisma.siswa.findFirst({
    where: {
      tenant_id: tenantId,
      OR: [
        { nis: siswa.nis },
        { nisn: siswa.nis },
        { no_rfid: siswa.nis }
      ]
    },
    include: { Kelas: true }
  });

  console.log('Search Student by Scan Code Result:', searchSiswa ? searchSiswa.nama_siswa : 'NOT FOUND');

  const tapRes = await axios.post('http://10.10.10.250:3004/api/attendance/gerbang/bypass', {
    siswa_id: siswa.id,
    note: 'Tap Gerbang RFID'
  }, { headers });

  console.log('✅ BYPASS TAP SUCCESS! Status:', tapRes.status);
  console.log('TAP DATA:', JSON.stringify(tapRes.data, null, 2));
}

testTapTenant()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
