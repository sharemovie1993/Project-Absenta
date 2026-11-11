import { prisma } from '@/utils/prisma';
import { TeachingMode } from '@prisma/client';

export type SumatifSlot = 'sumatif_1' | 'sumatif_2' | 'sumatif_3' | 'sumatif_4';

const VALID_SUMATIF_SLOTS = new Set<string>(['sumatif_1', 'sumatif_2', 'sumatif_3', 'sumatif_4']);
const POLICY_CONFIG_KEY = 'kurikulum_lock_mid_semester_split';

export interface UnitInput {
  id?: string;
  nama_unit?: string | null;
  guru_id: string;
  jp_alokasi?: number;
  target_sumatif_slot?: string | null;
  urutan?: number;
  is_active?: boolean;
}

export class KurikulumPolicyError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, code: string, statusCode = 400, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export async function resolveAcademicContextForTenant(
  tenantId: string,
  tahunPelajaranId?: string | null,
  semesterId?: string | null
): Promise<{ tahun_pelajaran_id: string; semester_id: string }> {
  let tpId = tahunPelajaranId || null;
  let semId = semesterId || null;

  if (!tpId && semId) {
    const sem = await prisma.semester.findFirst({
      where: { id: semId, tenant_id: tenantId },
      select: { tahun_pelajaran_id: true },
    });
    if (sem) tpId = sem.tahun_pelajaran_id;
  }

  if (!tpId) {
    const activeTp =
      (await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        orderBy: { created_at: 'desc' },
      })) ||
      (await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId },
        orderBy: { created_at: 'desc' },
      }));
    tpId = activeTp?.id || null;
  }

  if (!semId && tpId) {
    const activeSem =
      (await prisma.semester.findFirst({
        where: { tenant_id: tenantId, tahun_pelajaran_id: tpId, is_active: true },
        orderBy: { created_at: 'desc' },
      })) ||
      (await prisma.semester.findFirst({
        where: { tenant_id: tenantId, tahun_pelajaran_id: tpId },
        orderBy: { created_at: 'desc' },
      }));
    semId = activeSem?.id || null;
  }

  if (!semId) {
    const fallbackSem = await prisma.semester.findFirst({
      where: { tenant_id: tenantId, is_active: true },
      orderBy: { created_at: 'desc' },
    });
    if (fallbackSem) {
      semId = fallbackSem.id;
      if (!tpId) tpId = fallbackSem.tahun_pelajaran_id;
    }
  }

  if (!tpId || !semId) {
    throw new KurikulumPolicyError(
      'Konteks akademik (Tahun Pelajaran & Semester) aktif belum tersedia untuk sekolah ini.',
      'ACADEMIC_CONTEXT_REQUIRED',
      400
    );
  }

  return { tahun_pelajaran_id: tpId, semester_id: semId };
}

function normalizeSumatifSlot(slot?: string | null): string | null {
  if (!slot || slot === '') return null;
  const trimmed = String(slot).trim();
  if (!VALID_SUMATIF_SLOTS.has(trimmed)) {
    throw new KurikulumPolicyError(
      `Slot sumatif tidak valid: ${trimmed}. Gunakan sumatif_1..sumatif_4.`,
      'INVALID_SUMATIF_SLOT',
      400
    );
  }
  return trimmed;
}

export class UnitPengajaranService {
  async getKurikulumPolicy(tenantId: string): Promise<{ kurikulum_lock_mid_semester_split: boolean }> {
    const row = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: POLICY_CONFIG_KEY },
      select: { value: true },
    });
    return {
      kurikulum_lock_mid_semester_split: String(row?.value || 'false').toLowerCase() === 'true',
    };
  }

  async setKurikulumPolicy(
    tenantId: string,
    lockMidSemesterSplit: boolean
  ): Promise<{ kurikulum_lock_mid_semester_split: boolean }> {
    const strValue = lockMidSemesterSplit ? 'true' : 'false';
    const existing = await prisma.config.findFirst({
      where: { tenant_id: tenantId, key: POLICY_CONFIG_KEY },
      select: { id: true },
    });

    if (existing) {
      await prisma.config.update({
        where: { id: existing.id },
        data: { value: strValue },
      });
    } else {
      await prisma.config.create({
        data: {
          tenant_id: tenantId,
          key: POLICY_CONFIG_KEY,
          value: strValue,
          description: 'Kunci perubahan mode SINGLE <-> COLLABORATION jika sudah ada jadwal/sesi di semester berjalan.',
        },
      });
    }

    return { kurikulum_lock_mid_semester_split: lockMidSemesterSplit };
  }

  async listUnitsByTenant(
    tenantId: string,
    filters: {
      tahun_pelajaran_id?: string;
      semester_id?: string;
      kelas_id?: string;
      jurusan_id?: string;
      mapel_id?: string;
      guru_id?: string;
      is_active?: boolean;
    } = {}
  ) {
    const where: any = { tenant_id: tenantId };
    if (filters.tahun_pelajaran_id) where.tahun_pelajaran_id = filters.tahun_pelajaran_id;
    if (filters.semester_id) where.semester_id = filters.semester_id;
    if (filters.mapel_id) where.mapel_id = filters.mapel_id;
    if (filters.guru_id) where.guru_id = filters.guru_id;
    if (filters.is_active !== undefined) where.is_active = filters.is_active;

    if (filters.kelas_id) {
      const kelas = await prisma.kelas.findFirst({
        where: { id: filters.kelas_id, tenant_id: tenantId },
        select: { jurusan_id: true },
      });
      where.OR = [
        { kelas_id: filters.kelas_id },
        ...(kelas?.jurusan_id ? [{ kelas_id: null, jurusan_id: kelas.jurusan_id }] : []),
        { kelas_id: null, jurusan_id: null },
      ];
    } else if (filters.jurusan_id) {
      where.OR = [{ jurusan_id: filters.jurusan_id }, { jurusan_id: null }];
    }

    return prisma.unitPengajaran.findMany({
      where,
      include: {
        Guru: { select: { id: true, nama_guru: true, max_jp: true } },
        Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
        Kelas: { select: { id: true, nama_kelas: true, tingkat: true, jurusan_id: true } },
        Jurusan: { select: { id: true, nama: true, kode: true } },
        GuruMapel: { select: { id: true, guru_id: true, teaching_mode: true } },
        _count: { select: { JadwalKBM: true, SesiAbsensi: true } },
      },
      orderBy: [{ Mapel: { nama_mapel: 'asc' } }, { urutan: 'asc' }, { created_at: 'asc' }],
    });
  }

  private async getStrukturJpWarning(
    tenantId: string,
    params: {
      tahun_pelajaran_id: string;
      semester_id: string;
      mapel_id: string;
      kelas_id?: string | null;
      jurusan_id?: string | null;
    },
    totalJpAlokasi: number
  ): Promise<{ struktur_jp_per_minggu: number | null; warning: string | null }> {
    let tingkat: number | null = null;
    let jurusanId = params.jurusan_id || null;

    if (params.kelas_id) {
      const kelas = await prisma.kelas.findFirst({
        where: { id: params.kelas_id, tenant_id: tenantId },
        select: { tingkat: true, jurusan_id: true },
      });
      if (kelas) {
        tingkat = kelas.tingkat;
        jurusanId = jurusanId || kelas.jurusan_id;
      }
    }

    const struktur = await prisma.strukturKurikulum.findFirst({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: params.tahun_pelajaran_id,
        semester_id: params.semester_id,
        mapel_id: params.mapel_id,
        ...(tingkat ? { tingkat } : {}),
        ...(jurusanId ? { OR: [{ jurusan_id: jurusanId }, { jurusan_id: null }] } : {}),
      },
      orderBy: [{ jurusan_id: 'desc' }],
      select: { jp_per_minggu: true },
    });

    if (!struktur) {
      return { struktur_jp_per_minggu: null, warning: null };
    }

    const warning =
      totalJpAlokasi > struktur.jp_per_minggu
        ? `Total alokasi JP unit (${totalJpAlokasi} JP) melebihi Struktur Kurikulum resmi (${struktur.jp_per_minggu} JP/minggu).`
        : null;

    return { struktur_jp_per_minggu: struktur.jp_per_minggu, warning };
  }

  async getUnitsForGuruMapel(tenantId: string, guruMapelId: string) {
    const gm = await prisma.guruMapel.findFirst({
      where: { id: guruMapelId, tenant_id: tenantId },
      include: {
        Guru: { select: { id: true, nama_guru: true } },
        Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
        Kelas: { select: { id: true, nama_kelas: true, tingkat: true, jurusan_id: true } },
        Jurusan: { select: { id: true, nama: true } },
        UnitPengajaran: {
          include: {
            Guru: { select: { id: true, nama_guru: true } },
            _count: {
              select: {
                JadwalKBM: true,
                SesiAbsensi: true,
                JadwalKontrakKbm: true,
                CbtBankSoal: true,
                CbtSoal: true,
              },
            },
          },
          orderBy: [{ urutan: 'asc' }, { created_at: 'asc' }],
        },
      },
    });

    if (!gm) {
      throw new KurikulumPolicyError('Plotting GuruMapel tidak ditemukan.', 'NOT_FOUND', 404);
    }

    const ctx = await resolveAcademicContextForTenant(tenantId, gm.tahun_pelajaran_id, gm.semester_id);
    const totalActiveJp = gm.UnitPengajaran.filter((u) => u.is_active).reduce(
      (sum, u) => sum + Number(u.jp_alokasi || 0),
      0
    );
    const jpMeta = await this.getStrukturJpWarning(
      tenantId,
      {
        tahun_pelajaran_id: ctx.tahun_pelajaran_id,
        semester_id: ctx.semester_id,
        mapel_id: gm.mapel_id,
        kelas_id: gm.kelas_id,
        jurusan_id: gm.jurusan_id,
      },
      totalActiveJp
    );
    const policy = await this.getKurikulumPolicy(tenantId);

    return {
      guru_mapel: gm,
      units: gm.UnitPengajaran,
      total_active_jp: totalActiveJp,
      ...jpMeta,
      policy,
    };
  }

  async switchTeachingMode(
    tenantId: string,
    guruMapelId: string,
    input: {
      teaching_mode: TeachingMode;
      units?: UnitInput[];
      confirmMidSemesterSplit?: boolean;
    }
  ) {
    const gm = await prisma.guruMapel.findFirst({
      where: { id: guruMapelId, tenant_id: tenantId },
      include: {
        Kelas: { select: { id: true, jurusan_id: true } },
        UnitPengajaran: {
          include: {
            _count: {
              select: {
                JadwalKBM: true,
                SesiAbsensi: true,
                CbtSoal: true,
              },
            },
          },
          orderBy: [{ urutan: 'asc' }, { created_at: 'asc' }],
        },
      },
    });

    if (!gm) {
      throw new KurikulumPolicyError('Plotting GuruMapel tidak ditemukan.', 'NOT_FOUND', 404);
    }

    const ctx = await resolveAcademicContextForTenant(tenantId, gm.tahun_pelajaran_id, gm.semester_id);
    const resolvedJurusanId = gm.jurusan_id || gm.Kelas?.jurusan_id || null;
    const policy = await this.getKurikulumPolicy(tenantId);

    const existingUnits = gm.UnitPengajaran;
    const totalSesi = existingUnits.reduce((sum, u) => sum + u._count.SesiAbsensi, 0);
    const totalJadwal = existingUnits.reduce((sum, u) => sum + u._count.JadwalKBM, 0);
    const unitsWithSesi = existingUnits.filter((u) => u._count.SesiAbsensi > 0);
    const unitsWithRefs = existingUnits.filter(
      (u) => u._count.SesiAbsensi > 0 || u._count.JadwalKBM > 0 || u._count.CbtSoal > 0
    );

    // Cross-tenant invariant: COLLABORATION -> SINGLE is ALWAYS blocked if > 1 unit has SesiAbsensi or active refs
    if (gm.teaching_mode === 'COLLABORATION' && input.teaching_mode === 'SINGLE') {
      if (unitsWithSesi.length > 1 || unitsWithRefs.length > 1) {
        throw new KurikulumPolicyError(
          'Tidak dapat menggabungkan kembali ke mode SINGLE karena lebih dari 1 unit pengajaran sudah memiliki riwayat sesi absensi, jadwal, atau butir soal CBT. Nonaktifkan unit yang tidak terpakai (is_active = false).',
          'COLLABORATION_DOWNGRADE_BLOCKED',
          409,
          { unitsWithSesi: unitsWithSesi.length, unitsWithRefs: unitsWithRefs.length }
        );
      }
    }

    // Tenant policy check when transitioning SINGLE <-> COLLABORATION with active semester history
    if (gm.teaching_mode !== input.teaching_mode && (totalSesi > 0 || totalJadwal > 0)) {
      if (policy.kurikulum_lock_mid_semester_split) {
        throw new KurikulumPolicyError(
          'Kebijakan sekolah mengunci perubahan mode SINGLE <-> COLLABORATION pada tengah semester karena sudah terdapat Jadwal KBM atau Sesi Absensi berjalan.',
          'MID_SEMESTER_MODE_LOCKED',
          409,
          { totalSesi, totalJadwal }
        );
      }

      if (gm.teaching_mode === 'SINGLE' && input.teaching_mode === 'COLLABORATION' && !input.confirmMidSemesterSplit) {
        throw new KurikulumPolicyError(
          `Sudah terdapat ${totalJadwal} slot Jadwal KBM dan ${totalSesi} Sesi Absensi pada Semester ini. Mengaktifkan Mode Kolaborasi (Split Forward) akan tetap mempertahankan seluruh riwayat pada Unit ke-1 dan membuka unit tambahan untuk jadwal berikutnya.`,
          'MID_SEMESTER_CONFIRM_REQUIRED',
          409,
          { totalSesi, totalJadwal }
        );
      }
    }

    // Validate all supplied unit teachers belong to tenant
    if (input.units && input.units.length > 0) {
      const teacherIds = Array.from(new Set(input.units.map((u) => u.guru_id).filter(Boolean)));
      const foundTeachers = await prisma.guru.findMany({
        where: { tenant_id: tenantId, id: { in: teacherIds } },
        select: { id: true },
      });
      const validIds = new Set(foundTeachers.map((t) => t.id));
      for (const tid of teacherIds) {
        if (!validIds.has(tid)) {
          throw new KurikulumPolicyError('Guru pengampu unit tidak ditemukan pada tenant ini.', 'GURU_NOT_FOUND', 400);
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.guruMapel.update({
        where: { id: gm.id },
        data: {
          teaching_mode: input.teaching_mode,
          tahun_pelajaran_id: gm.tahun_pelajaran_id || ctx.tahun_pelajaran_id,
          semester_id: gm.semester_id || ctx.semester_id,
        },
      });

      if (input.teaching_mode === 'SINGLE') {
        if (existingUnits.length === 0) {
          await tx.unitPengajaran.create({
            data: {
              tenant_id: tenantId,
              tahun_pelajaran_id: ctx.tahun_pelajaran_id,
              semester_id: ctx.semester_id,
              guru_mapel_id: gm.id,
              mapel_id: gm.mapel_id,
              kelas_id: gm.kelas_id,
              jurusan_id: resolvedJurusanId,
              nama_unit: null,
              guru_id: gm.guru_id,
              jp_alokasi: input.units?.[0]?.jp_alokasi ?? 2,
              target_sumatif_slot: normalizeSumatifSlot(input.units?.[0]?.target_sumatif_slot),
              urutan: 1,
              is_active: true,
            },
          });
        } else {
          // Keep primary unit (prefer one with references, or first by urutan)
          const primaryUnit = unitsWithRefs[0] || existingUnits[0];
          await tx.unitPengajaran.update({
            where: { id: primaryUnit.id },
            data: {
              guru_id: gm.guru_id,
              nama_unit: null,
              is_active: true,
              urutan: 1,
            },
          });
          for (const extra of existingUnits) {
            if (extra.id === primaryUnit.id) continue;
            if (extra._count.SesiAbsensi === 0 && extra._count.JadwalKBM === 0 && extra._count.CbtSoal === 0) {
              await tx.unitPengajaran.delete({ where: { id: extra.id } });
            } else {
              await tx.unitPengajaran.update({
                where: { id: extra.id },
                data: { is_active: false },
              });
            }
          }
        }
      } else {
        // COLLABORATION mode
        const incomingUnits =
          input.units && input.units.length > 0
            ? input.units
            : existingUnits.length > 0
              ? existingUnits.map((u, idx) => ({
                  id: u.id,
                  nama_unit: u.nama_unit || `Unit ${idx + 1}`,
                  guru_id: u.guru_id,
                  jp_alokasi: u.jp_alokasi,
                  target_sumatif_slot: u.target_sumatif_slot,
                  urutan: idx + 1,
                  is_active: u.is_active,
                }))
              : [
                  {
                    nama_unit: 'Unit 1',
                    guru_id: gm.guru_id,
                    jp_alokasi: 2,
                    urutan: 1,
                    is_active: true,
                  },
                ];

        const keptIds = new Set<string>();
        for (let idx = 0; idx < incomingUnits.length; idx += 1) {
          const item = incomingUnits[idx];
          const urutan = item.urutan ?? idx + 1;
          const targetSlot = normalizeSumatifSlot(item.target_sumatif_slot);

          if (item.id && existingUnits.some((e) => e.id === item.id)) {
            keptIds.add(item.id);
            await tx.unitPengajaran.update({
              where: { id: item.id },
              data: {
                nama_unit: item.nama_unit ?? null,
                guru_id: item.guru_id,
                jp_alokasi: Math.max(1, Number(item.jp_alokasi ?? 2)),
                target_sumatif_slot: targetSlot,
                urutan,
                is_active: item.is_active !== undefined ? item.is_active : true,
              },
            });
          } else if (idx === 0 && existingUnits.length > 0 && !keptIds.has(existingUnits[0].id)) {
            // Preserve Unit #1 ID during SINGLE -> COLLABORATION split-forward so history stays attached
            const firstExisting = existingUnits[0];
            keptIds.add(firstExisting.id);
            await tx.unitPengajaran.update({
              where: { id: firstExisting.id },
              data: {
                nama_unit: item.nama_unit ?? 'Unit 1',
                guru_id: item.guru_id,
                jp_alokasi: Math.max(1, Number(item.jp_alokasi ?? 2)),
                target_sumatif_slot: targetSlot,
                urutan,
                is_active: item.is_active !== undefined ? item.is_active : true,
              },
            });
          } else {
            const created = await tx.unitPengajaran.create({
              data: {
                tenant_id: tenantId,
                tahun_pelajaran_id: ctx.tahun_pelajaran_id,
                semester_id: ctx.semester_id,
                guru_mapel_id: gm.id,
                mapel_id: gm.mapel_id,
                kelas_id: gm.kelas_id,
                jurusan_id: resolvedJurusanId,
                nama_unit: item.nama_unit ?? `Unit ${urutan}`,
                guru_id: item.guru_id,
                jp_alokasi: Math.max(1, Number(item.jp_alokasi ?? 2)),
                target_sumatif_slot: targetSlot,
                urutan,
                is_active: item.is_active !== undefined ? item.is_active : true,
              },
            });
            keptIds.add(created.id);
          }
        }

        // Any omitted existing unit: delete if unreferenced, else mark inactive (never drop historical SesiAbsensi)
        for (const existing of existingUnits) {
          if (keptIds.has(existing.id)) continue;
          if (existing._count.SesiAbsensi === 0 && existing._count.JadwalKBM === 0 && existing._count.CbtSoal === 0) {
            await tx.unitPengajaran.delete({ where: { id: existing.id } });
          } else {
            await tx.unitPengajaran.update({
              where: { id: existing.id },
              data: { is_active: false },
            });
          }
        }
      }

      return tx.guruMapel.findFirst({
        where: { id: gm.id, tenant_id: tenantId },
        include: {
          Guru: { select: { id: true, nama_guru: true } },
          Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
          UnitPengajaran: {
            include: { Guru: { select: { id: true, nama_guru: true } } },
            orderBy: [{ urutan: 'asc' }, { created_at: 'asc' }],
          },
        },
      });
    });

    const totalActiveJp = (updated?.UnitPengajaran || [])
      .filter((u) => u.is_active)
      .reduce((sum, u) => sum + Number(u.jp_alokasi || 0), 0);
    const jpMeta = await this.getStrukturJpWarning(
      tenantId,
      {
        tahun_pelajaran_id: ctx.tahun_pelajaran_id,
        semester_id: ctx.semester_id,
        mapel_id: gm.mapel_id,
        kelas_id: gm.kelas_id,
        jurusan_id: resolvedJurusanId,
      },
      totalActiveJp
    );

    const { cacheInvalidationService } = await import('@/utils/cache-invalidation.service');
    await cacheInvalidationService.invalidateBebanGuruCache(tenantId);
    await this.syncCbtContributorsNonFatal(tenantId, gm.mapel_id);

    return {
      guru_mapel: updated,
      ...jpMeta,
    };
  }

  async createUnit(tenantId: string, guruMapelId: string, input: UnitInput) {
    const gm = await prisma.guruMapel.findFirst({
      where: { id: guruMapelId, tenant_id: tenantId },
      include: {
        Kelas: { select: { jurusan_id: true } },
        UnitPengajaran: true,
      },
    });
    if (!gm) {
      throw new KurikulumPolicyError('Plotting GuruMapel tidak ditemukan.', 'NOT_FOUND', 404);
    }

    const guru = await prisma.guru.findFirst({
      where: { id: input.guru_id, tenant_id: tenantId },
      select: { id: true },
    });
    if (!guru) {
      throw new KurikulumPolicyError('Guru pengampu unit tidak ditemukan pada tenant ini.', 'GURU_NOT_FOUND', 400);
    }

    const ctx = await resolveAcademicContextForTenant(tenantId, gm.tahun_pelajaran_id, gm.semester_id);
    const targetSlot = normalizeSumatifSlot(input.target_sumatif_slot);
    const nextUrutan =
      input.urutan ??
      (gm.UnitPengajaran.reduce((max, u) => Math.max(max, u.urutan), 0) + 1);

    const created = await prisma.$transaction(async (tx) => {
      const unit = await tx.unitPengajaran.create({
        data: {
          tenant_id: tenantId,
          tahun_pelajaran_id: ctx.tahun_pelajaran_id,
          semester_id: ctx.semester_id,
          guru_mapel_id: gm.id,
          mapel_id: gm.mapel_id,
          kelas_id: gm.kelas_id,
          jurusan_id: gm.jurusan_id || gm.Kelas?.jurusan_id || null,
          nama_unit: input.nama_unit?.trim() || `Unit ${nextUrutan}`,
          guru_id: input.guru_id,
          jp_alokasi: Math.max(1, Number(input.jp_alokasi ?? 2)),
          target_sumatif_slot: targetSlot,
          urutan: nextUrutan,
          is_active: input.is_active !== undefined ? input.is_active : true,
        },
        include: { Guru: { select: { id: true, nama_guru: true } } },
      });

      const activeCount = gm.UnitPengajaran.filter((u) => u.is_active).length + (unit.is_active ? 1 : 0);
      if (activeCount > 1 && gm.teaching_mode !== 'COLLABORATION') {
        await tx.guruMapel.update({
          where: { id: gm.id },
          data: { teaching_mode: 'COLLABORATION' },
        });
      }

      return unit;
    });

    const totalActiveJp =
      gm.UnitPengajaran.filter((u) => u.is_active).reduce((s, u) => s + Number(u.jp_alokasi || 0), 0) +
      (created.is_active ? created.jp_alokasi : 0);

    const jpMeta = await this.getStrukturJpWarning(
      tenantId,
      {
        tahun_pelajaran_id: ctx.tahun_pelajaran_id,
        semester_id: ctx.semester_id,
        mapel_id: gm.mapel_id,
        kelas_id: gm.kelas_id,
        jurusan_id: gm.jurusan_id || gm.Kelas?.jurusan_id || null,
      },
      totalActiveJp
    );

    const { cacheInvalidationService } = await import('@/utils/cache-invalidation.service');
    await cacheInvalidationService.invalidateBebanGuruCache(tenantId);
    await this.syncCbtContributorsNonFatal(tenantId, gm.mapel_id);

    return { unit: created, ...jpMeta };
  }

  async updateUnit(tenantId: string, unitId: string, input: Partial<UnitInput>) {
    const unit = await prisma.unitPengajaran.findFirst({
      where: { id: unitId, tenant_id: tenantId },
      include: {
        GuruMapel: {
          include: {
            UnitPengajaran: { select: { id: true, is_active: true, jp_alokasi: true } },
          },
        },
      },
    });
    if (!unit) {
      throw new KurikulumPolicyError('UnitPengajaran tidak ditemukan.', 'NOT_FOUND', 404);
    }

    if (input.guru_id) {
      const guru = await prisma.guru.findFirst({
        where: { id: input.guru_id, tenant_id: tenantId },
        select: { id: true },
      });
      if (!guru) {
        throw new KurikulumPolicyError('Guru pengampu unit tidak ditemukan pada tenant ini.', 'GURU_NOT_FOUND', 400);
      }
    }

    if (input.is_active === false) {
      const otherActive = unit.GuruMapel.UnitPengajaran.filter((u) => u.id !== unit.id && u.is_active);
      if (otherActive.length === 0) {
        throw new KurikulumPolicyError(
          'Minimal harus terdapat 1 Unit Pengajaran aktif pada penugasan mapel ini.',
          'LAST_ACTIVE_UNIT',
          400
        );
      }
    }

    const updated = await prisma.unitPengajaran.update({
      where: { id: unit.id },
      data: {
        nama_unit: input.nama_unit !== undefined ? input.nama_unit?.trim() || null : undefined,
        guru_id: input.guru_id ?? undefined,
        jp_alokasi: input.jp_alokasi !== undefined ? Math.max(1, Number(input.jp_alokasi)) : undefined,
        target_sumatif_slot:
          input.target_sumatif_slot !== undefined ? normalizeSumatifSlot(input.target_sumatif_slot) : undefined,
        urutan: input.urutan !== undefined ? Number(input.urutan) : undefined,
        is_active: input.is_active !== undefined ? input.is_active : undefined,
      },
      include: { Guru: { select: { id: true, nama_guru: true } } },
    });

    const totalActiveJp = unit.GuruMapel.UnitPengajaran.reduce((sum, u) => {
      const active = u.id === updated.id ? updated.is_active : u.is_active;
      const jp = u.id === updated.id ? updated.jp_alokasi : u.jp_alokasi;
      return active ? sum + Number(jp || 0) : sum;
    }, 0);

    const jpMeta = await this.getStrukturJpWarning(
      tenantId,
      {
        tahun_pelajaran_id: unit.tahun_pelajaran_id,
        semester_id: unit.semester_id,
        mapel_id: unit.mapel_id,
        kelas_id: unit.kelas_id,
        jurusan_id: unit.jurusan_id,
      },
      totalActiveJp
    );

    const { cacheInvalidationService } = await import('@/utils/cache-invalidation.service');
    await cacheInvalidationService.invalidateBebanGuruCache(tenantId);
    await this.syncCbtContributorsNonFatal(tenantId, unit.mapel_id);

    return { unit: updated, ...jpMeta };
  }

  async removeUnit(tenantId: string, unitId: string) {
    const unit = await prisma.unitPengajaran.findFirst({
      where: { id: unitId, tenant_id: tenantId },
      include: {
        _count: {
          select: {
            SesiAbsensi: true,
            JadwalKBM: true,
            JadwalKontrakKbm: true,
            CbtBankSoal: true,
            CbtSoal: true,
          },
        },
        GuruMapel: {
          include: {
            UnitPengajaran: { select: { id: true } },
          },
        },
      },
    });
    if (!unit) {
      throw new KurikulumPolicyError('UnitPengajaran tidak ditemukan.', 'NOT_FOUND', 404);
    }

    if (unit.GuruMapel.UnitPengajaran.length <= 1) {
      throw new KurikulumPolicyError(
        'Tidak dapat menghapus satu-satunya UnitPengajaran pada GuruMapel. Hapus penugasan GuruMapel jika tidak digunakan.',
        'CANNOT_DELETE_ONLY_UNIT',
        400
      );
    }

    const totalRefs =
      unit._count.SesiAbsensi +
      unit._count.JadwalKBM +
      unit._count.JadwalKontrakKbm +
      unit._count.CbtBankSoal +
      unit._count.CbtSoal;

    if (totalRefs > 0) {
      throw new KurikulumPolicyError(
        `Unit ini sudah direferensikan oleh data operasional (${unit._count.SesiAbsensi} sesi, ${unit._count.JadwalKBM} jadwal, ${unit._count.CbtSoal} soal CBT). Gunakan arsip / nonaktifkan (is_active = false).`,
        'UNIT_HAS_HISTORY',
        409,
        unit._count
      );
    }

    await prisma.unitPengajaran.delete({ where: { id: unit.id } });

    const remainingActive = await prisma.unitPengajaran.count({
      where: { guru_mapel_id: unit.guru_mapel_id, is_active: true },
    });
    if (remainingActive <= 1) {
      await prisma.guruMapel.update({
        where: { id: unit.guru_mapel_id },
        data: { teaching_mode: 'SINGLE' },
      });
    }

    const { cacheInvalidationService } = await import('@/utils/cache-invalidation.service');
    await cacheInvalidationService.invalidateBebanGuruCache(tenantId);
    await this.syncCbtContributorsNonFatal(tenantId, unit.mapel_id);

    return { success: true };
  }

  async copyUnitsToClasses(
    tenantId: string,
    sourceGuruMapelId: string,
    targetKelasIds?: string[]
  ) {
    const sourceGm = await prisma.guruMapel.findFirst({
      where: { id: sourceGuruMapelId, tenant_id: tenantId },
      include: {
        Kelas: { select: { id: true, tingkat: true, jurusan_id: true } },
        UnitPengajaran: { where: { is_active: true }, orderBy: [{ urutan: 'asc' }] },
      },
    });

    if (!sourceGm) {
      throw new KurikulumPolicyError('Plotting sumber tidak ditemukan.', 'NOT_FOUND', 404);
    }
    if (sourceGm.UnitPengajaran.length === 0) {
      throw new KurikulumPolicyError('Plotting sumber belum memiliki UnitPengajaran aktif.', 'NO_UNITS', 400);
    }

    const ctx = await resolveAcademicContextForTenant(tenantId, sourceGm.tahun_pelajaran_id, sourceGm.semester_id);

    let targetClasses: Array<{ id: string; nama_kelas: string; jurusan_id: string | null }> = [];
    if (targetKelasIds && targetKelasIds.length > 0) {
      targetClasses = await prisma.kelas.findMany({
        where: {
          tenant_id: tenantId,
          id: { in: targetKelasIds.filter((id) => id !== sourceGm.kelas_id) },
          is_active: true,
        },
        select: { id: true, nama_kelas: true, jurusan_id: true },
      });
    } else if (sourceGm.Kelas) {
      targetClasses = await prisma.kelas.findMany({
        where: {
          tenant_id: tenantId,
          id: { not: sourceGm.kelas_id || undefined },
          tingkat: sourceGm.Kelas.tingkat,
          ...(sourceGm.Kelas.jurusan_id ? { jurusan_id: sourceGm.Kelas.jurusan_id } : {}),
          is_active: true,
        },
        select: { id: true, nama_kelas: true, jurusan_id: true },
      });
    } else {
      throw new KurikulumPolicyError(
        'Pilih target kelas atau gunakan sumber plotting yang terikat pada kelas tertentu.',
        'TARGET_CLASSES_REQUIRED',
        400
      );
    }

    let copiedCount = 0;
    let skippedWithHistory = 0;

    await prisma.$transaction(async (tx) => {
      for (const cls of targetClasses) {
        let targetGm = await tx.guruMapel.findFirst({
          where: {
            tenant_id: tenantId,
            mapel_id: sourceGm.mapel_id,
            kelas_id: cls.id,
            tahun_pelajaran_id: ctx.tahun_pelajaran_id,
            semester_id: ctx.semester_id,
          },
          include: {
            UnitPengajaran: {
              include: { _count: { select: { SesiAbsensi: true, JadwalKBM: true } } },
            },
          },
        });

        if (!targetGm) {
          targetGm = await tx.guruMapel.create({
            data: {
              tenant_id: tenantId,
              guru_id: sourceGm.guru_id,
              mapel_id: sourceGm.mapel_id,
              kelas_id: cls.id,
              jurusan_id: cls.jurusan_id,
              tahun_pelajaran_id: ctx.tahun_pelajaran_id,
              semester_id: ctx.semester_id,
              teaching_mode: sourceGm.teaching_mode,
            },
            include: {
              UnitPengajaran: {
                include: { _count: { select: { SesiAbsensi: true, JadwalKBM: true } } },
              },
            },
          });
        } else {
          const hasHistory = targetGm.UnitPengajaran.some(
            (u) => u._count.SesiAbsensi > 0 || u._count.JadwalKBM > 0
          );
          if (hasHistory) {
            skippedWithHistory += 1;
            continue;
          }
          await tx.unitPengajaran.deleteMany({ where: { guru_mapel_id: targetGm.id } });
          await tx.guruMapel.update({
            where: { id: targetGm.id },
            data: { guru_id: sourceGm.guru_id, teaching_mode: sourceGm.teaching_mode },
          });
        }

        for (const srcUnit of sourceGm.UnitPengajaran) {
          await tx.unitPengajaran.create({
            data: {
              tenant_id: tenantId,
              tahun_pelajaran_id: ctx.tahun_pelajaran_id,
              semester_id: ctx.semester_id,
              guru_mapel_id: targetGm.id,
              mapel_id: sourceGm.mapel_id,
              kelas_id: cls.id,
              jurusan_id: cls.jurusan_id,
              nama_unit: srcUnit.nama_unit,
              guru_id: srcUnit.guru_id,
              jp_alokasi: srcUnit.jp_alokasi,
              target_sumatif_slot: srcUnit.target_sumatif_slot,
              urutan: srcUnit.urutan,
              is_active: true,
            },
          });
        }
        copiedCount += 1;
      }
    });

    const { cacheInvalidationService } = await import('@/utils/cache-invalidation.service');
    await cacheInvalidationService.invalidateBebanGuruCache(tenantId);

    return {
      copied_classes: copiedCount,
      skipped_with_history: skippedWithHistory,
      total_targets: targetClasses.length,
    };
  }

  async copyUnitsFromSemester(
    tenantId: string,
    input: {
      source_tahun_pelajaran_id: string;
      source_semester_id: string;
      target_tahun_pelajaran_id: string;
      target_semester_id: string;
    }
  ) {
    if (
      input.source_tahun_pelajaran_id === input.target_tahun_pelajaran_id &&
      input.source_semester_id === input.target_semester_id
    ) {
      throw new KurikulumPolicyError('Semester sumber dan tujuan tidak boleh sama.', 'SAME_SEMESTER', 400);
    }

    const [targetTp, targetSem] = await Promise.all([
      prisma.tahunPelajaran.findFirst({ where: { id: input.target_tahun_pelajaran_id, tenant_id: tenantId } }),
      prisma.semester.findFirst({
        where: {
          id: input.target_semester_id,
          tenant_id: tenantId,
          tahun_pelajaran_id: input.target_tahun_pelajaran_id,
        },
      }),
    ]);

    if (!targetTp || !targetSem) {
      throw new KurikulumPolicyError('Tahun Pelajaran / Semester tujuan tidak valid.', 'TARGET_ACADEMIC_INVALID', 400);
    }

    const sourceGuruMapels = await prisma.guruMapel.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: input.source_tahun_pelajaran_id,
        semester_id: input.source_semester_id,
      },
      include: {
        UnitPengajaran: { where: { is_active: true }, orderBy: [{ urutan: 'asc' }] },
      },
    });

    let createdCount = 0;
    let skippedExisting = 0;

    await prisma.$transaction(async (tx) => {
      for (const src of sourceGuruMapels) {
        const existingTarget = await tx.guruMapel.findFirst({
          where: {
            tenant_id: tenantId,
            guru_id: src.guru_id,
            mapel_id: src.mapel_id,
            kelas_id: src.kelas_id,
            jurusan_id: src.jurusan_id,
            tahun_pelajaran_id: targetTp.id,
            semester_id: targetSem.id,
          },
        });
        if (existingTarget) {
          skippedExisting += 1;
          continue;
        }

        const createdGm = await tx.guruMapel.create({
          data: {
            tenant_id: tenantId,
            guru_id: src.guru_id,
            mapel_id: src.mapel_id,
            kelas_id: src.kelas_id,
            jurusan_id: src.jurusan_id,
            tahun_pelajaran_id: targetTp.id,
            semester_id: targetSem.id,
            teaching_mode: src.teaching_mode,
          },
        });

        const srcUnits =
          src.UnitPengajaran.length > 0
            ? src.UnitPengajaran
            : [
                {
                  nama_unit: null,
                  guru_id: src.guru_id,
                  jp_alokasi: 2,
                  target_sumatif_slot: null,
                  urutan: 1,
                },
              ];

        for (const u of srcUnits) {
          await tx.unitPengajaran.create({
            data: {
              tenant_id: tenantId,
              tahun_pelajaran_id: targetTp.id,
              semester_id: targetSem.id,
              guru_mapel_id: createdGm.id,
              mapel_id: src.mapel_id,
              kelas_id: src.kelas_id,
              jurusan_id: src.jurusan_id,
              nama_unit: u.nama_unit,
              guru_id: u.guru_id,
              jp_alokasi: u.jp_alokasi,
              target_sumatif_slot: u.target_sumatif_slot,
              urutan: u.urutan,
              is_active: true,
            },
          });
        }
        createdCount += 1;
      }
    });

    const { cacheInvalidationService } = await import('@/utils/cache-invalidation.service');
    await cacheInvalidationService.invalidateBebanGuruCache(tenantId);

    return {
      created_count: createdCount,
      skipped_existing: skippedExisting,
      source_total: sourceGuruMapels.length,
    };
  }

  private async syncCbtContributorsNonFatal(tenantId: string, mapelId: string): Promise<void> {
    try {
      const { CbtBankSoalService } = await import('@/modules/cbt/services/cbt-bank-soal.service');
      await CbtBankSoalService.syncContributorsForMapelDelegationChange(tenantId, mapelId);
    } catch {
      // Non-fatal: jangan gagalkan operasi UnitPengajaran bila modul CBT sedang kosong/tidak aktif
    }
  }
}

export const unitPengajaranService = new UnitPengajaranService();
