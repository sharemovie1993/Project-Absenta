import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function testSuperAdminLogin() {
  try {
    console.log('🔐 Testing SUPERADMIN login...');
    
    // Login sebagai SUPERADMIN (tanpa tenant_id)
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'superadmin@system.com',
        password: 'superadmin123',
        tenant_id: '' // Empty string untuk SUPERADMIN
      });
      
      console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
      
      if (loginResponse.data.success) {
        console.log('✅ SUPERADMIN login successful');
        
        // Coba berbagai kemungkinan lokasi token
        let token = loginResponse.data.data?.token || 
                   loginResponse.data.token || 
                   loginResponse.data.data?.access_token || 
                   loginResponse.data.access_token;
        
        if (!token) {
          console.log('❌ Token not found in response');
          return;
        }
        
        console.log('Token found:', token.substring(0, 20) + '...');
        
        // Test dashboard API tanpa X-Tenant-ID header
        console.log('\n📊 Testing dashboard API without tenant header...');
        try {
          const dashboardResponse = await axios.get(`${BASE_URL}/dashboard/overview`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              // Tidak ada X-Tenant-ID header
            }
          });
          
          if (dashboardResponse.data.success) {
            console.log('✅ Dashboard API successful for SUPERADMIN');
            console.log('Dashboard data:', JSON.stringify(dashboardResponse.data.data, null, 2));
          } else {
            console.log('❌ Dashboard API failed');
          }
        } catch (dashboardError) {
          console.log('❌ Dashboard API error:', dashboardError.response?.data?.message || dashboardError.message);
          if (dashboardError.response?.data) {
            console.log('Dashboard error details:', JSON.stringify(dashboardError.response.data, null, 2));
          }
        }
        
      } else {
        console.log('❌ SUPERADMIN login failed');
      }
    } catch (loginError) {
      console.log('❌ Login error:', loginError.response?.data?.message || loginError.message);
      if (loginError.response?.data) {
        console.log('Login error details:', JSON.stringify(loginError.response.data, null, 2));
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSuperAdminLogin();
