import axios from 'axios';

async function testSuperAdminLogin() {
  try {
    console.log('🧪 Testing SUPERADMIN login and API access...\n');

    // Login as SUPERADMIN
    let loginResponse;
    try {
      loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
        email: 'superadmin@system.com',
        password: 'superadmin123',
        tenant_id: ''
      });
      console.log('✅ Login successful!');
      console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
    } catch (loginError) {
      console.log('❌ Login failed:');
      console.log('Error message:', loginError.message);
      console.log('Response status:', loginError.response?.status);
      console.log('Response data:', loginError.response?.data);
      return;
    }
    
    // Extract token from response - check different possible locations
    let token = loginResponse.data.token || 
                loginResponse.data.data?.token || 
                loginResponse.data.access_token ||
                loginResponse.data.data?.access_token;
    
    console.log('Token:', token);
    
    if (!token) {
      console.log('❌ No token found in response');
      return;
    }

    // Test dashboard API access without X-Tenant-ID header
    try {
      const dashboardResponse = await axios.get('http://localhost:3000/api/dashboard/overview', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Dashboard API access successful!');
      console.log('Dashboard data:', JSON.stringify(dashboardResponse.data, null, 2));
    } catch (dashboardError) {
      console.log('❌ Dashboard API failed:');
      console.log('Error message:', dashboardError.message);
      console.log('Response status:', dashboardError.response?.status);
      console.log('Response data:', dashboardError.response?.data);
    }

  } catch (error) {
    console.log('❌ Unexpected error:');
    console.log('Error message:', error.message);
  }
}

testSuperAdminLogin();
