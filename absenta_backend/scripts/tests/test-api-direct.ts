import axios from 'axios';

async function testApiDirect() {
  try {
    console.log('🔍 Testing API directly...\n');

    // Generate token with correct secret key
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';
    
    const token = jwt.sign(
      { 
        userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        roleName: 'SUPERADMIN'
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('🔑 Generated token:', token.substring(0, 50) + '...');

    // Test API call
    const response = await axios.get('http://localhost:3000/api/invoice', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', response.headers);
    console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));

    // Test with query parameters
    console.log('\n' + '='.repeat(50));
    console.log('🔍 Testing with query parameters...\n');

    const responseWithParams = await axios.get('http://localhost:3000/api/invoice?page=1&limit=5', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Response Status (with params):', responseWithParams.status);
    console.log('📊 Response Data (with params):', JSON.stringify(responseWithParams.data, null, 2));

  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testApiDirect();