const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');

async function testReferenceEndpoints() {
  console.log('=== TESTING MASTER REFERENCE ENDPOINTS IN ABSENTA_BACKEND ===');
  
  const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
    email: 'ajeng@gmail.com',
    identifier: 'ajeng@gmail.com',
    password: 'admin1234'
  });

  const token = loginRes.data?.data?.token;
  const tenantId = loginRes.data?.data?.user?.tenant_id;
  const headers = { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId };

  // 1. Check Kelas Endpoint
  const kelasEndpoints = [
    '/api/academic/kelas',
    '/api/sekolah/kelas',
    '/api/kelas'
  ];
  for (const ep of kelasEndpoints) {
    try {
      const res = await axios.get(`http://10.10.10.250:3004${ep}`, { headers });
      console.log(`✅ [FOUND] GET ${ep}:`, res.status, 'Items:', Array.isArray(res.data?.data) ? res.data.data.length : typeof res.data?.data);
    } catch (e) {
      console.log(`❌ [404/ERR] GET ${ep}:`, e.response?.status);
    }
  }

  // 2. Check Mapel Endpoint
  const mapelEndpoints = [
    '/api/academic/mapel',
    '/api/sekolah/mapel',
    '/api/mapel'
  ];
  for (const ep of mapelEndpoints) {
    try {
      const res = await axios.get(`http://10.10.10.250:3004${ep}`, { headers });
      console.log(`✅ [FOUND] GET ${ep}:`, res.status, 'Items:', Array.isArray(res.data?.data) ? res.data.data.length : typeof res.data?.data);
    } catch (e) {
      console.log(`❌ [404/ERR] GET ${ep}:`, e.response?.status);
    }
  }

  // 3. Check Jenis Pelanggaran Endpoint
  const pelanggaranEndpoints = [
    '/api/kesiswaan/jenis-pelanggaran',
    '/api/kesiswaan/pelanggaran/jenis',
    '/api/pelanggaran/jenis'
  ];
  for (const ep of pelanggaranEndpoints) {
    try {
      const res = await axios.get(`http://10.10.10.250:3004${ep}`, { headers });
      console.log(`✅ [FOUND] GET ${ep}:`, res.status, 'Items:', Array.isArray(res.data?.data) ? res.data.data.length : typeof res.data?.data);
    } catch (e) {
      console.log(`❌ [404/ERR] GET ${ep}:`, e.response?.status);
    }
  }

  // 4. Check Siswa Endpoint
  const siswaEndpoints = [
    '/api/academic/siswa',
    '/api/sekolah/siswa',
    '/api/siswa'
  ];
  for (const ep of siswaEndpoints) {
    try {
      const res = await axios.get(`http://10.10.10.250:3004${ep}`, { headers });
      console.log(`✅ [FOUND] GET ${ep}:`, res.status, 'Items:', Array.isArray(res.data?.data) ? res.data.data.length : typeof res.data?.data);
    } catch (e) {
      console.log(`❌ [404/ERR] GET ${ep}:`, e.response?.status);
    }
  }
}

testReferenceEndpoints()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
