
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function update() {
  const user = await prisma.user.findFirst({ where: { email: 'hidayat@gmail.com' } });
  if (!user) {
    console.log('User not found');
    return;
  }

  const sa = await prisma.siswaAkademik.findFirst({
    where: { siswa: { user_id: user.id } }
  });
  if (!sa) {
    console.log('SiswaAkademik not found');
    return;
  }

  // Update ALL existing ALPA for this student to HADIR
  const result = await prisma.absenSiswa.updateMany({
    where: { 
        siswa_akademik_id: sa.id,
        status: 'ALPA' 
    },
    data: { 
        status: 'HADIR' 
    }
  });

  console.log(`Successfully updated ${result.count} records from ALPA to HADIR.`);

  // Also check if we need to add points to Pelanggaran if they were 0
  const points = await prisma.pelanggaranSiswa.count({ where: { siswa_id: sa.siswa_id } });
  if (points === 0) {
      console.log('Adding 70 dummy points for Hidayat...');
      await prisma.pelanggaranSiswa.create({
          data: {
              tenant_id: sa.tenant_id,
              siswa_id: sa.siswa_id,
              siswa_akademik_id: sa.id,
              tanggal: new Date(),
              jenis_pelanggaran: 'Kedisiplinan',
              poin: 70,
              status: 'SELESAI'
          }
      });
  }
}

update()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
