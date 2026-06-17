import axios from 'axios';

// Simulasi frontend API call
const testFrontendAPI = async () => {
  console.log('🔍 Testing Frontend API Call...\n');

  // Token yang baru dari generate-test-token.ts
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbTRxZGNqZGcwMDAwMTNlNGZkZGNlZGNlIiwicm9sZU5hbWUiOiJTVVBFUkFETUlOIiwiaWF0IjoxNzYyMDA4NDcwLCJleHAiOjE3NjIwOTQ4NzB9.6ALPFJnnlsmuPkYRsjkY_AuQ0Awycp8Ty8rqA3bCtVU';
  const tenantId = '07411721-73bf-436f-bcf8-91931615a5c3';

  try {
    console.log('📋 Request Details:');
    console.log(`URL: http://localhost:3000/api/invoice`);
    console.log(`Authorization: Bearer ${token.substring(0, 50)}...`);
    console.log(`X-Tenant-ID: ${tenantId}\n`);

    // Test 1: Get all invoices
    console.log('🚀 Test 1: Get All Invoices');
    const response1 = await axios.get('http://localhost:3000/api/invoice', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Status: ${response1.status}`);
    console.log(`📊 Data Count: ${response1.data.data?.length || 0}`);
    console.log(`📄 Response:`, JSON.stringify(response1.data, null, 2));

    // Test 2: Get invoices with query parameters (seperti yang mungkin dilakukan frontend)
    console.log('\n🚀 Test 2: Get Invoices with Query Parameters');
    const response2 = await axios.get('http://localhost:3000/api/invoice?status=DRAFT&limit=10', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Status: ${response2.status}`);
    console.log(`📊 Data Count: ${response2.data.data?.length || 0}`);
    console.log(`📄 Response:`, JSON.stringify(response2.data, null, 2));

  } catch (error: any) {
    console.error('❌ Error:', error.response?.status, error.response?.statusText);
    console.error('📄 Error Response:', error.response?.data);
    console.error('🔍 Error Details:', error.message);
  }
};

// Test localStorage simulation
const testLocalStorageSimulation = () => {
  console.log('\n🗄️ LocalStorage Simulation Test:');
  
  // Simulasi data yang seharusnya ada di localStorage
  const mockLocalStorage = {
    access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbTRxZGNqZGcwMDAwMTNlNGZkZGNlZGNlIiwicm9sZU5hbWUiOiJTVVBFUkFETUlOIiwiaWF0IjoxNzYyMDA4NDcwLCJleHAiOjE3NjIwOTQ4NzB9.6ALPFJnnlsmuPkYRsjkY_AuQ0Awycp8Ty8rqA3bCtVU',
    tenant_id: '07411721-73bf-436f-bcf8-91931615a5c3'
  };

  console.log('📋 Expected localStorage data:');
  console.log(`access_token: ${mockLocalStorage.access_token ? 'EXISTS' : 'MISSING'}`);
  console.log(`tenant_id: ${mockLocalStorage.tenant_id ? 'EXISTS' : 'MISSING'}`);
  
  if (mockLocalStorage.access_token) {
    console.log(`Token length: ${mockLocalStorage.access_token.length} characters`);
    console.log(`Token preview: ${mockLocalStorage.access_token.substring(0, 50)}...`);
  }
  
  if (mockLocalStorage.tenant_id) {
    console.log(`Tenant ID: ${mockLocalStorage.tenant_id}`);
    console.log(`Tenant ID format: ${/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mockLocalStorage.tenant_id) ? 'Valid UUID' : 'Invalid UUID'}`);
  }
};

// Run tests
const runTests = async () => {
  console.log('🧪 Frontend API Test Suite\n');
  console.log('=' .repeat(50));
  
  testLocalStorageSimulation();
  
  console.log('\n' + '=' .repeat(50));
  await testFrontendAPI();
  
  console.log('\n✨ Test completed!');
};

runTests().catch(console.error);