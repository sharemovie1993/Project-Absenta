import { prisma } from '../utils/prisma';
import { ensureTenantBaseRoles } from '../database/seeds/seed_policies';

async function migrateBaseRolesToTenantScope() {
  console.log('========================================================================');
  console.log('🚀 MIGRATION: Transformasi Base Roles Global ke Tenant-Scoped Roles');
  console.log('========================================================================');

  // 1. Ambil seluruh tenant sekolah (selain system)
  const tenants = await prisma.tenant.findMany({
    where: { id: { not: 'system' } },
    select: { id: true, name: true }
  });

  console.log(`📌 Ditemukan ${tenants.length} tenant sekolah untuk diproses.\n`);

  let totalRolesCreated = 0;
  let totalUsersMigrated = 0;

  for (const tenant of tenants) {
    console.log(`🔄 Memproses Tenant: ${tenant.name} (${tenant.id})...`);

    // Ensure 4 base roles untuk tenant ini
    const tenantRoleMap = await ensureTenantBaseRoles(tenant.id);
    totalRolesCreated += Object.keys(tenantRoleMap).length;

    // Ambil semua user di tenant ini
    const usersInTenant = await prisma.user.findMany({
      where: { tenant_id: tenant.id },
      select: {
        id: true,
        email: true,
        role_id: true,
        Role: { select: { id: true, name: true } },
        Guru: { select: { id: true } },
        Siswa: { select: { id: true } }
      }
    });

    let tenantUserMigratedCount = 0;

    for (const u of usersInTenant) {
      let targetRoleName: 'ADMIN' | 'GURU' | 'SISWA' | 'ANGGOTA_KOPERASI_EXTERNAL' | null = null;

      const currentRoleName = u.Role?.name;

      if (currentRoleName === 'SUPERADMIN' || currentRoleName?.startsWith('PLATFORM_')) {
        // Platform user - skip tenant re-scoping
        continue;
      }

      // Prioritas 1: Berdasarkan relasi tabel konkret Siswa / Guru
      if (u.Siswa) {
        targetRoleName = 'SISWA';
      } else if (u.Guru && currentRoleName !== 'ADMIN') {
        targetRoleName = 'GURU';
      } else if (currentRoleName === 'SISWA') {
        targetRoleName = 'SISWA';
      } else if (currentRoleName === 'GURU') {
        targetRoleName = 'GURU';
      } else if (currentRoleName === 'ANGGOTA_KOPERASI_EXTERNAL') {
        targetRoleName = 'ANGGOTA_KOPERASI_EXTERNAL';
      } else {
        // Default admin tenant
        targetRoleName = 'ADMIN';
      }

      const targetRoleId = tenantRoleMap[targetRoleName];
      if (targetRoleId && u.role_id !== targetRoleId) {
        await prisma.user.update({
          where: { id: u.id },
          data: { role_id: targetRoleId }
        });
        tenantUserMigratedCount++;
        totalUsersMigrated++;
      }
    }

    console.log(`   ✅ Selesai. ${tenantUserMigratedCount} user berhasil diperbarui role_id-nya.`);
  }

  console.log('\n========================================================================');
  console.log(`🎉 MIGRASI SELESAI! Total User Di-migrasikan: ${totalUsersMigrated}`);
  console.log('========================================================================');

  await prisma.$disconnect();
}

migrateBaseRolesToTenantScope().catch((err) => {
  console.error('Error saat migrasi:', err);
  prisma.$disconnect();
  process.exit(1);
});
