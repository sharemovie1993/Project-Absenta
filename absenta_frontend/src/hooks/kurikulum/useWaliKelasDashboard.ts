import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getJurnalWaliKelasList,
  createJurnalWaliKelas,
  deleteJurnalWaliKelas,
  getPermohonanIzinList,
  updatePermohonanIzinStatus,
  getEwsPerKelasList,
  getPelanggaranList,
  getPrestasiList,
  getSiswaWalasList,
} from '../../api/kurikulum/waliKelas.api';
import { kesiswaanApi } from '../../api/kesiswaan.api';
import { getRekapKelasBulanan } from '../../api/attendance/rekap.api';
import { resolveProfilePhotoUrl } from '../../lib/utils';
import type { JournalEntry, LeaveRequest, AtRiskStudent, Student, ViolationRecord, AchievementRecord } from '../../components/dashboard/staff/walas/types';

function extractArrayData(res: any): any[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.list)) return res.data.list;
  if (Array.isArray(res.data?.items)) return res.data.items;
  if (Array.isArray(res.list)) return res.list;
  if (Array.isArray(res.items)) return res.items;
  return [];
}

export function useWaliKelasDashboard(kelasId?: string, bulan?: string) {
  const queryClient = useQueryClient();
  const currentMonth = bulan || new Date().toISOString().slice(0, 7);

  // 1. Fetch Jurnal Wali Kelas
  const journalQuery = useQuery({
    queryKey: ['walas-jurnal', kelasId],
    queryFn: () => getJurnalWaliKelasList(1, 100, '', kelasId),
    staleTime: 60 * 1000,
  });

  const rawJournal = extractArrayData(journalQuery.data);
  const journalEntries: JournalEntry[] = useMemo(() => {
    return rawJournal.map((item: any) => ({
      id: item.id,
      date: new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: item.jam || '10:00 WIB',
      category: item.kategori,
      title: item.judul,
      content: item.konten,
      author: item.Guru?.nama_guru || 'Wali Kelas',
      tags: item.tags || [],
      attachedStudents: item.siswa_terlibat || [],
    }));
  }, [rawJournal]);

  // 2. Fetch Permohonan Izin Siswa
  const leaveQuery = useQuery({
    queryKey: ['walas-permohonan-izin', kelasId],
    queryFn: () => getPermohonanIzinList(undefined, kelasId),
    staleTime: 60 * 1000,
  });

  const rawLeave = extractArrayData(leaveQuery.data);
  const leaveRequests: LeaveRequest[] = useMemo(() => {
    return rawLeave.map((item: any) => ({
      id: item.id,
      studentId: item.siswa_id,
      studentName: item.Siswa?.nama_siswa || 'Siswa',
      nis: item.Siswa?.nis || '-',
      studentAvatar: item.Siswa?.foto ? resolveProfilePhotoUrl(item.Siswa.foto) : undefined,
      parentName: item.Siswa?.nama_ayah || item.Siswa?.nama_ibu || item.Siswa?.nama_wali || item.Siswa?.OrangTuaSiswa?.[0]?.OrangTua?.nama || 'Orang Tua',
      parentPhone: item.Siswa?.no_hp_ortu || item.Siswa?.no_hp_ayah || item.Siswa?.no_hp_ibu || item.Siswa?.no_hp_wali || item.Siswa?.OrangTuaSiswa?.[0]?.OrangTua?.no_hp || item.Siswa?.no_hp || '',
      type: item.tipe_izin,
      startDate: new Date(item.tanggal_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      endDate: new Date(item.tanggal_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      reason: item.alasan,
      status: item.status === 'DISETUJUI' ? 'Disetujui' : item.status === 'DITOLAK' ? 'Ditolak' : 'Pending',
      submittedAt: new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      attachmentUrl: item.attachment_url || undefined,
      attachmentType: item.attachment_type || undefined,
    }));
  }, [rawLeave]);

  // 3. Fetch EWS (At Risk Students)
  const ewsQuery = useQuery({
    queryKey: ['walas-ews', kelasId],
    queryFn: () => getEwsPerKelasList(kelasId),
    staleTime: 60 * 1000,
  });

  const atRiskStudents: AtRiskStudent[] = useMemo(() => {
    return extractArrayData(ewsQuery.data);
  }, [ewsQuery.data]);

  // 4. Fetch Pelanggaran Siswa
  const violationQuery = useQuery({
    queryKey: ['walas-pelanggaran', kelasId],
    queryFn: () => getPelanggaranList(kelasId),
    staleTime: 60 * 1000,
  });

  const rawViolations = extractArrayData(violationQuery.data);
  const violations: ViolationRecord[] = useMemo(() => {
    return rawViolations.map((item: any) => ({
      id: item.id,
      studentId: item.siswa_id,
      studentName: item.Siswa?.nama_siswa || 'Siswa',
      nis: item.Siswa?.nis || '-',
      category: item.jenis_pelanggaran || item.nama_pelanggaran || 'Kedisiplinan',
      points: item.poin || 10,
      severity: (item.poin || 10) >= 50 ? 'Berat' : (item.poin || 10) >= 25 ? 'Sedang' : 'Ringan',
      date: item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-',
      reporter: item.pencatat || 'Wali Kelas',
      description: item.keterangan || '-',
      bkStatus: item.status === 'PROSES' ? 'Konseling BK' : item.status === 'SELESAI' ? 'Selesai' : 'Dalam Pemantauan',
      followUpNotes: item.keterangan
    }));
  }, [rawViolations]);

  // 5. Fetch Prestasi Siswa (Hall of Fame)
  const achievementQuery = useQuery({
    queryKey: ['walas-prestasi', kelasId],
    queryFn: () => getPrestasiList(kelasId),
    staleTime: 60 * 1000,
  });

  const rawAchievements = extractArrayData(achievementQuery.data);
  const achievements: AchievementRecord[] = useMemo(() => {
    return rawAchievements.map((item: any) => ({
      id: item.id,
      studentId: item.siswa_id,
      studentName: item.Siswa?.nama_siswa || 'Siswa',
      nis: item.Siswa?.nis || '-',
      avatar: item.Siswa?.foto ? resolveProfilePhotoUrl(item.Siswa.foto) : undefined,
      title: item.nama_prestasi,
      category: item.kategori === 'AKADEMIK' ? 'Akademik' : item.kategori === 'KARAKTER' ? 'Karakter & Sosial' : 'Non-Akademik',
      level: item.tingkat === 'PROVINSI' ? 'Provinsi' : item.tingkat === 'KOTA' ? 'Kota/Kab' : 'Sekolah',
      date: item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-',
      points: item.poin || 20,
      description: item.keterangan || ''
    }));
  }, [rawAchievements]);

  // 6. Fetch Presensi Kelas Harian Live
  const attendanceQuery = useQuery({
    queryKey: ['walas-presensi-harian', kelasId],
    queryFn: () => kesiswaanApi.getRekapHarianSiswa({ kelas_id: kelasId }).catch(() => ({ success: true, data: [] })),
    enabled: Boolean(kelasId),
    staleTime: 60 * 1000,
  });

  const rawAttendance = extractArrayData(attendanceQuery.data);

  // 7. Fetch Rekap Bulanan Kelas (Real Backend Grid Matrix)
  const rekapBulananQuery = useQuery({
    queryKey: ['walas-rekap-bulanan', kelasId, currentMonth],
    queryFn: () => getRekapKelasBulanan(kelasId!, currentMonth).catch(() => ({ success: true, data: null })),
    enabled: Boolean(kelasId),
    staleTime: 60 * 1000,
  });

  // 8. Fetch Siswa & Attendance Matrix
  const studentQuery = useQuery({
    queryKey: ['walas-siswa', kelasId],
    queryFn: () => getSiswaWalasList(kelasId),
    staleTime: 60 * 1000,
  });

  const rawStudents = extractArrayData(studentQuery.data);
  const students: Student[] = useMemo(() => {
    const attMap = new Map<string, any>();
    rawAttendance.forEach((a: any) => {
      const sId = a.siswa_id || a.id;
      if (sId) attMap.set(sId, a);
    });

    const violMap = new Map<string, ViolationRecord[]>();
    violations.forEach((v) => {
      if (!violMap.has(v.studentId)) violMap.set(v.studentId, []);
      violMap.get(v.studentId)!.push(v);
    });

    const achMap = new Map<string, AchievementRecord[]>();
    achievements.forEach((a) => {
      if (!achMap.has(a.studentId)) achMap.set(a.studentId, []);
      achMap.get(a.studentId)!.push(a);
    });

    const ewsMap = new Map<string, AtRiskStudent>();
    atRiskStudents.forEach((e) => {
      if (e.studentId) ewsMap.set(e.studentId, e);
    });

    const activeList = rawStudents.filter((item: any) => {
      const s = String(item.status || 'AKTIF').toUpperCase();
      return s === 'AKTIF' || s === 'ACTIVE';
    });

    const mapped = activeList.map((item: any) => {
      const sId = item.id;
      const att = attMap.get(sId);
      const studentViolations = violMap.get(sId) || [];
      const totalViolPoints = studentViolations.reduce((acc, v) => acc + (v.points || 0), 0);
      const studentAchievements = achMap.get(sId) || [];
      const totalAchPoints = studentAchievements.reduce((acc, a) => acc + (a.points || 0), 0);
      const ews = ewsMap.get(sId);

      // Status kehadiran hari ini
      let todayStatus: any = 'Hadir';
      const rawStatus = att?.status_kehadiran || att?.status || item.status_kehadiran_hari_ini;
      if (rawStatus === 'A' || rawStatus === 'ALPHA') todayStatus = 'Alpha';
      else if (rawStatus === 'I' || rawStatus === 'IZIN') todayStatus = 'Izin';
      else if (rawStatus === 'S' || rawStatus === 'SAKIT') todayStatus = 'Sakit';
      else if (rawStatus === 'D' || rawStatus === 'DISPENSASI') todayStatus = 'Dispensasi';
      else if (rawStatus === 'B' || rawStatus === 'BOLOS') todayStatus = 'Bolos';
      else if (ews?.totalAlphaThisMonth && ews.totalAlphaThisMonth >= 3) todayStatus = 'Alpha';

      const alphaCount = ews?.totalAlphaThisMonth ?? (todayStatus === 'Alpha' ? 1 : 0);
      const sakitCount = todayStatus === 'Sakit' ? 1 : 0;
      const izinCount = todayStatus === 'Izin' ? 1 : 0;

      // Kalkulasi rasio kehadiran dinamis (default 100%, dipotong jika ada alpha/sakit)
      const penalty = (alphaCount * 10) + (sakitCount * 2) + (izinCount * 1);
      const attendanceRate = Math.max(0, Math.min(100, 100 - penalty));

      // Indeks Komposit Karakter & Performa Akademis (Dinamis dari Poin Reward & Disiplin)
      const academicAverage = Math.max(65, Math.min(100, Math.round(
        (attendanceRate * 0.5) + (Math.max(0, 100 - totalViolPoints * 2) * 0.3) + (Math.min(100, totalAchPoints * 5 + 75) * 0.2)
      )));

      // Badges dari prestasi riil
      const badges: StudentBadge[] = studentAchievements.map((ach, bIdx) => ({
        id: `badge-${ach.id || bIdx}`,
        badgeName: ach.title,
        icon: 'Trophy',
        category: ach.category,
        awardedBy: 'Wali Kelas / Kesiswaan',
        awardedAt: ach.date,
        note: ach.description
      }));

      return {
        id: sId,
        nis: item.nis || '-',
        name: item.nama_siswa,
        gender: item.jenis_kelamin === 'P' ? 'P' : 'L',
        avatar: item.foto ? resolveProfilePhotoUrl(item.foto) : undefined,
        parentName: item.nama_ayah || item.nama_ibu || item.nama_wali || item.OrangTuaSiswa?.[0]?.OrangTua?.nama || 'Orang Tua',
        parentPhone: item.no_hp_ortu || item.no_hp_ayah || item.no_hp_ibu || item.no_hp_wali || item.OrangTuaSiswa?.[0]?.OrangTua?.no_hp || item.no_hp || '',
        todayStatus,
        attendanceRate,
        alphaCount,
        sakitCount,
        izinCount,
        violationPoints: totalViolPoints,
        goodDeedsPoints: totalAchPoints,
        academicAverage,
        isStarStudent: false,
        starRank: undefined as number | undefined,
        badges,
        atRiskReason: ews?.atRiskReason,
      };
    });

    // Urutkan siswa untuk mencari Star Students (prestasi tertinggi & poin pelanggaran 0)
    const sortedForStar = [...mapped].sort((a, b) => {
      if (b.goodDeedsPoints !== a.goodDeedsPoints) return b.goodDeedsPoints - a.goodDeedsPoints;
      return a.violationPoints - b.violationPoints;
    });

    sortedForStar.slice(0, 3).forEach((star, idx) => {
      const target = mapped.find(m => m.id === star.id);
      if (target && target.goodDeedsPoints > 0) {
        target.isStarStudent = true;
        target.starRank = idx + 1;
      }
    });

    return mapped;
  }, [rawStudents, rawAttendance, violations, achievements, atRiskStudents]);

  // Mutations
  const updateLeaveMutation = useMutation({
    mutationFn: ({ id, status, catatan }: { id: string; status: 'DISETUJUI' | 'DITOLAK'; catatan?: string }) =>
      updatePermohonanIzinStatus(id, { status, catatan_penolakan: catatan }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walas-permohonan-izin'] });
      queryClient.invalidateQueries({ queryKey: ['walas-siswa'] });
      queryClient.invalidateQueries({ queryKey: ['walas-presensi-harian'] });
    },
  });

  const createJournalMutation = useMutation({
    mutationFn: (payload: { tanggal: string; jam?: string; kategori: string; judul: string; isi: string; tags?: string[]; attached_students?: string[] }) =>
      createJurnalWaliKelas({ ...payload, kelas_id: kelasId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walas-jurnal'] });
    },
  });

  const deleteJournalMutation = useMutation({
    mutationFn: (id: string) => deleteJurnalWaliKelas(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walas-jurnal'] });
    },
  });

  const createViolationMutation = useMutation({
    mutationFn: (payload: any) => kesiswaanApi.createPelanggaran(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walas-pelanggaran'] });
      queryClient.invalidateQueries({ queryKey: ['walas-siswa'] });
      queryClient.invalidateQueries({ queryKey: ['walas-ews'] });
    },
  });

  const updateViolationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => kesiswaanApi.updatePelanggaran(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walas-pelanggaran'] });
      queryClient.invalidateQueries({ queryKey: ['walas-siswa'] });
    },
  });

  const createAchievementMutation = useMutation({
    mutationFn: (payload: any) => kesiswaanApi.createPrestasiSiswa(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walas-prestasi'] });
      queryClient.invalidateQueries({ queryKey: ['walas-siswa'] });
    },
  });

  const isApiConnected = (journalQuery.isSuccess || leaveQuery.isSuccess || ewsQuery.isSuccess || violationQuery.isSuccess || achievementQuery.isSuccess || studentQuery.isSuccess) &&
    !journalQuery.isError && !leaveQuery.isError && !ewsQuery.isError;

  return {
    journalEntries,
    leaveRequests,
    atRiskStudents,
    violations,
    achievements,
    students,
    rekapBulananKelas: rekapBulananQuery.data,
    isApiConnected,
    isLoading: journalQuery.isLoading || leaveQuery.isLoading || ewsQuery.isLoading || violationQuery.isLoading || achievementQuery.isLoading || studentQuery.isLoading,
    refetchAll: () => {
      journalQuery.refetch();
      leaveQuery.refetch();
      ewsQuery.refetch();
      violationQuery.refetch();
      achievementQuery.refetch();
      studentQuery.refetch();
      rekapBulananQuery.refetch();
    },
    updateLeaveStatus: updateLeaveMutation.mutateAsync,
    createJournal: createJournalMutation.mutateAsync,
    deleteJournal: deleteJournalMutation.mutateAsync,
    createViolation: createViolationMutation.mutateAsync,
    updateViolation: updateViolationMutation.mutateAsync,
    createAchievement: createAchievementMutation.mutateAsync,
  };
}
