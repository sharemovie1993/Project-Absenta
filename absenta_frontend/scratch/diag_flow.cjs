const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001/api';
const EMAIL = 'cimahi@gmail.com';
const PASSWORD = 'admin1234';

async function testFullFlow() {
  console.log('--- STEP 1: Login ---');
  let token;
  let tenantId;
  
  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: EMAIL,
      password: PASSWORD
    }, {
      timeout: 5000
    });
    
    console.log('Login Success!');
    token = loginRes.data.data.token;
    tenantId = loginRes.data.data.user.tenantId || loginRes.data.data.user.tenant_id;
    console.log('Token ID:', token.substring(0, 15) + '...');
    console.log('Tenant ID:', tenantId);
    
    console.log('\n--- STEP 2: Download Jurusan Template ---');
    const endpoint = `${BASE_URL}/academic/jurusan/import/template`;
    
    const downloadRes = await axios({
      url: endpoint,
      method: 'GET',
      responseType: 'arraybuffer',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': tenantId
      }
    });
    
    const buffer = Buffer.from(downloadRes.data);
    const hex = buffer.toString('hex', 0, 4);
    
    console.log('Status:', downloadRes.status);
    console.log('Content-Type:', downloadRes.headers['content-type']);
    console.log('Magic Bytes:', hex);
    
    if (hex === '504b0304') {
      console.log('✅ VALID EXCEL (Magic bytes matched ZIP/XLSX)');
    } else {
      console.log('❌ INVALID DATA: Backend NOT returning Excel!');
      console.log('Preview (ASCII):', buffer.toString('utf8', 0, 100));
    }
  } catch (error) {
    console.error('--- FAIL DETAILS ---');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data.toString());
    } else {
      console.error('Message:', error.message);
    }
  }
}

testFullFlow();
