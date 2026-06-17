const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deepAudit() {
  try {
    console.log('--- Database Deep Audit ---');
    const user = await prisma.user.findFirst({
      where: { email: '2krw@gmail.com' },
      include: { Role: true }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User ID:', user.id);
    console.log('Tenant ID:', user.tenant_id);
    console.log('Role:', user.Role?.name);

    const subscriptions = await prisma.subscription.findMany({
      where: { tenant_id: user.tenant_id },
      include: {
        Plan: true,
        Billing: {
          include: { Invoice: true }
        }
      }
    });

    if (subscriptions.length === 0) {
      console.log('No subscriptions found');
      return;
    }

    for (const subscription of subscriptions) {
      console.log('\n--- Subscription Info ---');
      console.log('ID:', subscription.id);
      console.log('Status:', subscription.status);
      console.log('Current Plan:', subscription.Plan?.name);
      
      console.log('\n--- Plan Change Requests ---');
      const requests = await prisma.planChangeRequest.findMany({
        where: { subscription_id: subscription.id }
      });
      console.table(requests.map(r => ({
        id: r.id,
        status: r.status,
        change_type: r.change_type,
        new_plan_id: r.new_plan_id,
        created_at: r.created_at
      })));
    }

    console.log('\n--- Invoices ---');
    const invoices = await prisma.invoice.findMany({
      where: { tenant_id: user.tenant_id }
    });
    console.table(invoices.map(i => ({
      id: i.id,
      status: i.status,
      type: i.type,
      amount: i.total_amount
    })));

  } catch (error) {
    console.error('Audit failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deepAudit();
