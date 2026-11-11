import 'dotenv/config';
import { prisma } from '@/utils/prisma';

interface BackfillStats {
  tenantsProcessed: number;
  unitCreated: number;
  unitSkippedExisting: number;
  unitSkippedNoAcademicContext: number;
  jadwalUpdated: number;
  kontrakUpdated: number;
  sesiUpdated: number;
}

function findMatchingUnitId(
  units: Array<{
    id: string;
    mapel_id: string;
    guru_id: string;
    tahun_pelajaran_id: string;
    semester_id: string;
    kelas_id: string | null;
    jurusan_id: string | null;
  }>,
  record: {
    mapel_id: string | null;
    guru_id: string | null;
    tahun_pelajaran_id: string;
    semester_id: string;
    kelas_id: string;
    jurusan_id: string | null;
  }
): string | null {
  if (!record.mapel_id || !record.guru_id) return null;

  // 1. Exact match (TP + Semester + Mapel + Guru + Kelas)
  const exact = units.find(
    (u) =>
      u.mapel_id === record.mapel_id &&
      u.guru_id === record.guru_id &&
      u.tahun_pelajaran_id === record.tahun_pelajaran_id &&
      u.semester_id === record.semester_id &&
      u.kelas_id === record.kelas_id
  );
  if (exact) return exact.id;

  // 2. Match TP + Semester + Mapel + Guru where UnitPengajaran is jurusan/general scoped
  const byScope = units.find(
    (u) =>
      u.mapel_id === record.mapel_id &&
      u.guru_id === record.guru_id &&
      u.tahun_pelajaran_id === record.tahun_pelajaran_id &&
      u.semester_id === record.semester_id &&
      u.kelas_id === null &&
      (!u.jurusan_id || !record.jurusan_id || u.jurusan_id === record.jurusan_id)
  );
  if (byScope) return byScope.id;

  // 3. Fallback cross-semester for legacy GuruMapel without exact TP match
  const byClassOrGeneral = units.find(
    (u) =>
      u.mapel_id === record.mapel_id &&
      u.guru_id === record.guru_id &&
      (u.kelas_id === record.kelas_id || u.kelas_id === null)
  );
  return byClassOrGeneral ? byClassOrGeneral.id : null;
}

export async function backfillUnitPengajaran(): Promise<BackfillStats> {
  const stats: BackfillStats = {
    tenantsProcessed: 0,
    unitCreated: 0,
    unitSkippedExisting: 0,
    unitSkippedNoAcademicContext: 0,
    jadwalUpdated: 0,
    kontrakUpdated: 0,
    sesiUpdated: 0,
  };

  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true },
    orderBy: { created_at: 'asc' },
  });

  for (const tenant of tenants) {
    stats.tenantsProcessed += 1;

    const [activeTp, activeSem, fallbackTp] = await Promise.all([
      prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenant.id, is_active: true },
        orderBy: { created_at: 'desc' },
      }),
      prisma.semester.findFirst({
        where: { tenant_id: tenant.id, is_active: true },
        orderBy: { created_at: 'desc' },
      }),
      prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenant.id },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const resolvedDefaultTp = activeTp || (activeSem ? await prisma.tahunPelajaran.findFirst({ where: { id: activeSem.tahun_pelajaran_id } }) : null) || fallbackTp;
    const resolvedDefaultSem =
      activeSem ||
      (resolvedDefaultTp
        ? await prisma.semester.findFirst({
            where: { tenant_id: tenant.id, tahun_pelajaran_id: resolvedDefaultTp.id },
            orderBy: { created_at: 'desc' },
          })
        : null) ||
      (await prisma.semester.findFirst({
        where: { tenant_id: tenant.id },
        orderBy: { created_at: 'desc' },
      }));

    const guruMapels = await prisma.guruMapel.findMany({
      where: { tenant_id: tenant.id },
      include: {
        Kelas: { select: { id: true, jurusan_id: true } },
        UnitPengajaran: { select: { id: true } },
      },
      orderBy: { created_at: 'asc' },
    });

    for (const gm of guruMapels) {
      if (gm.UnitPengajaran.length > 0) {
        stats.unitSkippedExisting += 1;
        continue;
      }

      let tahunPelajaranId = gm.tahun_pelajaran_id;
      let semesterId = gm.semester_id;

      // Resolve missing TP/Semester from related JadwalKBM first
      if (!tahunPelajaranId || !semesterId) {
        const relatedJadwal = await prisma.jadwalKBM.findFirst({
          where: {
            tenant_id: tenant.id,
            guru_id: gm.guru_id,
            mapel_id: gm.mapel_id,
            ...(gm.kelas_id ? { kelas_id: gm.kelas_id } : {}),
          },
          select: { tahun_pelajaran_id: true, semester_id: true },
          orderBy: { created_at: 'desc' },
        });
        if (relatedJadwal) {
          tahunPelajaranId = tahunPelajaranId || relatedJadwal.tahun_pelajaran_id;
          semesterId = semesterId || relatedJadwal.semester_id;
        }
      }

      // If only one is missing, derive sibling from Semester or active TP
      if (!tahunPelajaranId && semesterId) {
        const semRow = await prisma.semester.findUnique({
          where: { id: semesterId },
          select: { tahun_pelajaran_id: true },
        });
        tahunPelajaranId = semRow?.tahun_pelajaran_id || null;
      }
      if (tahunPelajaranId && !semesterId) {
        const semRow = await prisma.semester.findFirst({
          where: { tenant_id: tenant.id, tahun_pelajaran_id: tahunPelajaranId },
          orderBy: [{ is_active: 'desc' }, { created_at: 'desc' }],
          select: { id: true },
        });
        semesterId = semRow?.id || null;
      }

      // Fallback to tenant's active TP + Semester
      tahunPelajaranId = tahunPelajaranId || resolvedDefaultTp?.id || null;
      semesterId = semesterId || resolvedDefaultSem?.id || null;

      if (!tahunPelajaranId || !semesterId) {
        stats.unitSkippedNoAcademicContext += 1;
        console.warn(`[Backfill] Skip GuruMapel ${gm.id} (tenant ${tenant.name}): no TahunPelajaran/Semester found.`);
        continue;
      }

      await prisma.unitPengajaran.create({
        data: {
          tenant_id: tenant.id,
          tahun_pelajaran_id: tahunPelajaranId,
          semester_id: semesterId,
          guru_mapel_id: gm.id,
          mapel_id: gm.mapel_id,
          kelas_id: gm.kelas_id,
          jurusan_id: gm.jurusan_id || gm.Kelas?.jurusan_id || null,
          nama_unit: null,
          guru_id: gm.guru_id,
          jp_alokasi: 2,
          urutan: 1,
          is_active: gm.teaching_mode === 'SINGLE' ? true : true,
        },
      });
      stats.unitCreated += 1;
    }

    // Load all active UnitPengajaran for mapping JadwalKBM, JadwalKontrakKbm, and SesiAbsensi
    const units = await prisma.unitPengajaran.findMany({
      where: { tenant_id: tenant.id, is_active: true },
      orderBy: [{ urutan: 'asc' }, { created_at: 'asc' }],
      select: {
        id: true,
        mapel_id: true,
        guru_id: true,
        tahun_pelajaran_id: true,
        semester_id: true,
        kelas_id: true,
        jurusan_id: true,
      },
    });

    if (units.length === 0) continue;

    // Map JadwalKBM
    const jadwalRows = await prisma.jadwalKBM.findMany({
      where: {
        tenant_id: tenant.id,
        unit_pengajaran_id: null,
        mapel_id: { not: null },
        guru_id: { not: null },
      },
      select: {
        id: true,
        mapel_id: true,
        guru_id: true,
        tahun_pelajaran_id: true,
        semester_id: true,
        kelas_id: true,
        Kelas: { select: { jurusan_id: true } },
      },
    });

    for (const j of jadwalRows) {
      const unitId = findMatchingUnitId(units, {
        mapel_id: j.mapel_id,
        guru_id: j.guru_id,
        tahun_pelajaran_id: j.tahun_pelajaran_id,
        semester_id: j.semester_id,
        kelas_id: j.kelas_id,
        jurusan_id: j.Kelas?.jurusan_id ?? null,
      });
      if (unitId) {
        await prisma.jadwalKBM.update({
          where: { id: j.id },
          data: { unit_pengajaran_id: unitId },
        });
        stats.jadwalUpdated += 1;
      }
    }

    // Map JadwalKontrakKbm
    const kontrakRows = await prisma.jadwalKontrakKbm.findMany({
      where: {
        tenant_id: tenant.id,
        unit_pengajaran_id: null,
        mapel_id: { not: null },
        guru_id: { not: null },
      },
      select: {
        id: true,
        mapel_id: true,
        guru_id: true,
        tahun_pelajaran_id: true,
        semester_id: true,
        kelas_id: true,
        Kelas: { select: { jurusan_id: true } },
      },
    });

    for (const k of kontrakRows) {
      const unitId = findMatchingUnitId(units, {
        mapel_id: k.mapel_id,
        guru_id: k.guru_id,
        tahun_pelajaran_id: k.tahun_pelajaran_id,
        semester_id: k.semester_id,
        kelas_id: k.kelas_id,
        jurusan_id: k.Kelas?.jurusan_id ?? null,
      });
      if (unitId) {
        await prisma.jadwalKontrakKbm.update({
          where: { id: k.id },
          data: { unit_pengajaran_id: unitId },
        });
        stats.kontrakUpdated += 1;
      }
    }

    // Map SesiAbsensi (prefer JadwalKBM.unit_pengajaran_id first, then matching UnitPengajaran)
    const sesiRows = await prisma.sesiAbsensi.findMany({
      where: {
        tenant_id: tenant.id,
        unit_pengajaran_id: null,
      },
      select: {
        id: true,
        jadwal_kbm_id: true,
        mapel_id: true,
        guru_id: true,
        tahun_pelajaran_id: true,
        semester_id: true,
        kelas_id: true,
        JadwalKBM: { select: { unit_pengajaran_id: true } },
        Kelas: { select: { jurusan_id: true } },
      },
    });

    for (const s of sesiRows) {
      const unitId =
        s.JadwalKBM?.unit_pengajaran_id ||
        findMatchingUnitId(units, {
          mapel_id: s.mapel_id,
          guru_id: s.guru_id,
          tahun_pelajaran_id: s.tahun_pelajaran_id,
          semester_id: s.semester_id,
          kelas_id: s.kelas_id,
          jurusan_id: s.Kelas?.jurusan_id ?? null,
        });
      if (unitId) {
        await prisma.sesiAbsensi.update({
          where: { id: s.id },
          data: { unit_pengajaran_id: unitId },
        });
        stats.sesiUpdated += 1;
      }
    }
  }

  return stats;
}

if (require.main === module) {
  backfillUnitPengajaran()
    .then((stats) => {
      console.log('Backfill UnitPengajaran completed:', JSON.stringify(stats, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('Backfill UnitPengajaran failed:', err);
      process.exit(1);
    });
}
