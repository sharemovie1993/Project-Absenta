const axios = require('axios');

async function test() {
  try {
    const res = await axios.get('http://127.0.0.1:3004/api/system/config');
    console.log('Config status:', res.status);
    console.log('Config data:', res.data);
  } catch (err) {
    console.error('Config failed:', err.message);
    if (err.response) {
      console.error('Config error response:', err.response.status, err.response.data);
    } else {
      console.error('Config no response:', err);
    }
  }

  try {
    const res = await axios.get('http://127.0.0.1:3004/api/auth/dev/tenants');
    console.log('Dev Tenants status:', res.status);
    console.log('Dev Tenants data:', res.data);
  } catch (err) {
    console.error('Dev Tenants failed:', err.message);
    if (err.response) {
      console.error('Dev Tenants error response:', err.response.status, err.response.data);
    } else {
      console.error('Dev Tenants no response:', err);
    }
  }
}

test();
