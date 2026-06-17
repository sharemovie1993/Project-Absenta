import { PrismaClient } from '@prisma/client';
import { DEFAULT_STRUKTUR_ORGANISASI } from '../config/organization-structure';
import { STRUKTUR_CAPABILITIES } from '../config/position-capabilities';

const prisma = new PrismaClient();

async function syncOrgStructure() {
  console.log('🚀 Starting Organizational Structure & Capability Synchronization...');

  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true }
  });

  console.log(`📦 Found ${tenants.length} tenants. Syncing...`);

  for (const tenant of tenants) {
    console.log(`\n🏢 Syncing Tenant: ${tenant.name} (${tenant.id})`);

    // 1. Update Position Orders
    for (const def of DEFAULT_STRUKTUR_ORGANISASI) {
      await prisma.organizationalPosition.updateMany({
        where: {
          tenant_id: tenant.id,
          code: def.kode
        },
        data: {
          order: def.order,
          name: def.nama,
          scope_type: def.scope_type,
        }
      });
    }

    // 2. Sync Capabilities for each position
    const positions = await prisma.organizationalPosition.findMany({
      where: { tenant_id: tenant.id }
    });

    for (const position of positions) {
      const requiredCaps = STRUKTUR_CAPABILITIES[position.code] || [];
      
      if (requiredCaps.length === 0) continue;

      // Get capability IDs (Permission.id is the action slug)
      const permissions = await prisma.permission.findMany({
        where: {
          id: { in: requiredCaps }
        },
        select: { id: true }
      });

      const foundPermissionIds = permissions.map(p => p.id);

      // Sync logic: Ensure all required caps exist
      for (const permissionId of foundPermissionIds) {
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
          update: {} // No change needed if exists
        });
      }
      
      console.log(`✅ Synced ${foundPermissionIds.length} capabilities for ${position.code}`);
    }
  }

  console.log('\n✨ Synchronization completed for all tenants!');
  
  // 3. Clear relevant caches (Simple way: notify user or assume next login will pick up)
  // In a real production env, we'd trigger a redis flush for auth keys
  console.log('💡 Note: User authorization caches may need to be cleared or wait for expiration.');
}

syncOrgStructure()
  .catch((e) => {
    console.error('❌ Error during synchronization:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
