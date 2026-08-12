import { prisma } from '../utils/prisma';

async function fixRestoredUserRoles() {
  console.log('====================================================');
  console.log('🛠️ REPAIR SCRIPT: Fix Restored User Roles in DB');
  console.log('====================================================');

  // 1. Get canonical roles
  const siswaRole = await prisma.role.findFirst({ where: { name: 'SISWA' } });
  const guruRole = await prisma.role.findFirst({ where: { name: 'GURU' } });
  const adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN' } });

  if (!siswaRole || !guruRole || !adminRole) {
    throw new Error('Canonical system roles (SISWA, GURU, ADMIN) missing in DB.');
  }

  console.log(`📌 Target Role IDs:`);
  console.log(`   - SISWA: ${siswaRole.id}`);
  console.log(`   - GURU : ${guruRole.id}`);
  console.log(`   - ADMIN: ${adminRole.id}`);

  // 2. Find all students currently assigned as ADMIN or wrong role
  const mismatchedStudents = await prisma.user.findMany({
    where: {
      Siswa: { isNot: null },
      role_id: { not: siswaRole.id }
    },
    select: {
      id: true,
      email: true,
      full_name: true,
      role_id: true,
      Siswa: { select: { nama_siswa: true, nisn: true } }
    }
  });

  console.log(`\n🔍 Found ${mismatchedStudents.length} student user accounts with wrong role.`);

  if (mismatchedStudents.length > 0) {
    const studentUserIds = mismatchedStudents.map(u => u.id);
    const updateResult = await prisma.user.updateMany({
      where: { id: { in: studentUserIds } },
      data: { role_id: siswaRole.id }
    });
    console.log(`✅ Successfully updated ${updateResult.count} student user accounts to SISWA role.`);
  }

  // 3. Find all teachers (who are not explicit admins) currently assigned wrong role
  const mismatchedTeachers = await prisma.user.findMany({
    where: {
      Guru: { isNot: null },
      role_id: { notIn: [guruRole.id, adminRole.id] }
    },
    select: {
      id: true,
      email: true,
      full_name: true,
      role_id: true,
      Guru: { select: { nama_guru: true, nip: true } }
    }
  });

  console.log(`\n🔍 Found ${mismatchedTeachers.length} teacher user accounts with wrong role.`);

  if (mismatchedTeachers.length > 0) {
    const teacherUserIds = mismatchedTeachers.map(u => u.id);
    const updateResult = await prisma.user.updateMany({
      where: { id: { in: teacherUserIds } },
      data: { role_id: guruRole.id }
    });
    console.log(`✅ Successfully updated ${updateResult.count} teacher user accounts to GURU role.`);
  }

  console.log('\n====================================================');
  console.log('🎉 ROLE REPAIR COMPLETE!');
  console.log('====================================================');

  await prisma.$disconnect();
}

fixRestoredUserRoles().catch(err => {
  console.error('Error repairing roles:', err);
  prisma.$disconnect();
  process.exit(1);
});
