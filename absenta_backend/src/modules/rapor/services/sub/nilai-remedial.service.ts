// @ts-nocheck
import { prisma } from '@/utils/prisma';
import { appLogger } from '@/utils/app-logger';
import { cacheInvalidationService } from '@/utils/cache-invalidation.service';

export class NilaiRemedialService {
  /**
   * 📡 RADAR REMEDIAL (EARLY DETECTION HUB)
   * Mendeteksi seluruh siswa yang perlu remedial (< KKM) atau belum dinilai (unassessed)
   * di seluruh kelas yang diampu guru untuk semester aktif / terpilih.
   */
  static async getRadarRemedial(
    tenantId: string,
    user: { id: string; roleName: string },
    params: {
      tahun_pelajaran_id?: string;
      semester_id?: string;
      kelas_id?: string;
      mapel_id?: string;
      kkm?: number | string;
    }
  ) {
    const kkmThreshold = Number(params.kkm) || 70;

    // 1. Tentukan Tahun Pelajaran & Semester
    const tp = params.tahun_pelajaran_id
      ? await prisma.tahunPelajaran.findFirst({ where: { id: params.tahun_pelajaran_id, tenant_id: tenantId } })
      : await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } });

    const sem = params.semester_id
      ? await prisma.semester.findFirst({ where: { id: params.semester_id, tenant_id: tenantId } })
      : await prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true } });

    if (!tp || !sem) {
      return {
        stats: {
          total_siswa_diampu: 0,
          total_perlu_remedial: 0,
          total_belum_dinilai: 0,
          total_tuntas: 0,
          kkm_threshold: kkmThreshold,
        },
        periode: {
          tahun_pelajaran_id: '',
          tahun_pelajaran: '',
          semester_id: '',
          semester: '',
        },
        tasks: [],
        items: [],
      };
    }

    // 2. Ambil Profil Guru jika role GURU
    let guruId: string | undefined;
    if (user.roleName === 'GURU') {
      const guru = await prisma.guru.findFirst({ where: { tenant_id: tenantId, user_id: user.id } });
      if (guru) guruId = guru.id;
    }

    // 3. Ambil Jadwal KBM Guru
    const whereJadwal: any = {
      tenant_id: tenantId,
      tahun_pelajaran_id: tp.id,
      semester_id: sem.id,
    };
    if (guruId) whereJadwal.guru_id = guruId;
    if (params.kelas_id) whereJadwal.kelas_id = params.kelas_id;
    if (params.mapel_id) whereJadwal.mapel_id = params.mapel_id;

    let schedules = await prisma.jadwalKBM.findMany({
      where: whereJadwal,
      include: {
        Kelas: { select: { id: true, nama_kelas: true } },
        Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
      },
    });

    if (schedules.length === 0 && !params.kelas_id && !params.mapel_id) {
      schedules = await prisma.jadwalKBM.findMany({
        where: {
          tenant_id: tenantId,
          tahun_pelajaran_id: tp.id,
          ...(guruId ? { guru_id: guruId } : {}),
        },
        include: {
          Kelas: { select: { id: true, nama_kelas: true } },
          Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
        },
      });
    }

    // Map unique tasks
    const taskMap = new Map<string, { kelas_id: string; nama_kelas: string; mapel_id: string; nama_mapel: string }>();
    schedules.forEach((s) => {
      if (s.kelas_id && s.mapel_id && s.Kelas && s.Mapel) {
        const key = `${s.kelas_id}_${s.mapel_id}`;
        if (!taskMap.has(key)) {
          taskMap.set(key, {
            kelas_id: s.kelas_id,
            nama_kelas: s.Kelas.nama_kelas,
            mapel_id: s.mapel_id,
            nama_mapel: s.Mapel.nama_mapel,
          });
        }
      }
    });

    const uniqueTasks = Array.from(taskMap.values());
    if (uniqueTasks.length === 0) {
      return {
        stats: {
          total_siswa_diampu: 0,
          total_perlu_remedial: 0,
          total_belum_dinilai: 0,
          total_tuntas: 0,
          kkm_threshold: kkmThreshold,
        },
        periode: {
          tahun_pelajaran_id: tp.id,
          tahun_pelajaran: tp.tahun,
          semester_id: sem.id,
          semester: sem.nama_semester,
        },
        tasks: [],
        items: [],
      };
    }

    // 4. Ambil seluruh siswa aktif di kelas-kelas tersebut
    const classIds = Array.from(new Set(uniqueTasks.map((t) => t.kelas_id)));
    const students = await prisma.siswa.findMany({
      where: {
        tenant_id: tenantId,
        kelas_id: { in: classIds },
        status: { in: ['AKTIF', 'ACTIVE', 'Aktif', 'active'] },
      },
      select: {
        id: true,
        nis: true,
        nama_siswa: true,
        kelas_id: true,
        Kelas: { select: { nama_kelas: true } },
      },
      orderBy: { nama_siswa: 'asc' },
    });

    // 5. Ambil data nilai siswa yang sudah ada
    const existingNilai = await prisma.nilaiSiswa.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: tp.id,
        semester_id: sem.id,
        siswa_id: { in: students.map((s) => s.id) },
        mapel_id: { in: Array.from(new Set(uniqueTasks.map((t) => t.mapel_id))) },
      },
      select: {
        id: true,
        siswa_id: true,
        mapel_id: true,
        nilai: true,
        sumatif_1: true,
        sumatif_2: true,
        sumatif_3: true,
        nilai_akhir_sumatif: true,
        nilai_rapor_final: true,
        catatan_deskripsi: true,
        capaian_kompetensi: true,
      },
    });

    const gradeMap = new Map<string, any>();
    existingNilai.forEach((n) => {
      gradeMap.set(`${n.siswa_id}_${n.mapel_id}`, n);
    });

    // 6. Evaluasi tiap siswa di tiap jadwal KBM
    const radarItems: any[] = [];
    let totalPerluRemedial = 0;
    let totalBelumDinilai = 0;
    let totalTuntas = 0;
    let totalSiswaDiampu = 0;

    uniqueTasks.forEach((t) => {
      const classStudents = students.filter((s) => s.kelas_id === t.kelas_id);
      classStudents.forEach((student) => {
        totalSiswaDiampu++;
        const gradeKey = `${student.id}_${t.mapel_id}`;
        const grade = gradeMap.get(gradeKey);

        const hasAnyScore = grade && (
          (grade.nilai !== null && grade.nilai !== undefined && grade.nilai > 0) ||
          (grade.sumatif_1 !== null && grade.sumatif_1 !== undefined) ||
          (grade.nilai_akhir_sumatif !== null && grade.nilai_akhir_sumatif !== undefined) ||
          (grade.nilai_rapor_final !== null && grade.nilai_rapor_final !== undefined)
        );

        if (!hasAnyScore) {
          totalBelumDinilai++;
          radarItems.push({
            id: `${student.id}_${t.mapel_id}`,
            siswa_id: student.id,
            nis: student.nis,
            nama_siswa: student.nama_siswa,
            kelas_id: t.kelas_id,
            nama_kelas: t.nama_kelas,
            mapel_id: t.mapel_id,
            nama_mapel: t.nama_mapel,
            kkm: kkmThreshold,
            nilai_saat_ini: null,
            sumatif_1: null,
            sumatif_2: null,
            sumatif_3: null,
            sumatif_akhir: null,
            status: 'unassessed',
            catatan: 'Belum ada asesmen atau nilai tersimpan.',
          });
        } else {
          const finalScore = grade.nilai_rapor_final ?? grade.nilai_akhir_sumatif ?? grade.nilai ?? 0;
          const isRemedial = finalScore < kkmThreshold;

          if (isRemedial) {
            totalPerluRemedial++;
            radarItems.push({
              id: `${student.id}_${t.mapel_id}`,
              siswa_id: student.id,
              nis: student.nis,
              nama_siswa: student.nama_siswa,
              kelas_id: t.kelas_id,
              nama_kelas: t.nama_kelas,
              mapel_id: t.mapel_id,
              nama_mapel: t.nama_mapel,
              kkm: kkmThreshold,
              nilai_saat_ini: finalScore,
              sumatif_1: grade.sumatif_1,
              sumatif_2: grade.sumatif_2,
              sumatif_3: grade.sumatif_3,
              sumatif_akhir: grade.nilai_akhir_sumatif,
              status: 'needs_remedial',
              catatan: `Nilai akhir ${finalScore} berada di bawah KKM (${kkmThreshold}).`,
            });
          } else {
            totalTuntas++;
            const isRemedialResolved = (grade.catatan_deskripsi || '').toLowerCase().includes('remedial');
            if (isRemedialResolved) {
              radarItems.push({
                id: `${student.id}_${t.mapel_id}`,
                siswa_id: student.id,
                nis: student.nis,
                nama_siswa: student.nama_siswa,
                kelas_id: t.kelas_id,
                nama_kelas: t.nama_kelas,
                mapel_id: t.mapel_id,
                nama_mapel: t.nama_mapel,
                kkm: kkmThreshold,
                nilai_saat_ini: finalScore,
                sumatif_1: grade.sumatif_1,
                sumatif_2: grade.sumatif_2,
                sumatif_3: grade.sumatif_3,
                sumatif_akhir: grade.nilai_akhir_sumatif,
                status: 'completed',
                catatan: grade.catatan_deskripsi || 'Tuntas Remedial',
              });
            }
          }
        }
      });
    });

    return {
      stats: {
        total_siswa_diampu: totalSiswaDiampu,
        total_perlu_remedial: totalPerluRemedial,
        total_belum_dinilai: totalBelumDinilai,
        total_tuntas: totalTuntas,
        kkm_threshold: kkmThreshold,
      },
      periode: {
        tahun_pelajaran_id: tp.id,
        tahun_pelajaran: tp.tahun,
        semester_id: sem.id,
        semester: sem.nama_semester,
      },
      tasks: uniqueTasks,
      items: radarItems,
    };
  }

  /**
   * ⚡ SUBMIT NILAI REMEDIAL CEPAT PER SISWA
   */
  static async submitRemedialSingle(
    tenantId: string,
    user: { id: string; roleName: string },
    data: {
      siswa_id: string;
      kelas_id: string;
      mapel_id: string;
      tahun_pelajaran_id: string;
      semester_id: string;
      nilai_remedial: number;
      catatan_remedial?: string;
    }
  ) {
    if (!data.siswa_id || !data.mapel_id || !data.tahun_pelajaran_id || !data.semester_id) {
      throw new Error('Data tidak lengkap: siswa_id, mapel_id, tahun_pelajaran_id, dan semester_id wajib diisi.');
    }

    const nilaiRemedial = Math.min(100, Math.max(0, Number(data.nilai_remedial) || 0));
    const catatan = data.catatan_remedial?.trim() || `Tuntas Remedial (${nilaiRemedial})`;

    // Pastikan SiswaAkademik ada
    let saRecord = await prisma.siswaAkademik.findFirst({
      where: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        tahun_pelajaran_id: data.tahun_pelajaran_id,
        semester_id: data.semester_id,
      },
    });

    if (!saRecord && data.kelas_id) {
      saRecord = await prisma.siswaAkademik.create({
        data: {
          tenant_id: tenantId,
          siswa_id: data.siswa_id,
          kelas_id: data.kelas_id,
          tahun_pelajaran_id: data.tahun_pelajaran_id,
          semester_id: data.semester_id,
          status: 'AKTIF',
        },
      });
    }

    // Upsert NilaiSiswa
    const updated = await prisma.nilaiSiswa.upsert({
      where: {
        siswa_id_mapel_id_tahun_pelajaran_id_semester_id: {
          siswa_id: data.siswa_id,
          mapel_id: data.mapel_id,
          tahun_pelajaran_id: data.tahun_pelajaran_id,
          semester_id: data.semester_id,
        },
      },
      update: {
        nilai: nilaiRemedial,
        nilai_akhir_sumatif: nilaiRemedial,
        nilai_rapor_final: nilaiRemedial,
        catatan_deskripsi: catatan,
        ...(saRecord ? { siswa_akademik_id: saRecord.id } : {}),
      },
      create: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        siswa_akademik_id: saRecord?.id || null,
        mapel_id: data.mapel_id,
        tahun_pelajaran_id: data.tahun_pelajaran_id,
        semester_id: data.semester_id,
        nilai: nilaiRemedial,
        nilai_akhir_sumatif: nilaiRemedial,
        nilai_rapor_final: nilaiRemedial,
        catatan_deskripsi: catatan,
      },
    });

    // Invalidate Cache Rapor
    void cacheInvalidationService.invalidateRaporCache(tenantId);
    appLogger.info({ tenantId, siswaId: data.siswa_id, nilaiRemedial }, 'Nilai remedial berhasil disimpan');

    return updated;
  }
}
