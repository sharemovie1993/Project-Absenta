const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
let authToken = '';
let tenantId = '';
let subscriptionId = '';
let billingId = '';

// Test data - Using valid ADMIN user from setup
const testData = {
  admin: {
    email: 'admin1@sman1jkt.sch.id',
    password: 'Admin123!',
    tenant_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d482'
  },
  superadmin: {
    email: 'superadmin@system.com',
    password: 'SuperAdmin123!'
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

const testGetAllPlans = async () => {
  console.log('\n📋 Testing GET /billing/plans...');
  const result = await makeRequest('GET', '/billing/plans');
  
  if (result.success) {
    console.log('✅ Get all plans successful');
    console.log(`📊 Found ${result.data.data?.length || 0} plans`);
    return result.data.data;
  } else {
    console.log('❌ Get all plans failed:', result.error);
    return [];
  }
};

const testCreateSubscription = async () => {
  console.log('\n📝 Testing POST /billing/subscriptions...');
  
  // Get plans first
  const plans = await testGetAllPlans();
  if (!plans || plans.length === 0) {
    console.log('❌ No plans available for subscription');
    return null;
  }
  
  const subscriptionData = {
    tenant_id: tenantId,
    plan_id: plans[0].id,
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
  };
  
  const result = await makeRequest('POST', '/billing/subscriptions', subscriptionData);
  
  if (result.success) {
    console.log('✅ Create subscription successful');
    console.log(`📋 Subscription ID: ${result.data.data?.id}`);
    return result.data.data?.id;
  } else {
    console.log('❌ Create subscription failed:', result.error);
    return null;
  }
};

const testGetAllSubscriptions = async () => {
  console.log('\n📋 Testing GET /billing/subscriptions...');
  const result = await makeRequest('GET', '/billing/subscriptions');
  
  if (result.success) {
    console.log('✅ Get all subscriptions successful');
    console.log(`📊 Found ${result.data.data?.length || 0} subscriptions`);
    return result.data.data;
  } else {
    console.log('❌ Get all subscriptions failed:', result.error);
    return [];
  }
};

const testGetSubscriptionById = async (id) => {
  console.log(`\n🔍 Testing GET /billing/subscriptions/${id}...`);
  const result = await makeRequest('GET', `/billing/subscriptions/${id}`);
  
  if (result.success) {
    console.log('✅ Get subscription by ID successful');
    return result.data.data;
  } else {
    console.log('❌ Get subscription by ID failed:', result.error);
    return null;
  }
};

const testCreateBilling = async () => {
  console.log('\n💰 Testing POST /billing/billings...');
  
  const billingData = {
    subscription_id: subscriptionId,
    amount: 100000,
    billing_date: new Date().toISOString(),
    due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days from now
    payment_method: 'BANK_TRANSFER'
  };
  
  const result = await makeRequest('POST', '/billing/billings', billingData);
  
  if (result.success) {
    console.log('✅ Create billing successful');
    console.log(`💰 Billing ID: ${result.data.data?.id}`);
    return result.data.data?.id;
  } else {
    console.log('❌ Create billing failed:', result.error);
    return null;
  }
};

const testGetAllBillings = async () => {
  console.log('\n📋 Testing GET /billing/billings...');
  const result = await makeRequest('GET', '/billing/billings');
  
  if (result.success) {
    console.log('✅ Get all billings successful');
    console.log(`📊 Found ${result.data.data?.length || 0} billings`);
    return result.data.data;
  } else {
    console.log('❌ Get all billings failed:', result.error);
    return [];
  }
};

const testGetBillingById = async (id) => {
  console.log(`\n🔍 Testing GET /billing/billings/${id}...`);
  const result = await makeRequest('GET', `/billing/billings/${id}`);
  
  if (result.success) {
    console.log('✅ Get billing by ID successful');
    return result.data.data;
  } else {
    console.log('❌ Get billing by ID failed:', result.error);
    return null;
  }
};

const testUpdateBilling = async (id) => {
  console.log(`\n✏️ Testing PUT /billing/billings/${id}...`);
  
  const updateData = {
    payment_method: 'CREDIT_CARD',
    payment_reference: 'CC-' + Date.now()
  };
  
  const result = await makeRequest('PUT', `/billing/billings/${id}`, updateData);
  
  if (result.success) {
    console.log('✅ Update billing successful');
    return result.data.data;
  } else {
    console.log('❌ Update billing failed:', result.error);
    return null;
  }
};

const testPayBilling = async (id) => {
  console.log(`\n💳 Testing POST /billing/billings/${id}/pay...`);
  
  const paymentData = {
    payment_method: 'BANK_TRANSFER',
    payment_reference: 'PAY-' + Date.now()
  };
  
  const result = await makeRequest('POST', `/billing/billings/${id}/pay`, paymentData);
  
  if (result.success) {
    console.log('✅ Pay billing successful');
    return result.data.data;
  } else {
    console.log('❌ Pay billing failed:', result.error);
    return null;
  }
};

const testGenerateMonthlyBilling = async () => {
  console.log(`\n📅 Testing POST /billing/subscriptions/${subscriptionId}/generate-billing...`);
  
  const currentDate = new Date();
  const billingData = {
    month: currentDate.getMonth() + 2, // Next month
    year: currentDate.getFullYear()
  };
  
  const result = await makeRequest('POST', `/billing/subscriptions/${subscriptionId}/generate-billing`, billingData);
  
  if (result.success) {
    console.log('✅ Generate monthly billing successful');
    return result.data.data;
  } else {
    console.log('❌ Generate monthly billing failed:', result.error);
    return null;
  }
};

const testGetBillingsBySubscription = async () => {
  console.log(`\n📋 Testing GET /billing/subscriptions/${subscriptionId}/billings...`);
  const result = await makeRequest('GET', `/billing/subscriptions/${subscriptionId}/billings`);
  
  if (result.success) {
    console.log('✅ Get billings by subscription successful');
    console.log(`📊 Found ${result.data.data?.length || 0} billings for subscription`);
    return result.data.data;
  } else {
    console.log('❌ Get billings by subscription failed:', result.error);
    return [];
  }
};

const testUpdateSubscription = async (id) => {
  console.log(`\n✏️ Testing PUT /billing/subscriptions/${id}...`);
  
  const updateData = {
    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // Extend to 60 days
  };
  
  const result = await makeRequest('PUT', `/billing/subscriptions/${id}`, updateData);
  
  if (result.success) {
    console.log('✅ Update subscription successful');
    return result.data.data;
  } else {
    console.log('❌ Update subscription failed:', result.error);
    return null;
  }
};

// Main test runner
const runAllTests = async () => {
  console.log('🚀 Starting Billing Module Endpoint Tests...\n');
  
  try {
    // 1. Login as admin
    authToken = await testLogin(testData.admin, 'ADMIN');
    if (!authToken) {
      console.log('❌ Cannot proceed without authentication');
      return;
    }
    
    tenantId = testData.admin.tenant_id;
    
    // 2. Get tenant info (assuming we have tenant data)
    console.log('\n🏢 Getting tenant information...');
    const tenantsResult = await makeRequest('GET', '/tenants');
    if (tenantsResult.success && tenantsResult.data.data?.length > 0) {
      tenantId = tenantsResult.data.data[0].id;
      console.log(`✅ Using tenant ID: ${tenantId}`);
    } else {
      console.log('❌ No tenants found, cannot proceed with billing tests');
      return;
    }
    
    // 3. Test Plans endpoints
    await testGetAllPlans();
    
    // 4. Test Subscription endpoints
    subscriptionId = await testCreateSubscription();
    if (subscriptionId) {
      await testGetAllSubscriptions();
      await testGetSubscriptionById(subscriptionId);
      await testUpdateSubscription(subscriptionId);
    }
    
    // 5. Test Billing endpoints
    if (subscriptionId) {
      billingId = await testCreateBilling();
      if (billingId) {
        await testGetAllBillings();
        await testGetBillingById(billingId);
        await testUpdateBilling(billingId);
        await testPayBilling(billingId);
      }
      
      // 6. Test subscription-specific billing endpoints
      await testGetBillingsBySubscription();
      await testGenerateMonthlyBilling();
    }
    
    console.log('\n🎉 All billing endpoint tests completed!');
    
  } catch (error) {
    console.error('💥 Test runner error:', error.message);
  }
};

// Run tests
runAllTests().catch(console.error);