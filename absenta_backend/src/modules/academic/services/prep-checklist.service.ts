import { prisma } from '../../../utils/prisma';

export interface ChecklistItem {
  key: string;
  label: string;
  description: string;
  completed: boolean;
  status_text: string;
  action_path: string;
  details?: Record<string, any>;
}

export interface PrepChecklistResponse {
  current_year: { id: string; tahun: string } | null;
  current_semester: { id: string; nama_semester: string } | null;
  target_year: { id: string; tahun: string } | null;
  target_semester: { id: string; nama_semester: string } | null;
  completion_percentage: number;
  checklist: ChecklistItem[];
}

export class PrepChecklistService {
  async getChecklist(tenantId: string): Promise<PrepChecklistResponse> {
    // 1. Get current active Year & Semester
    const currentYearObj = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: tenantId, is_active: true },
      select: { id: true, tahun: true }
    });

    const currentSemesterObj = await prisma.semester.findFirst({
      where: { tenant_id: tenantId, is_active: true },
      select: { id: true, nama_semester: true }
    });

    // 2. Identify target Year (the latest inactive year)
    const targetYearObj = await prisma.tahunPelajaran.findFirst({
      where: { tenant_id: tenantId, is_active: false },
      orderBy: { tahun: 'desc' }, // Alphabetically/chronologically latest
      select: { id: true, tahun: true }
    });

    // 3. Identify target Semester (Ganjil/1 in the target Year)
    let targetSemesterObj = null;
    if (targetYearObj) {
      targetSemesterObj = await prisma.semester.findFirst({
        where: {
          tenant_id: tenantId,
          tahun_pelajaran_id: targetYearObj.id,
          nama_semester: {
            in: ['Ganjil', 'ganjil', '1', 'Semester Ganjil', 'Ganjil / 1']
          }
        },
        select: { id: true, nama_semester: true }
      });

      // Fallback: If no semester contains "Ganjil"/"1", get the first semester under target year
      if (!targetSemesterObj) {
        targetSemesterObj = await prisma.semester.findFirst({
          where: { tenant_id: tenantId, tahun_pelajaran_id: targetYearObj.id },
          select: { id: true, nama_semester: true }
        });
      }
    }

    // 4. Calculate stats for checking checklist completion
    const [totalKelas, totalGuru, countGuruMapel] = await Promise.all([
      prisma.kelas.count({ where: { tenant_id: tenantId, is_active: true } }),
      prisma.guru.count({ where: { tenant_id: tenantId } }),
      prisma.guruMapel.count({ where: { tenant_id: tenantId } })
    ]);

    // Count new students in target year (grade X / tingkat 10)
    let countSiswaBaru = 0;
    let countSiswaTransisi = 0;

    if (targetYearObj && targetSemesterObj) {
      countSiswaBaru = await prisma.siswaAkademik.count({
        where: {
          tahun_pelajaran_id: targetYearObj.id,
          semester_id: targetSemesterObj.id,
          kelas: { tingkat: 10 }
        }
      });

      countSiswaTransisi = await prisma.siswaAkademik.count({
        where: {
          tahun_pelajaran_id: targetYearObj.id,
          semester_id: targetSemesterObj.id,
          kelas: { tingkat: { in: [11, 12] } }
        }
      });
    }

    // Find assigned Wali Kelas for the active classes
    let assignedWaliKelasCount = 0;
    const waliKelasPosition = await prisma.organizationalPosition.findFirst({
      where: { tenant_id: tenantId, code: 'WALIKELAS' },
      select: { id: true }
    });

    if (waliKelasPosition) {
      const activeWaliKelasAssignments = await prisma.organizationalAssignment.findMany({
        where: {
          tenant_id: tenantId,
          position_id: waliKelasPosition.id,
          is_active: true,
          kelas_id: { not: null }
        },
        select: { kelas_id: true }
      });
      // Get distinct kelas count assigned to wali kelas
      const uniqueKelasIds = new Set(activeWaliKelasAssignments.map(a => a.kelas_id).filter(Boolean));
      assignedWaliKelasCount = uniqueKelasIds.size;
    }

    // 5. Build checklist array
    const checklist: ChecklistItem[] = [];

    // Step 1: Tahun Pelajaran Baru
    const isYearDone = !!targetYearObj;
    checklist.push({
      key: 'tahun_pelajaran',
      label: 'Tahun Pelajaran Baru',
      description: 'Tambahkan Tahun Pelajaran non-aktif berikutnya di sistem.',
      completed: isYearDone,
      status_text: isYearDone
        ? `Tahun Pelajaran ${targetYearObj.tahun} telah dibuat`
        : 'Belum ada Tahun Pelajaran berikutnya yang terdaftar',
      action_path: '/academic/tahun-pelajaran',
      details: targetYearObj ? { id: targetYearObj.id, tahun: targetYearObj.tahun } : undefined
    });

    // Step 2: Semester Ganjil Baru
    const isSemesterDone = !!targetSemesterObj;
    checklist.push({
      key: 'semester',
      label: 'Semester Ganjil Baru',
      description: 'Pastikan semester ganjil/1 pada Tahun Pelajaran baru telah terdaftar.',
      completed: isSemesterDone,
      status_text: targetSemesterObj
        ? `Semester ${targetSemesterObj.nama_semester} telah dibuat`
        : 'Belum ada Semester Ganjil terdaftar di Tahun Pelajaran baru',
      action_path: '/academic/semester',
      details: targetSemesterObj ? { id: targetSemesterObj.id, nama: targetSemesterObj.nama_semester } : undefined
    });

    // Step 3: Kelas & Rombel
    const isKelasDone = totalKelas > 0;
    checklist.push({
      key: 'kelas',
      label: 'Rombongan Belajar (Kelas)',
      description: 'Konfigurasi rombel belajar aktif untuk menampung siswa.',
      completed: isKelasDone,
      status_text: isKelasDone
        ? `${totalKelas} kelas aktif terkonfigurasi`
        : 'Belum ada kelas aktif terdaftar di sistem',
      action_path: '/academic/kelas',
      details: { total: totalKelas }
    });

    // Step 4: Data Guru & Tendik
    const isGuruDone = totalGuru > 0;
    checklist.push({
      key: 'guru',
      label: 'Registrasi Guru & Staf',
      description: 'Verifikasi seluruh data guru pengajar terdaftar di sistem.',
      completed: isGuruDone,
      status_text: isGuruDone
        ? `${totalGuru} guru terdaftar`
        : 'Belum ada data guru terdaftar',
      action_path: '/academic/guru',
      details: { total: totalGuru }
    });

    // Step 5: Kenaikan Kelas (Siswa Lama) — HARUS DULUAN sebelum PPDB
    // Siswa lama naik kelas dulu agar slot kelas X kosong untuk siswa baru
    const isSiswaTransisiDone = countSiswaTransisi > 0;
    checklist.push({
      key: 'siswa_transisi',
      label: 'Kenaikan Kelas (Siswa Lama)',
      description: 'Naikkan siswa lama ke tingkat XI/XII terlebih dahulu sebelum mendaftar siswa baru.',
      completed: isSiswaTransisiDone,
      status_text: isSiswaTransisiDone
        ? `${countSiswaTransisi} siswa lama berhasil naik kelas`
        : 'Belum ada kenaikan kelas siswa lama yang dieksekusi',
      action_path: '/academic/transition',
      details: { total: countSiswaTransisi }
    });

    // Step 6: Registrasi Siswa Baru (PPDB) — setelah slot kelas X kosong
    const isSiswaBaruDone = countSiswaBaru > 0;
    checklist.push({
      key: 'siswa_baru',
      label: 'Registrasi Siswa Baru (PPDB)',
      description: 'Daftarkan siswa baru tingkat X ke kelas tahun pelajaran baru.',
      completed: isSiswaBaruDone,
      status_text: isSiswaBaruDone
        ? `${countSiswaBaru} siswa baru (Tingkat X) terdaftar`
        : 'Belum ada siswa baru terdaftar di Tahun Pelajaran baru',
      action_path: '/academic/registrasi-siswa',
      details: { total: countSiswaBaru }
    });

    // Step 7: Penunjukan Wali Kelas
    const isWaliKelasDone = totalKelas > 0 && assignedWaliKelasCount >= totalKelas;
    checklist.push({
      key: 'wali_kelas',
      label: 'Penugasan Wali Kelas',
      description: 'Tunjuk Wali Kelas untuk setiap rombongan belajar aktif.',
      completed: isWaliKelasDone,
      status_text: totalKelas > 0
        ? `${assignedWaliKelasCount} dari ${totalKelas} kelas sudah memiliki Wali Kelas`
        : 'Belum ada penugasan Wali Kelas',
      action_path: '/academic/struktur-organisasi?tab=WALI_KELAS',
      details: { assigned: assignedWaliKelasCount, total: totalKelas }
    });

    // Step 8: Penugasan Guru Mapel
    const isGuruMapelDone = countGuruMapel > 0;
    checklist.push({
      key: 'guru_mapel',
      label: 'Penugasan Guru Pengampu Mapel',
      description: 'Petakan pembagian tugas mengajar guru untuk mata pelajaran.',
      completed: isGuruMapelDone,
      status_text: isGuruMapelDone
        ? `${countGuruMapel} pemetaan beban mengajar terdaftar`
        : 'Belum ada pemetaan beban mengajar guru',
      action_path: '/academic/guru-mapel',
      details: { total: countGuruMapel }
    });

    // Compute overall completion percentage
    const completedTasksCount = checklist.filter(item => item.completed).length;
    const completionPercentage = checklist.length > 0
      ? Math.round((completedTasksCount / checklist.length) * 100)
      : 0;

    return {
      current_year: currentYearObj,
      current_semester: currentSemesterObj,
      target_year: targetYearObj,
      target_semester: targetSemesterObj,
      completion_percentage: completionPercentage,
      checklist
    };
  }
}
