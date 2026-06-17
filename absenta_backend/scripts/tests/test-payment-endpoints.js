const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let authToken = '';

// Test data - Using valid SUPERADMIN credentials
const testData = {
  superadmin: {
    email: 'superadmin@system.com',
  password: 'superadmin123'
  }
};

// Helper function to make authenticated requests
const makeRequest = async (method, endpoint, data = null, token = authToken) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      data
    };
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      status: error.response?.status 
    };
  }
};

// Test functions
const testLogin = async (credentials, userType) => {
  console.log(`\n🔐 Testing ${userType} login...`);
  const result = await makeRequest('POST', '/auth/login', credentials);
  
  if (result.success && result.data.data?.token) {
    console.log(`✅ ${userType} login successful`);
    return result.data.data.token;
  } else {
    console.log(`❌ ${userType} login failed:`, result.error);
    return null;
  }
};

const testGetSupportedGateways = async () => {
  console.log(`\n🏦 Testing GET /api/payments/gateways...`);
  const result = await makeRequest('GET', '/api/payments/gateways');
  
  if (result.success) {
    console.log('✅ Get supported gateways successful');
    console.log('Gateways:', result.data.data);
    return result.data.data;
  } else {
    console.log('❌ Get supported gateways failed:', result.error);
    return null;
  }
};

const testCreatePayment = async () => {
  console.log(`\n💳 Testing POST /api/payments/create...`);
  
  // First, let's get a billing ID to use for payment
  const billingResult = await makeRequest('GET', '/api/billing/billings?limit=1');
  let billingId = null;
  
  if (billingResult.success && billingResult.data.data && billingResult.data.data.length > 0) {
    billingId = billingResult.data.data[0].id;
    console.log(`📋 Using billing ID: ${billingId}`);
  } else {
    console.log('⚠️ No billing data found, skipping payment creation test');
    return null;
  }
  
  const paymentData = {
    billing_id: billingId,
    gateway: 'MIDTRANS',
    method: 'QRIS',
    return_url: 'http://localhost:3000/payment/success',
    cancel_url: 'http://localhost:3000/payment/cancel'
  };
  
  const result = await makeRequest('POST', '/api/payments/create', paymentData);
  
  if (result.success) {
    console.log('✅ Create payment successful');
    console.log(`💳 Payment ID: ${result.data.data?.payment_id}`);
    return result.data.data?.payment_id;
  } else {
    console.log('❌ Create payment failed:', result.error);
    return null;
  }
};

const testGetPaymentStatus = async (paymentId) => {
  console.log(`\n🔍 Testing GET /api/payments/${paymentId}...`);
  const result = await makeRequest('GET', `/api/payments/${paymentId}`);
  
  if (result.success) {
    console.log('✅ Get payment status successful');
    console.log('Status:', result.data.data?.status);
    return result.data.data;
  } else {
    console.log('❌ Get payment status failed:', result.error);
    return null;
  }
};

const testGetPaymentsList = async () => {
  console.log(`\n📋 Testing GET /api/payments/list...`);
  const result = await makeRequest('GET', '/api/payments/list?limit=10&offset=0');
  
  if (result.success) {
    console.log('✅ Get payments list successful');
    console.log('Total payments:', result.data.data?.payments?.length || 0);
    return result.data.data;
  } else {
    console.log('❌ Get payments list failed:', result.error);
    return null;
  }
};

const testHealthCheck = async () => {
  console.log(`\n🏥 Testing GET /api/payments/health...`);
  const result = await makeRequest('GET', '/api/payments/health');
  
  if (result.success) {
    console.log('✅ Health check successful');
    console.log('Status:', result.data.status);
    return result.data;
  } else {
    console.log('❌ Health check failed:', result.error);
    return null;
  }
};

const testWebhookProcessing = async () => {
  console.log(`\n🔗 Testing POST /api/payments/test/webhook...`);
  
  const webhookData = {
    gateway: 'MIDTRANS',
    scenario: 'success'
  };
  
  const result = await makeRequest('POST', '/api/payments/test/webhook?scenario=success', webhookData);
  
  if (result.success) {
    console.log('✅ Test webhook processing successful');
    console.log('Result:', result.data.data);
    return result.data.data;
  } else {
    console.log('❌ Test webhook processing failed:', result.error);
    return null;
  }
};

// Main test runner
const runPaymentTests = async () => {
  console.log('🚀 Starting Payment Module Endpoint Tests...\n');
  
  try {
    // 1. Login as SUPERADMIN
    authToken = await testLogin(testData.superadmin, 'SUPERADMIN');
    if (!authToken) {
      console.log('❌ Cannot proceed without authentication');
      return;
    }
    
    // 2. Test basic endpoints
    await testGetSupportedGateways();
    await testGetPaymentsList();
    
    // 3. Test payment creation (might fail due to missing billing)
    const payment = await testCreatePayment();
    
    // 4. Test payment status if payment was created
    if (payment?.id) {
      await testGetPaymentStatus(payment.id);
    }
    
    // 5. Test health check
    await testHealthCheck();
    
    // 6. Test webhook processing
    await testWebhookProcessing();
    
    console.log('\n🎉 Payment endpoint tests completed!');
    
  } catch (error) {
    console.error('💥 Test runner error:', error.message);
  }
};

// Run tests
runPaymentTests().catch(console.error);
