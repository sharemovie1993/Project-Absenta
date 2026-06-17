const axios = require('axios');

const API_URL = 'http://10.10.10.250:3001/api';
const EMAIL = 'neple@gmail.com';
const PASSWORD = 'admin1234';

async function test() {
  try {
    console.log('1. Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: EMAIL,
      password: PASSWORD
    });

    const token = loginRes.data.data.token;
    console.log('   Login success. Token:', token.substring(0, 20) + '...');

    console.log('\n2. Testing /auth/me (getCurrentUser)...');
    try {
      const meRes = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('   /auth/me success:', meRes.data.success);
      console.log('   User:', meRes.data.data.full_name, `(${meRes.data.data.email})`);
    } catch (e) {
      console.error('   /auth/me failed:', e.response?.status, e.response?.data || e.message);
    }

    console.log('\n3. Testing /invoice/public (without token)...');
    // Using a sample token hash (need a real one from DB to be sure, but let's see if it 404s or what)
    try {
        const publicRes = await axios.get(`${API_URL}/invoice/public/invalid-token-test`);
        console.log('   /invoice/public status:', publicRes.status);
    } catch (e) {
        console.log('   /invoice/public (invalid token) expectedly failed:', e.response?.status, e.response?.data?.message);
    }

  } catch (error) {
    console.error('Test failed:', error.response?.status, error.response?.data || error.message);
  }
}

test();
