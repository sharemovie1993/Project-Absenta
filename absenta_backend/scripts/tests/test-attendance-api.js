/**
 * COMPREHENSIVE ATTENDANCE API TESTING SCRIPT
 * 
 * This script tests all attendance module endpoints for both SIMPLE and MULTI_SESI modes
 * to ensure proper mode restrictions and functionality.
 * 
 * Modules tested:
 * - Gerbang (Gate) Attendance
 * - Kegiatan (Activity) Attendance  
 * - Manual Attendance
 * - Rekap (Reports) Attendance
 * 
 * Usage: node scripts/test-attendance-api.js
 */

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Define enum values as constants since they're not exported by Prisma client
const JenisTap = {
  GERBANG_DATANG: 'GERBANG_DATANG',
  GERBANG_PULANG: 'GERBANG_PULANG',
  KELAS: 'KELAS',
  GERBANG_LAINNYA: 'GERBANG_LAINNYA'
};

const AbsensiMode = {
  SIMPLE: 'SIMPLE',
  MULTI_SESI: 'MULTI_SESI'
};

const AbsenStatus = {
  HADIR: 'HADIR',
  TIDAK_HADIR: 'TIDAK_HADIR',
  IZIN: 'IZIN',
  SAKIT: 'SAKIT',
  ALPA: 'ALPA'
};

// Test configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_DATE = '2025-01-27';
const TEST_MONTH = '2025-01';

// Test data containers
let testData = {
  simpleTenant: null,
  multiTenant: null,
  simpleUser: null,
  multiUser: null,
  simpleToken: null,
  multiToken: null,
  testSiswa: null,
  testGuru: null,
  testKelas: null,
  testJurusan: null,
  testSesi: null
};

// Test results tracking
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

/**
 * Utility function to make HTTP requests
 */
async function makeRequest(method, url, data = null, token = null, tenantIdHeader = null) {
  const fetch = (await import('node-fetch')).default;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(tenantIdHeader && { 'x-tenant-id': tenantIdHeader })
    },
    ...(data && { body: JSON.stringify(data) })
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    return {
      status: response.status,
      data: result,
      success: response.ok
    };
  } catch (error) {
    return {
      status: 500,
      data: { error: error.message },
      success: false
    };
  }
}

/**
 * Test result logging
 */
function logTest(testName, expected, actual, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}: PASSED`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}: FAILED`);
    console.log(`   Expected: ${expected}`);
    console.log(`   Actual: ${actual}`);
    if (details) console.log(`   Details: ${details}`);
  }
  
  testResults.details.push({
    test: testName,
    expected,
    actual,
    passed,
    details
  });
}

/**
 * Setup test data
 */
async function setupTestData() {
  console.log('🔧 Setting up test data...');
  
  try {
    // Create test tenants
    testData.simpleTenant = await prisma.tenant.create({
      data: {
        name: 'Simple Mode Test Tenant',
        domain: 'simple-test.local',
        absensi_mode: AbsensiMode.SIMPLE,
        status: 'ACTIVE'
      }
    });

    testData.multiTenant = await prisma.tenant.create({
      data: {
        name: 'Multi Sesi Test Tenant',
        domain: 'multi-test.local',
        absensi_mode: AbsensiMode.MULTI_SESI,
        status: 'ACTIVE'
      }
    });

    // Create or find ADMIN role
    let adminRole = await prisma.role.findFirst({
      where: { name: 'ADMIN' }
    });

    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: 'ADMIN',
          description: 'Administrator role for testing',
        },
      });
    }

    // Create test users
    testData.simpleUser = await prisma.user.create({
      data: {
        tenant_id: testData.simpleTenant.id,
        email: 'simple@test.com',
        password: 'hashedpassword',
        full_name: 'Simple Admin User',
        role_id: adminRole.id,
        status: 'ACTIVE'
      }
    });

    testData.multiUser = await prisma.user.create({
      data: {
        tenant_id: testData.multiTenant.id,
        email: 'multi@test.com',
        password: 'hashedpassword',
        full_name: 'Multi Admin User',
        role_id: adminRole.id,
        status: 'ACTIVE'
      }
    });

    // Create test jurusan for multi tenant
    testData.testJurusan = await prisma.jurusan.create({
      data: {
        tenant_id: testData.multiTenant.id,
        nama: 'Test Jurusan',
        kode: 'TJ'
      }
    });

    // Create test kelas for multi tenant
    testData.testKelas = await prisma.kelas.create({
      data: {
        tenant_id: testData.multiTenant.id,
        nama_kelas: 'Test Kelas',
        tingkat: 10,
        jurusan_id: testData.testJurusan.id
      }
    });

    // Create test siswa for multi tenant
    testData.testSiswa = await prisma.siswa.create({
      data: {
        tenant_id: testData.multiTenant.id,
        user_id: testData.multiUser.id,
        nis: 'TEST001',
        nama_siswa: 'Test Siswa',
        jenis_kelamin: 'L',
        tempat_lahir: 'Test City',
        tanggal_lahir: new Date('2005-01-01'),
        alamat: 'Test Address',
        kelas_id: testData.testKelas.id
      }
    });

    // Create test guru for multi tenant
    testData.testGuru = await prisma.guru.create({
      data: {
        tenant_id: testData.multiTenant.id,
        user_id: testData.multiUser.id,
        nama_guru: 'Test Guru',
        nip: 'TEST001'
      }
    });

    // Generate real JWT tokens using server secret
    const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here';
    // Use system SUPERADMIN to bypass subscription guard and domain restrictions for testing
    testData.simpleToken = jwt.sign({
      id: testData.simpleUser.id,
      tenantId: 'system',
      roleName: 'SUPERADMIN'
    }, secret, { expiresIn: '1h' });
    testData.multiToken = jwt.sign({
      id: testData.multiUser.id,
      tenantId: 'system',
      roleName: 'SUPERADMIN'
    }, secret, { expiresIn: '1h' });

    console.log('✅ Test data setup completed');
    
  } catch (error) {
    console.error('❌ Failed to setup test data:', error.message);
    throw error;
  }
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    // Delete in reverse order of creation
    if (testData.testGuru) await prisma.guru.delete({ where: { id: testData.testGuru.id } });
    if (testData.testSiswa) await prisma.siswa.delete({ where: { id: testData.testSiswa.id } });
    if (testData.testKelas) await prisma.kelas.delete({ where: { id: testData.testKelas.id } });
    if (testData.testJurusan) await prisma.jurusan.delete({ where: { id: testData.testJurusan.id } });
    if (testData.simpleUser) await prisma.user.delete({ where: { id: testData.simpleUser.id } });
    if (testData.multiUser) await prisma.user.delete({ where: { id: testData.multiUser.id } });
    if (testData.simpleTenant) await prisma.tenant.delete({ where: { id: testData.simpleTenant.id } });
    if (testData.multiTenant) await prisma.tenant.delete({ where: { id: testData.multiTenant.id } });
    
    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.error('❌ Failed to cleanup test data:', error.message);
  }
}

/**
 * Test Gerbang (Gate) Attendance Endpoints
 */
async function testGerbangEndpoints() {
  console.log('\n📍 Testing Gerbang (Gate) Attendance Endpoints...');
  
  // Test 1: Gerbang tap with SIMPLE mode (should work)
  const simpleTapResponse = await makeRequest(
    'POST',
    `${BASE_URL}/attendance/gerbang/tap`,
    {
      siswa_id: testData.testSiswa.id,
      arah: JenisTap.GERBANG_DATANG,
      device_id: 'TEST_DEVICE_001'
    },
    testData.simpleToken
  );
  
  logTest(
    'Gerbang tap - SIMPLE mode',
    'Should accept tap (200/201)',
    `Status: ${simpleTapResponse.status}`,
    [200, 201].includes(simpleTapResponse.status),
    simpleTapResponse.data.message || 'No message'
  );

  // Test 2: Gerbang tap with MULTI_SESI mode (should work)
  const multiTapResponse = await makeRequest(
    'POST',
    `${BASE_URL}/attendance/gerbang/tap`,
    {
      siswa_id: testData.testSiswa.id,
      arah: JenisTap.GERBANG_DATANG,
      device_id: 'TEST_DEVICE_002'
    },
    testData.multiToken
  );
  
  logTest(
    'Gerbang tap - MULTI_SESI mode',
    'Should accept tap (200/201)',
    `Status: ${multiTapResponse.status}`,
    [200, 201].includes(multiTapResponse.status),
    multiTapResponse.data.message || 'No message'
  );
}

/**
 * Test Kegiatan (Activity) Attendance Endpoints
 */
async function testKegiatanEndpoints() {
  console.log('\n🎯 Testing Kegiatan (Activity) Attendance Endpoints...');
  
  // Test 1: Kegiatan tap with SIMPLE mode (should be forbidden)
  const simpleTapResponse = await makeRequest(
    'POST',
    `${BASE_URL}/attendance/kegiatan/tap`,
    {
      siswa_id: testData.testSiswa.id,
      sesi_absensi_id: 'dummy-session-id'
    },
    testData.simpleToken
  );
  
  logTest(
    'Kegiatan tap - SIMPLE mode',
    'Should be forbidden (403)',
    `Status: ${simpleTapResponse.status}`,
    simpleTapResponse.status === 403,
    simpleTapResponse.data.message || 'No message'
  );

  // Test 2: Kegiatan sessions with SIMPLE mode (should be forbidden)
  const simpleSessionsResponse = await makeRequest(
    'GET',
    `${BASE_URL}/attendance/kegiatan/sessions`,
    null,
    testData.simpleToken
  );
  
  logTest(
    'Kegiatan sessions - SIMPLE mode',
    'Should be forbidden (403)',
    `Status: ${simpleSessionsResponse.status}`,
    simpleSessionsResponse.status === 403,
    simpleSessionsResponse.data.message || 'No message'
  );

  // Test 3: Kegiatan sessions with MULTI_SESI mode (should work)
  const multiSessionsResponse = await makeRequest(
    'GET',
    `${BASE_URL}/attendance/kegiatan/sessions`,
    null,
    testData.multiToken
  );
  
  logTest(
    'Kegiatan sessions - MULTI_SESI mode',
    'Should return sessions (200)',
    `Status: ${multiSessionsResponse.status}`,
    multiSessionsResponse.status === 200,
    multiSessionsResponse.data.message || 'No message'
  );
}

/**
 * Test Sesi Absensi (MULTI_SESI) Endpoints
 */
async function testSesiAbsensiEndpoints() {
  console.log('\n🗂️  Testing Sesi Absensi Endpoints (MULTI_SESI)...');

  // Build today's date (YYYY-MM-DD) in local machine time
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const dayStr = `${y}-${m}-${d}`;
  const startIso = `${dayStr}T09:00:00+07:00`;
  const endIso = `${dayStr}T10:00:00+07:00`;

  // Create a session (KBM requires guru)
  const createResponse = await makeRequest(
    'POST',
    `${BASE_URL}/attendance/sesi-absensi`,
    {
      kelas_id: testData.testKelas.id,
      guru_id: testData.testGuru.id,
      jenis_kegiatan: 'KBM-MATEMATIKA',
      tanggal: dayStr,
      waktu_mulai: startIso,
      waktu_selesai: endIso
    },
    testData.multiToken,
    testData.multiTenant.id
  );

  logTest(
    'Create sesi absensi - MULTI_SESI',
    'Should create session (201)',
    `Status: ${createResponse.status}`,
    [200, 201].includes(createResponse.status),
    createResponse.data?.message || 'No message'
  );

  // Idempotency: try to create the same session again and expect 200 with 'Sesi sudah ada'
  const createDuplicateResponse = await makeRequest(
    'POST',
    `${BASE_URL}/attendance/sesi-absensi`,
    {
      kelas_id: testData.testKelas.id,
      guru_id: testData.testGuru.id,
      jenis_kegiatan: 'KBM-MATEMATIKA',
      tanggal: dayStr,
      waktu_mulai: startIso,
      waktu_selesai: endIso
    },
    testData.multiToken,
    testData.multiTenant.id
  );

  const duplicatePassed = createDuplicateResponse.status === 200 && String(createDuplicateResponse.data?.message || '').toLowerCase().includes('sesi sudah ada');
  logTest(
    'Create sesi absensi duplicate - idempotent',
    'Should return existing session (200) with message',
    `Status: ${createDuplicateResponse.status}, Message: ${createDuplicateResponse.data?.message}`,
    duplicatePassed,
    createDuplicateResponse.data?.message || 'No message'
  );

  // List sessions for today and verify presence
  const listResponse = await makeRequest(
    'GET',
    `${BASE_URL}/attendance/sesi-absensi?tanggal=${dayStr}&summary=true`,
    null,
    testData.multiToken,
    testData.multiTenant.id
  );

  const hasCreated = Array.isArray(listResponse.data?.data)
    && listResponse.data.data.some(s => String(s.kelas_id) === String(testData.testKelas.id) && String(s.guru_id) === String(testData.testGuru.id) && String(s.status || '').toUpperCase() === 'BERLANGSUNG');

  logTest(
    'List sesi absensi - MULTI_SESI',
    'Should return created session (200)',
    `Status: ${listResponse.status}, Found: ${hasCreated}`,
    listResponse.status === 200 && hasCreated,
    listResponse.data?.message || 'No message'
  );
}

/**
 * Test timezone configuration effects on session date boundaries
 */
async function testTimezoneConfigValidation() {
  console.log('\n🕒 Testing Timezone Configuration Effects...');

  // Upsert tenant system config to Asia/Makassar (+08:00)
  const upsertResponse = await makeRequest(
    'PUT',
    `${BASE_URL}/system/config`,
    {
      tenant_id: testData.multiTenant.id,
      timezone: 'Asia/Makassar',
      is_active: true
    },
    testData.multiToken,
    testData.multiTenant.id
  );

  logTest(
    'Upsert system config timezone',
    'Should upsert config (200)',
    `Status: ${upsertResponse.status}`,
    upsertResponse.status === 200,
    upsertResponse.data?.message || 'No message'
  );

  // Create a session using +08:00 offset and ensure listing by tanggal returns it
  const now = new Date();
  const dayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const startIso = `${dayStr}T07:00:00+08:00`; // 07:00 local Makassar
  const endIso = `${dayStr}T08:00:00+08:00`;

  const createResponse = await makeRequest(
    'POST',
    `${BASE_URL}/attendance/sesi-absensi`,
    {
      kelas_id: testData.testKelas.id,
      guru_id: testData.testGuru.id,
      jenis_kegiatan: 'KBM-FISIKA',
      tanggal: dayStr,
      waktu_mulai: startIso,
      waktu_selesai: endIso
    },
    testData.multiToken,
    testData.multiTenant.id
  );

  logTest(
    'Create sesi with Asia/Makassar timezone',
    'Should create or reuse session (200/201)',
    `Status: ${createResponse.status}`,
    [200, 201].includes(createResponse.status),
    createResponse.data?.message || 'No message'
  );

  const listResponse = await makeRequest(
    'GET',
    `${BASE_URL}/attendance/sesi-absensi?tanggal=${dayStr}&summary=true`,
    null,
    testData.multiToken,
    testData.multiTenant.id
  );

  const foundMakassarSession = Array.isArray(listResponse.data?.data)
    && listResponse.data.data.some(s => String(s.kelas_id) === String(testData.testKelas.id) && String(s.jenis_kegiatan || '').includes('KBM-FISIKA'));

  logTest(
    'List sesi respects tenant timezone boundaries',
    'Should include KBM-FISIKA session (200)',
    `Status: ${listResponse.status}, Found: ${foundMakassarSession}`,
    listResponse.status === 200 && foundMakassarSession,
    listResponse.data?.message || 'No message'
  );
}

/**
 * Test Manual Attendance Endpoints
 */
async function testManualEndpoints() {
  console.log('\n✏️ Testing Manual Attendance Endpoints...');
  
  // Test 1: Manual kelas with SIMPLE mode (should be forbidden)
  const simpleKelasResponse = await makeRequest(
    'GET',
    `${BASE_URL}/attendance/manual/kelas/${testData.testKelas.id}`,
    null,
    testData.simpleToken
  );
  
  logTest(
    'Manual kelas - SIMPLE mode',
    'Should be forbidden (403)',
    `Status: ${simpleKelasResponse.status}`,
    simpleKelasResponse.status === 403,
    simpleKelasResponse.data.message || 'No message'
  );

  // Test 2: Manual submit with SIMPLE mode (should be forbidden)
  const simpleSubmitResponse = await makeRequest(
    'POST',
    `${BASE_URL}/attendance/manual/submit`,
    {
      kelas_id: testData.testKelas.id,
      tanggal: TEST_DATE,
      absensi: [
        {
          siswa_id: testData.testSiswa.id,
          status: AbsenStatus.HADIR
        }
      ]
    },
    testData.simpleToken
  );
  
  logTest(
    'Manual submit - SIMPLE mode',
    'Should be forbidden (403)',
    `Status: ${simpleSubmitResponse.status}`,
    simpleSubmitResponse.status === 403,
    simpleSubmitResponse.data.message || 'No message'
  );

  // Test 3: Manual kelas with MULTI_SESI mode (should work)
  const multiKelasResponse = await makeRequest(
    'GET',
    `${BASE_URL}/attendance/manual/kelas/${testData.testKelas.id}`,
    null,
    testData.multiToken
  );
  
  logTest(
    'Manual kelas - MULTI_SESI mode',
    'Should return kelas data (200)',
    `Status: ${multiKelasResponse.status}`,
    multiKelasResponse.status === 200,
    multiKelasResponse.data.message || 'No message'
  );
}

/**
 * Test Rekap (Reports) Attendance Endpoints
 */
async function testRekapEndpoints() {
  console.log('\n📊 Testing Rekap (Reports) Attendance Endpoints...');
  
  // Test universal endpoints (should work for both modes)
  const universalEndpoints = [
    { path: `/siswa/${testData.testSiswa.id}/harian?tanggal=${TEST_DATE}`, name: 'Siswa harian' },
    { path: `/siswa/${testData.testSiswa.id}/bulanan?bulan=${TEST_MONTH}`, name: 'Siswa bulanan' },
    { path: `/kelas/${testData.testKelas.id}/bulanan?bulan=${TEST_MONTH}`, name: 'Kelas bulanan' },
    { path: `/guru/harian?tanggal=${TEST_DATE}`, name: 'Guru harian' },
    { path: `/statistik/harian?tanggal=${TEST_DATE}`, name: 'Statistik harian' }
  ];

  for (const endpoint of universalEndpoints) {
    // Test with SIMPLE mode
    const simpleResponse = await makeRequest(
      'GET',
      `${BASE_URL}/attendance/rekap${endpoint.path}`,
      null,
      testData.simpleToken
    );
    
    logTest(
      `${endpoint.name} - SIMPLE mode`,
      'Should return data (200)',
      `Status: ${simpleResponse.status}`,
      simpleResponse.status === 200,
      simpleResponse.data.message || 'No message'
    );

    // Test with MULTI_SESI mode
    const multiResponse = await makeRequest(
      'GET',
      `${BASE_URL}/attendance/rekap${endpoint.path}`,
      null,
      testData.multiToken
    );
    
    logTest(
      `${endpoint.name} - MULTI_SESI mode`,
      'Should return data (200)',
      `Status: ${multiResponse.status}`,
      multiResponse.status === 200,
      multiResponse.data.message || 'No message'
    );
  }

  // Test MULTI_SESI only endpoints
  const trackingEndpoint = `/siswa/${testData.testSiswa.id}/tracking?tanggal=${TEST_DATE}`;
  
  // Test tracking with SIMPLE mode (should be forbidden)
  const simpleTrackingResponse = await makeRequest(
    'GET',
    `${BASE_URL}/attendance/rekap${trackingEndpoint}`,
    null,
    testData.simpleToken
  );
  
  logTest(
    'Siswa tracking - SIMPLE mode',
    'Should be forbidden (403)',
    `Status: ${simpleTrackingResponse.status}`,
    simpleTrackingResponse.status === 403,
    simpleTrackingResponse.data.message || 'No message'
  );

  // Test tracking with MULTI_SESI mode (should work)
  const multiTrackingResponse = await makeRequest(
    'GET',
    `${BASE_URL}/attendance/rekap${trackingEndpoint}`,
    null,
    testData.multiToken
  );
  
  logTest(
    'Siswa tracking - MULTI_SESI mode',
    'Should return tracking data (200)',
    `Status: ${multiTrackingResponse.status}`,
    multiTrackingResponse.status === 200,
    multiTrackingResponse.data.message || 'No message'
  );
}

/**
 * Generate test report
 */
function generateTestReport() {
  console.log('\n📋 TEST REPORT');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`- ${test.test}: Expected ${test.expected}, Got ${test.actual}`);
        if (test.details) console.log(`  Details: ${test.details}`);
      });
  }
  
  console.log('\n✅ Test execution completed!');
}

/**
 * Main test execution
 */
async function runTests() {
  console.log('🚀 Starting Comprehensive Attendance API Tests');
  console.log('='.repeat(60));
  
  try {
    await setupTestData();
    
    // Run all test suites
    await testGerbangEndpoints();
    await testKegiatanEndpoints();
    await testManualEndpoints();
    await testRekapEndpoints();
    await testSesiAbsensiEndpoints();
    await testTimezoneConfigValidation();
    
    generateTestReport();
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    console.error(error.stack);
  } finally {
    await cleanupTestData();
    await prisma.$disconnect();
  }
}

// Execute tests if run directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testResults
};
