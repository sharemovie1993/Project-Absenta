import { prisma } from '@/utils/prisma';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';
import { resolveKbmOperationalFilter } from '@/modules/attendance/helpers/kbm-operational-period.helper';

export interface CreatePeriodeOperasionalKbmInput {
  tahun_pelajaran_id?: string;
  semester_id?: string | null;
  nama: string;
  tipe: 'PKL' | 'KBM_BLOK' | 'NON_KBM';
  kelompok_aktif?: 'PRODUKTIF' | 'UMUM' | 'MUATAN_LOKAL' | null;
  tanggal_mulai: string; // YYYY-MM-DD
  tanggal_selesai: string; // YYYY-MM-DD
  target_semua_kelas?: boolean;
  target_kelas_ids?: string[];
  keterangan?: string | null;
  aktif?: boolean;
}

export type UpdatePeriodeOperasionalKbmInput = Partial<CreatePeriodeOperasionalKbmInput>;

export class PeriodeOperasionalKbmService {
  /**
   * Bersihkan SesiAbsensi KBM kosong (belum dibuka guru / MENDATANG, 0 AbsenGuru)
   * dari hari ini ke depan yang jatuh dalam periode penangguhan agar tidak menjadi sesi hantu / ALPA.
   */
  private async purgePendingSuspendedSessions(
    tenantId: string,
    mulaiDate: Date,
    selesaiDate: Date
  ) {
    try {
      const todayUtc = new Date();
      todayUtc.setUTCHours(0, 0, 0, 0);
      const effectiveStart = mulaiDate > todayUtc ? mulaiDate : todayUtc;
      if (effectiveStart > selesaiDate) return;

      const candidateSessions = await prisma.sesiAbsensi.findMany({
        where: {
          tenant_id: tenantId,
          jenis_kegiatan: 'KBM',
          status: 'MENDATANG',
          tanggal: { gte: effectiveStart, lte: selesaiDate },
        },
        select: {
          id: true,
          tanggal: true,
          kelas_id: true,
          mapel_id: true,
          _count: { select: { AbsenGuru: true, AbsenSiswa: true } },
        },
      });

      if (candidateSessions.length === 0) return;

      const idsToDelete: string[] = [];
      const filterByDateCache = new Map<string, Awaited<ReturnType<typeof resolveKbmOperationalFilter>>>();

      for (const s of candidateSessions) {
        if ((s._count?.AbsenGuru || 0) > 0 || (s._count?.AbsenSiswa || 0) > 0) continue;
        const dStr = s.tanggal.toISOString().slice(0, 10);
        if (!filterByDateCache.has(dStr)) {
          filterByDateCache.set(dStr, await resolveKbmOperationalFilter(tenantId, dStr));
        }
        const ctx = filterByDateCache.get(dStr)!;
        if (ctx.checkSchedule({ kelas_id: s.kelas_id, mapel_id: s.mapel_id }).suspended) {
          idsToDelete.push(s.id);
        }
      }

      if (idsToDelete.length > 0) {
        await prisma.sesiAbsensi.deleteMany({
          where: { tenant_id: tenantId, id: { in: idsToDelete } },
        });
      }
    } catch {
      // Non-blocking cleanup
    }
  }

  private buildTargetTingkatLabel(
    targetSemua: boolean,
    targetIds: string[],
    kelasMap: Map<string, { id: string; tingkat: number; nama_kelas: string }>
  ): string {
    if (targetSemua) return 'Seluruh Kelas';
    if (!targetIds || targetIds.length === 0) return 'Belum dipilih';
    const levels = new Set<string>();
    for (const cid of targetIds) {
      const k = kelasMap.get(cid);
      if (!k) continue;
      const t = String(k.tingkat ?? '').trim().toUpperCase();
      const nm = String(k.nama_kelas || '').trim().toUpperCase();
      if (t === '10' || t === 'X' || nm.startsWith('X ') || nm.startsWith('10 ')) levels.add('X');
      else if (t === '11' || t === 'XI' || nm.startsWith('XI ') || nm.startsWith('11 ')) levels.add('XI');
      else if (t === '12' || t === 'XII' || nm.startsWith('XII ') || nm.startsWith('12 ')) levels.add('XII');
    }
    if (levels.size > 0) {
      const ordered = ['X', 'XI', 'XII'].filter((l) => levels.has(l));
      return `Kelas ${ordered.join(', ')} (${targetIds.length} rombel)`;
    }
    return `${targetIds.length} rombel`;
  }

  async getAll(
    tenantId: string,
    filters?: { tahun_pelajaran_id?: string; tipe?: string; aktifOnly?: boolean }
  ) {
    if (!tenantId) throw new Error('Tenant ID required');

    const [rows, tenantClasses] = await Promise.all([
      prisma.periodeOperasionalKbm.findMany({
        where: {
          tenant_id: tenantId,
          ...(filters?.tahun_pelajaran_id ? { tahun_pelajaran_id: filters.tahun_pelajaran_id } : {}),
          ...(filters?.tipe ? { tipe: filters.tipe.toUpperCase() } : {}),
          ...(filters?.aktifOnly ? { aktif: true } : {}),
        },
        include: {
          TahunPelajaran: { select: { id: true, tahun: true } },
          Semester: { select: { id: true, nama_semester: true } },
        },
        orderBy: [{ aktif: 'desc' }, { tanggal_mulai: 'desc' }, { created_at: 'desc' }],
      }),
      prisma.kelas.findMany({
        where: { tenant_id: tenantId },
        select: { id: true, tingkat: true, nama_kelas: true },
      }),
    ]);

    const kelasMap = new Map(tenantClasses.map((k) => [k.id, k]));

    return rows.map((row) => ({
      ...row,
      target_tingkat_label: this.buildTargetTingkatLabel(
        row.target_semua_kelas,
        row.target_kelas_ids,
        kelasMap
      ),
    }));
  }

  async create(tenantId: string, userId: string, input: CreatePeriodeOperasionalKbmInput) {
    if (!tenantId) throw new Error('Tenant ID required');

    const tipe = String(input.tipe || '').toUpperCase() as 'PKL' | 'KBM_BLOK' | 'NON_KBM';
    if (!['PKL', 'KBM_BLOK', 'NON_KBM'].includes(tipe)) {
      throw new Error('Tipe periode tidak valid (PKL, KBM_BLOK, atau NON_KBM)');
    }

    if (tipe === 'KBM_BLOK' && !input.kelompok_aktif) {
      throw new Error('Pilih kelompok mapel aktif (PRODUKTIF atau UMUM) untuk mode KBM Blok');
    }

    const mulaiStr = String(input.tanggal_mulai || '').slice(0, 10);
    const selesaiStr = String(input.tanggal_selesai || '').slice(0, 10);
    if (!mulaiStr || !selesaiStr) {
      throw new Error('Tanggal mulai dan tanggal selesai wajib diisi');
    }
    if (selesaiStr < mulaiStr) {
      throw new Error('Tanggal selesai tidak boleh lebih awal dari tanggal mulai');
    }

    const targetSemua = Boolean(input.target_semua_kelas);
    const targetIds = targetSemua
      ? []
      : Array.from(new Set((input.target_kelas_ids || []).filter(Boolean)));
    if (!targetSemua && targetIds.length === 0) {
      throw new Error('Pilih minimal satu tingkat/kelas peserta');
    }

    let tpId = input.tahun_pelajaran_id;
    if (!tpId || tpId.trim() === '') {
      const activeTp =
        (await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } })) ||
        (await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId } }));
      if (!activeTp) throw new Error('Tahun Pelajaran aktif tidak ditemukan');
      tpId = activeTp.id;
    }

    const mulaiDate = new Date(`${mulaiStr}T00:00:00.000Z`);
    const selesaiDate = new Date(`${selesaiStr}T00:00:00.000Z`);

    const created = await prisma.periodeOperasionalKbm.create({
      data: {
        tenant_id: tenantId,
        tahun_pelajaran_id: tpId,
        semester_id: input.semester_id || null,
        nama: input.nama.trim(),
        tipe,
        kelompok_aktif: tipe === 'KBM_BLOK' && input.kelompok_aktif ? input.kelompok_aktif.toUpperCase() : null,
        tanggal_mulai: mulaiDate,
        tanggal_selesai: selesaiDate,
        target_semua_kelas: targetSemua,
        target_kelas_ids: targetIds,
        keterangan: input.keterangan?.trim() || null,
        aktif: input.aktif ?? true,
        dibuat_oleh: userId || 'system',
      },
    });

    await this.purgePendingSuspendedSessions(tenantId, mulaiDate, selesaiDate);
    await cacheInvalidationService.invalidateAttendanceCache(tenantId);
    return created;
  }

  async update(tenantId: string, id: string, input: UpdatePeriodeOperasionalKbmInput) {
    if (!tenantId) throw new Error('Tenant ID required');

    const existing = await prisma.periodeOperasionalKbm.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!existing) {
      throw new Error('Periode operasional KBM tidak ditemukan');
    }

    const nextTipe = (input.tipe ? input.tipe.toUpperCase() : existing.tipe) as 'PKL' | 'KBM_BLOK' | 'NON_KBM';
    const nextKelompok =
      nextTipe === 'KBM_BLOK'
        ? (input.kelompok_aktif !== undefined
            ? (input.kelompok_aktif ? input.kelompok_aktif.toUpperCase() : null)
            : existing.kelompok_aktif)
        : null;

    if (nextTipe === 'KBM_BLOK' && !nextKelompok) {
      throw new Error('Pilih kelompok mapel aktif (PRODUKTIF atau UMUM) untuk mode KBM Blok');
    }

    const nextMulaiStr = input.tanggal_mulai
      ? input.tanggal_mulai.slice(0, 10)
      : existing.tanggal_mulai.toISOString().slice(0, 10);
    const nextSelesaiStr = input.tanggal_selesai
      ? input.tanggal_selesai.slice(0, 10)
      : existing.tanggal_selesai.toISOString().slice(0, 10);

    if (nextSelesaiStr < nextMulaiStr) {
      throw new Error('Tanggal selesai tidak boleh lebih awal dari tanggal mulai');
    }

    const nextSemua =
      input.target_semua_kelas !== undefined ? Boolean(input.target_semua_kelas) : existing.target_semua_kelas;
    const nextKelasIds = nextSemua
      ? []
      : input.target_kelas_ids !== undefined
      ? Array.from(new Set(input.target_kelas_ids.filter(Boolean)))
      : existing.target_kelas_ids;

    if (!nextSemua && nextKelasIds.length === 0) {
      throw new Error('Pilih minimal satu tingkat/kelas peserta');
    }

    const mulaiDate = new Date(`${nextMulaiStr}T00:00:00.000Z`);
    const selesaiDate = new Date(`${nextSelesaiStr}T00:00:00.000Z`);

    const updated = await prisma.periodeOperasionalKbm.update({
      where: { id },
      data: {
        ...(input.tahun_pelajaran_id ? { tahun_pelajaran_id: input.tahun_pelajaran_id } : {}),
        ...(input.semester_id !== undefined ? { semester_id: input.semester_id || null } : {}),
        ...(input.nama !== undefined ? { nama: input.nama.trim() } : {}),
        tipe: nextTipe,
        kelompok_aktif: nextKelompok,
        tanggal_mulai: mulaiDate,
        tanggal_selesai: selesaiDate,
        target_semua_kelas: nextSemua,
        target_kelas_ids: nextKelasIds,
        ...(input.keterangan !== undefined ? { keterangan: input.keterangan?.trim() || null } : {}),
        ...(input.aktif !== undefined ? { aktif: Boolean(input.aktif) } : {}),
      },
    });

    if (updated.aktif) {
      await this.purgePendingSuspendedSessions(tenantId, mulaiDate, selesaiDate);
    }
    await cacheInvalidationService.invalidateAttendanceCache(tenantId);
    return updated;
  }

  async delete(tenantId: string, id: string) {
    if (!tenantId) throw new Error('Tenant ID required');
    const existing = await prisma.periodeOperasionalKbm.findFirst({
      where: { id, tenant_id: tenantId },
    });
    if (!existing) {
      throw new Error('Periode operasional KBM tidak ditemukan');
    }

    const deleted = await prisma.periodeOperasionalKbm.delete({
      where: { id },
    });
    await cacheInvalidationService.invalidateAttendanceCache(tenantId);
    return deleted;
  }
}

export const periodeOperasionalKbmService = new PeriodeOperasionalKbmService();
