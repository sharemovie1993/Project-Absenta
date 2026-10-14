import { PrismaClient } from '@prisma/client';
import { STRUKTUR_CAPABILITIES } from '../config/position-capabilities';
import { STRUKTUR_CODES } from '../config/organization-structure';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Running Comprehensive Cooperative Menu & RBAC Matrix Sync...');

  // 1. Ensure all required permissions exist in Permission table
  const newPermissions = [
    { id: 'cooperative.suppliers.view.list', description: 'Lihat daftar pemasok (supplier) koperasi', group: 'cooperative', module: 'Koperasi' },
    { id: 'cooperative.suppliers.manage', description: 'Kelola data pemasok (supplier) koperasi', group: 'cooperative', module: 'Koperasi' },
    { id: 'cooperative.store.inventory.manage', description: 'Kelola inventori dan stok toko koperasi', group: 'cooperative', module: 'Koperasi' },
    { id: 'cooperative.ppob.manage.products', description: 'Kelola produk PPOB & pulsa koperasi', group: 'cooperative', module: 'Koperasi' },
    { id: 'cooperative.ppob.transact', description: 'Transaksi PPOB koperasi', group: 'cooperative', module: 'Koperasi' },
    { id: 'cooperative.ppob.view.products', description: 'Lihat produk PPOB koperasi', group: 'cooperative', module: 'Koperasi' },
    { id: 'cooperative.store.products.view.list', description: 'Lihat daftar produk toko koperasi', group: 'cooperative', module: 'Koperasi' },
  ];

  for (const perm of newPermissions) {
    const existing = await prisma.permission.findUnique({ where: { id: perm.id } });
    if (!existing) {
      await prisma.permission.create({
        data: {
          id: perm.id,
          description: perm.description,
          group: perm.group,
          module: perm.module
        }
      });
      console.log(`✅ Created permission in DB: ${perm.id}`);
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

  // 3. Define the exact ordered items with precise required_capability
  const orderedItems = [
    // Klaster 0 & 1: Ikhtisar Eksekutif, Layanan Anggota & Simpan Pinjam
    { label: 'Dashboard', icon: 'LayoutDashboard', path: '/cooperative/dashboard', required_capability: 'cooperative.dashboard.view.overview' },
    { label: 'Data Anggota', icon: 'Users', path: '/cooperative/members', required_capability: 'cooperative.members.view.list' },
    { label: 'Simpanan', icon: 'Wallet', path: '/cooperative/savings', required_capability: 'cooperative.savings.view.list, cooperative.savings.view.history' },
    { label: 'Pinjaman', icon: 'HeartHandshake', path: '/cooperative/loans', required_capability: 'cooperative.loans.view.list' },
    // Divider 1
    { label: 'divider', icon: null, path: null },
    // Klaster 2: Perdagangan, Toko & Unit Usaha Komersial (Retail)
    { label: 'Data Pemasok', icon: 'Building2', path: '/cooperative/suppliers', required_capability: 'cooperative.suppliers.view.list' },
    { label: 'Data Barang', icon: 'Box', path: '/cooperative/products', required_capability: 'cooperative.store.products.view.list, cooperative.store.view.catalog' },
    { label: 'Voucher & Promo', icon: 'Tag', path: '/cooperative/vouchers', required_capability: 'cooperative.vouchers.view.list, cooperative.points.view' },
    { label: 'Kasir Toko', icon: 'ShoppingCart', path: '/cooperative/pos', required_capability: 'cooperative.store.orders.manage' },
    { label: 'Pulsa & Tagihan', icon: 'Zap', path: '/cooperative/ppob', required_capability: 'cooperative.ppob.manage.products, cooperative.ppob.transact' },
    { label: 'Laporan Penjualan', icon: 'BarChart2', path: '/cooperative/sales-report', required_capability: 'cooperative.store.transactions.view' },
    { label: 'Laporan Stok', icon: 'ClipboardList', path: '/cooperative/inventory-report', required_capability: 'cooperative.store.inventory.manage' },
    // Divider 2
    { label: 'divider', icon: null, path: null },
    // Klaster 3: Keuangan Terpadu, Aset & Pertanggungjawaban
    { label: 'Kas & Bank', icon: 'Landmark', path: '/cooperative/cash-bank', required_capability: 'cooperative.reports.view.financial' },
    { label: 'Aset Koperasi', icon: 'Package', path: '/cooperative/assets', required_capability: 'cooperative.assets.view.list' },
    { label: 'Laporan Keuangan', icon: 'FilePieChart', path: '/cooperative/reports', required_capability: 'cooperative.reports.view.financial' },
    { label: 'Sisa Hasil Usaha', icon: 'Award', path: '/cooperative/shu', required_capability: 'cooperative.shu.view.report' },
    // Divider 3
    { label: 'divider', icon: null, path: null },
    // Klaster 4: Komunikasi Anggota & Pengaturan Tata Kelola
    { label: 'Pengumuman', icon: 'Bell', path: '/cooperative/announcements', required_capability: 'cooperative.announcements.view.list' },
    { label: 'Pusat Bantuan', icon: 'MessageSquare', path: '/cooperative/tickets', required_capability: 'cooperative.tickets.view.list, cooperative.tickets.create' },
    { label: 'Pengaturan', icon: 'Settings', path: '/cooperative/settings', required_capability: 'cooperative.settings.view' },
  ];

  // Re-create dividers cleanly
  await prisma.menu.deleteMany({
    where: {
      parent_id: parentMenu.id,
      name: 'divider'
    }
  });

  let orderIndex = 1;
  for (const item of orderedItems) {
    const currentOrder = orderIndex * 10;
    let menuRow = null;

    if (item.path) {
      menuRow = await prisma.menu.findFirst({
        where: {
          path: item.path,
          parent_id: parentMenu.id,
          scope: 'TENANT'
        }
      });
    }

    if (item.label === 'divider') {
      await prisma.menu.create({
        data: {
          name: 'divider',
          icon: null,
          path: null,
          order: currentOrder,
          parent_id: parentMenu.id,
          scope: 'TENANT',
          is_active: true
        }
      });
      console.log(`➖ Created divider at order ${currentOrder}`);
    } else if (menuRow) {
      await prisma.menu.update({
        where: { id: menuRow.id },
        data: {
          name: item.label,
          icon: item.icon,
          order: currentOrder,
          required_capability: item.required_capability,
          required_features: ['KOPERASI'],
          is_active: true
        }
      });
      console.log(`✅ Updated menu '${item.label}' (Order: ${currentOrder}, Lock: ${item.required_capability})`);
    } else {
      await prisma.menu.create({
        data: {
          name: item.label,
          icon: item.icon,
          path: item.path,
          order: currentOrder,
          parent_id: parentMenu.id,
          required_capability: item.required_capability,
          required_features: ['KOPERASI'],
          scope: 'TENANT',
          is_active: true
        }
      });
      console.log(`🌟 Created new menu '${item.label}' (Order: ${currentOrder})`);
    }
    orderIndex++;
  }

  // 4. Synchronize OrganizationalCapability for all 5 roles across all tenants with Clean Purge
  const targetRoleCodes = [
    STRUKTUR_CODES.KETUA_KOPERASI,
    STRUKTUR_CODES.BENDAHARA_KOPERASI,
    STRUKTUR_CODES.SEKRETARIS_KOPERASI,
    STRUKTUR_CODES.MANAJER_TOKO_KOPERASI,
    STRUKTUR_CODES.PENGAWAS_KOPERASI
  ];

  const positions = await prisma.organizationalPosition.findMany({
    where: {
      code: { in: targetRoleCodes }
    }
  });

  console.log(`\n🏢 Found ${positions.length} cooperative organizational positions across tenants to sync.`);

  for (const pos of positions) {
    const configCaps = STRUKTUR_CAPABILITIES[pos.code] || [];
    console.log(`\n🔄 Syncing position ${pos.code} [Tenant: ${pos.tenant_id}] (${configCaps.length} capabilities)...`);

    // Ensure all config capabilities exist in Permission table
    for (const capId of configCaps) {
      const permExists = await prisma.permission.findUnique({ where: { id: capId } });
      if (!permExists) {
        await prisma.permission.create({
          data: {
            id: capId,
            description: `Capability ${capId}`,
            group: 'cooperative',
            module: 'Koperasi'
          }
        });
      }
    }

    // A. PURGE: Delete existing capabilities for this position that are NOT in the new config
    const deleted = await prisma.organizationalCapability.deleteMany({
      where: {
        position_id: pos.id,
        permission_id: { notIn: configCaps }
      }
    });
    if (deleted.count > 0) {
      console.log(`   🧹 Purged ${deleted.count} revoked capabilities.`);
    }

    // B. UPSERT: Ensure all config capabilities exist for this position
    let addedCount = 0;
    for (const capId of configCaps) {
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
        addedCount++;
      }
    }
    console.log(`   ✨ Verified/Added ${configCaps.length} active capabilities (${addedCount} newly added).`);
  }

  console.log('\n🎉 Comprehensive Cooperative RBAC & Menu Matrix sync completed 100%!');
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
