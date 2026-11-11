import { prisma } from '@/utils/prisma';
import { TeachingMode } from '@prisma/client';
import { RoleName } from '../../../../constants/enums';
import { isSystemSuperAdmin } from '../../../../utils/rbac';
import { findBestMatch } from '../../../../utils/normalization';
import { resolveAcademicContextForTenant, UnitInput } from './unit-pengajaran.service';

export interface CreateGuruMapelInput {
  guru_id: string;
  mapel_id: string;
  kelas_id?: string | null;
  jurusan_id?: string | null;
  tahun_pelajaran_id?: string | null;
  semester_id?: string | null;
  teaching_mode?: TeachingMode;
  units?: UnitInput[];
}

export interface GuruMapelResponse {
  id: string;
  tenant_id: string;
  guru_id: string;
  mapel_id: string;
  kelas_id?: string | null;
  jurusan_id?: string | null;
  tahun_pelajaran_id?: string | null;
  semester_id?: string | null;
  created_at: Date;
  Guru?: {
    id: string;
    nama_guru: string;
  };
  Mapel?: {
    id: string;
    nama_mapel: string;
    kode_mapel?: string;
  };
  Kelas?: {
    id: string;
    nama_kelas: string;
  };
  Jurusan?: {
    id: string;
    nama: string;
  };
}

export class GuruMapelService {
  async listAssignments(
    requestingUserRole: RoleName,
    requestingUserTenantId: string | undefined,
    filters?: { guru_id?: string; mapel_id?: string; kelas_id?: string; jurusan_id?: string; tahun_pelajaran_id?: string; semester_id?: string }
  ): Promise<GuruMapelResponse[]> {
    const whereClause: any = {};

    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId)) {
      whereClause.tenant_id = requestingUserTenantId;
    }

    if (filters?.guru_id) whereClause.guru_id = filters.guru_id;
    if (filters?.mapel_id) whereClause.mapel_id = filters.mapel_id;
    if (filters?.kelas_id) whereClause.kelas_id = filters.kelas_id;
    if (filters?.jurusan_id) whereClause.jurusan_id = filters.jurusan_id;
    if (filters?.tahun_pelajaran_id) whereClause.tahun_pelajaran_id = filters.tahun_pelajaran_id;
    if (filters?.semester_id) whereClause.semester_id = filters.semester_id;

    const data = await prisma.guruMapel.findMany({
      where: whereClause,
      include: {
        Guru: { select: { id: true, nama_guru: true, max_jp: true, no_hp: true } },
        Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
        Kelas: { select: { id: true, nama_kelas: true, tingkat: true, jurusan_id: true } },
        Jurusan: { select: { id: true, nama: true } },
        UnitPengajaran: {
          include: {
            Guru: { select: { id: true, nama_guru: true } },
            _count: { select: { JadwalKBM: true, SesiAbsensi: true } },
          },
          orderBy: [{ urutan: 'asc' }, { created_at: 'asc' }],
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Auto-heal / Auto-sync: jika data penugasan GuruMapel di tenant ini belum ada atau sangat sedikit (<= 2)
    // tetapi di JadwalKBM sudah ada data jadwal riil KBM (> 10), jalankan sync otomatis agar modul CBT & Rapor tidak kosong.
    if (data.length <= 2 && requestingUserTenantId) {
      const kbmCount = await prisma.jadwalKBM.count({
        where: {
          tenant_id: requestingUserTenantId,
          jenis_kegiatan: 'KBM',
          ...(filters?.tahun_pelajaran_id ? { tahun_pelajaran_id: filters.tahun_pelajaran_id } : {})
        }
      });
      if (kbmCount > 10) {
        await this.syncFromJadwalKbm(requestingUserTenantId, filters?.tahun_pelajaran_id, filters?.semester_id);
        return (await prisma.guruMapel.findMany({
          where: whereClause,
          include: {
            Guru: { select: { id: true, nama_guru: true, max_jp: true, no_hp: true } },
            Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
            Kelas: { select: { id: true, nama_kelas: true, tingkat: true, jurusan_id: true } },
            Jurusan: { select: { id: true, nama: true } },
            UnitPengajaran: {
              include: {
                Guru: { select: { id: true, nama_guru: true } },
                _count: { select: { JadwalKBM: true, SesiAbsensi: true } },
              },
              orderBy: [{ urutan: 'asc' }, { created_at: 'asc' }],
            },
          },
          orderBy: { created_at: 'desc' },
        })) as unknown as GuruMapelResponse[];
      }
    }

    return data as unknown as GuruMapelResponse[];
  }

  async assignMapelToGuru(tenantId: string, input: CreateGuruMapelInput): Promise<GuruMapelResponse> {
    // Ensure Guru exists in tenant
    const guru = await prisma.guru.findFirst({
      where: { id: input.guru_id, tenant_id: tenantId },
    });
    if (!guru) {
      throw new Error('Guru tidak ditemukan');
    }

    // Ensure Mapel exists in tenant
    const mapel = await prisma.mapel.findFirst({
      where: { id: input.mapel_id, tenant_id: tenantId },
    });
    if (!mapel) {
      throw new Error('Mapel tidak ditemukan');
    }

    const academicCtx = await resolveAcademicContextForTenant(
      tenantId,
      input.tahun_pelajaran_id,
      input.semester_id
    );
    const tpId = academicCtx.tahun_pelajaran_id;
    const semId = academicCtx.semester_id;

    let resolvedJurusanId = input.jurusan_id || null;
    if (!resolvedJurusanId && input.kelas_id) {
      const cls = await prisma.kelas.findFirst({
        where: { id: input.kelas_id, tenant_id: tenantId },
        select: { jurusan_id: true },
      });
      resolvedJurusanId = cls?.jurusan_id || null;
    }

    // Prevent duplicate assignment
    const existing = await prisma.guruMapel.findFirst({
      where: {
        tenant_id: tenantId,
        guru_id: input.guru_id,
        mapel_id: input.mapel_id,
        kelas_id: input.kelas_id || null,
        jurusan_id: input.jurusan_id || null,
        tahun_pelajaran_id: tpId,
        semester_id: semId,
      },
    });
    if (existing) {
      throw new Error('Penugasan guru mapel sudah ada');
    }

    const teachingMode: TeachingMode =
      input.teaching_mode === 'COLLABORATION' || (input.units && input.units.length > 1)
        ? 'COLLABORATION'
        : 'SINGLE';

    const unitPayloads =
      teachingMode === 'COLLABORATION' && input.units && input.units.length > 0
        ? input.units
        : [
            {
              nama_unit: teachingMode === 'COLLABORATION' ? 'Unit 1' : null,
              guru_id: input.guru_id,
              jp_alokasi: input.units?.[0]?.jp_alokasi ?? 2,
              target_sumatif_slot: input.units?.[0]?.target_sumatif_slot ?? null,
              urutan: 1,
            },
          ];

    const created = await prisma.$transaction(async (tx) => {
      const gm = await tx.guruMapel.create({
        data: {
          tenant_id: tenantId,
          guru_id: input.guru_id,
          mapel_id: input.mapel_id,
          kelas_id: input.kelas_id || null,
          jurusan_id: input.jurusan_id || null,
          tahun_pelajaran_id: tpId,
          semester_id: semId,
          teaching_mode: teachingMode,
        },
      });

      for (let i = 0; i < unitPayloads.length; i += 1) {
        const u = unitPayloads[i];
        await tx.unitPengajaran.create({
          data: {
            tenant_id: tenantId,
            tahun_pelajaran_id: tpId,
            semester_id: semId,
            guru_mapel_id: gm.id,
            mapel_id: input.mapel_id,
            kelas_id: input.kelas_id || null,
            jurusan_id: resolvedJurusanId,
            nama_unit: u.nama_unit ?? (teachingMode === 'COLLABORATION' ? `Unit ${i + 1}` : null),
            guru_id: u.guru_id || input.guru_id,
            jp_alokasi: Math.max(1, Number(u.jp_alokasi ?? 2)),
            target_sumatif_slot: u.target_sumatif_slot || null,
            urutan: u.urutan ?? i + 1,
            is_active: true,
          },
        });
      }

      return tx.guruMapel.findFirst({
        where: { id: gm.id, tenant_id: tenantId },
        include: {
          Guru: { select: { id: true, nama_guru: true } },
          Mapel: { select: { id: true, nama_mapel: true } },
          Kelas: { select: { id: true, nama_kelas: true, tingkat: true } },
          Jurusan: { select: { id: true, nama: true } },
          UnitPengajaran: {
            include: { Guru: { select: { id: true, nama_guru: true } } },
            orderBy: [{ urutan: 'asc' }],
          },
        },
      });
    });

    const { cacheInvalidationService } = await import('../../../../utils/cache-invalidation.service');
    await cacheInvalidationService.invalidateBebanGuruCache(tenantId);

    return created as unknown as GuruMapelResponse;
  }

  async removeAssignment(
    assignmentId: string,
    requestingUserRole: RoleName,
    requestingUserTenantId?: string
  ): Promise<void> {
    // Restrict deletion within tenant for non-system-superadmin
    const record = await prisma.guruMapel.findFirst({ where: { id: assignmentId } });
    if (!record) {
      throw new Error('Assignment not found');
    }

    if (!isSystemSuperAdmin(requestingUserRole, requestingUserTenantId) && record.tenant_id !== requestingUserTenantId) {
      throw new Error('Insufficient permissions');
    }

    await prisma.guruMapel.delete({ where: { id: assignmentId } });

    const { cacheInvalidationService } = await import('../../../../utils/cache-invalidation.service');
    await cacheInvalidationService.invalidateBebanGuruCache(record.tenant_id);
  }

  async importFromExcel(data: any[], tenantId: string): Promise<{ success: number; failed: number; errors: any[] }> {
    let success = 0;
    let failed = 0;
    const errors: any[] = [];

    // Pre-fetch all Guru and Mapel for this tenant
    const [gurus, mapels] = await Promise.all([
      prisma.guru.findMany({ where: { tenant_id: tenantId, jenis_ptk: 'PENDIDIK' }, select: { id: true, nama_guru: true } }),
      prisma.mapel.findMany({ where: { tenant_id: tenantId }, select: { id: true, nama_mapel: true, kode_mapel: true } })
    ]);

    const guruNames = gurus.map(g => g.nama_guru);
    const mapelNames = mapels.map(m => m.nama_mapel);
    const mapelKodes = mapels.map(m => m.kode_mapel).filter(Boolean) as string[];

    for (const [index, row] of data.entries()) {
      const rowNumber = row.__rowNum || (index + 2);
      try {
        const inputGuru = row.nama_guru || row.guru;
        const inputMapel = row.nama_mapel || row.mapel || row.kode_mapel;

        if (!inputGuru || !inputMapel) {
          throw new Error('Kolom Nama Guru dan Nama Mapel wajib diisi.');
        }

        // Smart Match Guru
        const guruMatch = findBestMatch(String(inputGuru), guruNames);
        if (!guruMatch.match) {
          throw new Error(`Guru '${inputGuru}' tidak ditemukan.`);
        }
        const guru = gurus.find(g => g.nama_guru === guruMatch.match);

        // Smart Match Mapel (Check Name first, then Code)
        let mapelMatch = findBestMatch(String(inputMapel), mapelNames);
        if (!mapelMatch.match) {
          // Try matching by Code
          mapelMatch = findBestMatch(String(inputMapel), mapelKodes);
        }

        if (!mapelMatch.match) {
          throw new Error(`Mata Pelajaran '${inputMapel}' tidak ditemukan.`);
        }
        
        const mapel = mapels.find(m => m.nama_mapel === mapelMatch.match || m.kode_mapel === mapelMatch.match);

        if (!guru || !mapel) throw new Error('Data referensi tidak valid.');

        // Assign
        await this.assignMapelToGuru(tenantId, {
          guru_id: guru.id,
          mapel_id: mapel.id
        });

        success++;
      } catch (error: any) {
        failed++;
        errors.push({
          row: rowNumber,
          error: error.message
        });
      }
    }

    return { success, failed, errors };
  }

  async syncFromJadwalKbm(
    tenantId: string,
    tahunPelajaranId?: string,
    semesterId?: string
  ): Promise<{ syncedCount: number; totalAssignments: number }> {
    const whereKbm: any = {
      tenant_id: tenantId,
      guru_id: { not: null },
      mapel_id: { not: null },
      jenis_kegiatan: 'KBM',
      // Jadwal yang sudah terikat UnitPengajaran (kolaborasi / impor aSc) tidak perlu membuat GuruMapel duplikat
      unit_pengajaran_id: null,
    };
    if (tahunPelajaranId) whereKbm.tahun_pelajaran_id = tahunPelajaranId;
    if (semesterId) whereKbm.semester_id = semesterId;

    const jadwals = await prisma.jadwalKBM.findMany({
      where: whereKbm,
      select: {
        guru_id: true,
        mapel_id: true,
        kelas_id: true,
        tahun_pelajaran_id: true,
        semester_id: true,
        Kelas: { select: { jurusan_id: true } }
      }
    });

    if (jadwals.length === 0) {
      return { syncedCount: 0, totalAssignments: 0 };
    }

    const uniqueMap = new Map<string, {
      guru_id: string;
      mapel_id: string;
      kelas_id: string | null;
      jurusan_id: string | null;
      tahun_pelajaran_id: string | null;
      semester_id: string | null;
    }>();

    for (const j of jadwals) {
      if (!j.guru_id || !j.mapel_id) continue;
      const key = `${j.guru_id}_${j.mapel_id}_${j.kelas_id || 'null'}_${j.tahun_pelajaran_id || 'null'}_${j.semester_id || 'null'}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, {
          guru_id: j.guru_id,
          mapel_id: j.mapel_id,
          kelas_id: j.kelas_id || null,
          jurusan_id: j.Kelas?.jurusan_id || null,
          tahun_pelajaran_id: j.tahun_pelajaran_id || null,
          semester_id: j.semester_id || null,
        });
      }
    }

    const uniqueList = Array.from(uniqueMap.values());

    const existingGm = await prisma.guruMapel.findMany({
      where: {
        tenant_id: tenantId,
        ...(tahunPelajaranId ? { tahun_pelajaran_id: tahunPelajaranId } : {})
      },
      select: {
        guru_id: true,
        mapel_id: true,
        kelas_id: true,
        tahun_pelajaran_id: true,
        semester_id: true
      }
    });

    const existingSet = new Set(
      existingGm.map(e => `${e.guru_id}_${e.mapel_id}_${e.kelas_id || 'null'}_${e.tahun_pelajaran_id || 'null'}_${e.semester_id || 'null'}`)
    );

    const toInsert = uniqueList
      .filter(item => !existingSet.has(`${item.guru_id}_${item.mapel_id}_${item.kelas_id || 'null'}_${item.tahun_pelajaran_id || 'null'}_${item.semester_id || 'null'}`))
      .map(item => ({
        tenant_id: tenantId,
        guru_id: item.guru_id,
        mapel_id: item.mapel_id,
        kelas_id: item.kelas_id,
        jurusan_id: item.jurusan_id,
        tahun_pelajaran_id: item.tahun_pelajaran_id,
        semester_id: item.semester_id,
      }));

    if (toInsert.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const item of toInsert) {
          const fallbackCtx =
            item.tahun_pelajaran_id && item.semester_id
              ? { tahun_pelajaran_id: item.tahun_pelajaran_id, semester_id: item.semester_id }
              : await resolveAcademicContextForTenant(tenantId, item.tahun_pelajaran_id, item.semester_id);

          const createdGm = await tx.guruMapel.create({
            data: {
              tenant_id: tenantId,
              guru_id: item.guru_id,
              mapel_id: item.mapel_id,
              kelas_id: item.kelas_id,
              jurusan_id: item.jurusan_id,
              tahun_pelajaran_id: fallbackCtx.tahun_pelajaran_id,
              semester_id: fallbackCtx.semester_id,
              teaching_mode: 'SINGLE',
            },
          });

          const createdUnit = await tx.unitPengajaran.create({
            data: {
              tenant_id: tenantId,
              tahun_pelajaran_id: fallbackCtx.tahun_pelajaran_id,
              semester_id: fallbackCtx.semester_id,
              guru_mapel_id: createdGm.id,
              mapel_id: item.mapel_id,
              kelas_id: item.kelas_id,
              jurusan_id: item.jurusan_id,
              nama_unit: null,
              guru_id: item.guru_id,
              jp_alokasi: 2,
              urutan: 1,
              is_active: true,
            },
          });

          await tx.jadwalKBM.updateMany({
            where: {
              tenant_id: tenantId,
              guru_id: item.guru_id,
              mapel_id: item.mapel_id,
              ...(item.kelas_id ? { kelas_id: item.kelas_id } : {}),
              tahun_pelajaran_id: fallbackCtx.tahun_pelajaran_id,
              semester_id: fallbackCtx.semester_id,
              unit_pengajaran_id: null,
            },
            data: { unit_pengajaran_id: createdUnit.id },
          });
        }
      });
      const { cacheInvalidationService } = await import('../../../../utils/cache-invalidation.service');
      await cacheInvalidationService.invalidateBebanGuruCache(tenantId);
    }

    return {
      syncedCount: toInsert.length,
      totalAssignments: uniqueList.length
    };
  }
}

export const guruMapelService = new GuruMapelService();
