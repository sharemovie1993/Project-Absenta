const axios = require('axios');

async function run() {
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
  const TENANT_ID = process.env.TENANT_ID || '112e351e-6b65-4eab-8cc7-d7fafafcf125';
  const ADMIN_CANDIDATES = [
    { email: process.env.ADMIN_EMAIL || 'admin@smkn1cimahi.com', password: process.env.ADMIN_PASSWORD || 'admin123' },
    { email: 'cimahi@gamil.com', password: 'admin1234' },
    { email: 'superadmin@system.com', password: 'superadmin123', tenantHeader: TENANT_ID }
  ];

  console.log('🧭 Open Invoice List (Tenant Context)');
  console.log('🔗 Base URL:', API_BASE_URL);
  console.log('🏢 Tenant:', TENANT_ID);

  let token = '';
  let lastError;
  for (const cred of ADMIN_CANDIDATES) {
    try {
      const login = await axios.post(`${API_BASE_URL}/auth/login`, { email: cred.email, password: cred.password }, { headers: { 'Content-Type': 'application/json' }, timeout: 12000 });
      if (login.data?.success) {
        token = login.data.data?.token || login.data.data?.access_token || login.data.token;
        console.log('✅ Login:', cred.email);
        if (cred.tenantHeader) {
          console.log('ℹ️ Using SUPERADMIN token with X-Tenant-ID override for tenant scope');
        }
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

  console.log('\n📥 Mengambil daftar invoice (ADMIN-scoped)...');
  let list = [];
  try {
    const resp = await client.get('/invoice', { params: { limit: 50 } });
    list = resp.data?.data?.data || resp.data?.data || [];
  } catch (e) {
    const status = e?.response?.status;
    if (status === 404) {
      console.log('ℹ️ Endpoint /invoice tidak tersedia. Fallback via /billing/billings ...');
      const bResp = await client.get('/billing/billings', { params: { limit: 100 } });
      const billings = bResp.data?.data?.data || bResp.data?.data || [];
      const invoices = (Array.isArray(billings) ? billings : [])
        .map(b => b.Invoice)
        .filter(Boolean)
        .map(inv => ({
          id: inv.id,
          invoice_number: inv.invoice_number || '(auto)',
          status: inv.status,
          due_date: inv.due_date,
          amount: inv.amount || 0
        }));
      list = invoices;
    } else {
      throw e;
    }
  }
  console.log('📊 Jumlah invoice:', Array.isArray(list) ? list.length : 0);
  if (Array.isArray(list) && list.length > 0) {
    const preview = list.slice(0, 5);
    console.log('🧾 Sample (max 5):');
    console.log(JSON.stringify(preview, null, 2));
  }

  console.log('\n🔑 Tips akses UI:');
  console.log('- Pastikan login sebagai ADMIN tenant di frontend.');
  console.log('- Halaman daftar invoice sesuai routing frontend (misal: /invoice/list).');
  console.log('- Backend siap di: http://localhost:3001/api');

  console.log('\n✅ Invoice list retrieved successfully');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Error:', err.response?.data || err.message);
  process.exit(1);
});
