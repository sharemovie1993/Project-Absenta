import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getTenantId() {
  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        status: true
      },
      take: 5
    });

    console.log('📋 Available Tenants:');
    tenants.forEach((tenant, index) => {
      console.log(`${index + 1}. ID: ${tenant.id}`);
      console.log(`   Name: ${tenant.name}`);
      console.log(`   Status: ${tenant.status}`);
      console.log('');
    });

    if (tenants.length > 0) {
      console.log('🎯 Using first tenant ID for testing:');
      console.log(tenants[0].id);
    } else {
      console.log('❌ No tenants found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getTenantId();