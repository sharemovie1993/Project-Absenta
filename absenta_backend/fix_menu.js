const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Lihat semua children dari parent yang kita pakai (980bd5ed)
  const children = await p.menu.findMany({
    where: { parent_id: '980bd5ed-4e1c-44f7-a1b0-079f207d862a' },
    select: { id: true, name: true, path: true, order: true }
  });
  console.log('Children of 980bd5ed (yang kita pakai):');
  console.log(JSON.stringify(children, null, 2));

  // Cari semua menu yang namanya mengandung 'Toko' atau 'Kasir'
  const tokoMenus = await p.menu.findMany({
    where: { OR: [
      { name: { contains: 'Toko' } },
      { name: { contains: 'Kasir' } },
      { name: { contains: 'Kantin' } }
    ]},
    select: { id: true, name: true, path: true, parent_id: true }
  });
  console.log('\nMenus dengan nama Toko/Kasir/Kantin:');
  console.log(JSON.stringify(tokoMenus, null, 2));

  // Cari parent dari Katalog Barang (pasti di Menu Toko yang benar)
  const katalog = await p.menu.findFirst({
    where: { path: '/cooperative/products' },
    select: { id: true, name: true, parent_id: true }
  });
  console.log('\nKatalog Barang:', JSON.stringify(katalog, null, 2));

  if (katalog?.parent_id) {
    const correctParent = await p.menu.findUnique({
      where: { id: katalog.parent_id },
      select: { id: true, name: true }
    });
    console.log('\nParent yang BENAR untuk Menu Toko:', JSON.stringify(correctParent, null, 2));
  }
}

main().catch(e => console.error(e.message)).finally(() => p.$disconnect());
