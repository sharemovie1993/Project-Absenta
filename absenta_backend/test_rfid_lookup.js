const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');

async function testRfidLookup() {
  console.log('=== SEARCHING FOR SISWA BY NIS / NISN / RFID ===');
  
  // Find a student in DB
  const siswa = await prisma.siswa.findFirst({
    where: { status: 'AKTIF' },
    select: { id: true, nama_siswa: true, nis: true, nisn: true, no_rfid: true }
  });

  console.log('Found Siswa Sample:', siswa);

  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: 'ajeng@gmail.com',
    identifier: 'ajeng@gmail.com',
    password: 'admin1234'
  });

  const token = loginRes.data?.data?.token;
  const tenantId = loginRes.data?.data?.user?.tenant_id;
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  if (siswa) {
    const tapRes = await axios.post('http://10.10.10.250:3004/api/attendance/gerbang/tap', {
      siswa_id: siswa.id,
      arah: 'GERBANG_DATANG',
      rfid: siswa.nis || '2526100001'
    }, { headers });

    console.log('Tap Response Status:', tapRes.status);
    console.log('Tap Response Data:', tapRes.data);
  }
}

testRfidLookup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
