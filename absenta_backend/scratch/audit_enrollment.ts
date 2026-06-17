
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findFirst({ where: { email: 'hidayat@gmail.com' } });
  if (!user) {
    console.log('User not found');
    return;
  }

  const enrollment = await prisma.siswaAkademik.findMany({
    where: { 
      Siswa: { user_id: user.id } 
    },
    include: {
      Siswa: true,
      Kelas: true,
      TahunPelajaran: true,
      Semester: true
    }
  });

  console.log('--- ENROLLMENT DATA ---');
  console.log(JSON.stringify(enrollment, null, 2));

  if (enrollment.length > 0) {
    const saId = enrollment[0].id;
    const attendance = await prisma.absenSiswa.findMany({
        where: { siswa_akademik_id: saId },
        include: { SesiAbsensi: true }
    });
    console.log('\n--- ATTENDANCE RECORDS (AbsenSiswa) ---');
    console.log(`Found ${attendance.length} records`);
    if (attendance.length > 0) {
        console.log('Sample record sample status:', attendance[0].status);
        console.log('Sample record date:', attendance[0].SesiAbsensi?.tanggal);
    }
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
