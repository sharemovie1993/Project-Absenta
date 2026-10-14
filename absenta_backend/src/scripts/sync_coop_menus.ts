import { PrismaClient } from '@prisma/client';
import { STRUKTUR_CAPABILITIES } from '../config/position-capabilities';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Running Cooperative Menu and Capabilities sync...');

  // 1. Ensure permissions exist in Permission table
  const requiredPerms = [
    { id: 'cooperative.store.inventory.manage', description: 'Kelola inventori dan stok toko koperasi', domain: 'TENANT' },
    { id: 'cooperative.ppob.manage.products', description: 'Kelola produk PPOB & pulsa koperasi', domain: 'TENANT' },
    { id: 'cooperative.ppob.transact', description: 'Transaksi PPOB koperasi', domain: 'TENANT' },
    { id: 'cooperative.ppob.view.products', description: 'Lihat produk PPOB koperasi', domain: 'TENANT' },
    { id: 'cooperative.store.products.view.list', description: 'Lihat daftar produk toko koperasi', domain: 'TENANT' },
  ];

  for (const perm of requiredPerms) {
    const existing = await prisma.permission.findUnique({ where: { id: perm.id } });
    if (!existing) {
      await prisma.permission.create({
        data: {
          id: perm.id,
          description: perm.description,
          group: 'cooperative',
          module: 'Koperasi'
        }
      });
      console.log(`✅ Created permission: ${perm.id}`);
    } else {
      console.log(`ℹ️ Permission exists: ${perm.id}`);
    }
  }

  // 2. Find parent KOPERASI menu
  const parentMenu = await prisma.menu.findFirst({
    where: {
      name: 'KOPERASI',
      scope: 'TENANT'
    }
  });

  if (!parentMenu) {
    console.error('❌ Parent menu KOPERASI not found!');
    return;
  }
  console.log(`📍 Found Parent Menu KOPERASI: ${parentMenu.id}`);

  // 3. Upsert Laporan Inventori
  const invMenu = await prisma.menu.findFirst({
    where: {
      path: '/cooperative/inventory-report',
      scope: 'TENANT'
    }
  });

  if (invMenu) {
    await prisma.menu.update({
      where: { id: invMenu.id },
      data: {
        name: 'Laporan Inventori',
        icon: 'ClipboardList',
        path: '/cooperative/inventory-report',
        order: 43.5,
        parent_id: parentMenu.id,
        required_capability: 'cooperative.store.inventory.manage, cooperative.store.products.view.list',
        required_features: ['KOPERASI'],
        is_active: true
      }
    });
    console.log(`✅ Updated menu 'Laporan Inventori' (id: ${invMenu.id})`);
  } else {
    const created = await prisma.menu.create({
      data: {
        name: 'Laporan Inventori',
        icon: 'ClipboardList',
        path: '/cooperative/inventory-report',
        order: 43.5,
        parent_id: parentMenu.id,
        required_capability: 'cooperative.store.inventory.manage, cooperative.store.products.view.list',
        required_features: ['KOPERASI'],
        scope: 'TENANT',
        is_active: true
      }
    });
    console.log(`✅ Created menu 'Laporan Inventori' (id: ${created.id})`);
  }

  // 4. Update OrganizationalCapability for KETUA_KOPERASI and BENDAHARA_KOPERASI across all tenants
  const positions = await prisma.organizationalPosition.findMany({
    where: {
      code: { in: ['KETUA_KOPERASI', 'BENDAHARA_KOPERASI', 'SEKRETARIS_KOPERASI'] }
    }
  });

  console.log(`🏢 Found ${positions.length} cooperative organizational positions across tenants.`);

  for (const pos of positions) {
    const configCaps = STRUKTUR_CAPABILITIES[pos.code] || [];
    console.log(`🔧 Syncing capabilities for position ${pos.code} (${pos.tenant_id}): ${configCaps.length} caps in config`);

    for (const capId of configCaps) {
      // check if permission exists in DB
      const permExists = await prisma.permission.findUnique({ where: { id: capId } });
      if (!permExists) {
        // create placeholder permission if missing
        await prisma.permission.create({
          data: {
            id: capId,
            description: `Capability ${capId}`,
            group: 'cooperative',
            module: 'Koperasi'
          }
        });
      }

      // Upsert into organizationalCapability
      const existingCap = await prisma.organizationalCapability.findFirst({
        where: {
          position_id: pos.id,
          permission_id: capId
        }
      });

      if (!existingCap) {
        await prisma.organizationalCapability.create({
          data: {
            position_id: pos.id,
            permission_id: capId
          }
        });
      }
    }
  }

  console.log('🎉 Sync completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('❌ Error during sync:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
