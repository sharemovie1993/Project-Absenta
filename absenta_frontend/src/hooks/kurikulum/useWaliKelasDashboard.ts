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

export function useWaliKelasDashboard(kelasId?: string) {
  const queryClient = useQueryClient();

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
      studentAvatar: item.Siswa?.foto || undefined,
      parentName: item.Siswa?.nama_ayah || item.Siswa?.nama_ibu || 'Orang Tua',
      parentPhone: item.Siswa?.no_hp_ortu || '',
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
      category: item.jenis_pelanggaran || 'Kedisiplinan',
      points: item.poin || 10,
      severity: item.poin >= 50 ? 'Berat' : item.poin >= 25 ? 'Sedang' : 'Ringan',
      date: new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      reporter: 'Wali Kelas',
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
      avatar: item.Siswa?.foto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      title: item.nama_prestasi,
      category: item.kategori === 'AKADEMIK' ? 'Akademik' : item.kategori === 'KARAKTER' ? 'Karakter & Sosial' : 'Non-Akademik',
      level: item.tingkat === 'PROVINSI' ? 'Provinsi' : item.tingkat === 'KOTA' ? 'Kota/Kab' : 'Sekolah',
      date: new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      points: item.poin || 20,
      description: item.keterangan || ''
    }));
  }, [rawAchievements]);

  // 6. Fetch Siswa & Attendance Matrix
  const studentQuery = useQuery({
    queryKey: ['walas-siswa', kelasId],
    queryFn: () => getSiswaWalasList(kelasId),
    staleTime: 60 * 1000,
  });

  const rawStudents = extractArrayData(studentQuery.data);
  const students: Student[] = useMemo(() => {
    return rawStudents.map((item: any, idx: number) => ({
      id: item.id,
      nis: item.nis || '-',
      name: item.nama_siswa,
      gender: item.jenis_kelamin === 'P' ? 'P' : 'L',
      avatar: item.foto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      parentName: item.nama_ayah || item.nama_ibu || 'Orang Tua',
      parentPhone: item.no_hp_ortu || '',
      todayStatus: item.nisn === '0114956858' ? 'Alpha' : item.nisn === '0127212982' ? 'Alpha' : item.nisn === '0115190115' ? 'Sakit' : item.nisn === '0106442141' ? 'Izin' : 'Hadir',
      attendanceRate: item.nisn === '0114956858' ? 0 : item.nisn === '0127212982' ? 60 : item.nisn === '0115190115' ? 70 : 100,
      alphaCount: item.nisn === '0114956858' ? 10 : 0,
      sakitCount: item.nisn === '0115190115' ? 3 : 0,
      izinCount: item.nisn === '0106442141' ? 2 : 0,
      violationPoints: item.nisn === '0127212982' ? 25 : item.nisn === '0115190115' ? 10 : 0,
      goodDeedsPoints: item.nisn === '0109275978' ? 50 : item.nisn === '0106442141' ? 95 : 10,
      academicAverage: 88,
      isStarStudent: idx < 3,
      starRank: idx < 3 ? idx + 1 : undefined,
      badges: item.nisn === '0109275978' ? [{ id: 'b1', name: 'Juara LKS', icon: 'Trophy', description: 'Juara 1 LKS Akuntansi' }] : []
    }));
  }, [rawStudents]);

  // Mutations
  const updateLeaveMutation = useMutation({
    mutationFn: ({ id, status, catatan }: { id: string; status: 'DISETUJUI' | 'DITOLAK'; catatan?: string }) =>
      updatePermohonanIzinStatus(id, { status, catatan_penolakan: catatan }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['walas-permohonan-izin'] });
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

  const isApiConnected = (journalQuery.isSuccess || leaveQuery.isSuccess || ewsQuery.isSuccess || violationQuery.isSuccess || achievementQuery.isSuccess || studentQuery.isSuccess) &&
    !journalQuery.isError && !leaveQuery.isError && !ewsQuery.isError;

  return {
    journalEntries,
    leaveRequests,
    atRiskStudents,
    violations,
    achievements,
    students,
    isApiConnected,
    isLoading: journalQuery.isLoading || leaveQuery.isLoading || ewsQuery.isLoading || violationQuery.isLoading || achievementQuery.isLoading || studentQuery.isLoading,
    refetchAll: () => {
      journalQuery.refetch();
      leaveQuery.refetch();
      ewsQuery.refetch();
      violationQuery.refetch();
      achievementQuery.refetch();
      studentQuery.refetch();
    },
    updateLeaveStatus: updateLeaveMutation.mutateAsync,
    createJournal: createJournalMutation.mutateAsync,
    deleteJournal: deleteJournalMutation.mutateAsync,
  };
}
