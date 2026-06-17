
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function reseed() {
  const user = await prisma.user.findFirst({ where: { email: 'hidayat@gmail.com' } });
  if (!user) return;

  const sa = await prisma.siswaAkademik.findFirst({
    where: { siswa: { user_id: user.id } }
  });
  if (!sa) return;

  console.log('Cleaning existing attendance for sa_id:', sa.id);
  await prisma.absenSiswa.deleteMany({ where: { siswa_akademik_id: sa.id } });
  await prisma.absenGerbangSiswa.deleteMany({ where: { siswa_id: sa.siswa_id } });

  // Seed 22 HADIR and 3 ALPA records for April 2026 (1-25)
  const tenantId = sa.tenant_id;
  const tpId = sa.tahun_pelajaran_id;
  const semId = sa.semester_id;

  console.log('Seeding 22 HADIR records...');
  for (let i = 1; i <= 22; i++) {
    const day = String(i).padStart(2, '0');
    const date = new Date(`2026-04-${day}T07:00:00Z`);
    
    // We need a SesiAbsensi for AbsenSiswa
    let sesi = await prisma.sesiAbsensi.findFirst({
        where: { tenant_id: tenantId, tanggal: date }
    });
    
    if (!sesi) {
        const start = new Date(date);
        start.setUTCHours(7, 0, 0, 0);
        const end = new Date(date);
        end.setUTCHours(8, 0, 0, 0);

        sesi = await prisma.sesiAbsensi.create({
            data: {
                tenant_id: tenantId,
                tanggal: date,
                nama_sesi: `Sesi Pagi - ${day}`,
                waktu_mulai: start,
                waktu_selesai: end,
                kelas_id: sa.kelas_id,
                tahun_pelajaran_id: tpId,
                semester_id: semId,
                status: 'SELESAI',
                jenis_kegiatan: 'KBM'
            }
        });
    }

    await prisma.absenSiswa.create({
      data: {
        tenant_id: tenantId,
        sesi_id: sesi.id,
        siswa_id: sa.siswa_id,
        siswa_akademik_id: sa.id,
        status: 'HADIR',
        waktu_tap: date,
        is_terlambat: false
      }
    });

    await prisma.absenGerbangSiswa.create({
        data: {
            tenant_id: tenantId,
            siswa_id: sa.siswa_id,
            status: 'HADIR',
            waktu_tap: date,
            arah: 'IN',
            is_terlambat: false
        }
    });
  }

  console.log('Seeding 3 ALPA records...');
  for (let i = 23; i <= 25; i++) {
    const day = String(i).padStart(2, '0');
    const date = new Date(`2026-04-${day}T07:00:00Z`);
    
    let sesi = await prisma.sesiAbsensi.findFirst({
        where: { tenant_id: tenantId, tanggal: date }
    });
    
    if (!sesi) {
        const start = new Date(date);
        start.setUTCHours(7, 0, 0, 0);
        const end = new Date(date);
        end.setUTCHours(8, 0, 0, 0);

        sesi = await prisma.sesiAbsensi.create({
            data: {
                tenant_id: tenantId,
                tanggal: date,
                nama_sesi: `Sesi Pagi - ${day}`,
                waktu_mulai: start,
                waktu_selesai: end,
                kelas_id: sa.kelas_id,
                tahun_pelajaran_id: tpId,
                semester_id: semId,
                status: 'SELESAI',
                jenis_kegiatan: 'KBM'
            }
        });
    }

    await prisma.absenSiswa.create({
      data: {
        tenant_id: tenantId,
        sesi_id: sesi.id,
        siswa_id: sa.siswa_id,
        siswa_akademik_id: sa.id,
        status: 'ALPA'
      }
    });
  }

  console.log('Reseed successful!');
}

reseed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
