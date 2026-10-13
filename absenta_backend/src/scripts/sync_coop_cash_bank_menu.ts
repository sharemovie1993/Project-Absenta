import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Menambahkan menu Kas & Bank ke navigasi Koperasi...');

  const parentMenu = await prisma.menu.findFirst({
    where: { name: 'KOPERASI' }
  });

  if (!parentMenu) {
    console.error('❌ Parent menu KOPERASI tidak ditemukan!');
    return;
  }

  const existingMenu = await prisma.menu.findFirst({
    where: { path: '/cooperative/cash-bank' }
  });

  if (existingMenu) {
    await prisma.menu.update({
      where: { id: existingMenu.id },
      data: {
        name: 'Kas & Bank',
        icon: 'Landmark',
        parent_id: parentMenu.id,
        order: 155,
        required_capability: 'cooperative.reports.view.financial, cooperative.savings.deposit',
        required_features: ['KOPERASI'],
        scope: 'TENANT',
        is_active: true
      }
    });
    console.log('✅ Menu /cooperative/cash-bank berhasil diperbarui dengan icon Landmark.');
  } else {
    await prisma.menu.create({
      data: {
        name: 'Kas & Bank',
        icon: 'Landmark',
        path: '/cooperative/cash-bank',
        parent_id: parentMenu.id,
        order: 155,
        required_capability: 'cooperative.reports.view.financial, cooperative.savings.deposit',
        required_features: ['KOPERASI'],
        scope: 'TENANT',
        is_active: true
      }
    });
    console.log('✅ Menu /cooperative/cash-bank berhasil dibuat.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
