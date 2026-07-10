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

    // 2. Identify target Year
    let targetYearObj = null;
    if (currentYearObj) {
      // Find if there is an inactive year that is newer than current active year
      // Sort ascending to get the NEAREST future inactive year (e.g., 2027/2028 before 2028/2029)
      targetYearObj = await prisma.tahunPelajaran.findFirst({
        where: {
          tenant_id: tenantId,
          is_active: false,
          tahun: { gt: currentYearObj.tahun }
        },
        orderBy: { tahun: 'asc' },
        select: { id: true, tahun: true }
      });
    }

    // Fallback 1: If no newer inactive year exists, target is the current active year
    if (!targetYearObj) {
      targetYearObj = currentYearObj;
    }

    // Fallback 2: If no active year exists either (e.g. initial setup), fallback to latest registered year
    if (!targetYearObj) {
      targetYearObj = await prisma.tahunPelajaran.findFirst({
        where: { tenant_id: tenantId },
        orderBy: { tahun: 'desc' },
        select: { id: true, tahun: true }
      });
    }

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
    const [totalKelas, totalGuru, countGuruMapel, totalJurusan, totalMapel] = await Promise.all([
      prisma.kelas.count({ where: { tenant_id: tenantId, is_active: true } }),
      prisma.guru.count({ where: { tenant_id: tenantId } }),
      prisma.guruMapel.count({ where: { tenant_id: tenantId } }),
      prisma.jurusan.count({ where: { tenant_id: tenantId } }),
      prisma.mapel.count({ where: { tenant_id: tenantId } })
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

    // Fetch School Jenjang
    const sekolahObj = await prisma.sekolah.findFirst({
      where: { tenant_id: tenantId },
      select: { jenjang: true }
    });
    const jenjang = (sekolahObj?.jenjang || 'SMA').toUpperCase();

    let requiredCodes = ['KEPALA_SEKOLAH', 'KURIKULUM', 'KESISWAAN', 'SARPRAS', 'TU', 'BPBK'];
    if (['SD', 'MI'].includes(jenjang)) {
      requiredCodes = ['KEPALA_SEKOLAH', 'TU'];
    } else if (['SMK', 'MAK'].includes(jenjang)) {
      requiredCodes = ['KEPALA_SEKOLAH', 'KURIKULUM', 'KESISWAAN', 'HUBIN', 'SARPRAS', 'TU', 'BPBK'];
    }

    // Fetch all global structural positions and check active assignments
    const globalPositions = await prisma.organizationalPosition.findMany({
      where: { 
        tenant_id: tenantId,
        is_active: true,
        code: {
          in: requiredCodes
        }
      },
      include: {
        organizationalAssigns: {
          where: { is_active: true }
        }
      }
    });

    const unassignedPositions = globalPositions.filter(p => p.organizationalAssigns.length === 0);
    const isStrukturDone = unassignedPositions.length === 0;

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
      status_text: isYearDone && targetYearObj
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

    // Step 2b: Jurusan / Kompetensi Keahlian
    const isJurusanDone = totalJurusan > 0;
    checklist.push({
      key: 'jurusan',
      label: 'Kompetensi Keahlian (Jurusan)',
      description: 'Daftarkan kompetensi keahlian / jurusan aktif di sekolah.',
      completed: isJurusanDone,
      status_text: isJurusanDone
        ? `${totalJurusan} kompetensi keahlian terdaftar`
        : 'Belum ada kompetensi keahlian / jurusan terdaftar',
      action_path: '/academic/jurusan',
      details: { total: totalJurusan }
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

    // Step 3b: Mata Pelajaran (Mapel)
    const isMapelDone = totalMapel > 0;
    checklist.push({
      key: 'mapel',
      label: 'Mata Pelajaran (Mapel)',
      description: 'Verifikasi daftar mata pelajaran yang diajarkan di sekolah.',
      completed: isMapelDone,
      status_text: isMapelDone
        ? `${totalMapel} mata pelajaran aktif terdaftar`
        : 'Belum ada mata pelajaran terdaftar',
      action_path: '/academic/mapel',
      details: { total: totalMapel }
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

    // Step 4b: Struktur Organisasi Inti
    checklist.push({
      key: 'struktur_organisasi',
      label: 'Penugasan Struktur Organisasi Inti',
      description: 'Pastikan seluruh posisi penting sekolah (Kepala Sekolah, Waka, Staf TU, Staf BK) sudah memiliki penugasan pejabat aktif.',
      completed: isStrukturDone,
      status_text: isStrukturDone
        ? 'Seluruh jabatan struktur organisasi inti telah terisi'
        : unassignedPositions.length === globalPositions.length 
          ? 'Belum ada jabatan struktur organisasi inti terisi'
          : `Terdapat ${unassignedPositions.length} jabatan penting yang masih kosong (${unassignedPositions.map(p => p.name).join(', ')})`,
      action_path: '/academic/struktur-organisasi',
      details: {
        total: globalPositions.length,
        assigned: globalPositions.length - unassignedPositions.length,
        unassigned: unassignedPositions.map(p => ({ code: p.code, name: p.name }))
      }
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
