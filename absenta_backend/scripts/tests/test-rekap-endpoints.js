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

async function testEndpoint(method, url, description) {
  try {
    console.log(`\n📊 Testing ${description}...`);
    console.log(`${method.toUpperCase()} ${url}`);
    
    const config = {
      method: method.toLowerCase(),
      url: `${BASE_URL}${url}`,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };

    const response = await axios(config);
    
    console.log('✅ Status:', response.status);
    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ Error:', error.response?.status || 'Network Error');
    console.log('❌ Message:', error.response?.data?.message || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Rekap Endpoints Test\n');
  
  // Test login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }

  // Test endpoints
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  const endpoints = [
    {
      method: 'GET',
      url: `/attendance/rekap/siswa/test-siswa-id/harian?tanggal=${today}`,
      description: 'Daily Student Recap'
    },
    {
      method: 'GET', 
      url: `/attendance/rekap/siswa/test-siswa-id/bulanan?bulan=${currentMonth}`,
      description: 'Monthly Student Recap'
    },
    {
      method: 'GET',
      url: `/attendance/rekap/kelas/test-kelas-id/bulanan?bulan=${currentMonth}`,
      description: 'Monthly Class Recap'
    },
    {
      method: 'GET',
      url: `/attendance/rekap/guru/harian?tanggal=${today}`,
      description: 'Daily Teacher Recap'
    },
    {
      method: 'GET',
      url: `/attendance/rekap/siswa/test-siswa-id/tracking?tanggal=${today}`,
      description: 'Daily Student Tracking'
    },
    {
      method: 'GET',
      url: `/attendance/rekap/statistik/harian?tanggal=${today}`,
      description: 'Daily Statistics'
    }
  ];

  let successCount = 0;
  for (const endpoint of endpoints) {
    const success = await testEndpoint(endpoint.method, endpoint.url, endpoint.description);
    if (success) successCount++;
  }

  console.log(`\n📈 Test Results: ${successCount}/${endpoints.length} endpoints working`);
  
  if (successCount === endpoints.length) {
    console.log('🎉 All endpoints are working correctly!');
  } else {
    console.log('⚠️  Some endpoints need attention');
  }
}

// Run the tests
runTests().catch(console.error);