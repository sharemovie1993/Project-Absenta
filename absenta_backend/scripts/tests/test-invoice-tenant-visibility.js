/**
 * Invoice Tenant Visibility Test
 *
 * Tujuan:
 * - Login sebagai SUPERADMIN (superadmin@system.com / superadmin123)
 * - Panggil endpoint GET /api/invoice
 * - Hitung nilai tampilan kolom Tenant (name + domain/email) sesuai fallback frontend
 * - Gagalkan test jika ada invoice yang menghasilkan 'N/A' untuk name atau domain/email
 *
 * Cara pakai:
 *   node backend/scripts/test-invoice-tenant-visibility.js
 *
 * Opsional ENV:
 *   API_BASE_URL, TEST_EMAIL, TEST_PASSWORD, TEST_TENANT_ID
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const TEST_EMAIL = process.env.TEST_EMAIL || 'superadmin@system.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'superadmin123';
const TEST_TENANT_ID = process.env.TEST_TENANT_ID || '';

function logStep(title) {
  console.log(`\n==== ${title} ====`);
}

function safe(obj, path, def = undefined) {
  return path
    .split('.')
    .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj) ?? def;
}

async function loginSuperadmin() {
  logStep('Login sebagai SUPERADMIN');
  const resp = await axios.post(
    `${API_BASE_URL}/auth/login`,
    { email: TEST_EMAIL, password: TEST_PASSWORD },
    { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
  );

  if (!resp.data?.success) throw new Error(`Login gagal: ${resp.data?.message}`);
  const token = safe(resp, 'data.data.token') || resp.data.token || resp.data.access_token;
  if (!token) throw new Error('Token tidak ditemukan pada respons login');
  console.log('✅ Login sukses');
  return token;
}

function makeClient(token, { skipTenant = true, tenantId = '' } = {}) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  if (skipTenant) headers['X-Skip-Tenant'] = 'true';
  if (tenantId) headers['X-Tenant-ID'] = tenantId;

  return axios.create({ baseURL: API_BASE_URL, timeout: 15000, headers });
}

async function fetchInvoices(client) {
  logStep('GET /invoice');
  const params = { limit: 50 };
  if (TEST_TENANT_ID) params.tenant_id = TEST_TENANT_ID;
  const resp = await client.get('/invoice', { params });
  console.log('Status:', resp.status);
  const list = resp.data?.data?.data || resp.data?.data || [];
  console.log('Jumlah invoice:', Array.isArray(list) ? list.length : 0);
  return list;
}

function computeTenantDisplays(inv) {
  // Support casing per backend (Billing) dan fallback frontend (billing)
  const b = inv?.Billing || inv?.billing;
  const s = b?.Subscription || b?.subscription;
  const t = s?.Tenant || s?.tenant;

  const nameDisplay = (t?.name || inv?.tenant?.name || 'N/A');
  const domainOrEmailDisplay = (t?.domain || t?.email || inv?.tenant?.email || 'N/A');

  return { nameDisplay, domainOrEmailDisplay };
}

async function run() {
  try {
    console.log('🧪 Invoice Tenant Visibility Test');
    console.log('BASE_URL:', API_BASE_URL);
    if (TEST_TENANT_ID) {
      console.log('Tenant filter aktif, TEST_TENANT_ID =', TEST_TENANT_ID);
    }

    const token = await loginSuperadmin();
    // Jika TEST_TENANT_ID tersedia, jangan set X-Skip-Tenant
    const client = makeClient(token, { skipTenant: !TEST_TENANT_ID, tenantId: TEST_TENANT_ID });

    const invoices = await fetchInvoices(client);
    if (!Array.isArray(invoices) || invoices.length === 0) {
      console.log('ℹ️ Tidak ada invoice yang ditemukan. Pastikan data uji sudah dibuat.');
      process.exit(0);
    }

    let failCount = 0;
    invoices.forEach((inv, idx) => {
      const { nameDisplay, domainOrEmailDisplay } = computeTenantDisplays(inv);
      const invNumber = inv.invoice_number || inv.number || inv.id;
      console.log(
        `#${idx + 1} INV=${invNumber} TenantName="${nameDisplay}" TenantContact="${domainOrEmailDisplay}"`
      );

      if (nameDisplay === 'N/A' || domainOrEmailDisplay === 'N/A') {
        failCount += 1;
        console.warn(
          `⚠️ Invoice ${inv.id} memiliki kolom tenant yang tidak lengkap (N/A).`
        );
        try {
          console.log('🔎 Debug invoice object:', JSON.stringify(inv, null, 2));
          const b = inv?.Billing || inv?.billing;
          const s = b?.Subscription || b?.subscription;
          const t = s?.Tenant || s?.tenant;
          console.log('🔎 Paths:', {
            hasBilling: !!b,
            hasSubscription: !!s,
            hasTenant: !!t,
            tenantName: t?.name,
            tenantDomain: t?.domain,
            tenantEmail: t?.email,
            fallbackTenantName: inv?.tenant?.name,
            fallbackTenantEmail: inv?.tenant?.email,
          });
        } catch (e) {
          console.log('🔎 Debug serialize error:', e?.message || e);
        }
      }
    });

    if (failCount > 0) {
      console.error(`\n❌ Gagal: ${failCount} invoice memiliki kolom tenant 'N/A'.`);
      process.exit(1);
    } else {
      console.log('\n✅ Berhasil: Semua invoice memiliki kolom tenant yang tampil (bukan N/A).');
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Error:', err.response?.status, err.response?.data || err.message);
    console.error('🧩 Tips: Pastikan backend berjalan di', API_BASE_URL.replace('/api',''));
    console.error('     Jalankan: npm run dev (di folder backend)');
    process.exit(1);
  }
}

if (require.main === module) {
  run();
}
