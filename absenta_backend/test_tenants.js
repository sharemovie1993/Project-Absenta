const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  console.log('Fetching all tenants...');
  const list = await p.tenant.findMany();
  console.log(list);
  await p.$disconnect();
}
main();
