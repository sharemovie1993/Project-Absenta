
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findFirst({ where: { email: 'hidayat@gmail.com' } });
  if (!user) {
    console.log('User not found');
    return;
  }
  console.log('User ID:', user.id);

  const siswa = await prisma.siswa.findFirst({ where: { user_id: user.id } });
  if (!siswa) {
    console.log('Siswa record not found');
    return;
  }
  console.log('Siswa ID:', siswa.id);

  const enrollment = await prisma.siswaAkademik.findMany({
    where: { siswa_id: siswa.id }
  });

  console.log('--- ENROLLMENT DATA ---');
  console.log('Count:', enrollment.length);
  if (enrollment.length > 0) {
    enrollment.forEach((e, i) => {
        console.log(`Enrollment ${i+1}: ID=${e.id}, Kelas=${e.kelas_id}, TP=${e.tahun_pelajaran_id}, Sem=${e.semester_id}`);
    });

    const saId = enrollment[0].id;
    const attendanceCount = await prisma.absenSiswa.count({
        where: { siswa_akademik_id: saId }
    });
    console.log('\n--- ATTENDANCE RECORDS (AbsenSiswa) ---');
    console.log(`Found ${attendanceCount} records`);
    
    if (attendanceCount > 0) {
        const firstAbsen = await prisma.absenSiswa.findFirst({
            where: { siswa_akademik_id: saId }
        });
        console.log('Sample record status:', firstAbsen?.status);
    }
    
    const gateCount = await prisma.absenGerbangSiswa.count({
        where: { siswa_id: siswa.id }
    });
    console.log('\n--- GATE RECORDS (AbsenGerbangSiswa) ---');
    console.log(`Found ${gateCount} records`);
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
