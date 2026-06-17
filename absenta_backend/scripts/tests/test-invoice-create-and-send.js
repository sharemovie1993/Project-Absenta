const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

async function run() {
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
  const TENANT_ID = process.env.TENANT_ID || 'f47ac10b-58cc-4372-a567-0e02b2c3d482';
  const ADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'superadmin@system.com';
  const ADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'superadmin123';

  console.log('🚀 Test: create and send invoice');
  console.log('🔗 Base URL:', API_BASE_URL);
  console.log('🏢 Tenant:', TENANT_ID);

  // Login as SUPERADMIN
  const login = await axios.post(`${API_BASE_URL}/auth/login`, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
  });

  if (!login.data?.success) {
    console.error('❌ Login failed:', login.data);
    return;
  }

  const token = login.data.data?.token || login.data.data?.access_token || login.data.token;
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Tenant-ID': TENANT_ID,
    },
  });

  // Find an unpaid billing (no payment yet)
  console.log('\n🧭 Fetch candidate billing...');
  const billingsResp = await client.get('/billing/billings', {
    params: { limit: 20 },
  });

  const billings = billingsResp.data?.data?.data || billingsResp.data?.data || [];
  const candidate = billings.find(b => !b.Invoice); // prefer those without existing invoice
  if (!candidate) {
    console.error('⚠️ No candidate billing found');
    return;
  }
  console.log('✅ Candidate billing:', { id: candidate.id, amount: candidate.amount, billing_date: candidate.billing_date });

  // Create invoice
  console.log('\n📝 Create invoice from billing...');
  const dueDate = new Date(Date.now() + 7*24*60*60*1000).toISOString();
  const createResp = await client.post('/invoice', {
    billing_id: candidate.id,
    due_date: dueDate,
    notes: 'E2E test invoice',
  });

  console.log('📦 Create response:', JSON.stringify(createResp.data, null, 2));
  if (!createResp.data?.success) {
    console.error('❌ Failed to create invoice');
    return;
  }
  const invoiceId = createResp.data.data?.id;
  
  // Send invoice
  console.log('\n✉️ Send invoice...');
  const sendResp = await client.put(`/invoice/${invoiceId}/send`, {});
  console.log('📦 Send response:', JSON.stringify(sendResp.data, null, 2));

  // Verify fields
  console.log('\n🔎 Verify invoice fields...');
  const getResp = await client.get(`/invoice/${invoiceId}`);
  const inv = getResp.data?.data || {};
  const checks = {
    statusIsSent: inv.status === 'SENT',
    sentAtSet: !!inv.sent_at,
  };
  console.log('✅ Checks:', checks);

  // Verify email_sent directly from DB (API doesn't expose this field)
  const prisma = new PrismaClient();
  const dbInv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { email_sent: true, status: true, sent_at: true }
  });
  await prisma.$disconnect();
  const emailSentDbTrue = dbInv?.email_sent === true;
  console.log('🗄️ DB email_sent:', dbInv?.email_sent, 'status:', dbInv?.status, 'sent_at:', dbInv?.sent_at);

  if (checks.statusIsSent && checks.sentAtSet && emailSentDbTrue) {
    console.log('🎉 Invoice send verification PASSED');
  } else {
    console.log('⚠️ Invoice send verification FAILED');
  }
}

run().catch(err => {
  console.error('❌ Test error:', err.response?.data || err.message);
});
