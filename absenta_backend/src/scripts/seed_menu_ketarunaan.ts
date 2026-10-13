import { prisma } from '../utils/prisma';

async function main() {
  console.log('🚀 Memulai penyuntikan menu "Program Ketarunaan" ke database...');

  // 1. Temukan menu induk KESISWAAN
  const parentKesiswaan = await prisma.menu.findFirst({
    where: {
      name: 'KESISWAAN',
      parent_id: null,
      scope: 'TENANT'
    }
  });

  if (!parentKesiswaan) {
    console.error('❌ Parent menu KESISWAAN tidak ditemukan di database.');
    return;
  }

  console.log(`✅ Ditemukan menu induk KESISWAAN: id=${parentKesiswaan.id}`);

  // 2. Cari order yang tepat (setelah Prestasi Siswa)
  const prestasiMenu = await prisma.menu.findFirst({
    where: {
      parent_id: parentKesiswaan.id,
      path: '/kesiswaan/prestasi'
    }
  });

  const orderNum = prestasiMenu ? prestasiMenu.order + 1 : 16;

  // 3. Upsert menu Program Ketarunaan
  let ketarunaanMenu = await prisma.menu.findFirst({
    where: {
      path: '/kesiswaan/program-ketarunaan',
      parent_id: parentKesiswaan.id
    }
  });

  if (!ketarunaanMenu) {
    ketarunaanMenu = await prisma.menu.create({
      data: {
        name: 'Program Ketarunaan',
        icon: 'Shield',
        path: '/kesiswaan/program-ketarunaan',
        parent_id: parentKesiswaan.id,
        order: orderNum,
        is_active: true,
        scope: 'TENANT',
        required_capability: 'attendance.sessions.view.list, dashboard.view.kesiswaan',
      }
    });
    console.log(`✅ Menu "Program Ketarunaan" berhasil dibuat: id=${ketarunaanMenu.id}`);
  } else {
    ketarunaanMenu = await prisma.menu.update({
      where: { id: ketarunaanMenu.id },
      data: {
        name: 'Program Ketarunaan',
        icon: 'Shield',
        is_active: true,
        order: orderNum,
        required_capability: 'attendance.sessions.view.list, dashboard.view.kesiswaan',
      }
    });
    console.log(`✅ Menu "Program Ketarunaan" berhasil diperbarui: id=${ketarunaanMenu.id}`);
  }

  // 4. Salin MenuRole dari parent Kesiswaan atau sibling menu (agar permission melihatnya aktif)
  const siblingRoles = await prisma.menuRole.findMany({
    where: {
      menu_id: prestasiMenu ? prestasiMenu.id : parentKesiswaan.id
    }
  });

  if (siblingRoles.length > 0) {
    for (const sr of siblingRoles) {
      await prisma.menuRole.upsert({
        where: {
          menu_id_role_id: {
            menu_id: ketarunaanMenu.id,
            role_id: sr.role_id
          }
        },
        update: {
          can_view: true,
          can_create: sr.can_create,
          can_update: sr.can_update,
          can_delete: sr.can_delete
        },
        create: {
          menu_id: ketarunaanMenu.id,
          role_id: sr.role_id,
          can_view: true,
          can_create: sr.can_create,
          can_update: sr.can_update,
          can_delete: sr.can_delete
        }
      });
    }
    console.log(`✅ Berhasil menyelaraskan ${siblingRoles.length} MenuRole untuk Program Ketarunaan.`);
  } else {
    // Berikan akses ke semua role yang ada jika tidak ada sibling roles
    const allRoles = await prisma.role.findMany();
    for (const role of allRoles) {
      await prisma.menuRole.upsert({
        where: {
          menu_id_role_id: {
            menu_id: ketarunaanMenu.id,
            role_id: role.id
          }
        },
        update: { can_view: true },
        create: {
          menu_id: ketarunaanMenu.id,
          role_id: role.id,
          can_view: true
        }
      });
    }
    console.log(`✅ Berhasil memberikan akses ke ${allRoles.length} role.`);
  }

  console.log('🎉 Selesai! Menu "Program Ketarunaan" sekarang sudah tersimpan di database dan siap tampil di sidebar.');
}

main()
  .catch(err => {
    console.error('❌ Terjadi kesalahan saat inject menu:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
