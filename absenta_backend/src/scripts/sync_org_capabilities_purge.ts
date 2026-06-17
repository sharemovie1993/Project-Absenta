import { PrismaClient } from '@prisma/client';
import { DEFAULT_STRUKTUR_ORGANISASI } from '../config/organization-structure';
import { STRUKTUR_CAPABILITIES } from '../config/position-capabilities';

const prisma = new PrismaClient();

async function syncAndPurgeOrgStructure() {
  console.log('🚀 Starting Organizational Structure & Capability Purge/Sync...');

  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true }
  });

  console.log(`📦 Found ${tenants.length} tenants. Syncing...`);

  for (const tenant of tenants) {
    console.log(`\n🏢 Processing Tenant: ${tenant.name} (${tenant.id})`);

    // 1. Update/Create Positions based on DEFAULT_STRUKTUR_ORGANISASI
    for (const def of DEFAULT_STRUKTUR_ORGANISASI) {
      await prisma.organizationalPosition.upsert({
        where: {
          tenant_id_code: {
            tenant_id: tenant.id,
            code: def.kode
          }
        },
        update: {
          order: def.order,
          name: def.nama,
          scope_type: def.scope_type,
          is_active: true
        },
        create: {
          tenant_id: tenant.id,
          code: def.kode,
          name: def.nama,
          scope_type: def.scope_type,
          order: def.order,
          is_active: true
        }
      });
    }

    // 2. Sync & Purge Capabilities
    const positions = await prisma.organizationalPosition.findMany({
      where: { tenant_id: tenant.id }
    });

    for (const position of positions) {
      const configCaps = STRUKTUR_CAPABILITIES[position.code] || [];
      
      // Get valid permission IDs from config that exist in database
      const validPermissions = await prisma.permission.findMany({
        where: { id: { in: configCaps } },
        select: { id: true }
      });
      const validIds = validPermissions.map(p => p.id);

      // A. DELETE capabilities not in config (PURGE)
      const deleteResult = await prisma.organizationalCapability.deleteMany({
        where: {
          position_id: position.id,
          permission_id: { notIn: validIds }
        }
      });
      if (deleteResult.count > 0) {
        console.log(`  🗑️ Purged ${deleteResult.count} obsolete capabilities from ${position.code}`);
      }

      // B. UPSERT required capabilities (SYNC)
      let syncedCount = 0;
      for (const permissionId of validIds) {
        await prisma.organizationalCapability.upsert({
          where: {
            position_id_permission_id: {
              position_id: position.id,
              permission_id: permissionId
            }
          },
          create: {
            position_id: position.id,
            permission_id: permissionId
          },
          update: {} // No change if already exists
        });
        syncedCount++;
      }
      
      if (syncedCount > 0 || deleteResult.count > 0) {
        console.log(`  ✅ Position ${position.code}: ${syncedCount} caps synced.`);
      }
    }
  }

  console.log('\n✨ Synchronization and Purge completed for all tenants!');
  console.log('💡 Note: Users may need to re-login to refresh their capability maps.');
}

syncAndPurgeOrgStructure()
  .catch((e) => {
    console.error('❌ Error during synchronization:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
