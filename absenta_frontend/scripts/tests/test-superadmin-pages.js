import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function testSuperAdminPages() {
  try {
    console.log('🔐 Testing SUPERADMIN login...');
    
    // Login sebagai SUPERADMIN
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'superadmin@system.com',
      password: 'superadmin123',
      tenant_id: '' // Empty string untuk SUPERADMIN
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ SUPERADMIN login failed');
      return;
    }
    
    console.log('✅ SUPERADMIN login successful');
    const token = loginResponse.data.data.token;
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      // Tidak ada X-Tenant-ID header untuk SUPERADMIN
    };
    
    // Test berbagai endpoint
    const tests = [
      {
        name: 'Dashboard Overview',
        url: '/dashboard/overview',
        method: 'GET'
      },
      {
        name: 'Users List',
        url: '/users',
        method: 'GET'
      },
      {
        name: 'Tenants List',
        url: '/tenants',
        method: 'GET'
      },
      {
        name: 'Billing Plans',
        url: '/billing/plans',
        method: 'GET'
      },
      {
        name: 'Billing Subscriptions',
        url: '/billing/subscriptions',
        method: 'GET'
      },
      {
        name: 'Billing List',
        url: '/billing/billings',
        method: 'GET'
      },
      {
        name: 'Payment List',
        url: '/api/payments/list',
        method: 'GET'
      }
    ];
    
    console.log('\n📋 Testing SUPERADMIN access to various pages...\n');
    
    for (const test of tests) {
      try {
        console.log(`🔍 Testing ${test.name}...`);
        
        const response = await axios({
          method: test.method,
          url: `${BASE_URL}${test.url}`,
          headers: headers
        });
        
        if (response.data.success) {
          console.log(`✅ ${test.name}: SUCCESS`);
          if (response.data.data) {
            if (Array.isArray(response.data.data)) {
              console.log(`   📊 Data count: ${response.data.data.length}`);
            } else if (typeof response.data.data === 'object') {
              console.log(`   📊 Data keys: ${Object.keys(response.data.data).join(', ')}`);
            }
          }
        } else {
          console.log(`⚠️  ${test.name}: Response not successful`);
        }
        
      } catch (error) {
        console.log(`❌ ${test.name}: ERROR`);
        console.log(`   Error: ${error.response?.data?.message || error.message}`);
        if (error.response?.status) {
          console.log(`   Status: ${error.response.status}`);
        }
      }
      
      console.log(''); // Empty line for readability
    }
    
    console.log('🎯 SUPERADMIN pages testing completed!');
    
  } catch (error) {
    console.log('❌ Test failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSuperAdminPages();
