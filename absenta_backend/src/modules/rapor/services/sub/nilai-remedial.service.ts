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
      guru_id?: string;
      role_mode?: string;
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

    // 2. Tentukan Scope Guru vs Walas
    // Jika role_mode === 'walas' ATAU ada params.kelas_id tanpa guru_id spesifik:
    // Scope adalah 1 KELAS PENUH UNTUK SELURUH MAPEL (Konteks Wali Kelas)
    let guruId: string | undefined = params.guru_id;
    const isWalasMode = params.role_mode === 'walas' || Boolean(params.kelas_id && !params.guru_id && user.roleName.includes('WALI_KELAS'));

    if (!isWalasMode && !guruId && user.roleName === 'GURU') {
      const guru = await prisma.guru.findFirst({ where: { tenant_id: tenantId, user_id: user.id } });
      if (guru) guruId = guru.id;
    }

    // 3. Ambil Jadwal KBM (Jika Walas: Semua Mapel di Kelas tersebut)
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
        Guru: { select: { id: true, nama_guru: true } },
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
          Guru: { select: { id: true, nama_guru: true } },
        },
      });
    }

    // Map unique tasks
    const taskMap = new Map<string, { kelas_id: string; nama_kelas: string; mapel_id: string; nama_mapel: string; guru_id?: string; nama_guru?: string }>();
    schedules.forEach((s) => {
      if (s.kelas_id && s.mapel_id && s.Kelas && s.Mapel) {
        const key = `${s.kelas_id}_${s.mapel_id}`;
        if (!taskMap.has(key)) {
          taskMap.set(key, {
            kelas_id: s.kelas_id,
            nama_kelas: s.Kelas.nama_kelas,
            mapel_id: s.mapel_id,
            nama_mapel: s.Mapel.nama_mapel,
            guru_id: s.guru_id || undefined,
            nama_guru: s.Guru?.nama_guru || undefined,
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
            guru_id: t.guru_id,
            nama_guru: t.nama_guru || 'Guru Pengajar',
            tahun_pelajaran_id: tp.id,
            tahun_pelajaran_nama: tp.tahun,
            semester_id: sem.id,
            semester_nama: sem.nama_semester,
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
              guru_id: t.guru_id,
              nama_guru: t.nama_guru || 'Guru Pengajar',
              tahun_pelajaran_id: tp.id,
              tahun_pelajaran_nama: tp.tahun,
              semester_id: sem.id,
              semester_nama: sem.nama_semester,
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
            radarItems.push({
              id: `${student.id}_${t.mapel_id}`,
              siswa_id: student.id,
              nis: student.nis,
              nama_siswa: student.nama_siswa,
              kelas_id: t.kelas_id,
              nama_kelas: t.nama_kelas,
              mapel_id: t.mapel_id,
              nama_mapel: t.nama_mapel,
              guru_id: t.guru_id,
              nama_guru: t.nama_guru || 'Guru Pengajar',
              tahun_pelajaran_id: tp.id,
              tahun_pelajaran_nama: tp.tahun,
              semester_id: sem.id,
              semester_nama: sem.nama_semester,
              kkm: kkmThreshold,
              nilai_saat_ini: finalScore,
              sumatif_1: grade.sumatif_1,
              sumatif_2: grade.sumatif_2,
              sumatif_3: grade.sumatif_3,
              sumatif_akhir: grade.nilai_akhir_sumatif,
              status: 'completed',
              catatan: grade.catatan_deskripsi || 'Tuntas KKM',
            });
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
   * ⚡ SUBMIT NILAI REMEDIAL & PERBAIKAN SUMATIF SISWA
   * Mendukung pembaruan rincian Sumatif 1, 2, 3, Sumatif Akhir, serta perhitungan otomatis Nilai Rapor Final.
   */
  static async submitRemedialSingle(
    tenantId: string,
    user: { id: string; roleName: string },
    data: {
      siswa_id: string;
      kelas_id: string;
      mapel_id: string;
      tahun_pelajaran_id?: string;
      semester_id?: string;
      sumatif_1?: number | null;
      sumatif_2?: number | null;
      sumatif_3?: number | null;
      sumatif_akhir?: number | null;
      nilai_rapor_final?: number | null;
      nilai_remedial?: number | null;
      catatan_remedial?: string;
    }
  ) {
    let tpId = data.tahun_pelajaran_id;
    let semId = data.semester_id;

    if (!tpId) {
      const activeTp = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true },
      });
      tpId = activeTp?.id;
    }

    if (!semId) {
      const activeSem = await prisma.semester.findFirst({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true },
      });
      semId = activeSem?.id;
    }

    if (!data.siswa_id || !data.mapel_id || !tpId || !semId) {
      throw new Error('Data tidak lengkap: siswa_id, mapel_id, tahun_pelajaran_id, dan semester_id wajib diisi.');
    }

    // 0. Authorization Guard: Cegah Guru/Wali Kelas mengubah nilai mapel orang lain (Phase 4 Hardening)
    const privilegedRoles = ['ADMIN', 'SUPER_ADMIN', 'ADMIN_TENANT', 'KURIKULUM', 'KEPALA_SEKOLAH'];
    const isPrivileged = privilegedRoles.includes(user.roleName.toUpperCase());

    if (!isPrivileged && user.roleName === 'GURU') {
      const guru = await prisma.guru.findFirst({
        where: { tenant_id: tenantId, user_id: user.id },
        select: { id: true, nama_guru: true },
      });

      if (!guru) {
        throw new Error('Akses ditolak: Profil guru Anda tidak terdaftar dalam pangkalan data.');
      }

      // Periksa apakah guru ini memiliki penugasan resmi pada kelas dan mapel ini
      const isAssigned = await prisma.jadwalKBM.findFirst({
        where: {
          tenant_id: tenantId,
          kelas_id: data.kelas_id,
          mapel_id: data.mapel_id,
          OR: [
            { guru_id: guru.id },
            { guru_pelaksana_id: guru.id },
          ],
        },
        select: { id: true },
      });

      if (!isAssigned) {
        appLogger.warn(
          { userId: user.id, guruId: guru.id, kelasId: data.kelas_id, mapelId: data.mapel_id },
          'Security Alert: Upaya pengubahan nilai remedial oleh pengguna yang bukan guru pengajar mapel tersebut'
        );
        throw new Error(
          'Akses ditolak: Anda tidak memiliki wewenang untuk mengubah nilai mata pelajaran ini. Pengisian nilai remedial hanya dapat dilakukan oleh guru pengajar yang bersangkutan.'
        );
      }
    }

    // 1. Kalkulasi Rata-rata Sumatif Harian
    const s1 = data.sumatif_1 !== undefined && data.sumatif_1 !== null && !isNaN(Number(data.sumatif_1)) ? Number(data.sumatif_1) : null;
    const s2 = data.sumatif_2 !== undefined && data.sumatif_2 !== null && !isNaN(Number(data.sumatif_2)) ? Number(data.sumatif_2) : null;
    const s3 = data.sumatif_3 !== undefined && data.sumatif_3 !== null && !isNaN(Number(data.sumatif_3)) ? Number(data.sumatif_3) : null;
    const sas = data.sumatif_akhir !== undefined && data.sumatif_akhir !== null && !isNaN(Number(data.sumatif_akhir)) ? Number(data.sumatif_akhir) : null;

    const sumatifList = [s1, s2, s3].filter((v): v is number => v !== null);
    let rataRataSumatif: number | null = null;
    if (sumatifList.length > 0) {
      const sum = sumatifList.reduce((acc, curr) => acc + curr, 0);
      rataRataSumatif = Number((sum / sumatifList.length).toFixed(2));
    }

    // 2. Kalkulasi Nilai Rapor Final: Formula Resmi Kurikulum Merdeka (Rata-rata Sumatif + Sumatif Akhir) / 2
    let calculatedFinal: number | null = null;
    if (data.nilai_rapor_final !== undefined && data.nilai_rapor_final !== null && !isNaN(Number(data.nilai_rapor_final))) {
      calculatedFinal = Number(data.nilai_rapor_final);
    } else if (rataRataSumatif !== null && sas !== null) {
      calculatedFinal = Number(((rataRataSumatif + sas) / 2).toFixed(2));
    } else if (sas !== null) {
      calculatedFinal = sas;
    } else if (rataRataSumatif !== null) {
      calculatedFinal = rataRataSumatif;
    } else if (data.nilai_remedial !== undefined && data.nilai_remedial !== null) {
      calculatedFinal = Number(data.nilai_remedial);
    } else {
      calculatedFinal = 0;
    }

    const finalRaporScore = Math.min(100, Math.max(0, calculatedFinal));
    const catatan = data.catatan_remedial?.trim() || `Tuntas Remedial (${finalRaporScore})`;

    // Pastikan SiswaAkademik ada menggunakan upsert standar (tanpa tenant_id pada SiswaAkademik)
    let saId: string | null = null;
    if (data.kelas_id) {
      try {
        const saRecord = await prisma.siswaAkademik.upsert({
          where: {
            siswa_id_tahun_pelajaran_id_semester_id: {
              siswa_id: data.siswa_id,
              tahun_pelajaran_id: tpId,
              semester_id: semId,
            },
          },
          update: {
            kelas_id: data.kelas_id,
            status: 'AKTIF',
          },
          create: {
            siswa_id: data.siswa_id,
            kelas_id: data.kelas_id,
            tahun_pelajaran_id: tpId,
            semester_id: semId,
            status: 'AKTIF',
          },
          select: { id: true },
        });
        saId = saRecord?.id || null;
      } catch (err) {
        appLogger.warn({ err }, 'SiswaAkademik upsert warning, proceeding without saId');
      }
    }

    // Upsert NilaiSiswa dengan rincian sumatif lengkap
    const updated = await prisma.nilaiSiswa.upsert({
      where: {
        siswa_id_mapel_id_tahun_pelajaran_id_semester_id: {
          siswa_id: data.siswa_id,
          mapel_id: data.mapel_id,
          tahun_pelajaran_id: tpId,
          semester_id: semId,
        },
      },
      update: {
        sumatif_1: s1,
        sumatif_2: s2,
        sumatif_3: s3,
        rata_rata_sumatif: rataRataSumatif,
        nilai_akhir_sumatif: sas,
        nilai_rapor_final: finalRaporScore,
        nilai: finalRaporScore,
        catatan_deskripsi: catatan,
        ...(saId ? { siswa_akademik_id: saId } : {}),
      },
      create: {
        tenant_id: tenantId,
        siswa_id: data.siswa_id,
        siswa_akademik_id: saId,
        mapel_id: data.mapel_id,
        tahun_pelajaran_id: tpId,
        semester_id: semId,
        sumatif_1: s1,
        sumatif_2: s2,
        sumatif_3: s3,
        rata_rata_sumatif: rataRataSumatif,
        nilai_akhir_sumatif: sas,
        nilai_rapor_final: finalRaporScore,
        nilai: finalRaporScore,
        catatan_deskripsi: catatan,
      },
    });

    // Invalidate Cache Rapor
    void cacheInvalidationService.invalidateRaporCache(tenantId);
    appLogger.info({ tenantId, siswaId: data.siswa_id, finalRaporScore }, 'Rincian nilai remedial sumatif berhasil disimpan');

    return updated;
  }
}
