const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findPetugasNotPresent() {
  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: '2526100115',
    identifier: '2526100115',
    password: '11223344'
  });

  const token = loginRes.data?.data?.token || loginRes.data?.data?.accessToken;
  const tenantId = loginRes.data?.data?.user?.tenantId || 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  const notPresentRes = await axios.get(`http://10.10.10.250:3004/api/attendance/gerbang/not-present?kelas_id=99c4545f-76ca-41ee-a502-77fcd58b9875`, { headers });
  console.log('Not Present Count for X TE 4:', notPresentRes.data?.data?.length);
  if (notPresentRes.data?.data?.length > 0) {
    console.log('Students in class X TE 4:', notPresentRes.data.data.map(s => s.nama_siswa));
  }
}

findPetugasNotPresent().finally(() => prisma.$disconnect());
