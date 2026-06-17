const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test data
const testTenantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d482';
const testUser = {
  email: 'admin@testschool.edu',
  password: 'password123',
  tenant_id: testTenantId
};

let authToken = '';

async function login() {
  try {
    console.log('🔐 Testing login...');
    const response = await axios.post(`${BASE_URL}/auth/login`, testUser);
    
    if (response.data.success) {
      authToken = response.data.data.token;
      console.log('✅ Login successful');
      console.log('Token:', authToken.substring(0, 50) + '...');
      return true;
    } else {
      console.log('❌ Login failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Login error:', error.response?.data?.message || error.message);
    return false;
  }
}

function getHeaders() {
  return {
    'Authorization': `Bearer ${authToken}`,
    'X-Tenant-ID': testTenantId,
    'Content-Type': 'application/json'
  };
}

async function testDashboardOverview() {
  try {
    console.log('\n📊 Testing Dashboard Overview...');
    const response = await axios.get(`${BASE_URL}/dashboard/overview`, {
      headers: getHeaders()
    });
    
    console.log('✅ Dashboard Overview successful');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ Dashboard Overview failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function testStatistikKelasHarian() {
  try {
    console.log('\n📈 Testing Statistik Kelas Harian...');
    const tanggal = '2025-01-20'; // Today's date
    const response = await axios.get(`${BASE_URL}/dashboard/statistik/kelas/${tanggal}`, {
      headers: getHeaders()
    });
    
    console.log('✅ Statistik Kelas Harian successful');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ Statistik Kelas Harian failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function testStatistikKelasBulanan() {
  try {
    console.log('\n📅 Testing Statistik Kelas Bulanan...');
    // Use a real kelas ID from the seed data
    const kelasId = '692669ef-c665-4fc3-bad0-91244d1060d2'; // 1TI-A from seed data
    const bulan = '2025-01';
    const response = await axios.get(`${BASE_URL}/dashboard/statistik/kelas/${kelasId}/bulan/${bulan}`, {
      headers: getHeaders()
    });
    
    console.log('✅ Statistik Kelas Bulanan successful');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ Statistik Kelas Bulanan failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function testStatistikGuruHarian() {
  try {
    console.log('\n👨‍🏫 Testing Statistik Guru Harian...');
    const tanggal = '2025-01-20'; // Today's date
    const response = await axios.get(`${BASE_URL}/dashboard/statistik/guru/${tanggal}`, {
      headers: getHeaders()
    });
    
    console.log('✅ Statistik Guru Harian successful');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ Statistik Guru Harian failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function testGrafikSiswaBulanan() {
  try {
    console.log('\n📊 Testing Grafik Siswa Bulanan...');
    const bulan = '2025-01';
    const response = await axios.get(`${BASE_URL}/dashboard/grafik/siswa/${bulan}`, {
      headers: getHeaders()
    });
    
    console.log('✅ Grafik Siswa Bulanan successful');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ Grafik Siswa Bulanan failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function testGrafikGuruBulanan() {
  try {
    console.log('\n📈 Testing Grafik Guru Bulanan...');
    const bulan = '2025-01';
    const response = await axios.get(`${BASE_URL}/dashboard/grafik/guru/${bulan}`, {
      headers: getHeaders()
    });
    
    console.log('✅ Grafik Guru Bulanan successful');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ Grafik Guru Bulanan failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Dashboard Endpoints Testing...\n');
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }
  
  // Test all dashboard endpoints
  const tests = [
    { name: 'Dashboard Overview', fn: testDashboardOverview },
    { name: 'Statistik Kelas Harian', fn: testStatistikKelasHarian },
    { name: 'Statistik Kelas Bulanan', fn: testStatistikKelasBulanan },
    { name: 'Statistik Guru Harian', fn: testStatistikGuruHarian },
    { name: 'Grafik Siswa Bulanan', fn: testGrafikSiswaBulanan },
    { name: 'Grafik Guru Bulanan', fn: testGrafikGuruBulanan }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    const success = await test.fn();
    if (success) passedTests++;
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All dashboard endpoints are working correctly!');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
  }
  
  console.log('='.repeat(50));
}

// Run the tests
runAllTests().catch(console.error);