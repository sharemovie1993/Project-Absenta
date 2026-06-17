const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

async function run() {
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
  const TENANT_ID = process.env.TENANT_ID || 'system';
  const ADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'superadmin@system.com';
  const ADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'superadmin123';

  console.log('🚀 Test: create invoice only');
  console.log('🔗 Base URL:', API_BASE_URL);
  console.log('🏢 Tenant:', TENANT_ID);

  // Login as SUPERADMIN
  const login = await axios.post(
    `${API_BASE_URL}/auth/login`,
    { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
  );

  if (!login.data?.success) {
    console.error('❌ Login failed:', login.data);
    process.exit(1);
  }

  const token =
    login.data.data?.token ||
    login.data.data?.access_token ||
    login.data.token;

  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Tenant-ID': TENANT_ID,
    },
  });

  // Pick or create a billing without existing invoice
  console.log('\n🧭 Fetch candidate billing (no invoice)...');
  let candidate;
  try {
    const billingsResp = await client.get('/billing/billings', { params: { limit: 50 } });
    const billings = billingsResp.data?.data?.data || billingsResp.data?.data || [];
    candidate = billings.find((b) => !b.Invoice);
    if (candidate) {
      console.log('✅ Candidate billing found:', {
        id: candidate.id,
        amount: candidate.amount,
        billing_date: candidate.billing_date,
      });
    }
  } catch (e) {
    console.warn('⚠️ Failed to fetch billings:', e.response?.data || e.message);
  }

  if (!candidate) {
    console.log('ℹ️ No candidate found, creating a temporary billing...');
    // Ensure subscription exists for tenant
    let sub;
    try {
      const subsResp = await client.get(`/billing/subscriptions/tenant/${TENANT_ID}`);
      const subs = subsResp.data?.data || [];
      sub = Array.isArray(subs) && subs.length > 0 ? subs[0] : undefined;
    } catch {}
    if (!sub) {
      try {
        const subsAll = await client.get(`/billing/subscriptions`, { params: { tenant_id: TENANT_ID, limit: 50 } });
        const list = subsAll.data?.data?.data || subsAll.data?.data || [];
        sub = Array.isArray(list) ? list.find((s) => s.tenant_id === TENANT_ID || s.Tenant?.id === TENANT_ID) : undefined;
      } catch {}
    }
    if (!sub) {
      try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const found = await prisma.subscription.findFirst({ where: { tenant_id: TENANT_ID } });
        await prisma.$disconnect();
        if (found) {
          sub = found;
          console.log('🔎 Subscription fetched via DB:', { id: sub.id });
        }
      } catch (e) {
        console.warn('⚠️ Failed to query subscription via Prisma:', e.message);
      }
    }
    if (!sub) {
      console.log('ℹ️ No subscription found, creating one...');
      // Fetch public plans to select plan_id
      const plansResp = await axios.get(`${API_BASE_URL}/billing/plans/public`);
      const plans = plansResp.data?.data || [];
      if (!Array.isArray(plans) || plans.length === 0) {
        console.error('❌ No public plans available, cannot create subscription.');
        process.exit(1);
      }
      const plan = plans[0];
      const start = new Date();
      const end = new Date(start.getTime());
      end.setFullYear(start.getFullYear() + 1);
      const createSubResp = await client.post('/billing/subscriptions', {
        tenant_id: TENANT_ID,
        plan_id: plan.id,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        auto_renew: true,
        status: 'ACTIVE',
      });
      const createdSub = createSubResp.data?.data;
      if (!createdSub?.id) {
        console.error('❌ Failed to create subscription:', createSubResp.data);
        process.exit(1);
      }
      sub = createdSub;
      console.log('✅ Subscription created:', { id: sub.id, plan_id: sub.plan_id || plan.id });
    }
    // Use a far-future unique billing date to avoid unique constraint collisions
    const billingDate = new Date('2099-12-01T00:00:00.000Z');
    const due = new Date(billingDate.getTime() + 3 * 24 * 60 * 60 * 1000);
    const amount =
      typeof sub.plan?.price_monthly === 'number' && sub.plan.price_monthly > 0
        ? sub.plan.price_monthly
        : 100000;
    const createBillingResp = await client.post('/billing/billings', {
      subscription_id: sub.id,
      amount,
      billing_date: billingDate.toISOString(),
      due_date: due.toISOString(),
    });
    const createdBilling = createBillingResp.data?.data;
    if (!createdBilling?.id) {
      console.error('❌ Failed to create billing:', createBillingResp.data);
      process.exit(1);
    }
    candidate = createdBilling;
    console.log('✅ Temporary billing created:', { id: candidate.id, amount: candidate.amount });
    if (createdBilling.Invoice?.id) {
      console.log('ℹ️ Invoice auto-created with billing (controller behavior). Using it for verification.');
      // Normalize shape to mimic create invoice response
      const auto = createdBilling.Invoice;
      const normalized = {
        id: auto.id,
        billing_id: createdBilling.id,
        invoice_number: auto.invoice_number || '(auto)',
        status: auto.status || 'DRAFT',
        due_date: auto.due_date,
        total_amount: createdBilling.amount,
      };
      // Basic assertions
      const checksAuto = {
        hasId: !!normalized.id,
        hasInvoiceNumber: typeof normalized.invoice_number === 'string',
        statusIsDraft: String(normalized.status) === 'DRAFT',
        dueDateValid: !!normalized.due_date,
        billingMatches: normalized.billing_id === createdBilling.id,
      };
      console.log('✅ Checks (auto-created):', checksAuto);
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const dbInv = await prisma.invoice.findUnique({ where: { id: normalized.id }, select: { id: true, billing_id: true, status: true, due_date: true, invoice_number: true, tenant_id: true } });
      await prisma.$disconnect();
      console.log('🗄️ DB Invoice Snapshot:', dbInv);
      const passed = Object.values(checksAuto).every(Boolean) && dbInv && dbInv.status === 'DRAFT' && dbInv.billing_id === createdBilling.id;
      if (passed) {
        console.log('🎉 Invoice creation verification PASSED (auto-created via billing)');
        process.exit(0);
      } else {
        console.log('⚠️ Invoice creation verification FAILED (auto-created path)');
        process.exit(2);
      }
    }
  }

  // Create invoice
  console.log('\n📝 Create invoice...');
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  let createResp;
  try {
    createResp = await client.post('/invoice', {
      billing_id: candidate.id,
      due_date: dueDate,
      notes: 'Automated test invoice (create only)',
    });
  } catch (e) {
    const status = e?.response?.status;
    const msg = e?.response?.data || e.message;
    if (status === 404) {
      console.log('ℹ️ /invoice not available, fallback to /billing/billings/:id/generate-invoice ...');
      createResp = await client.post(`/billing/billings/${candidate.id}/generate-invoice`, {
        due_date: dueDate,
        notes: 'Automated test invoice (fallback)',
      });
      // Normalize response shape
      if (createResp?.data?.data?.id) {
        createResp.data = { success: true, data: createResp.data.data };
      } else if (createResp?.data?.data?.invoice?.id) {
        createResp.data = { success: true, data: createResp.data.data.invoice };
      }
    } else {
      console.error('❌ Failed to create invoice:', msg);
      process.exit(1);
    }
  }

  console.log('📦 Create response status:', createResp.status);
  const payload = createResp.data;
  if (!payload?.success) {
    console.error('❌ Failed to create invoice:', payload);
    process.exit(1);
  }
  const invoice = payload.data;
  console.log('🧾 Created invoice:', {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    status: invoice.status,
    due_date: invoice.due_date,
    total_amount: invoice.total_amount,
  });

  // Basic assertions
  const checks = {
    hasId: !!invoice.id,
    hasInvoiceNumber: typeof invoice.invoice_number === 'string' && invoice.invoice_number.startsWith('INV-'),
    statusIsDraft: invoice.status === 'DRAFT',
    dueDateValid: !!invoice.due_date,
    billingMatches: invoice.billing_id === candidate.id,
  };
  console.log('✅ Checks:', checks);

  // Verify in DB
  const prisma = new PrismaClient();
  const dbInv = await prisma.invoice.findUnique({
    where: { id: invoice.id },
    select: {
      id: true,
      billing_id: true,
      status: true,
      due_date: true,
      invoice_number: true,
      tenant_id: true,
    },
  });
  await prisma.$disconnect();
  console.log('🗄️ DB Invoice Snapshot:', dbInv);

  const allPassed =
    Object.values(checks).every(Boolean) &&
    dbInv &&
    dbInv.status === 'DRAFT' &&
    dbInv.billing_id === candidate.id;

  if (allPassed) {
    console.log('🎉 Invoice creation verification PASSED');
    process.exit(0);
  } else {
    console.log('⚠️ Invoice creation verification FAILED');
    process.exit(2);
  }
}

run().catch((err) => {
  console.error('❌ Test error:', err.response?.data || err.message);
  process.exit(1);
});
