const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  try {
    const tCount = await p.tenant.count();
    const cCount = await p.systemConfig.count();
    console.log('Tenant count:', tCount);
    console.log('SystemConfig count:', cCount);
  } catch (err) {
    console.error(err);
  } finally {
    await p.$disconnect();
  }
}

run();
