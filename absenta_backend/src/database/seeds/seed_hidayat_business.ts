
import { PrismaClient, SumberSesi } from '@prisma/client';
const prisma = new PrismaClient();

async function seed() {
  console.log('🚀 Starting Business Flow Seeding for Hidayat...');

  // 1. Find Core Entities
  const user = await prisma.user.findFirst({ where: { email: 'hidayat@gmail.com' } });
  if (!user) throw new Error('User hidayat@gmail.com not found');

  const tenant = await prisma.tenant.findUnique({ where: { domain: 'smkn1cimahi' } });
  if (!tenant) throw new Error('Tenant smkn1cimahi not found');

  // 2. Ensure Active Academic Context
  let tapel = await prisma.tahunPelajaran.findFirst({
    where: { tenant_id: tenant.id, is_active: true }
  });
  if (!tapel) tapel = await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenant.id } });
  
  let semester = await prisma.semester.findFirst({
    where: { tenant_id: tenant.id, is_active: true }
  });
  if (!semester) semester = await prisma.semester.findFirst({ where: { tenant_id: tenant.id } });

  if (!tapel || !semester) throw new Error('Tapel or Semester missing');

  // 3. Ensure Hidayat Enrollment
  const siswa = await prisma.siswa.findFirst({ where: { user_id: user.id } });
  if (!siswa) throw new Error('Siswa record not found');

  let sa = await prisma.siswaAkademik.findFirst({
    where: { 
      siswa_id: siswa.id,
      tahun_pelajaran_id: tapel.id,
      semester_id: semester.id
    }
  });

  if (!sa) {
    console.log('Creating enrollment for Hidayat...');
    // Need a Kelas
    const kelas = await prisma.kelas.findFirst({ where: { tenant_id: tenant.id } });
    if (!kelas) throw new Error('No Kelas found in tenant');
    sa = await prisma.siswaAkademik.create({
      data: {
        siswa_id: siswa.id,
        kelas_id: kelas.id,
        tahun_pelajaran_id: tapel.id,
        semester_id: semester.id
      }
    });
  }

  // 4. CLEANUP OLD DATA
  console.log('Cleaning up old records...');
  await prisma.absenSiswa.deleteMany({ where: { siswa_akademik_id: sa.id } });
  await prisma.absenGerbangSiswa.deleteMany({ where: { siswa_id: siswa.id } });
  await prisma.pelanggaranSiswa.deleteMany({ where: { siswa_id: siswa.id } });

  // 5. SEED BUSINESS FLOW (Gate -> Session -> Recap)
  console.log('Seeding 25 days of data...');
  for (let i = 1; i <= 25; i++) {
    const day = String(i).padStart(2, '0');
    const dateStr = `2026-04-${day}`;
    const date = new Date(`${dateStr}T07:00:00Z`);

    // A. GATE TAP (The first step in business flow)
    let sesiGerbang = await prisma.sesiGerbang.findFirst({
      where: { tenant_id: tenant.id, tanggal: date }
    });

    if (!sesiGerbang) {
        const sekolah = await prisma.sekolah.findFirst({ where: { tenant_id: tenant.id } });
        if (!sekolah) throw new Error('Sekolah not found for SesiGerbang');
        sesiGerbang = await prisma.sesiGerbang.create({
            data: {
                tenant_id: tenant.id,
                sekolah_id: sekolah.id,
                tanggal: date,
                waktu_mulai: date,
                status: 'SELESAI',
                tahun_pelajaran_id: tapel.id
            }
        });
    }

    await prisma.absenGerbangSiswa.create({
      data: {
        tenant_id: tenant.id,
        sesi_gerbang_id: sesiGerbang.id,
        siswa_id: siswa.id,
        status: 'HADIR',
        waktu_tap: date,
        arah: 'GERBANG_DATANG',
        is_terlambat: false,
        tahun_pelajaran_id_snapshot: tapel.id
      }
    });

    // B. SESSION (The second step - classroom attendance)
    // Find or create a session for that day
    let sesi = await prisma.sesiAbsensi.findFirst({
      where: { tenant_id: tenant.id, tanggal: date, kelas_id: sa.kelas_id }
    });

    if (!sesi) {
      const start = new Date(date);
      const end = new Date(date);
      end.setUTCHours(8, 0, 0, 0);

      sesi = await prisma.sesiAbsensi.create({
        data: {
          tenant_id: tenant.id,
          tanggal: date,
          waktu_mulai: start,
          waktu_selesai: end,
          kelas_id: sa.kelas_id,
          tahun_pelajaran_id: tapel.id,
          semester_id: semester.id,
          status: 'SELESAI',
          jenis_kegiatan: 'KBM',
          sumber_sesi: SumberSesi.MANUAL
        }
      });
    }

    // C. CLASS ATTENDANCE RECORD
    await prisma.absenSiswa.create({
      data: {
        tenant_id: tenant.id,
        sesi_id: sesi.id,
        siswa_id: siswa.id,
        siswa_akademik_id: sa.id,
        status: 'HADIR',
        waktu_tap: date,
        is_terlambat: false,
        tahun_pelajaran_id_snapshot: tapel.id,
        kelas_id_snapshot: sa.kelas_id
      }
    });
  }

  // 6. SEED PELANGGARAN (Discipline Points)
  console.log('Seeding points...');
  await prisma.pelanggaranSiswa.create({
    data: {
      tenant_id: tenant.id,
      siswa_id: siswa.id,
      siswa_akademik_id: sa.id,
      tanggal: new Date(),
      jenis_pelanggaran: 'Terlambat Berulang',
      poin: 70,
      status: 'SELESAI',
      keterangan: 'Dummy seed for gamification demo'
    }
  });

  console.log('✅ Seeding Completed Successfully!');
}

seed()
  .catch(e => {
    console.error('❌ Seeding Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
