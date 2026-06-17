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

  private async buildClassMap(tenantId: string, mapping?: ClassMapping[]) {
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
      if (byId.has(m.fromKelasId) && byId.has(m.toKelasId)) {
        map.set(m.fromKelasId, m.toKelasId);
      }
    }
    for (const k of kelasAll) {
      const keyNext = `${k.Jurusan?.id || ''}:${(k.tingkat || 0) + 1}`;
      const candidates = byJurusanTingkat.get(keyNext) || [];
      const next = candidates.length > 0 ? candidates[0] : null;
      if (next && !map.has(k.id)) {
        map.set(k.id, next.id);
      }
    }
    return { map, byId };
  }

  async preview(scope: DataScope, input: TransitionPreviewInput): Promise<TransitionPreviewResponse> {
    const tenantId = scope.tenantId;
    const { tahunLama, semesterAktifLama } = await this.assertGatekeepers(tenantId, input.tahunPelajaranLamaId, input.tahunPelajaranBaruId);
    const { map, byId } = await this.buildClassMap(tahunLama.tenant_id, input.mappingKelas);

    const overrides = new Map<string, OverrideItem>();
    for (const ov of input.overrides || []) {
      overrides.set(ov.siswaId, ov);
    }

    const candidates = await prisma.siswaAkademik.findMany({
      where: { tahun_pelajaran_id: tahunLama.id, semester_id: semesterAktifLama.id, status: 'AKTIF' },
      select: { id: true, siswa_id: true, kelas_id: true, siswa: { select: { nama_siswa: true } } }
    });

    const warnings: string[] = [];
    const items: TransitionPreviewItem[] = [];
    let countNAIK = 0, countTINGGAL = 0, countPINDAH = 0, countLULUS = 0;

    for (const c of candidates) {
      const fromKelas = byId.get(c.kelas_id);
      const override = overrides.get(c.siswa_id);
      let status: 'NAIK' | 'TINGGAL' | 'PINDAH' | 'LULUS' = override?.status || 'NAIK';
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

    const candidates = await prisma.siswaAkademik.findMany({
      where: { tahun_pelajaran_id: tahunLama.id, semester_id: semesterAktifLama.id, status: 'AKTIF' },
      select: { siswa_id: true, kelas_id: true }
    });

    const invalids: string[] = [];
    for (const c of candidates) {
      const fromKelas = byId.get(c.kelas_id);
      const override = overrides.get(c.siswa_id);
      const status = override?.status || 'NAIK';
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
        const status = override?.status || 'NAIK';
        
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
              status: status as any
            }
          });
          
          await tx.siswa.update({
            where: { id: c.siswa_id },
            data: {
              kelas_id: toKelasId,
              tahun_pelajaran_id: tahunBaru.id,
              semester_id: semesterGanjilBaru.id,
              status: status as any
            }
          });
        }
        count++;
      }
      return count;
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
