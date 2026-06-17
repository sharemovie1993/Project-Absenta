const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const savings = await prisma.saving.findMany({
    select: {
      id: true,
      createdAt: true,
      member: {
        select: {
          tenantId: true,
          Tenant: { select: { name: true } }
        }
      }
    }
  });

  const timeDistribution = {};
  savings.forEach(s => {
    // Round to nearest minute or 10 minutes
    const dateStr = s.createdAt.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
    const tenantName = s.member?.Tenant?.name || 'Unknown';
    const key = `${dateStr} | ${tenantName}`;
    if (!timeDistribution[key]) {
      timeDistribution[key] = 0;
    }
    timeDistribution[key]++;
  });

  console.log('--- Saving creation time & tenant distribution ---');
  console.log(JSON.stringify(timeDistribution, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
