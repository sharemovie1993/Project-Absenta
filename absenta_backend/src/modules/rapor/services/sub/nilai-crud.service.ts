// @ts-nocheck
import { getTenantTimezone } from '@/utils/timezone.utils';
import { appLogger } from '@/utils/app-logger';
import { prisma } from '@/utils/prisma';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';

export class NilaiCrudService {
  static async getNilai(
    tenantId: string,
    filter: {
      siswa_id?: string;
      mapel_id?: string;
      tahun_pelajaran_id?: string;
      semester_id?: string;
      jenis_nilai_id?: string;
      kelas_id?: string; // Filter berdasarkan siswa di kelas tertentu
    }
  ) {
    return prisma.nilaiSiswa.findMany({
      where: {
        tenant_id: tenantId,
        ...(filter.siswa_id ? { siswa_id: filter.siswa_id } : {}),
        ...(filter.mapel_id ? { mapel_id: filter.mapel_id } : {}),
        ...(filter.tahun_pelajaran_id ? { tahun_pelajaran_id: filter.tahun_pelajaran_id } : {}),
        ...(filter.semester_id ? { semester_id: filter.semester_id } : {}),
        ...(filter.jenis_nilai_id ? { jenis_nilai_id: filter.jenis_nilai_id } : {}),
        ...(filter.kelas_id
          ? {
              Siswa: {
                kelas_id: filter.kelas_id,
              },
            }
          : {}),
      },
      include: {
        Siswa: {
          select: {
            id: true,
            nis: true,
            nama_siswa: true,
          },
        },
        Mapel: true,
        JenisNilai: true,
      },
      orderBy: [
        { Siswa: { nama_siswa: 'asc' } },
        { Mapel: { nama_mapel: 'asc' } },
      ],
    });
  }

  static async upsertNilai(
    tenantId: string,
    data: {
      siswa_id: string;
      mapel_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
      jenis_nilai_id: string;
      nilai: number;
      catatan_deskripsi?: string | null;
      sesi_absensi_id?: string | null;
    }
  ) {
    const result = await prisma.nilaiSiswa.upsert({
      where: {
        siswa_id_mapel_id_tahun_pelajaran_id_semester_id: {
          siswa_id: data.siswa_id,
          mapel_id: data.mapel_id,
          tahun_pelajaran_id: data.tahun_pelajaran_id,
          semester_id: data.semester_id,
        },
      },
      update: {
        nilai: data.nilai,
        catatan_deskripsi: data.catatan_deskripsi || null,
        sesi_absensi_id: data.sesi_absensi_id || null,
        ...(data.jenis_nilai_id ? { jenis_nilai_id: data.jenis_nilai_id } : {}),
      },
      create: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        mapel_id: data.mapel_id,
        tahun_pelajaran_id: data.tahun_pelajaran_id,
        semester_id: data.semester_id,
        jenis_nilai_id: data.jenis_nilai_id || null,
        nilai: data.nilai,
        catatan_deskripsi: data.catatan_deskripsi || null,
        sesi_absensi_id: data.sesi_absensi_id || null,
      },
    });

    // Invalidate leger cache — nilai berubah, leger harus direcalculate
    void cacheInvalidationService.invalidateRaporCache(tenantId);
    return result;
  }

  static async upsertBulkNilai(
    tenantId: string,
    data: {
      mapel_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
      jenis_nilai_id?: string | null;
      sesi_absensi_id?: string | null;
      scores: Array<{
        siswa_id: string;
        nilai: number;
        catatan_deskripsi?: string | null;
      }>;
    }
  ) {
    const operations = data.scores.map((score) => {
      return prisma.nilaiSiswa.upsert({
        where: {
          siswa_id_mapel_id_tahun_pelajaran_id_semester_id: {
            siswa_id: score.siswa_id,
            mapel_id: data.mapel_id,
            tahun_pelajaran_id: data.tahun_pelajaran_id,
            semester_id: data.semester_id,
          },
        },
        update: {
          nilai: score.nilai,
          catatan_deskripsi: score.catatan_deskripsi || null,
          sesi_absensi_id: data.sesi_absensi_id || null,
          ...(data.jenis_nilai_id ? { jenis_nilai_id: data.jenis_nilai_id } : {}),
        },
        create: {
          tenant_id: tenantId,
          siswa_id: score.siswa_id,
          mapel_id: data.mapel_id,
          tahun_pelajaran_id: data.tahun_pelajaran_id,
          semester_id: data.semester_id,
          jenis_nilai_id: data.jenis_nilai_id || null,
          nilai: score.nilai,
          catatan_deskripsi: score.catatan_deskripsi || null,
          sesi_absensi_id: data.sesi_absensi_id || null,
        },
      });
    });

    const results = await prisma.$transaction(operations);

    // Invalidate leger cache — batch nilai berubah, leger harus direcalculate
    void cacheInvalidationService.invalidateRaporCache(tenantId);
    return results;
  }

  /**
   * 📊 BATCH UPSERT SUMATIF (S1, S2, S3, NILAI AKHIR, CP NARASI)
   * Formula: Nilai Rapor Final = (Rata-rata(S1, S2, S3) + Nilai Akhir) / 2
   */
  static async upsertBatchSumatifNilai(
    tenantId: string,
    data: {
      mapel_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
      scores: Array<{
        siswa_id: string;
        sumatif_1?: number | null;
        sumatif_2?: number | null;
        sumatif_3?: number | null;
        nilai_akhir_sumatif?: number | null;
        sumatif_akhir?: number | null;
        capaian_kompetensi?: string | null;
        deskripsi_cp?: string | null;
        catatan_deskripsi?: string | null;
      }>;
    }
  ) {
    const operations = data.scores.map((item) => {
      // Calculate Rata-rata Sumatif
      const sumatifList = [item.sumatif_1, item.sumatif_2, item.sumatif_3].filter(
        (v): v is number => v !== undefined && v !== null && !isNaN(v)
      );

      let rataRataSumatif: number | null = null;
      if (sumatifList.length > 0) {
        const total = sumatifList.reduce((acc, curr) => acc + curr, 0);
        rataRataSumatif = Number((total / sumatifList.length).toFixed(2));
      }

      // Read Nilai Akhir Sumatif (support aliases)
      const nilaiAkhir = item.nilai_akhir_sumatif ?? item.sumatif_akhir ?? null;

      // Read Capaian Kompetensi / CP Text (support aliases)
      const cpText = item.capaian_kompetensi ?? item.deskripsi_cp ?? item.catatan_deskripsi ?? undefined;

      // Calculate Nilai Rapor Final = (Rata-rata Sumatif + Nilai Akhir) / 2
      let nilaiRaporFinal: number | null = null;

      if (rataRataSumatif !== null && nilaiAkhir !== undefined && nilaiAkhir !== null) {
        nilaiRaporFinal = Number(((rataRataSumatif + nilaiAkhir) / 2).toFixed(2));
      } else if (nilaiAkhir !== undefined && nilaiAkhir !== null) {
        nilaiRaporFinal = nilaiAkhir;
      } else if (rataRataSumatif !== null) {
        nilaiRaporFinal = rataRataSumatif;
      }

      const mainNilai = nilaiRaporFinal ?? 0;

      return prisma.nilaiSiswa.upsert({
        where: {
          siswa_id_mapel_id_tahun_pelajaran_id_semester_id: {
            siswa_id: item.siswa_id,
            mapel_id: data.mapel_id,
            tahun_pelajaran_id: data.tahun_pelajaran_id,
            semester_id: data.semester_id,
          },
        },
        update: {
          sumatif_1: item.sumatif_1 ?? null,
          sumatif_2: item.sumatif_2 ?? null,
          sumatif_3: item.sumatif_3 ?? null,
          rata_rata_sumatif: rataRataSumatif,
          nilai_akhir_sumatif: nilaiAkhir,
          nilai_rapor_final: nilaiRaporFinal,
          nilai: mainNilai,
          ...(cpText !== undefined
            ? { capaian_kompetensi: cpText, catatan_deskripsi: cpText }
            : {}),
        },
        create: {
          tenant_id: tenantId,
          siswa_id: item.siswa_id,
          mapel_id: data.mapel_id,
          tahun_pelajaran_id: data.tahun_pelajaran_id,
          semester_id: data.semester_id,
          sumatif_1: item.sumatif_1 ?? null,
          sumatif_2: item.sumatif_2 ?? null,
          sumatif_3: item.sumatif_3 ?? null,
          rata_rata_sumatif: rataRataSumatif,
          nilai_akhir_sumatif: nilaiAkhir,
          nilai_rapor_final: nilaiRaporFinal,
          nilai: mainNilai,
          capaian_kompetensi: cpText ?? null,
          catatan_deskripsi: cpText ?? null,
        },
      });
    });

    const results = await prisma.$transaction(operations);

    // Invalidate leger cache
    void cacheInvalidationService.invalidateRaporCache(tenantId);
    return results;
  }


  static async getTeacherProgress(
    tenantId: string,
    user: { id: string; roleName: string },
    params: { tahun_pelajaran_id?: string; semester_id?: string }
  ) {
    const tp = params.tahun_pelajaran_id 
      ? await prisma.tahunPelajaran.findFirst({ where: { id: params.tahun_pelajaran_id, tenant_id: tenantId } })
      : await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } });

    const sem = params.semester_id
      ? await prisma.semester.findFirst({ where: { id: params.semester_id, tenant_id: tenantId } })
      : await prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true } });

    if (!tp || !sem) {
      return {
        total_tasks: 0,
        completed_tasks: 0,
        partial_tasks: 0,
        empty_tasks: 0,
        percentage: 0,
        tasks: []
      };
    }

    let guruId: string | undefined;
    if (user.roleName === 'GURU') {
      const guru = await prisma.guru.findFirst({ where: { tenant_id: tenantId, user_id: user.id } });
      if (guru) guruId = guru.id;
    }

    const whereJadwal: any = { tenant_id: tenantId };
    if (guruId) {
      whereJadwal.guru_id = guruId;
    }

    const schedules = await prisma.jadwalKBM.findMany({
      where: whereJadwal,
      include: {
        Kelas: { select: { id: true, nama_kelas: true } },
        Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } }
      }
    });

    const taskMap = new Map<string, { kelas_id: string; nama_kelas: string; mapel_id: string; nama_mapel: string; kode_mapel: string | null }>();
    schedules.forEach((s) => {
      if (s.kelas_id && s.mapel_id && s.Kelas && s.Mapel) {
        const key = `${s.kelas_id}_${s.mapel_id}`;
        if (!taskMap.has(key)) {
          taskMap.set(key, {
            kelas_id: s.kelas_id,
            nama_kelas: s.Kelas.nama_kelas,
            mapel_id: s.mapel_id,
            nama_mapel: s.Mapel.nama_mapel,
            kode_mapel: s.Mapel.kode_mapel
          });
        }
      }
    });

    const uniqueTasks = Array.from(taskMap.values());
    const tz = await getTenantTimezone(tenantId);
    appLogger.info({ tenantId, totalTasks: uniqueTasks.length, tz }, 'Monitoring nilai fetched');

    if (uniqueTasks.length === 0) {
      return {
        total_tasks: 0,
        completed_tasks: 0,
        partial_tasks: 0,
        empty_tasks: 0,
        percentage: 0,
        tasks: []
      };
    }

    const classIds = Array.from(new Set(uniqueTasks.map(t => t.kelas_id)));
    const students = await prisma.siswa.findMany({
      where: { tenant_id: tenantId, kelas_id: { in: classIds }, status: { in: ['AKTIF', 'ACTIVE', 'Aktif', 'active'] } },
      select: { id: true, kelas_id: true }
    });

    const studentClassMap = new Map<string, string>();
    const studentsPerClass = new Map<string, number>();
    students.forEach(s => {
      if (s.kelas_id) {
        studentClassMap.set(s.id, s.kelas_id);
        studentsPerClass.set(s.kelas_id, (studentsPerClass.get(s.kelas_id) || 0) + 1);
      }
    });

    const existingNilai = await prisma.nilaiSiswa.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: tp.id,
        semester_id: sem.id,
        siswa_id: { in: students.map(s => s.id) }
      },
      select: { siswa_id: true, mapel_id: true, nilai: true, sumatif_1: true, nilai_akhir_sumatif: true }
    });

    const filledMap = new Map<string, Set<string>>();
    existingNilai.forEach(n => {
      const isFilled = (n.nilai !== null && n.nilai !== undefined && n.nilai > 0) ||
                       (n.sumatif_1 !== null && n.sumatif_1 !== undefined) ||
                       (n.nilai_akhir_sumatif !== null && n.nilai_akhir_sumatif !== undefined);
      const kelasId = studentClassMap.get(n.siswa_id);
      if (isFilled && kelasId && n.mapel_id && n.siswa_id) {
        const key = `${kelasId}_${n.mapel_id}`;
        if (!filledMap.has(key)) filledMap.set(key, new Set());
        filledMap.get(key)!.add(n.siswa_id);
      }
    });

    let completedTasks = 0;
    let partialTasks = 0;
    let emptyTasks = 0;

    const detailedTasks = uniqueTasks.map(t => {
      const key = `${t.kelas_id}_${t.mapel_id}`;
      const totalStudents = studentsPerClass.get(t.kelas_id) || 0;
      const filledSet = filledMap.get(key);
      const filledStudents = filledSet ? filledSet.size : 0;

      let status: 'completed' | 'partial' | 'empty' = 'empty';
      if (filledStudents >= totalStudents && totalStudents > 0) {
        status = 'completed';
        completedTasks++;
      } else if (filledStudents > 0) {
        status = 'partial';
        partialTasks++;
      } else {
        emptyTasks++;
      }

      return {
        ...t,
        total_siswa: totalStudents,
        siswa_terisi: filledStudents,
        status
      };
    });

    const totalTasks = uniqueTasks.length;
    const percentage = totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(1)) : 0;

    return {
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      partial_tasks: partialTasks,
      empty_tasks: emptyTasks,
      percentage,
      tasks: detailedTasks
    };
  }
}
