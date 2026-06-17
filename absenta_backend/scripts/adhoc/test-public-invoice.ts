import 'dotenv/config';
import { prisma } from '../../src/utils/prisma';
import { subscriptionController } from '../../src/modules/billing/controllers/subscription.controller';

async function orderAndGetPublic(): Promise<{ token: string; invoiceId: string; publicUrl?: string }> {
  const tenant = await prisma.tenant.findFirst({ select: { id: true, name: true }, orderBy: { created_at: 'asc' } });
  if (!tenant) throw new Error('No tenant found');
  const plan = await prisma.plan.findFirst({
    where: { is_active: true, is_public: true, price_monthly: { gt: 0 } as any },
    orderBy: { price_monthly: 'asc' },
    select: { id: true, name: true },
  });
  if (!plan) throw new Error('No active & public plan found');

  const fakeUser = { roleName: 'ADMIN', tenant_id: tenant.id };
  const request: any = {
    user: fakeUser,
    body: { plan_id: plan.id },
    headers: { origin: 'http://localhost:5173' },
    correlationId: `adhoc-test-${Date.now()}`
  };
  const reply: any = { statusCode: 200, status(code: number) { this.statusCode = code; return this; } };
  const res = await (subscriptionController as any).orderPlan(request, reply);
  if (reply.statusCode !== 200) throw new Error(`orderPlan failed: ${JSON.stringify(res)}`);
  const invoiceId = String(res?.data?.checkout?.invoice_id || '');
  const token = String(res?.data?.checkout?.public_token || '');
  const publicUrl = String(res?.data?.checkout?.public_url || '');
  if (!invoiceId || !token) throw new Error('Missing invoiceId or public token from order response');
  return { token, invoiceId, publicUrl };
}

async function testPublicApi(token: string, invoiceId: string) {
  const apiBase = process.env.API_PUBLIC_BASE || 'http://localhost:3001';
  const url = `${apiBase.replace(/\/+$/, '')}/invoice/public/${encodeURIComponent(token)}?i=${encodeURIComponent(invoiceId)}`;
  console.log('GET', url);
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  const txt = await r.text();
  console.log('Status:', r.status);
  console.log('Body:', txt.slice(0, 500));
  if (r.status !== 200) throw new Error(`Public API GET failed with status ${r.status}`);
}

async function main() {
  try {
    const r = await orderAndGetPublic();
    console.log('Order OK:', r);
    await testPublicApi(r.token, r.invoiceId);
    console.log('\n=== RESULT: PASS (Public invoice endpoint accessible) ===');
  } catch (e: any) {
    console.error('Test failed:', e?.message || e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();

