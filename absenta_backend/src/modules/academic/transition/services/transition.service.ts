import { prisma } from '@/utils/prisma';
import { activityLogService } from '@/modules/activity/services/activity-log.service';
import { DataScope } from '../../../../types/fastify';

export interface ClassMapping { fromKelasId: string; toKelasId: string }
export interface OverrideItem { siswaId: string; status: 'NAIK' | 'TINGGAL' | 'PINDAH' | 'LULUS' }
export interface TransitionPreviewInput {
  tahunPelajaranLamaId: string;
  tahunPelajaranBaruId: string;
  mappingKelas?: ClassMapping[];
  overrides?: OverrideItem[];
}

export interface TransitionPreviewItem {
  siswaId: string;
  namaSiswa: string;
  fromKelas: string;
  toKelas: string | null;
  status: 'NAIK' | 'TINGGAL' | 'PINDAH' | 'LULUS';
}
export interface TransitionPreviewResponse {
  total: number;
  byStatus: { NAIK: number; TINGGAL: number; PINDAH: number; LULUS: number };
  warnings: string[];
  items: TransitionPreviewItem[];
}

export class TransitionService {
  private async assertGatekeepers(tenantId: string | undefined, tahunLamaId: string, tahunBaruId: string) {
    const tahunLama = await prisma.tahunPelajaran.findFirst({ where: { id: tahunLamaId } });
    const tahunBaru = await prisma.tahunPelajaran.findFirst({ where: { id: tahunBaruId } });
    if (!tahunLama || !tahunBaru) throw new Error('Tahun pelajaran tidak ditemukan');
    if (tenantId && (tahunLama.tenant_id !== tenantId || tahunBaru.tenant_id !== tenantId)) {
      throw new Error('Tahun pelajaran lintas tenant tidak diizinkan');
    }
    if (!tahunLama.is_active) throw new Error('Tahun pelajaran lama harus AKTIF');
    if (tahunBaru.is_active) throw new Error('Tahun pelajaran baru harus BELUM AKTIF');
    const semesterAktifLama = await prisma.semester.findFirst({
      where: { tenant_id: tahunLama.tenant_id, tahun_pelajaran_id: tahunLama.id, is_active: true }
    });
    if (!semesterAktifLama || !['genap','2'].includes(String(semesterAktifLama.nama_semester).toLowerCase())) {
      throw new Error(`Semester aktif tahun lama harus GENAP (Saat ini: ${semesterAktifLama?.nama_semester || 'Tidak ada'})`);
    }
    const sesiAktif = await prisma.sesiAbsensi.findFirst({
      where: { tenant_id: tahunLama.tenant_id, status: { in: ['BERLANGSUNG','AKTIF'] } }
    });
    if (sesiAktif) throw new Error('Terdapat sesi absensi aktif berjalan. Harap tutup sesi terlebih dahulu.');
    return { tahunLama, tahunBaru, semesterAktifLama };
  }

  private async getSemesterGanjilBaru(tenantId: string, tahunBaruId: string) {
    const semesters = await prisma.semester.findMany({
      where: { tenant_id: tenantId, tahun_pelajaran_id: tahunBaruId }
    });
    const semesterGanjil = semesters.find(s => ['ganjil','1'].includes(String(s.nama_semester).toLowerCase()));
    
    if (!semesterGanjil) throw new Error('Semester GANJIL untuk tahun baru tidak ditemukan');
    return semesterGanjil;
  }

  /**
   * Returns the highest valid tingkat for this tenant based on sekolah jenjang.
   * Falls back to the highest existing class tingkat if jenjang is not set.
   */
  private async getMaxTingkatByJenjang(tenantId: string): Promise<number> {
    const sekolah = await prisma.sekolah.findFirst({ where: { tenant_id: tenantId } });
    if (sekolah?.jenjang) {
      const jg = sekolah.jenjang.toUpperCase();
      if (jg === 'SD' || jg === 'MI') return 6;
      if (jg === 'SMP' || jg === 'MTS') return 9;
      if (jg === 'SMA' || jg === 'MA') return 12;
      if (jg === 'SMK' || jg === 'MAK') return 13;
    }
    // Fallback: compute from highest existing class
    const highest = await prisma.kelas.findFirst({
      where: { tenant_id: tenantId },
      orderBy: { tingkat: 'desc' }
    });
    return highest?.tingkat ?? 12;
  }

  private async buildClassMap(tenantId: string, mapping?: ClassMapping[]) {
    const maxTingkat = await this.getMaxTingkatByJenjang(tenantId);
    const kelasAll = await prisma.kelas.findMany({ where: { tenant_id: tenantId }, include: { Jurusan: true } });
    const byId = new Map(kelasAll.map(k => [k.id, k]));
    const byJurusanTingkat = new Map<string, any[]>();
    for (const k of kelasAll) {
      const key = `${k.Jurusan?.id || ''}:${k.tingkat}`;
      const arr = byJurusanTingkat.get(key) || [];
      arr.push(k);
      byJurusanTingkat.set(key, arr);
    }
    const map = new Map<string, string>();
    for (const m of mapping || []) {
      if (byId.has(m.fromKelasId) && (byId.has(m.toKelasId) || m.toKelasId === 'LULUS')) {
        map.set(m.fromKelasId, m.toKelasId);
      }
    }
    for (const k of kelasAll) {
      if (map.has(k.id)) continue; // respect explicit mapping override
      // Auto-detect graduation: if this class is at the max tingkat, map to LULUS
      if ((k.tingkat || 0) >= maxTingkat) {
        map.set(k.id, 'LULUS');
        continue;
      }
      // Otherwise auto-map to the next tingkat in the same jurusan
      const keyNext = `${k.Jurusan?.id || ''}:${(k.tingkat || 0) + 1}`;
      const candidates = byJurusanTingkat.get(keyNext) || [];
      const next = candidates.length > 0 ? candidates[0] : null;
      if (next) {
        map.set(k.id, next.id);
      }
    }
    return { map, byId, maxTingkat };
  }

  /**
   * Detect active source classes that have NO matching class at (tingkat + 1).
   * Returns a preview of classes that would be auto-created if confirmed.
   */
  async detectMissingNextClasses(tenantId: string): Promise<{
    missing: Array<{ sourceKelasId: string; sourceNama: string; sourceTingkat: number; suggestedNama: string; jurusanId: string | null }>;
  }> {
    const maxTingkat = await this.getMaxTingkatByJenjang(tenantId);
    const kelasAll = await prisma.kelas.findMany({ where: { tenant_id: tenantId }, include: { Jurusan: true } });
    const byJurusanTingkat = new Map<string, any[]>();
    for (const k of kelasAll) {
      const key = `${k.jurusan_id || ''}:${k.tingkat}`;
      const arr = byJurusanTingkat.get(key) || [];
      arr.push(k);
      byJurusanTingkat.set(key, arr);
    }

    const TINGKAT_PREFIX: Record<number, string> = {
      1:'I', 2:'II', 3:'III', 4:'IV', 5:'V', 6:'VI',
      7:'VII', 8:'VIII', 9:'IX',
      10:'X', 11:'XI', 12:'XII', 13:'XIII'
    };

    const missing: Array<{ sourceKelasId: string; sourceNama: string; sourceTingkat: number; suggestedNama: string; jurusanId: string | null }> = [];

    for (const k of kelasAll) {
      if ((k.tingkat || 0) >= maxTingkat) continue; // graduation class, no next needed
      const nextTingkat = (k.tingkat || 0) + 1;
      const nextKey = `${k.jurusan_id || ''}:${nextTingkat}`;
      const nextExists = (byJurusanTingkat.get(nextKey) || []).length > 0;
      if (!nextExists) {
        // Generate suggested name by replacing prefix
        const currentPrefix = TINGKAT_PREFIX[k.tingkat || 0] || String(k.tingkat);
        const nextPrefix = TINGKAT_PREFIX[nextTingkat] || String(nextTingkat);
        const suggestedNama = k.nama_kelas.replace(
          new RegExp(`^(${currentPrefix})\\s*`, 'i'),
          `${nextPrefix} `
        ).trim();
        // If no prefix was replaced, prepend the next prefix
        const finalSuggested = suggestedNama === k.nama_kelas
          ? `${nextPrefix} ${k.nama_kelas}`.trim()
          : suggestedNama;
        missing.push({
          sourceKelasId: k.id,
          sourceNama: k.nama_kelas,
          sourceTingkat: k.tingkat || 0,
          suggestedNama: finalSuggested,
          jurusanId: k.jurusan_id,
        });
      }
    }
    return { missing };
  }

  /**
   * Auto-create next-grade classes for each missing next tingkat.
   * Each new class inherits the jurusan_id and schedule of its source class.
   */
  async createNextGradeClasses(tenantId: string, confirmList: Array<{ sourceKelasId: string; namaKelas: string }>): Promise<{ created: number }> {
    const maxTingkat = await this.getMaxTingkatByJenjang(tenantId);
    const kelasAll = await prisma.kelas.findMany({ where: { tenant_id: tenantId }, include: { Jurusan: true } });
    const byId = new Map(kelasAll.map(k => [k.id, k]));

    let created = 0;
    for (const item of confirmList) {
      const source = byId.get(item.sourceKelasId);
      if (!source) continue;
      const nextTingkat = (source.tingkat || 0) + 1;
      if (nextTingkat > maxTingkat) continue;

      // Check not already existing
      const existing = await prisma.kelas.findFirst({
        where: {
          tenant_id: tenantId,
          nama_kelas: item.namaKelas,
          tingkat: nextTingkat,
          jurusan_id: source.jurusan_id,
        }
      });
      if (existing) continue;

      await prisma.kelas.create({
        data: {
          tenant_id: tenantId,
          nama_kelas: item.namaKelas,
          tingkat: nextTingkat,
          jurusan_id: source.jurusan_id,
          jam_masuk: source.jam_masuk,
          jam_pulang: source.jam_pulang,
          is_active: true, // activate immediately so it appears in target dropdown
        }
      });
      created++;
    }
    return { created };
  }


  private async getCandidates(tenantId: string, tahunLamaId: string, semesterLamaId: string, mappedFromKelasIds?: string[]) {
    const whereKelas = mappedFromKelasIds && mappedFromKelasIds.length > 0 ? { in: mappedFromKelasIds } : undefined;

    // 1. Try to fetch from SiswaAkademik first
    let candidates = await prisma.siswaAkademik.findMany({
      where: {
        tahun_pelajaran_id: tahunLamaId,
        semester_id: semesterLamaId,
        status: 'AKTIF',
        ...(whereKelas ? { kelas_id: whereKelas } : {})
      },
      select: { id: true, siswa_id: true, kelas_id: true, siswa: { select: { nama_siswa: true } } }
    });

    // 2. Fallback to main Siswa table if SiswaAkademik records don't exist yet for this semester
    if (candidates.length === 0) {
      const siswaList = await prisma.siswa.findMany({
        where: {
          tenant_id: tenantId,
          status: 'AKTIF',
          kelas_id: whereKelas || { not: null }
        },
        select: { id: true, nama_siswa: true, kelas_id: true }
      });

      candidates = siswaList.map(s => ({
        id: s.id,
        siswa_id: s.id,
        kelas_id: s.kelas_id!,
        siswa: { nama_siswa: s.nama_siswa }
      }));
    }

    return candidates;
  }

  async preview(scope: DataScope, input: TransitionPreviewInput): Promise<TransitionPreviewResponse> {
    const tenantId = scope.tenantId;
    const { tahunLama, semesterAktifLama } = await this.assertGatekeepers(tenantId, input.tahunPelajaranLamaId, input.tahunPelajaranBaruId);
    const { map, byId } = await this.buildClassMap(tahunLama.tenant_id, input.mappingKelas);

    const overrides = new Map<string, OverrideItem>();
    for (const ov of input.overrides || []) {
      overrides.set(ov.siswaId, ov);
    }

    const mappedFromKelasIds = input.mappingKelas?.map(m => m.fromKelasId).filter(Boolean);
    const candidates = await this.getCandidates(tahunLama.tenant_id, tahunLama.id, semesterAktifLama.id, mappedFromKelasIds);

    const warnings: string[] = [];
    const items: TransitionPreviewItem[] = [];
    let countNAIK = 0, countTINGGAL = 0, countPINDAH = 0, countLULUS = 0;

    for (const c of candidates) {
      const fromKelas = byId.get(c.kelas_id);
      const override = overrides.get(c.siswa_id);
      let status: 'NAIK' | 'TINGGAL' | 'PINDAH' | 'LULUS' = override?.status || (map.get(c.kelas_id) === 'LULUS' ? 'LULUS' : 'NAIK');
      let toKelasId: string | null = null;
      if (status === 'TINGGAL') {
        toKelasId = c.kelas_id;
      } else if (status === 'LULUS') {
        toKelasId = c.kelas_id;
      } else {
        toKelasId = map.get(c.kelas_id) || null;
      }

      if (!fromKelas) {
        warnings.push(`Kelas asal tidak ditemukan untuk siswa ${c.siswa_id}`);
        continue;
      }
      if ((status === 'NAIK' || status === 'PINDAH') && !toKelasId) {
        warnings.push(`Mapping kelas tujuan kosong untuk kelas asal ${fromKelas.nama_kelas}`);
        continue;
      }

      const toKelas = toKelasId ? byId.get(toKelasId) : null;
      items.push({
        siswaId: c.siswa_id,
        namaSiswa: c.siswa?.nama_siswa || '',
        fromKelas: fromKelas?.nama_kelas || '',
        toKelas: toKelas ? toKelas.nama_kelas : null,
        status
      });
      if (status === 'NAIK') countNAIK++;
      else if (status === 'TINGGAL') countTINGGAL++;
      else if (status === 'PINDAH') countPINDAH++;
      else if (status === 'LULUS') countLULUS++;
    }

    return {
      total: items.length,
      byStatus: { NAIK: countNAIK, TINGGAL: countTINGGAL, PINDAH: countPINDAH, LULUS: countLULUS },
      warnings,
      items
    };
  }

  async execute(scope: DataScope, input: TransitionPreviewInput, userId?: string): Promise<{ inserted: number; tahunPelajaranBaruId: string; semester: 'GANJIL' }> {
    const tenantId = scope.tenantId;
    const { tahunLama, tahunBaru, semesterAktifLama } = await this.assertGatekeepers(tenantId, input.tahunPelajaranLamaId, input.tahunPelajaranBaruId);
    const semesterGanjilBaru = await this.getSemesterGanjilBaru(tahunBaru.tenant_id, tahunBaru.id);
    const { map, byId } = await this.buildClassMap(tahunLama.tenant_id, input.mappingKelas);

    const overrides = new Map<string, OverrideItem>();
    for (const ov of input.overrides || []) {
      overrides.set(ov.siswaId, ov);
    }

    const mappedFromKelasIds = input.mappingKelas?.map(m => m.fromKelasId).filter(Boolean);
    const candidates = await this.getCandidates(tahunLama.tenant_id, tahunLama.id, semesterAktifLama.id, mappedFromKelasIds);

    const invalids: string[] = [];
    for (const c of candidates) {
      const fromKelas = byId.get(c.kelas_id);
      const override = overrides.get(c.siswa_id);
      const status = override?.status || (map.get(c.kelas_id) === 'LULUS' ? 'LULUS' : 'NAIK');
      const toKelasId = status === 'TINGGAL' || status === 'LULUS' ? c.kelas_id : map.get(c.kelas_id) || null;
      if (!fromKelas || ((status === 'NAIK' || status === 'PINDAH') && !toKelasId)) {
        invalids.push(c.siswa_id);
      }
    }
    if (invalids.length > 0) {
      throw new Error('Mapping kelas tidak valid. Perbaiki sebelum eksekusi.');
    }

    const existingNewSnapshots = await prisma.siswaAkademik.findMany({
      where: { tahun_pelajaran_id: tahunBaru.id, semester_id: semesterGanjilBaru.id, siswa_id: { in: candidates.map(c => c.siswa_id) } },
      select: { siswa_id: true }
    });
    if (existingNewSnapshots.length > 0) {
      throw new Error('Snapshot GANJIL tahun baru sudah ada. Eksekusi ditolak.');
    }

    const inserted = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const c of candidates) {
        const override = overrides.get(c.siswa_id);
        const status = override?.status || (map.get(c.kelas_id) === 'LULUS' ? 'LULUS' : 'NAIK');
        
        // 1. Update/create historical status in the old year's academic record
        await tx.siswaAkademik.upsert({
          where: {
            siswa_id_tahun_pelajaran_id_semester_id: {
              siswa_id: c.siswa_id,
              tahun_pelajaran_id: tahunLama.id,
              semester_id: semesterAktifLama.id
            }
          },
          update: {
            status: status as any
          },
          create: {
            siswa_id: c.siswa_id,
            tahun_pelajaran_id: tahunLama.id,
            semester_id: semesterAktifLama.id,
            kelas_id: c.kelas_id,
            status: status as any
          }
        });

        // 2. Apply target mapping status for the new academic year
        if (status === 'LULUS') {
          // IDEAL GRADUATION: Keep them locked in their graduation year, preserve their graduation class, and set status to LULUS
          await tx.siswa.update({
            where: { id: c.siswa_id },
            data: {
              status: 'LULUS',
              kelas_id: c.kelas_id,
              // Let tahun_pelajaran_id and semester_id stay pointing to their graduation year/semester
            } as any
          });
          // DO NOT create any new year SiswaAkademik record for graduated students
        } else {
          // ACTIVE STUDENTS: Move to the new year & semester, and assign to their target/repeated class
          const toKelasId = status === 'TINGGAL' ? c.kelas_id : (map.get(c.kelas_id) as string);
          
          await tx.siswaAkademik.create({
            data: {
              siswa_id: c.siswa_id,
              kelas_id: toKelasId,
              tahun_pelajaran_id: tahunBaru.id,
              semester_id: semesterGanjilBaru.id,
              status: 'AKTIF' // Active student in the new semester
            }
          });
          
          await tx.siswa.update({
            where: { id: c.siswa_id },
            data: {
              kelas_id: toKelasId,
              tahun_pelajaran_id: tahunBaru.id,
              semester_id: semesterGanjilBaru.id,
              status: 'AKTIF' // Active student in the new semester
            }
          });
        }
        count++;
      }

      // 2b. Automatically manage class active status after transition
      const allTenantClasses = await tx.kelas.findMany({
        where: { tenant_id: tenantId }
      });

      const populatedClassIds = new Set(
        (await tx.siswaAkademik.findMany({
          where: {
            tahun_pelajaran_id: tahunBaru.id,
            semester_id: semesterGanjilBaru.id,
            status: 'AKTIF'
          },
          select: { kelas_id: true }
        })).map(sa => sa.kelas_id).filter(Boolean)
      );

      // Determine the lowest grade level (minTingkat) dynamically for the tenant (e.g. 1 for SD, 7 for SMP, 10 for SMA)
      const minTingkat = allTenantClasses.reduce((min, k) => k.tingkat < min ? k.tingkat : min, 10);

      for (const k of allTenantClasses) {
        const shouldBeActive = populatedClassIds.has(k.id) || k.tingkat === minTingkat;
        if (k.is_active !== shouldBeActive) {
          await tx.kelas.update({
            where: { id: k.id },
            data: { is_active: shouldBeActive }
          });
        }
      }

      // 3. Automatically transition the active Tahun Pelajaran and Semester status
      await tx.tahunPelajaran.updateMany({
        where: { tenant_id: tenantId, id: { not: tahunBaru.id } },
        data: { is_active: false }
      });
      await tx.tahunPelajaran.update({
        where: { id: tahunBaru.id },
        data: { is_active: true }
      });

      await tx.semester.updateMany({
        where: { tenant_id: tenantId, id: { not: semesterGanjilBaru.id } },
        data: { is_active: false }
      });
      await tx.semester.update({
        where: { id: semesterGanjilBaru.id },
        data: { is_active: true }
      });

      return count;
    }, {
      maxWait: 45000,
      timeout: 180000, // 3 menit timeout agar aman untuk jumlah siswa besar (ribuan)
    });

    if (userId) {
      try {
        const yearLama = await prisma.tahunPelajaran.findUnique({ where: { id: input.tahunPelajaranLamaId }, select: { tahun: true } });
        const yearBaru = await prisma.tahunPelajaran.findUnique({ where: { id: input.tahunPelajaranBaruId }, select: { tahun: true } });

        activityLogService.logEvent({
          event_type: 'ACADEMIC_TRANSITION_EXECUTE',
          tenant_id: tenantId!,
          user_id: userId,
          entity: 'TahunPelajaran',
          entity_id: input.tahunPelajaranBaruId,
          metadata: {
            tahun_pelajaran_lama_id: input.tahunPelajaranLamaId,
            tahun_pelajaran_lama_name: yearLama?.tahun || null,
            tahun_pelajaran_baru_id: input.tahunPelajaranBaruId,
            tahun_pelajaran_baru_name: yearBaru?.tahun || null,
            total_students_transitioned: inserted,
          }
        });
      } catch (err) {
        console.error('Failed to log transition execute event:', err);
      }
    }

    return { inserted, tahunPelajaranBaruId: tahunBaru.id, semester: 'GANJIL' };
  }
}

export const transitionService = new TransitionService();
