const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCekManual() {
  console.log('=== TESTING CEK MANUAL GERBANG ENDPOINTS ===');

  const tenantId = 'c2998880-ef62-43b7-8c85-2cc855a84d26';
  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: 'ajeng@gmail.com',
    identifier: 'ajeng@gmail.com',
    password: 'admin1234'
  });

  const token = loginRes.data?.data?.token;
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  // 1. Get Not Present Students (Cek Manual List)
  const notPresentRes = await axios.get('http://10.10.10.250:3004/api/attendance/gerbang/not-present', { headers });
  console.log('1. Not Present Students Status:', notPresentRes.status, 'Count:', notPresentRes.data?.data?.length);
  if (notPresentRes.data?.data?.length > 0) {
    console.log('First student:', notPresentRes.data.data[0]);
  }
}

testCekManual()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
