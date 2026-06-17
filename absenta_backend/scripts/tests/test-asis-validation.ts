
import { PrismaClient } from '@prisma/client';
import { authService } from './src/modules/auth/services/auth.service';
import { billingService } from './src/modules/billing/services/billing.service';

const prisma = new PrismaClient();

async function runTest() {
  console.log('STARTING AS-IS FUNCTIONAL & SAFETY TESTING\n');

  let tenantId = '';
  let subscriptionId = '';
  let billingId = '';
  let invoiceId = '';

  // ==========================================
  // A. HAPPY PATH
  // ==========================================
  console.log('--- A. HAPPY PATH: REGISTRATION & PAYMENT ---');

  try {
    // 1. Registrasi Tenant
    const uniqueSuffix = Date.now();
    const registerInput = {
      tenant_name: `Test Tenant ${uniqueSuffix}`,
      tenant_domain: `test${uniqueSuffix}`,
      admin_full_name: 'Test Admin',
      admin_email: `admin${uniqueSuffix}@test.com`,
      admin_password: 'password123',
      admin_phone: '08123456789',
      plan_id: '89682644-bc6f-45af-b58c-47c772a7c21d', // PAID PLAN ID
      billing_cycle_months: 1
    };

    console.log(`[TEST] Registering tenant: ${registerInput.tenant_name}...`);
    const regResult = await authService.registerTenant(registerInput);
    tenantId = regResult.tenant.id;
    subscriptionId = regResult.subscription.id;
    
    console.log(`[PASS] Tenant Registered. ID: ${tenantId}`);
    console.log(`[PASS] Subscription Created. ID: ${subscriptionId}`);

    // 2. Verify Initial State
    const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
    const billing = await prisma.billing.findFirst({ where: { subscription_id: subscriptionId } });
    
    if (!billing) throw new Error('Billing not created automatically');
    billingId = billing.id;

    const invoice = await prisma.invoice.findFirst({ where: { billing_id: billingId } });
    if (!invoice) throw new Error('Invoice not created automatically');
    invoiceId = invoice.id;

    console.log(`[INFO] Subscription Status: ${sub?.status}`);
    console.log(`[INFO] Invoice Status: ${invoice.status}`);

    if ((sub?.status as any) === 'PENDING_PAYMENT' || (sub?.status as any) === 'INACTIVE') {
       console.log('[PASS] Subscription is NOT ACTIVE initially');
    } else {
       console.log(`[FAIL] Subscription is ${sub?.status} (Expected PENDING/INACTIVE)`);
    }

    if ((invoice.status as any) === 'DRAFT' || (invoice.status as any) === 'UNPAID') {
       console.log('[PASS] Invoice is UNPAID initially');
    } else {
       console.log(`[FAIL] Invoice is ${invoice.status} (Expected DRAFT/UNPAID)`);
    }

    // 3. Simulate Payment Success (via Authority: BillingService.markAsPaid)
    console.log(`[TEST] Simulating Payment Success via BillingService.markAsPaid(${billingId})...`);
    await billingService.markAsPaid(billingId, 'MANUAL_TEST', 'REF_TEST_001');

    // 4. Verify Final State
    const subAfter = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
    const invoiceAfter = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    const billingAfter = await prisma.billing.findUnique({ where: { id: billingId } });

    console.log(`[INFO] Final Invoice Status: ${invoiceAfter?.status}`);
    console.log(`[INFO] Final Billing Status: ${billingAfter?.status}`);
    console.log(`[INFO] Final Subscription Status: ${subAfter?.status}`);

    if (invoiceAfter?.status === 'PAID') console.log('[PASS] Invoice marked as PAID');
    else console.log('[FAIL] Invoice not PAID');

    if (billingAfter?.status === 'PAID') console.log('[PASS] Billing marked as PAID');
    else console.log('[FAIL] Billing not PAID');

    if (subAfter?.status === 'ACTIVE') console.log('[PASS] Subscription Activated');
    else console.log('[FAIL] Subscription NOT Activated');

  } catch (error) {
    console.error('[FAIL] Happy Path Error:', error);
  }

  // ==========================================
  // B. NEGATIVE & SAFETY TEST
  // ==========================================
  console.log('\n--- B. NEGATIVE & SAFETY TEST: DOUBLE PAYMENT ---');
  try {
    console.log(`[TEST] Attempting DOUBLE call to markAsPaid(${billingId})...`);
    await billingService.markAsPaid(billingId, 'MANUAL_TEST', 'REF_TEST_002');
    console.log('[FAIL] Second call succeeded (Should have failed)');
  } catch (error: any) {
    if (error.message.includes('already marked as paid')) {
      console.log(`[PASS] Blocked by System: "${error.message}"`);
    } else {
      console.log(`[FAIL] Unexpected error: ${error.message}`);
    }
  }

  // ==========================================
  // C. REPORTING READ-ONLY
  // ==========================================
  console.log('\n--- C. REPORTING READ-ONLY CHECK ---');
  try {
    console.log('[TEST] Reading Financial Report (Mock)...');
    // Mocking report access by counting records before and after
    const countBefore = await prisma.financialReport.count();
    
    // Simulate read
    const reports = await prisma.financialReport.findMany({ take: 5 });
    console.log(`[INFO] Read ${reports.length} reports`);

    const countAfter = await prisma.financialReport.count();
    if (countBefore === countAfter) {
      console.log('[PASS] No data mutation detected during read');
    } else {
      console.log('[FAIL] Data mutation detected!');
    }

  } catch (error) {
    console.error('[FAIL] Reporting Error:', error);
  }

  console.log('\nTEST COMPLETED.');
  await prisma.$disconnect();
}

runTest();
