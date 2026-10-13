import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Menambahkan menu Laporan Penjualan ke navigasi Koperasi...');

  const parentMenu = await prisma.menu.findFirst({
    where: { name: 'KOPERASI' }
  });

  if (!parentMenu) {
    console.error('❌ Parent menu KOPERASI tidak ditemukan!');
    return;
  }

  // Cari menu POS untuk mendapatkan urutannya
  const posMenu = await prisma.menu.findFirst({
    where: { path: '/cooperative/pos' }
  });

  const targetOrder = posMenu?.order ? posMenu.order + 1 : 165;

  const existingMenu = await prisma.menu.findFirst({
    where: { path: '/cooperative/sales-report' }
  });

  if (existingMenu) {
    await prisma.menu.update({
      where: { id: existingMenu.id },
      data: {
        name: 'Laporan Penjualan',
        icon: 'BarChart2',
        parent_id: parentMenu.id,
        order: targetOrder,
        required_capability: 'cooperative.store.transactions.view',
        required_features: ['KOPERASI'],
        scope: 'TENANT',
        is_active: true
      }
    });
    console.log('✅ Menu /cooperative/sales-report berhasil diperbarui.');
  } else {
    await prisma.menu.create({
      data: {
        name: 'Laporan Penjualan',
        icon: 'BarChart2',
        path: '/cooperative/sales-report',
        parent_id: parentMenu.id,
        order: targetOrder,
        required_capability: 'cooperative.store.transactions.view',
        required_features: ['KOPERASI'],
        scope: 'TENANT',
        is_active: true
      }
    });
    console.log('✅ Menu /cooperative/sales-report berhasil dibuat.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
