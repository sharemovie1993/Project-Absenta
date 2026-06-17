import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targetTenants = 200;
  const siswaPerTenant = 1000;
  const sesiPerTenant = 5;

  const tenants = await prisma.tenant.findMany({
    where: { id: { startsWith: 'phase5a-sim-tenant-' } },
    select: { id: true },
    orderBy: { id: 'asc' as any },
    take: targetTenants,
  });

  if (tenants.length === 0) {
    console.log('[SEED-REAL] Tidak menemukan tenant simulasi phase5a. Jalankan seed-simulator terlebih dahulu.');
    return;
  }

  console.log('[SEED-REAL] Menyesuaikan absensi_mode ke MULTI_SESI untuk tenant simulasi...');
  await prisma.tenant.updateMany({
    where: { id: { in: tenants.map(t => t.id) } },
    data: { absensi_mode: 'MULTI_SESI' as any },
  });

  for (const t of tenants) {
    const tenantId = t.id;
    const tahunPelajaranId = `sim-tahunpel-${tenantId}`;
    const semesterId = `sim-semester-${tenantId}`;
    const sekolahId = `sim-sekolah-${tenantId}`;
    const jurusanId = `sim-jurusan-${tenantId}`;
    const kelasId = `sim-kelas-${tenantId}`;

    // Pastikan entitas akademik dasar tersedia
    await prisma.$executeRawUnsafe(
      `insert into "TahunPelajaran" (id, tenant_id, tahun, is_active, created_at, updated_at)
       values ($1,$2,'2025/2026', true, now(), now())
       on conflict (id) do nothing;`,
      tahunPelajaranId, tenantId
    );
    await prisma.$executeRawUnsafe(
      `insert into "Semester" (id, tenant_id, nama_semester, tahun_pelajaran_id, is_active, created_at, updated_at)
       values ($1,$2,'Ganjil',$3,true, now(), now())
       on conflict (id) do nothing;`,
      semesterId, tenantId, tahunPelajaranId
    );
    await prisma.$executeRawUnsafe(
      `insert into "Sekolah" (id, tenant_id, nama, created_at, updated_at)
       values ($1,$2,'Sekolah Simulasi', now(), now())
       on conflict (id) do nothing;`,
       sekolahId, tenantId
    );
    await prisma.$executeRawUnsafe(
      `insert into "Jurusan" (id, tenant_id, nama, kode, created_at, updated_at)
       values ($1,$2,'Teknik Simulasi','SIM', now(), now())
       on conflict (id) do nothing;`,
       jurusanId, tenantId
    );
    await prisma.$executeRawUnsafe(
      `insert into "Kelas" (id, tenant_id, nama_kelas, tingkat, jurusan_id, created_at, updated_at)
       values ($1,$2,'X SIM 1',10,$3, now(), now())
       on conflict (id) do nothing;`,
      kelasId, tenantId, jurusanId
    );

    // Buat siswa 1..1000
    const batchSize = 200;
    const siswaRows: any[] = [];
    const akademikRows: any[] = [];
    for (let i = 1; i <= siswaPerTenant; i++) {
      const sid = `sim-siswa-${tenantId}-${i}`;
      const siswaRow: any = {
        id: sid,
        tenant_id: tenantId,
        nama_siswa: `Siswa ${i}`,
        nis: `SIM-${tenantId}-${i}`,
        jenis_kelamin: i % 2 === 0 ? 'L' : 'P',
        status: 'AKTIF',
        kelas_id: kelasId
      };
      siswaRows.push(siswaRow);
      akademikRows.push({
        id: `sim-siswa-akademik-${tenantId}-${i}`,
        siswa_id: sid,
        kelas_id: kelasId,
        tahun_pelajaran_id: tahunPelajaranId,
        semester_id: semesterId,
        status: 'AKTIF',
      });
      if (siswaRows.length === batchSize || i === siswaPerTenant) {
        await prisma.siswa.createMany({ data: siswaRows as any, skipDuplicates: true });
        await prisma.siswaAkademik.createMany({ data: akademikRows as any, skipDuplicates: true });
        siswaRows.length = 0;
        akademikRows.length = 0;
      }
    }

    // Buat 5 sesi absensi aktif (hari ini)
    const today = new Date();
    for (let k = 1; k <= sesiPerTenant; k++) {
      const sesiId = `sim-real-sesi-${tenantId}-${k}`;
      const start = new Date(today.getTime() + k * 10 * 60 * 1000);
      await prisma.$executeRawUnsafe(
        `insert into "SesiAbsensi" (id, tenant_id, kelas_id, semester_id, tahun_pelajaran_id, tanggal, waktu_mulai, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6::timestamptz,$7::timestamptz, now(), now())
         on conflict (id) do nothing;`,
        sesiId, tenantId, kelasId, semesterId, tahunPelajaranId, today.toISOString(), start.toISOString()
      );
    }

    console.log(`[SEED-REAL] Tenant ${tenantId}: siswa=${siswaPerTenant}, sesi=${sesiPerTenant}`);
  }

  console.log('[SEED-REAL] Selesai.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
