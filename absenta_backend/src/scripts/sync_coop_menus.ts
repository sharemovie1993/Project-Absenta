import { PrismaClient } from '@prisma/client';
import { STRUKTUR_CAPABILITIES } from '../config/position-capabilities';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Running Cooperative Menu Structure & Capabilities Sync...');

  // 1. Ensure permissions exist in Permission table
  const requiredPerms = [
    { id: 'cooperative.store.inventory.manage', description: 'Kelola inventori dan stok toko koperasi' },
    { id: 'cooperative.ppob.manage.products', description: 'Kelola produk PPOB & pulsa koperasi' },
    { id: 'cooperative.ppob.transact', description: 'Transaksi PPOB koperasi' },
    { id: 'cooperative.ppob.view.products', description: 'Lihat produk PPOB koperasi' },
    { id: 'cooperative.store.products.view.list', description: 'Lihat daftar produk toko koperasi' },
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

  // 3. Define the exact ordered items for KOPERASI
  const orderedItems = [
    // Klaster 0 & 1: Ikhtisar Eksekutif, Layanan Anggota & Simpan Pinjam
    { label: 'Dashboard', icon: 'LayoutDashboard', path: '/cooperative/dashboard', required_capability: 'cooperative.dashboard.view.overview, cooperative.members.view.list, cooperative.reports.view.financial, cooperative.store.orders.manage' },
    { label: 'Data Anggota', icon: 'Users', path: '/cooperative/members', required_capability: 'cooperative.members.view.list' },
    { label: 'Simpanan', icon: 'Wallet', path: '/cooperative/savings', required_capability: 'cooperative.savings.view.history, cooperative.savings.deposit' },
    { label: 'Pinjaman', icon: 'HeartHandshake', path: '/cooperative/loans', required_capability: 'cooperative.loans.apply, cooperative.loans.approve' },
    // Divider 1
    { label: 'divider', icon: null, path: null },
    // Klaster 2: Perdagangan, Toko & Unit Usaha Komersial (Retail)
    { label: 'Data Supplier', icon: 'Building2', path: '/cooperative/suppliers', required_capability: 'cooperative.store.products.view.list' },
    { label: 'Katalog Barang', icon: 'Box', path: '/cooperative/products', required_capability: 'cooperative.store.products.view.list' },
    { label: 'Voucher & Promo', icon: 'Tag', path: '/cooperative/vouchers', required_capability: 'cooperative.points.view, cooperative.vouchers.view.list, cooperative.vouchers.manage' },
    { label: 'Kasir Toko', icon: 'ShoppingCart', path: '/cooperative/pos', required_capability: 'cooperative.store.orders.manage, cooperative.store.transactions.view' },
    { label: 'PPOB & Pulsa', icon: 'Zap', path: '/cooperative/ppob', required_capability: 'cooperative.ppob.manage.products' },
    { label: 'Laporan Penjualan', icon: 'BarChart2', path: '/cooperative/sales-report', required_capability: 'cooperative.store.transactions.view' },
    { label: 'Laporan Inventori', icon: 'ClipboardList', path: '/cooperative/inventory-report', required_capability: 'cooperative.store.inventory.manage, cooperative.store.products.view.list' },
    // Divider 2
    { label: 'divider', icon: null, path: null },
    // Klaster 3: Keuangan Terpadu, Aset & Pertanggungjawaban
    { label: 'Kas & Bank', icon: 'Landmark', path: '/cooperative/cash-bank', required_capability: 'cooperative.reports.view.financial, cooperative.savings.deposit' },
    { label: 'Inventaris Aset', icon: 'Package', path: '/cooperative/assets', required_capability: 'cooperative.assets.view.list' },
    { label: 'Laporan Keuangan', icon: 'FilePieChart', path: '/cooperative/reports', required_capability: 'cooperative.reports.view.financial' },
    { label: 'Laba SHU', icon: 'Award', path: '/cooperative/shu', required_capability: 'cooperative.savings.view.history, cooperative.shu.view.report' },
    // Divider 3
    { label: 'divider', icon: null, path: null },
    // Klaster 4: Komunikasi Anggota & Pengaturan Tata Kelola
    { label: 'Pengumuman', icon: 'Bell', path: '/cooperative/announcements', required_capability: 'cooperative.announcements.view.list, cooperative.announcements.create' },
    { label: 'Pusat Aduan', icon: 'MessageSquare', path: '/cooperative/tickets', required_capability: 'cooperative.tickets.create, cooperative.tickets.view.list' },
    { label: 'Pengaturan', icon: 'Settings', path: '/cooperative/settings', required_capability: 'cooperative.settings.view' },
  ];

  // Delete existing dividers under KOPERASI first to cleanly recreate them at exact slots
  await prisma.menu.deleteMany({
    where: {
      parent_id: parentMenu.id,
      name: 'divider'
    }
  });

  let orderIndex = 1;
  const keepMenuIds: string[] = [];

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
      const createdDivider = await prisma.menu.create({
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
      keepMenuIds.push(createdDivider.id);
      console.log(`➖ Created divider at order ${currentOrder}`);
    } else if (menuRow) {
      const updated = await prisma.menu.update({
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
      keepMenuIds.push(updated.id);
      console.log(`✅ Updated menu '${item.label}' at order ${currentOrder}`);
    } else {
      const created = await prisma.menu.create({
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
      keepMenuIds.push(created.id);
      console.log(`🌟 Created new menu '${item.label}' at order ${currentOrder}`);
    }
    orderIndex++;
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

  console.log('🎉 Cooperative menu structure and capabilities sync completed 100%!');
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
