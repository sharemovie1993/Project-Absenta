import { prisma } from '../utils/prisma';

async function inspectAllUserRoles() {
  console.log('----------------------------------------------------');
  console.log('🔍 DETAILED USER ROLE ANALYSIS');
  console.log('----------------------------------------------------');

  // 1. Group users by Role Name
  const usersWithRole = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      full_name: true,
      tenant_id: true,
      Role: { select: { id: true, name: true } },
      Guru: { select: { id: true, nama_guru: true, nip: true } },
      Siswa: { select: { id: true, nama_siswa: true, nisn: true, nis: true } },
    }
  });

  const roleCounts: Record<string, number> = {};
  usersWithRole.forEach(u => {
    const roleName = u.Role?.name || 'NO_ROLE';
    roleCounts[roleName] = (roleCounts[roleName] || 0) + 1;
  });

  console.log('📌 Summary Count User per Role Name:');
  console.dir(roleCounts);

  console.log('\n📌 Mismatched Users (Misal: Punya record Siswa/Guru tapi Role Name-nya ADMIN):');
  let mismatchCount = 0;
  usersWithRole.forEach(u => {
    const roleName = u.Role?.name;
    const isSiswaInDb = !!u.Siswa;
    const isGuruInDb = !!u.Guru;

    if (isSiswaInDb && roleName !== 'SISWA') {
      mismatchCount++;
      console.log(`  ⚠️ MISMATCH SISWA: Email=${u.email} | Name=${u.full_name} | RoleInDB=${roleName} | SiswaName=${u.Siswa?.nama_siswa} (NISN: ${u.Siswa?.nisn}, NIS: ${u.Siswa?.nis})`);
    }

    if (isGuruInDb && roleName !== 'GURU' && roleName !== 'ADMIN') {
      mismatchCount++;
      console.log(`  ⚠️ MISMATCH GURU : Email=${u.email} | Name=${u.full_name} | RoleInDB=${roleName} | GuruName=${u.Guru?.nama_guru} (NIP: ${u.Guru?.nip})`);
    }
  });

  if (mismatchCount === 0) {
    console.log('✅ Tidak ditemukan mismatch pada sampel user!');
  } else {
    console.log(`❌ Total Mismatch Ditemukan: ${mismatchCount}`);
  }

  await prisma.$disconnect();
}

inspectAllUserRoles().catch(err => {
  console.error('Error:', err);
  prisma.$disconnect();
  process.exit(1);
});
