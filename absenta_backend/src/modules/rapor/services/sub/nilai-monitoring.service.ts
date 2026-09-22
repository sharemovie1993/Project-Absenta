// @ts-nocheck
import { prisma } from '@/utils/prisma';
import { appLogger } from '@/utils/app-logger';

export class NilaiMonitoringService {
  /**
   * Monitoring Progres Nilai Seluruh Guru di Sekolah (Untuk Kurikulum & Admin)
   */
  static async getSchoolWideTeacherProgress(
    tenantId: string,
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
        meta: {
          tahun_pelajaran: null,
          semester: null,
          total_guru: 0,
          guru_completed: 0,
          guru_partial: 0,
          guru_empty: 0,
          total_tasks: 0,
          completed_tasks: 0,
          percentage: 0,
        },
        teachers: [],
      };
    }

    // 1. Ambil seluruh Guru
    const teachers = await prisma.guru.findMany({
      where: { tenant_id: tenantId },
      select: {
        id: true,
        nama_guru: true,
        nip: true,
        no_hp: true,
        foto: true,
      },
      orderBy: { nama_guru: 'asc' },
    });


    // 2. Ambil seluruh Jadwal KBM pada TP & Semester ini
    const schedules = await prisma.jadwalKBM.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: tp.id,
        semester_id: sem.id,
      },
      include: {
        Kelas: { select: { id: true, nama_kelas: true, tingkat: true } },
        Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
      },
    });

    // 3. Petakan task unik per guru (guru_id -> Set key kelas_id + mapel_id)
    const teacherTaskMap = new Map<string, Map<string, { kelas_id: string; nama_kelas: string; mapel_id: string; nama_mapel: string; kode_mapel: string | null }>>();
    const allClassIds = new Set<string>();

    schedules.forEach((s) => {
      if (s.guru_id && s.kelas_id && s.mapel_id && s.Kelas && s.Mapel) {
        allClassIds.add(s.kelas_id);
        if (!teacherTaskMap.has(s.guru_id)) {
          teacherTaskMap.set(s.guru_id, new Map());
        }
        const gTasks = teacherTaskMap.get(s.guru_id)!;
        const key = `${s.kelas_id}_${s.mapel_id}`;
        if (!gTasks.has(key)) {
          gTasks.set(key, {
            kelas_id: s.kelas_id,
            nama_kelas: s.Kelas.nama_kelas,
            mapel_id: s.mapel_id,
            nama_mapel: s.Mapel.nama_mapel,
            kode_mapel: s.Mapel.kode_mapel,
          });
        }
      }
    });

    // 4. Hitung jumlah siswa per kelas
    const classIdList = Array.from(allClassIds);
    const students = await prisma.siswa.findMany({
      where: {
        tenant_id: tenantId,
        kelas_id: { in: classIdList },
        status: { in: ['AKTIF', 'ACTIVE', 'Aktif', 'active'] },
      },
      select: { id: true, kelas_id: true },
    });

    const studentClassMap = new Map<string, string>();
    const studentsPerClass = new Map<string, number>();
    students.forEach((s) => {
      if (s.kelas_id) {
        studentClassMap.set(s.id, s.kelas_id);
        studentsPerClass.set(s.kelas_id, (studentsPerClass.get(s.kelas_id) || 0) + 1);
      }
    });

    // 5. Ambil nilai siswa pada TP & Semester ini
    const existingNilai = await prisma.nilaiSiswa.findMany({
      where: {
        tenant_id: tenantId,
        tahun_pelajaran_id: tp.id,
        semester_id: sem.id,
        siswa_id: { in: students.map((s) => s.id) },
      },
      select: {
        siswa_id: true,
        mapel_id: true,
        nilai: true,
        sumatif_1: true,
        nilai_akhir_sumatif: true,
      },
    });

    const filledSet = new Set<string>(); // key: `${kelas_id}_${mapel_id}_${siswa_id}`
    existingNilai.forEach((n) => {
      const isFilled =
        (n.nilai !== null && n.nilai !== undefined && n.nilai > 0) ||
        (n.sumatif_1 !== null && n.sumatif_1 !== undefined) ||
        (n.nilai_akhir_sumatif !== null && n.nilai_akhir_sumatif !== undefined);

      const kId = studentClassMap.get(n.siswa_id);
      if (isFilled && kId && n.mapel_id) {
        filledSet.add(`${kId}_${n.mapel_id}_${n.siswa_id}`);
      }
    });

    // 6. Agregasi per Guru
    let schoolTotalTasks = 0;
    let schoolCompletedTasks = 0;
    let schoolGuruCompleted = 0;
    let schoolGuruPartial = 0;
    let schoolGuruEmpty = 0;
    let schoolTotalSiswa = 0;
    let schoolFilledSiswa = 0;

    const teacherProgressList = teachers
      .map((guru) => {
        const taskMap = teacherTaskMap.get(guru.id);
        const tasks = taskMap ? Array.from(taskMap.values()) : [];

        let completed = 0;
        let partial = 0;
        let empty = 0;

        const detailedTasks = tasks.map((t) => {
          const totalSiswa = studentsPerClass.get(t.kelas_id) || 0;
          let filledCount = 0;

          students.forEach((s) => {
            if (s.kelas_id === t.kelas_id && filledSet.has(`${t.kelas_id}_${t.mapel_id}_${s.id}`)) {
              filledCount++;
            }
          });

          let status: 'completed' | 'partial' | 'empty' = 'empty';
          if (filledCount >= totalSiswa && totalSiswa > 0) {
            status = 'completed';
            completed++;
          } else if (filledCount > 0) {
            status = 'partial';
            partial++;
          } else {
            empty++;
          }

          return {
            ...t,
            total_siswa: totalSiswa,
            siswa_terisi: filledCount,
            status,
          };
        });

        let teacherTotalSiswa = 0;
        let teacherFilledSiswa = 0;
        detailedTasks.forEach((t) => {
          teacherTotalSiswa += t.total_siswa;
          teacherFilledSiswa += t.siswa_terisi;
        });

        const totalTasks = tasks.length;
        // Persentase riil: rasio siswa terisi terhadap total seluruh siswa yang diampu
        const percentage = teacherTotalSiswa > 0 
          ? Number(((teacherFilledSiswa / teacherTotalSiswa) * 100).toFixed(1)) 
          : 0;

        let guruStatus: 'completed' | 'partial' | 'empty' | 'no_task' = 'no_task';
        if (totalTasks > 0) {
          if (completed === totalTasks) {
            guruStatus = 'completed';
            schoolGuruCompleted++;
          } else if (completed > 0 || partial > 0) {
            guruStatus = 'partial';
            schoolGuruPartial++;
          } else {
            guruStatus = 'empty';
            schoolGuruEmpty++;
          }
          schoolTotalTasks += totalTasks;
          schoolCompletedTasks += completed;
          schoolTotalSiswa += teacherTotalSiswa;
          schoolFilledSiswa += teacherFilledSiswa;
        }

        return {
          guru_id: guru.id,
          nama_guru: guru.nama_guru,
          nip: guru.nip || '-',
          no_telepon: guru.no_hp || null,
          foto: guru.foto || null,

          total_tugas: totalTasks,
          tuntas_tugas: completed,
          partial_tugas: partial,
          empty_tugas: empty,
          total_siswa: teacherTotalSiswa,
          siswa_terisi: teacherFilledSiswa,
          percentage,
          status: guruStatus,
          tasks: detailedTasks,
        };
      })
      .filter((g) => g.total_tugas > 0); // Hanya guru yang memiliki jadwal mengajar

    const schoolPercentage =
      schoolTotalSiswa > 0 ? Number(((schoolFilledSiswa / schoolTotalSiswa) * 100).toFixed(1)) : 0;

    appLogger.info(
      { tenantId, totalGuru: teacherProgressList.length, schoolPercentage, schoolFilledSiswa, schoolTotalSiswa },
      'School-wide teacher progress evaluated'
    );

    return {
      meta: {
        tahun_pelajaran: { id: tp.id, tahun: tp.tahun },
        semester: { id: sem.id, nama_semester: sem.nama_semester },
        total_guru: teacherProgressList.length,
        guru_completed: schoolGuruCompleted,
        guru_partial: schoolGuruPartial,
        guru_empty: schoolGuruEmpty,
        total_tasks: schoolTotalTasks,
        completed_tasks: schoolCompletedTasks,
        total_siswa: schoolTotalSiswa,
        siswa_terisi: schoolFilledSiswa,
        percentage: schoolPercentage,
      },
      teachers: teacherProgressList,
    };
  }

  /**
   * Monitoring Kelengkapan Mapel per Rombel / Kelas (Untuk Wali Kelas)
   */
  static async getClassSubjectProgress(
    tenantId: string,
    kelasId: string,
    params: { tahun_pelajaran_id?: string; semester_id?: string }
  ) {
    const tp = params.tahun_pelajaran_id
      ? await prisma.tahunPelajaran.findFirst({ where: { id: params.tahun_pelajaran_id, tenant_id: tenantId } })
      : (await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId, is_active: true } }))
        || (await prisma.tahunPelajaran.findFirst({ where: { tenant_id: tenantId }, orderBy: { created_at: 'desc' } }));

    const sem = params.semester_id
      ? await prisma.semester.findFirst({ where: { id: params.semester_id, tenant_id: tenantId } })
      : (await prisma.semester.findFirst({ where: { tenant_id: tenantId, is_active: true } }))
        || (tp ? await prisma.semester.findFirst({ where: { tenant_id: tenantId, tahun_pelajaran_id: tp.id } }) : null)
        || (await prisma.semester.findFirst({ where: { tenant_id: tenantId } }));

    const kelas = await prisma.kelas.findFirst({
      where: { id: kelasId, tenant_id: tenantId },
      include: {
        Jurusan: { select: { id: true, nama: true, kode: true } },
      },
    });

    if (!kelas || !tp || !sem) {
      return {
        kelas: null,
        total_siswa: 0,
        total_mapel: 0,
        mapel_completed: 0,
        mapel_partial: 0,
        mapel_empty: 0,
        percentage: 0,
        subjects: [],
      };
    }

    // Ambil wali kelas aktif dari OrganizationalAssignment
    const waliAssignment = await prisma.organizationalAssignment.findFirst({
      where: {
        tenant_id: tenantId,
        kelas_id: kelasId,
        is_active: true,
        Position: { code: 'WALIKELAS' },
      },
      include: {
        User: {
          select: {
            full_name: true,
            Guru: { select: { id: true, nama_guru: true, nip: true } },
          },
        },
      },
    });

    const waliKelasInfo = waliAssignment?.User?.Guru
      ? { nama_guru: waliAssignment.User.Guru.nama_guru, nip: waliAssignment.User.Guru.nip || '' }
      : waliAssignment?.User
      ? { nama_guru: waliAssignment.User.full_name, nip: '' }
      : null;

    // 1. Ambil seluruh siswa aktif di kelas ini
    const students = await prisma.siswa.findMany({
      where: {
        tenant_id: tenantId,
        kelas_id: kelasId,
        status: { in: ['AKTIF', 'ACTIVE', 'Aktif', 'active'] },
      },
      select: { id: true },
    });
    const totalSiswa = students.length;
    const studentIds = students.map((s) => s.id);

    // 2. Ambil seluruh mapel yang dijadwalkan di kelas ini via JadwalKBM
    let schedules = await prisma.jadwalKBM.findMany({
      where: {
        tenant_id: tenantId,
        kelas_id: kelasId,
        tahun_pelajaran_id: tp.id,
        semester_id: sem.id,
      },
      include: {
        Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
        Guru: { select: { id: true, nama_guru: true, nip: true, no_hp: true } },
      },
    });

    // Fallback JadwalKBM jika semester_id belum terikat spesifik (namun tetap dalam TP yang sama)
    if (schedules.length === 0) {
      schedules = await prisma.jadwalKBM.findMany({
        where: {
          tenant_id: tenantId,
          kelas_id: kelasId,
          tahun_pelajaran_id: tp.id,
        },
        include: {
          Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
          Guru: { select: { id: true, nama_guru: true, nip: true, no_hp: true } },
        },
      });
    }

    // Petakan mapel unik
    const mapelTaskMap = new Map<
      string,
      {
        mapel_id: string;
        nama_mapel: string;
        kode_mapel: string | null;
        guru_id: string | null;
        nama_guru: string | null;
        nip_guru: string | null;
        no_telepon_guru: string | null;
      }
    >();

    schedules.forEach((s) => {
      if (s.mapel_id && s.Mapel) {
        if (!mapelTaskMap.has(s.mapel_id)) {
          mapelTaskMap.set(s.mapel_id, {
            mapel_id: s.mapel_id,
            nama_mapel: s.Mapel.nama_mapel,
            kode_mapel: s.Mapel.kode_mapel,
            guru_id: s.Guru?.id || null,
            nama_guru: s.Guru?.nama_guru || null,
            nip_guru: s.Guru?.nip || null,
            no_telepon_guru: s.Guru?.no_hp || null,
          });
        }
      }
    });

    // 3. Fallback: jika JadwalKBM belum di-plot, periksa StrukturKurikulum khusus TP yang sama
    if (mapelTaskMap.size === 0 && kelas.tingkat) {
      const kurikulumList = await prisma.strukturKurikulum.findMany({
        where: {
          tenant_id: tenantId,
          tahun_pelajaran_id: tp.id,
          tingkat: kelas.tingkat,
          OR: [{ jurusan_id: null }, { jurusan_id: kelas.jurusan_id || undefined }],
        },
        include: {
          Mapel: { select: { id: true, nama_mapel: true, kode_mapel: true } },
        },
      });

      kurikulumList.forEach((k) => {
        if (k.mapel_id && k.Mapel && !mapelTaskMap.has(k.mapel_id)) {
          mapelTaskMap.set(k.mapel_id, {
            mapel_id: k.mapel_id,
            nama_mapel: k.Mapel.nama_mapel,
            kode_mapel: k.Mapel.kode_mapel,
            guru_id: null,
            nama_guru: null,
            nip_guru: null,
            no_telepon_guru: null,
          });
        }
      });
    }

    const uniqueMapels = Array.from(mapelTaskMap.values());

    // 4. Hitung keterisian nilai per mapel di kelas ini
    let completedCount = 0;
    let partialCount = 0;
    let emptyCount = 0;

    const subjectList = await Promise.all(
      uniqueMapels.map(async (m) => {
        const grades = await prisma.nilaiSiswa.findMany({
          where: {
            tenant_id: tenantId,
            tahun_pelajaran_id: tp.id,
            semester_id: sem.id,
            mapel_id: m.mapel_id,
            siswa_id: { in: studentIds },
          },
          select: {
            siswa_id: true,
            nilai: true,
            sumatif_1: true,
            nilai_akhir_sumatif: true,
          },
        });

        const filledSiswaIds = new Set<string>();
        grades.forEach((g) => {
          const isFilled =
            (g.nilai !== null && g.nilai !== undefined && g.nilai > 0) ||
            (g.sumatif_1 !== null && g.sumatif_1 !== undefined) ||
            (g.nilai_akhir_sumatif !== null && g.nilai_akhir_sumatif !== undefined);
          if (isFilled) {
            filledSiswaIds.add(g.siswa_id);
          }
        });

        const filledCount = filledSiswaIds.size;
        let status: 'completed' | 'partial' | 'empty' = 'empty';

        if (filledCount >= totalSiswa && totalSiswa > 0) {
          status = 'completed';
          completedCount++;
        } else if (filledCount > 0) {
          status = 'partial';
          partialCount++;
        } else {
          emptyCount++;
        }

        return {
          ...m,
          total_siswa: totalSiswa,
          siswa_terisi: filledCount,
          status,
        };
      })
    );

    const totalMapel = subjectList.length;
    const percentage = totalMapel > 0 ? Number(((completedCount / totalMapel) * 100).toFixed(1)) : 0;

    return {
      kelas: {
        id: kelas.id,
        nama_kelas: kelas.nama_kelas,
        tingkat: kelas.tingkat,
        jurusan: kelas.Jurusan?.nama || null,
        wali_kelas: waliKelasInfo,
      },
      tahun_pelajaran: { id: tp.id, tahun: tp.tahun },
      semester: { id: sem.id, nama_semester: sem.nama_semester },
      total_siswa: totalSiswa,
      total_mapel: totalMapel,
      mapel_completed: completedCount,
      mapel_partial: partialCount,
      mapel_empty: emptyCount,
      percentage,
      subjects: subjectList.sort((a, b) => a.nama_mapel.localeCompare(b.nama_mapel)),
    };
  }
}
