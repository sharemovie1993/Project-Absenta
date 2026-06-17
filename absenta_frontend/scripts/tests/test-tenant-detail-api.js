// Test script untuk menguji API detail tenant dari frontend
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const TENANT_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d482';

async function testTenantDetailAPI() {
  try {
    console.log('🔐 Step 1: Login to get token...');
    
    // Login untuk mendapatkan token
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'superadmin@system.com',
  password: 'superadmin123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, token received');
    
    console.log('\n📋 Step 2: Test tenant detail endpoint...');
    
    // Test endpoint detail tenant
    const detailResponse = await axios.get(`${BASE_URL}/superadmin/tenants/${TENANT_ID}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Tenant detail API response:');
    console.log('- Success:', detailResponse.data.success);
    console.log('- Message:', detailResponse.data.message);
    console.log('- Full response data:', JSON.stringify(detailResponse.data.data, null, 2));
    console.log('- Tenant Name:', detailResponse.data.data.name);
    console.log('- Tenant Status:', detailResponse.data.data.status);
    
    console.log('\n📊 Step 3: Test tenant metrics endpoint...');
    
    // Test endpoint metrics
    try {
      const metricsResponse = await axios.get(`${BASE_URL}/superadmin/tenants/${TENANT_ID}/metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Tenant metrics API response:');
      console.log('- Success:', metricsResponse.data.success);
      console.log('- Message:', metricsResponse.data.message);
    } catch (metricsError) {
      console.log('❌ Metrics endpoint error:', metricsError.response?.data || metricsError.message);
    }
    
    console.log('\n👥 Step 4: Test tenant users endpoint...');
    
    // Test endpoint users
    try {
      const usersResponse = await axios.get(`${BASE_URL}/superadmin/tenants/${TENANT_ID}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Tenant users API response:');
      console.log('- Success:', usersResponse.data.success);
      console.log('- Message:', usersResponse.data.message);
    } catch (usersError) {
      console.log('❌ Users endpoint error:', usersError.response?.data || usersError.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Jalankan test
testTenantDetailAPI();
