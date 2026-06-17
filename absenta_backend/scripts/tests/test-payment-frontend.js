/**
 * Frontend-oriented Payment Endpoint Test
 *
 * Menguji endpoint payment yang dipakai frontend:
 * - GET /api/payments/list (dengan filter gateway)
 * - GET /api/payments/stats
 * - GET /api/payments/gateways
 * - GET /api/payments/health
 *
 * Cara pakai:
 *  NODE_OPTIONS=--no-warnings node backend/test-payment-frontend.js
 *  (opsional env) API_BASE_URL, TEST_EMAIL, TEST_PASSWORD, TEST_AUTH_TOKEN, TEST_TENANT_ID
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
const path = require('path');
// Pastikan membaca .env dari folder backend
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Konfigurasi dasar
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'superadmin@system.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'superadmin123';
const TEST_TENANT_ID = process.env.TEST_TENANT_ID || '';
let AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

function generateTokenFallback() {
  // Payload disesuaikan dengan UserPayload (id, email, roleId, roleName, tenantId?)
  const payload = {
    id: process.env.SUPERADMIN_ID || 'ee9b5916-cdd5-43a0-a217-9f6b18146f70',
    email: process.env.SUPERADMIN_EMAIL || 'superadmin@system.com',
    tenantId: process.env.SUPERADMIN_TENANT_ID || undefined,
    roleId: process.env.SUPERADMIN_ROLE_ID || 'role-superadmin-id',
    roleName: 'SUPERADMIN',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 jam
  };
  const secret = process.env.JWT_SECRET || JWT_SECRET;
  const token = jwt.sign(payload, secret);
  console.log('🛠️ Generated fallback JWT (SUPERADMIN)');
  console.log('🔑 Token preview:', token.substring(0, 50) + '...');
  return token;
}

async function loginIfNeeded() {
  if (AUTH_TOKEN) {
    console.log('🔑 Using provided TEST_AUTH_TOKEN');
    return AUTH_TOKEN;
  }
  console.log('🔐 Logging in as SUPERADMIN to obtain token...');
  try {
    const resp = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    }, {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });
    if (!resp.data?.success) throw new Error(resp.data?.message || 'Login failed');
    AUTH_TOKEN = resp.data?.data?.token || '';
    console.log('✅ Login successful');
    console.log('🔑 Token preview:', AUTH_TOKEN ? AUTH_TOKEN.substring(0, 50) + '...' : 'NONE');
    return AUTH_TOKEN;
  } catch (err) {
    console.error('❌ Login error:', err.response?.data?.message || err.message);
    console.log('➡️ Falling back to local JWT generation using JWT_SECRET');
    AUTH_TOKEN = generateTokenFallback();
    return AUTH_TOKEN;
  }
}

function buildHeaders({ skipTenant = false, tenantId = '' } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (AUTH_TOKEN) headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  if (skipTenant) headers['X-Skip-Tenant'] = 'true';
  if (tenantId) headers['X-Tenant-ID'] = tenantId;
  return headers;
}

async function testPaymentStats({ skipTenant = false, tenantId = '' } = {}) {
  console.log(`\n📊 Testing GET /api/payments/stats (skipTenant=${skipTenant}, tenantId=${tenantId || '-'})`);
  try {
    const resp = await axios.get(`${BASE_URL}/api/payments/stats`, {
      headers: buildHeaders({ skipTenant, tenantId }),
      timeout: 15000
    });
    console.log('✅ Status:', resp.status);
    console.log('📄 Response:', JSON.stringify(resp.data, null, 2));
    const stats = resp.data?.data || resp.data;
    console.log('📈 Total Payments:', stats?.overview?.totalPayments ?? stats?.total_payments ?? '(unknown)');
    console.log('💵 Total Amount:', stats?.overview?.totalAmount ?? stats?.total_amount ?? '(unknown)');
  } catch (err) {
    console.error('❌ Error stats:', err.response?.status || 'Network Error');
    console.error('💬 Message:', err.response?.data?.message || err.message);
  }
}

async function testPaymentList({ gateway = '', skipTenant = false, tenantId = '' } = {}) {
  console.log(`\n📋 Testing GET /api/payments/list (gateway=${gateway || 'ALL'}, skipTenant=${skipTenant}, tenantId=${tenantId || '-'})`);
  try {
    const params = { page: 1, limit: 10 };
    if (gateway) params.gateway = gateway; // gunakan uppercase: MIDTRANS/STRIPE/XENDIT
    if (tenantId) params.tenant_id = tenantId;
    const resp = await axios.get(`${BASE_URL}/api/payments/list`, {
      params,
      headers: buildHeaders({ skipTenant, tenantId }),
      timeout: 20000
    });
    console.log('✅ Status:', resp.status);
    // Response bisa berupa { success, data: [] } atau { success, data: { payments: [] } }
    const raw = resp.data;
    const payments = Array.isArray(raw?.data) ? raw.data : (raw?.data?.payments || []);
    console.log('📦 Total Payments:', payments.length);
    if (payments.length > 0) {
      const p = payments[0];
      console.log('🔎 First Record:', JSON.stringify({
        id: p.id,
        billing_id: p.billing_id,
        invoice_number: p.invoice_number || p.invoice_id || p.external_id || p.payment_reference || p.billing_id,
        amount: p.amount,
        gateway: p.gateway || p.provider || p.gateway_name,
        status: p.status,
        paid_at: p.paid_at || p.created_at
      }, null, 2));
    }
  } catch (err) {
    console.error('❌ Error list:', err.response?.status || 'Network Error');
    console.error('💬 Message:', err.response?.data?.message || err.message);
  }
}

async function testPaymentHealth() {
  console.log(`\n🩺 Testing GET /api/payments/health`);
  try {
    const resp = await axios.get(`${BASE_URL}/api/payments/health`, {
      headers: buildHeaders(),
      timeout: 15000
    });
    console.log('✅ Status:', resp.status);
    console.log('📄 Response:', JSON.stringify(resp.data, null, 2));
    console.log('🟢 Message:', resp.data?.message || '(none)');
  } catch (err) {
    console.error('❌ Error health:', err.response?.status || 'Network Error');
    console.error('💬 Message:', err.response?.data?.message || err.message);
  }
}

async function testPaymentGateways() {
  console.log(`\n🔌 Testing GET /api/payments/gateways`);
  try {
    const resp = await axios.get(`${BASE_URL}/api/payments/gateways`, {
      headers: buildHeaders(),
      timeout: 15000
    });
    console.log('✅ Status:', resp.status);
    console.log('📄 Response:', JSON.stringify(resp.data, null, 2));
    const gateways = resp.data?.data?.gateways || resp.data?.gateways || [];
    console.log('🔌 Gateways:', Array.isArray(gateways) ? gateways.join(', ') : '(unknown)');
  } catch (err) {
    console.error('❌ Error gateways:', err.response?.status || 'Network Error');
    console.error('💬 Message:', err.response?.data?.message || err.message);
  }
}

async function tryGetAnyTenantId() {
  try {
    const resp = await axios.get(`${BASE_URL}/api/superadmin/tenants`, {
      headers: buildHeaders({ skipTenant: true }),
      timeout: 15000
    });
    const list = resp.data?.data || [];
    const id = list[0]?.id || list[0]?.tenant_id || '';
    if (id) console.log('🏷️ Using tenant id from superadmin list:', id);
    return id;
  } catch (err) {
    console.log('⚠️ Unable to fetch tenant list:', err.response?.data?.message || err.message);
    return '';
  }
}

async function run() {
  console.log('🧪 Payment Endpoint Test Suite (Frontend-oriented)');
  console.log('BASE_URL:', BASE_URL);
  await loginIfNeeded();

  // Simple mode style: skip tenant header
  await testPaymentStats({ skipTenant: true });
  await testPaymentList({ skipTenant: true });
  await testPaymentList({ gateway: 'MIDTRANS', skipTenant: true });
  await testPaymentList({ gateway: 'STRIPE', skipTenant: true });
  await testPaymentList({ gateway: 'XENDIT', skipTenant: true });
  await testPaymentGateways();
  await testPaymentHealth();

  // Tenant-scoped tests (if available)
  let tenantId = TEST_TENANT_ID;
  if (!tenantId) tenantId = await tryGetAnyTenantId();
  if (tenantId) {
    await testPaymentStats({ tenantId });
    await testPaymentList({ tenantId });
  } else {
    console.log('ℹ️ Skipping tenant-scoped tests (no tenant id available)');
  }

  console.log('\n✨ Tests completed');
}

run().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
