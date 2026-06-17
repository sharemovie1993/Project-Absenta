import 'dotenv/config';
import { prisma } from '../../src/utils/prisma';
import { subscriptionController } from '../../src/modules/billing/controllers/subscription.controller';

type ReplyCapture = {
  statusCode: number;
  payload: any;
  status: (code: number) => ReplyCapture;
  send: (data: any) => void;
};

function createReply(): ReplyCapture {
  const cap: any = {
    statusCode: 200,
    payload: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(data: any) {
      this.payload = data;
    }
  };
  return cap as ReplyCapture;
}

async function pickTenantAndPlan() {
  const tenant = await prisma.tenant.findFirst({
    where: {},
    orderBy: { created_at: 'asc' },
    select: { id: true, name: true }
  });
  if (!tenant) throw new Error('No tenant found in database');

  const plan = await prisma.plan.findFirst({
    where: { is_active: true, is_public: true, price_monthly: { gt: 0 } as any },
    orderBy: { price_monthly: 'asc' },
    select: { id: true, name: true, is_active: true, is_public: true }
  });
  if (!plan) throw new Error('No active & public plan found');

  return { tenant, plan };
}

async function run() {
  console.log('=== Upgrade Flow Test (Order → Checkout public token) ===');
  const { tenant, plan } = await pickTenantAndPlan();
  console.log(`Tenant: ${tenant.name} (${tenant.id})`);
  console.log(`Plan:   ${plan.name} (${plan.id})`);

  const fakeUser = {
    roleName: 'ADMIN',
    tenant_id: tenant.id,
  };

  const request: any = {
    user: fakeUser,
    body: { plan_id: plan.id },
    headers: { origin: 'http://localhost:5173' },
    correlationId: `adhoc-test-${Date.now()}`
  };
  const reply = createReply();

  try {
    const result = await (subscriptionController as any).orderPlan(request, reply);
    const status = reply.statusCode;
    console.log('Order status:', status);
    console.log('Order response:', JSON.stringify(result, null, 2));

    if (status !== 200 || !result?.data?.checkout?.invoice_id) {
      throw new Error(`Order failed or missing invoice_id (status=${status})`);
    }
    const invoiceId = String(result.data.checkout.invoice_id);
    const publicUrl = result?.data?.checkout?.public_url;
    const token = result?.data?.checkout?.public_token;
    console.log('Invoice ID:', invoiceId);
    if (publicUrl) console.log('Public URL:', publicUrl);
    if (token) console.log('Public Token:', token);

    console.log('\n=== RESULT: PASS (Order produced checkout with invoice and public link) ===');
  } catch (e: any) {
    console.error('Upgrade flow test failed:', e?.message || e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((e) => {
  console.error('Unhandled error:', e);
  process.exit(1);
});
