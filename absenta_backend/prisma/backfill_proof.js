
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfill() {
  const payments = await prisma.payment.findMany({
    where: {
      gateway_response: { not: null }
    }
  });

  console.log(`Found ${payments.length} payments to check for backfill...`);

  for (const p of payments) {
    const res = p.gateway_response;
    if (res && typeof res === 'object' && res.proof_url && !p.proof_url) {
      await prisma.payment.update({
        where: { id: p.id },
        data: { proof_url: res.proof_url }
      });
      console.log(`Updated payment ${p.id} with proof_url: ${res.proof_url}`);
    }
  }
  
  process.exit(0);
}

backfill();
