import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenantId = '2516520d-4466-4410-a218-06eab518bfd9'; // SMKN 1 Cimahi
  
  console.log('--- Checking Role ADMIN for SMKN 1 Cimahi ---');
  const role = await prisma.role.findFirst({
    where: {
      tenant_id: tenantId,
      name: 'ADMIN'
    },
    include: {
      capabilities: true
    }
  });

  if (!role) {
    console.log('Role ADMIN not found for this tenant!');
  } else {
    console.log(`Role found ID: ${role.id}`);
    console.log('Capabilities:');
    role.capabilities.forEach(c => {
      if (c.capability.startsWith('academic.students')) {
        console.log(`✅ ${c.capability}`);
      }
    });
    
    const count = role.capabilities.filter(c => c.capability.startsWith('academic.students')).length;
    if (count === 0) {
      console.log('❌ No academic.students capabilities found!');
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
