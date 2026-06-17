const axios = require('axios');

async function testInvoiceAPIWithAuth() {
  console.log('🔐 Testing Invoice API with Authentication...');
  
  try {
    // Step 1: Login untuk mendapatkan token
    console.log('🔑 Step 1: Login to get access token...');
    
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@testschool.edu',
      password: 'password123',
      tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d482'
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🔍 Login Response:', JSON.stringify(loginResponse.data, null, 2));
    
    if (!loginResponse.data.success) {
      console.error('❌ Login failed:', loginResponse.data.message);
      return;
    }
    
    // Try different token field names
    const accessToken = loginResponse.data.data.access_token || 
                       loginResponse.data.data.token || 
                       loginResponse.data.token;
    console.log('✅ Login successful');
    console.log('🎫 Access token received:', accessToken ? 'YES' : 'NO');
    console.log('🔑 Token preview:', accessToken ? accessToken.substring(0, 50) + '...' : 'NONE');
    
    // Step 2: Test Invoice API dengan token
    console.log('\n🧪 Step 2: Testing Invoice API with token...');
    
    const invoiceResponse = await axios.get('http://localhost:3000/api/invoice', {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Tenant-ID': 'f47ac10b-58cc-4372-a567-0e02b2c3d482'
      }
    });
    
    console.log('✅ Invoice API Response received');
    console.log('📊 Status:', invoiceResponse.status);
    console.log('📋 Response Data:', JSON.stringify(invoiceResponse.data, null, 2));
    
    // Analisis response
    if (invoiceResponse.data.success) {
      console.log('✅ API returned success=true');
      console.log('📄 Data structure:', Object.keys(invoiceResponse.data.data || {}));
      console.log('📄 Invoices length:', invoiceResponse.data.data?.invoices?.length || 0);
      console.log('📄 Total:', invoiceResponse.data.data?.total || 0);
      console.log('📄 Page:', invoiceResponse.data.data?.page || 0);
      console.log('📄 Limit:', invoiceResponse.data.data?.limit || 0);
      
      if (invoiceResponse.data.data?.invoices && invoiceResponse.data.data.invoices.length > 0) {
        console.log('✅ Invoice data found');
        console.log('📝 First invoice sample:', JSON.stringify(invoiceResponse.data.data.invoices[0], null, 2));
      } else {
        console.log('⚠️ No invoice data found (empty array)');
        console.log('💡 This is normal if no invoices exist in database');
      }
    } else {
      console.log('❌ API returned success=false');
      console.log('💬 Message:', invoiceResponse.data.message);
    }
    
    // Step 3: Test dengan parameter
    console.log('\n🔗 Step 3: Testing with query parameters...');
    const responseWithParams = await axios.get('http://localhost:3000/api/invoice', {
      params: {
        page: 1,
        limit: 5
      },
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Tenant-ID': 'f47ac10b-58cc-4372-a567-0e02b2c3d482'
      }
    });
    
    console.log('✅ API Response with params received');
    console.log('📊 Status:', responseWithParams.status);
    console.log('📋 Response Data:', JSON.stringify(responseWithParams.data, null, 2));
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    if (error.response) {
      console.error('📊 Error Status:', error.response.status);
      console.error('📋 Error Data:', error.response.data);
    }
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Backend mungkin belum berjalan di port 3000');
    }
  }
}

testInvoiceAPIWithAuth();