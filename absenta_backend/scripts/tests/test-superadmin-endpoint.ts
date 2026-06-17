import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function testSuperadminEndpoint() {
  console.log('🧪 Testing Superadmin Tenant Endpoint...\n');

  try {
    // Test 1: GET /api/superadmin/tenants
    console.log('📋 Test 1: GET /api/superadmin/tenants');
    const response1 = await axios.get(`${BASE_URL}/api/superadmin/tenants`, {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Status:', response1.status);
    console.log('📊 Response Data:', JSON.stringify(response1.data, null, 2));
    console.log('📈 Total Tenants:', response1.data?.data?.length || 0);
    console.log('');

    // Test 2: GET /api/superadmin/tenants dengan query parameter
    console.log('📋 Test 2: GET /api/superadmin/tenants?page=1&limit=10');
    const response2 = await axios.get(`${BASE_URL}/api/superadmin/tenants?page=1&limit=10`, {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Status:', response2.status);
    console.log('📊 Response Data:', JSON.stringify(response2.data, null, 2));
    console.log('📈 Total Tenants:', response2.data?.data?.length || 0);

  } catch (error: any) {
    console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
  }
}

testSuperadminEndpoint();