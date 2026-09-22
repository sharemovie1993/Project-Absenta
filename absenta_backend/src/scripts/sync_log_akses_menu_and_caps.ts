import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Syncing Log Akses Gerbang menu and position capabilities...');

  // 1. Ensure permission exists
  await prisma.permission.upsert({
    where: { id: 'attendance.gate.view.logs' },
    update: { group: 'attendance' },
    create: {
      id: 'attendance.gate.view.logs',
      group: 'attendance',
      description: 'Action: attendance.gate.view.logs'
    }
  });
  console.log('✅ Permission attendance.gate.view.logs upserted.');

  // 2. Find parent menu 'ABSENSI'
  const parentMenu = await prisma.menu.findFirst({
    where: { name: 'ABSENSI', parent_id: null }
  });

  if (parentMenu) {
    const existingMenu = await prisma.menu.findFirst({
      where: { path: '/attendance/log-akses' }
    });

    if (existingMenu) {
      await prisma.menu.update({
        where: { id: existingMenu.id },
        data: {
          name: 'Log Akses Gerbang',
          icon: 'ShieldCheck',
          parent_id: parentMenu.id,
          order: 140,
          required_capability: 'attendance.gate.view.logs, attendance.gate.tap.entry, attendance.sessions.create',
          required_features: ['ABSENSI'],
          scope: 'TENANT',
          is_active: true
        }
      });
      console.log('✅ Menu /attendance/log-akses updated.');
    } else {
      await prisma.menu.create({
        data: {
          name: 'Log Akses Gerbang',
          icon: 'ShieldCheck',
          path: '/attendance/log-akses',
          parent_id: parentMenu.id,
          order: 140,
          required_capability: 'attendance.gate.view.logs, attendance.gate.tap.entry, attendance.sessions.create',
          required_features: ['ABSENSI'],
          scope: 'TENANT',
          is_active: true
        }
      });
      console.log('✅ Menu /attendance/log-akses created.');
    }
  } else {
    console.warn('⚠️ Parent menu ABSENSI not found.');
  }

  // 3. Grant capability to GERBANG, PIKET, KESISWAAN, KEPALA_SEKOLAH positions
  const targetCodes = ['GERBANG', 'PIKET', 'KESISWAAN', 'KEPALA_SEKOLAH', 'WAKA_KESISWAAN'];
  const positions = await prisma.organizationalPosition.findMany({
    where: {
      code: { in: targetCodes },
      is_active: true
    }
  });

  console.log(`Found ${positions.length} active positions for codes: ${targetCodes.join(', ')}`);

  let addedCaps = 0;
  for (const pos of positions) {
    const existing = await prisma.organizationalCapability.findFirst({
      where: {
        position_id: pos.id,
        permission_id: 'attendance.gate.view.logs'
      }
    });

    if (!existing) {
      await prisma.organizationalCapability.create({
        data: {
          position_id: pos.id,
          permission_id: 'attendance.gate.view.logs'
        }
      });
      addedCaps++;
    }
  }
  console.log(`✅ Added attendance.gate.view.logs capability to ${addedCaps} positions.`);

  // 4. Also grant to base ADMIN roles if rolePermission exists
  const adminRoles = await prisma.role.findMany({
    where: { name: 'ADMIN' }
  });

  for (const r of adminRoles) {
    const hasPerm = await prisma.rolePermission.findFirst({
      where: { role_id: r.id, permission_id: 'attendance.gate.view.logs' }
    });
    if (!hasPerm) {
      await prisma.rolePermission.create({
        data: {
          role_id: r.id,
          permission_id: 'attendance.gate.view.logs'
        }
      }).catch(() => null);
    }
  }
  console.log('✅ ADMIN roles checked.');

  console.log('🎉 Sync completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error syncing:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
