const axios = require('axios');

async function testDashboard() {
  try {
    console.log('=== TESTING LOGIN AS GURU/PEJABAT (ajeng@gmail.com) ===');
    const loginRes = await axios.post('http://10.10.10.250:3004/api/auth/login', {
      email: 'ajeng@gmail.com',
      identifier: 'ajeng@gmail.com',
      password: 'admin1234'
    });

    const token = loginRes.data?.data?.token;
    const tenantId = loginRes.data?.data?.user?.tenant_id;
    console.log('LOGIN SUCCESS! Token:', token ? token.substring(0, 20) + '...' : 'NULL');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    };

    console.log('\n=== TESTING GET /api/dashboard/overview ===');
    const overviewRes = await axios.get('http://10.10.10.250:3004/api/dashboard/overview', { headers });
    console.log('OVERVIEW STATUS:', overviewRes.status);
    console.log('OVERVIEW DATA:', JSON.stringify(overviewRes.data, null, 2));

  } catch (err) {
    console.error('ERROR:', err.response?.status, err.response?.data || err.message);
  }
}

testDashboard();
