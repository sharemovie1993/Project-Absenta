import { PrismaClient } from '@prisma/client';
import { DEFAULT_STRUKTUR_ORGANISASI } from '../src/config/organization-structure';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Migrating TOOLMAN_SARPRAS to TOOLMAN...');
  const renameRes = await prisma.organizationalPosition.updateMany({
    where: { code: 'TOOLMAN_SARPRAS' },
    data: { code: 'TOOLMAN' }
  });
  console.log(`✅ Renamed ${renameRes.count} records.`);

  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  
  for (const tenant of tenants) {
    console.log(`📂 Processing tenant: ${tenant.id}`);
    for (const def of DEFAULT_STRUKTUR_ORGANISASI) {
      const existing = await prisma.organizationalPosition.findFirst({
        where: { tenant_id: tenant.id, code: def.kode }
      });

      if (existing) {
        await prisma.organizationalPosition.update({
          where: { id: existing.id },
          data: {
            name: def.nama,
            order: def.order,
            scope_type: def.scope_type
          }
        });
      } else {
        await prisma.organizationalPosition.create({
          data: {
            tenant_id: tenant.id,
            code: def.kode,
            name: def.nama,
            order: def.order,
            scope_type: def.scope_type,
            is_active: true
          }
        });
        console.log(`  ➕ Created ${def.kode}`);
      }
    }
  }
  console.log('\n🚀 Sync complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
