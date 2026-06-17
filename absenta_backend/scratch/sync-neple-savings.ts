import { PrismaClient } from '@prisma/client';
import { fakerID_ID as faker } from '@faker-js/faker';
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { domain: 'neple' } });
  if (!tenant) {
    console.log('Tenant neple not found');
    return;
  }

  console.log(`Populating savings for tenant: ${tenant.name} (${tenant.id})`);

  // Get categories
  const categories = await prisma.savingCategory.findMany({ where: { tenantId: tenant.id } });
  const categoryIdMap: Record<string, string> = {};
  for (const c of categories) {
    categoryIdMap[c.code] = c.id;
  }

  const members = await prisma.member.findMany({ where: { tenantId: tenant.id } });
  console.log(`Found ${members.length} members in neple`);

  for (const member of members) {
    // Pokok
    const pokokId = categoryIdMap['POKOK'];
    if (pokokId) {
      await prisma.saving.upsert({
        where: { memberId_categoryId: { memberId: member.id, categoryId: pokokId } },
        update: { amount: 50000 },
        create: { memberId: member.id, categoryId: pokokId, amount: 50000 }
      });
    }

    // Wajib
    const wajibId = categoryIdMap['WAJIB'];
    if (wajibId) {
      const amount = faker.number.int({ min: 150000, max: 800000 });
      await prisma.saving.upsert({
        where: { memberId_categoryId: { memberId: member.id, categoryId: wajibId } },
        update: { amount },
        create: { memberId: member.id, categoryId: wajibId, amount }
      });
    }

    // Sukarela
    const sukarelaId = categoryIdMap['SUKARELA'];
    if (sukarelaId) {
      const amount = faker.number.int({ min: 100000, max: 1200000 });
      await prisma.saving.upsert({
        where: { memberId_categoryId: { memberId: member.id, categoryId: sukarelaId } },
        update: { amount },
        create: { memberId: member.id, categoryId: sukarelaId, amount }
      });
    }

    // SHR
    const shrId = categoryIdMap['SHR'];
    if (shrId) {
      const amount = faker.number.int({ min: 50000, max: 500000 });
      await prisma.saving.upsert({
        where: { memberId_categoryId: { memberId: member.id, categoryId: shrId } },
        update: { amount },
        create: { memberId: member.id, categoryId: shrId, amount }
      });
    }
  }

  console.log('✅ Done populating neple savings balances!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
