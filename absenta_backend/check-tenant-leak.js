const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'sofyan@gmail.com' }
  });
  if (!user) return console.log('User not found');
  
  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenant_id }
  });
  
  console.log('User Tenant:', tenant ? tenant.name : 'Unknown', 'ID:', user.tenant_id);

  const kelasX_TKJ_1_dash = await prisma.kelas.findUnique({
    where: { id: 'b576114c-8157-401f-9b89-ceab5bb56390' }
  });
  
  console.log('Kelas X-TKJ-1 (dashes):', kelasX_TKJ_1_dash);

  const kelasX_TKJ_1_space = await prisma.kelas.findUnique({
    where: { id: 'd9282389-2fd6-479f-b968-64ca0c03d81f' }
  });
  
  console.log('Kelas X TKJ 1 (spaces):', kelasX_TKJ_1_space);

}
main().finally(() => prisma.$disconnect());
