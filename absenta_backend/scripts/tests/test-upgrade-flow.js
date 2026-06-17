const axios = require('axios');

async function run() {
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
  const TENANT_ID = process.env.TENANT_ID || '112e351e-6b65-4eab-8cc7-d7fafafcf125';
  const ADMIN_CANDIDATES = [
    { email: process.env.ADMIN_EMAIL || 'admin@smkn1cimahi.com', password: process.env.ADMIN_PASSWORD || 'admin123' },
    { email: 'cimahi@gamil.com', password: 'admin1234' }
  ];

  console.log('🚀 Test: upgrade flow until invoice accessible by ADMIN');
  console.log('🔗 Base URL:', API_BASE_URL);
  console.log('🏢 Tenant:', TENANT_ID);

  let token = '';
  let lastError;
  for (const cred of ADMIN_CANDIDATES) {
    try {
      const login = await axios.post(`${API_BASE_URL}/auth/login`, { email: cred.email, password: cred.password }, { headers: { 'Content-Type': 'application/json' }, timeout: 12000 });
      if (login.data?.success) {
        token = login.data.data?.token || login.data.data?.access_token || login.data.token;
        console.log('✅ Login ADMIN:', cred.email);
        break;
      }
    } catch (e) {
      lastError = e;
    }
  }
  if (!token) {
    console.error('❌ Login ADMIN gagal:', lastError?.response?.data || lastError?.message || 'unknown');
    process.exit(1);
  }

  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 20000,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Tenant-ID': TENANT_ID,
    },
  });

  console.log('\n📦 Ambil daftar plan publik...');
  let plansResp = await client.get('/billing/plans/public');
  let plans = plansResp.data?.data || [];
  let paidPlans = plans.filter((p) => typeof p.price_monthly === 'number' && p.price_monthly > 0 && p.is_active && p.is_public);
  let plan = paidPlans[0];
  if (!plan) {
    console.log('ℹ️ Tidak ada plan berbayar, membuat plan sementara via SUPERADMIN...');
    const superLogin = await axios.post(`${API_BASE_URL}/auth/login`, { email: 'superadmin@system.com', password: 'superadmin123' }, { headers: { 'Content-Type': 'application/json' }, timeout: 12000 });
    const superToken = superLogin.data?.data?.token || superLogin.data?.data?.access_token || superLogin.data?.token;
    const superClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: 20000,
      headers: {
        Authorization: `Bearer ${superToken}`,
        'Content-Type': 'application/json',
        'X-Tenant-ID': TENANT_ID,
      },
    });
    const uniqueName = `TEST_PRO_${Date.now()}`;
    const createPlan = await superClient.post('/billing/plans', {
      name: uniqueName,
      price_monthly: 50000,
      max_user: 100,
      features: JSON.stringify(['CORE']),
      currency: 'IDR'
    });
    const newPlan = createPlan.data?.data;
    if (!newPlan?.id) {
      console.error('❌ Gagal membuat plan berbayar');
      process.exit(1);
    }
    plan = newPlan;
  }
  console.log('✅ Plan terpilih:', { id: plan.id, name: plan.name, price: plan.price_monthly });

  console.log('\n🧙 Jalankan upgrade wizard (SELECT_PLAN)...');
  let checkout = null;
  try {
    const wizardResp = await client.post('/billing/subscriptions/upgrade-wizard', { action: 'SELECT_PLAN', plan_id: plan.id });
    const res = wizardResp.data;
    checkout = res?.data?.checkout || null;
    if (!checkout || !checkout.invoice_id) {
      console.log('ℹ️ Respons wizard tanpa checkout, fallback ke /billing/subscriptions/order');
      const orderResp = await client.post('/billing/subscriptions/order', { plan_id: plan.id });
      checkout = orderResp.data?.data?.checkout || null;
    }
  } catch (e) {
    console.log('ℹ️ Wizard gagal, fallback ke /billing/subscriptions/order');
    const orderResp = await client.post('/billing/subscriptions/order', { plan_id: plan.id });
    checkout = orderResp.data?.data?.checkout || null;
  }

  if (!checkout || !checkout.invoice_id) {
    console.error('❌ Gagal mendapatkan invoice dari proses upgrade');
    process.exit(2);
  }
  console.log('✅ Checkout:', checkout);

  const invoiceId = String(checkout.invoice_id);
  console.log('\n🔎 Verifikasi akses invoice sebagai ADMIN...');
  let inv = null;
  try {
    const byId = await client.get(`/invoice/${invoiceId}`);
    inv = byId.data?.data || null;
  } catch {}
  if (!inv) {
    try {
      const list = await client.get('/invoice', { params: { limit: 50 } });
      const arr = list.data?.data?.data || list.data?.data || [];
      inv = Array.isArray(arr) ? arr.find((x) => String(x.id) === invoiceId) : null;
    } catch {}
  }
  if (!inv) {
    try {
      const bills = await client.get('/billing/billings', { params: { limit: 50 } });
      const arr = bills.data?.data?.data || bills.data?.data || [];
      const host = Array.isArray(arr) ? arr.find((b) => String(b?.Invoice?.id || '') === invoiceId) : null;
      if (host && host.Invoice) {
        inv = { id: String(host.Invoice.id), status: String(host.Invoice.status), due_date: host.Invoice.due_date };
      }
    } catch {}
  }
  if (!inv) {
    console.error('❌ Invoice tidak dapat diakses oleh ADMIN');
    process.exit(3);
  }
  console.log('✅ Invoice dapat diakses oleh ADMIN:', { id: inv.id, status: inv.status, due_date: inv.due_date });

  console.log('\n🎉 Upgrade flow verification PASSED');
  process.exit(0);
}

run().catch(async (err) => {
  console.error('❌ Test error:', err.response?.data || err.message);
  if (String(process.env.RESET_ON_FAIL || '').toLowerCase() === 'true') {
    try {
      console.log('🧹 Menjalankan reset billing (truncate-billing.ts)...');
      const { execSync } = require('child_process');
      execSync('npx ts-node -r tsconfig-paths/register scripts/adhoc/truncate-billing.ts', { stdio: 'inherit' });
      console.log('✅ Reset selesai. Jalankan ulang test jika diperlukan.');
    } catch (e) {
      console.error('❌ Gagal reset billing:', e.message || e);
    }
  }
  process.exit(1);
});
