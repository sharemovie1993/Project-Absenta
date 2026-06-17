const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function run() {
  try {
    const id = process.env.BILLING_ID || '';
    if (!id) {
      console.error('❌ Set BILLING_ID environment variable');
      process.exit(1);
    }

    const billing = await prisma.billing.findUnique({
      where: { id },
      include: {
        Subscription: { include: { Tenant: true, Plan: true } },
        Invoice: true,
      },
    });

    console.log('📄 Billing record:');
    console.log(JSON.stringify(billing, null, 2));
  } catch (e) {
    console.error('❌ Error:', e.message || e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();

