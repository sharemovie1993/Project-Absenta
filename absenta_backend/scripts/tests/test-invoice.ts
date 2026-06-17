import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

// Token SUPERADMIN yang valid untuk testing
const SUPERADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbTRxZGNqZGcwMDAwMTNlNGZkZGNlZGNlIiwicm9sZU5hbWUiOiJTVVBFUkFETUlOIiwiaWF0IjoxNzYyMDA4MTExLCJleHAiOjE3NjIwOTQ1MTF9.Css-YfzNfAOWSrxM3qxqYdy7DPxkl2-Q_pkYTTOuV3Y';

async function testInvoiceEndpoint() {
  console.log('🧪 Testing Invoice Endpoint...');
  
  try {
    // Test 1: GET /api/invoice (semua invoice)
    console.log('\n1️⃣ Testing GET /api/invoice (all invoices)...');
    const response1 = await axios.get(`${BASE_URL}/api/invoice`, {
      headers: {
        'Authorization': `Bearer ${SUPERADMIN_TOKEN}`,
        'Content-Type': 'application/json',
        'x-tenant-id': '07411721-73bf-436f-bcf8-91931615a5c3'
      }
    });
    
    console.log('✅ Status:', response1.status);
    console.log('📄 Response:', JSON.stringify(response1.data, null, 2));
    
    // Test 2: GET /api/invoice?tenant_id=... (dengan filter tenant)
    console.log('\n2️⃣ Testing GET /api/invoice?tenant_id=07411721-73bf-436f-bcf8-91931615a5c3... (with tenant filter)...');
    const response2 = await axios.get(`${BASE_URL}/api/invoice?tenant_id=07411721-73bf-436f-bcf8-91931615a5c3`, {
      headers: {
        'Authorization': `Bearer ${SUPERADMIN_TOKEN}`,
        'Content-Type': 'application/json',
        'x-tenant-id': '07411721-73bf-436f-bcf8-91931615a5c3' // Tenant ID yang valid
      }
    });
    
    console.log('✅ Status:', response2.status);
    console.log('📄 Response:', JSON.stringify(response2.data, null, 2));
    
  } catch (error: any) {
    console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
  }
}

testInvoiceEndpoint();