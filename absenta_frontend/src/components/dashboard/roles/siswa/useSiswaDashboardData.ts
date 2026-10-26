import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { useAuthStore } from '@/store/authStore';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useSocket } from '@/hooks/useSocket';
import { useSiswaMe } from '@/hooks/useSiswaMe';
import { useTenant } from '@/hooks/useTenant';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useGerbangAttendanceData } from '@/hooks/attendance/useGerbangAttendanceData';
import { sekolahApi } from '@/api/academic/sekolah.api';
import { studentCardConfigApi } from '@/api/academic/student-card-config.api';
import { hubinApi } from '@/api/hubin.api';
import { listSiswaDocuments, getMemberDocPreviewUrl } from '@/api/memberDocs.api';
import api from '@/lib/axiosInstance';
import { resolveProfilePhotoUrl } from '@/lib/utils';
import {
  getRekapBulananSiswaMe,
  getRekapHarianSiswaMe,
  getRekapBulananKelasMe,
  getSesiAbsensiList,
} from '@/api/attendanceGerbang.api';
import { normalizeFromSesiAbsensi } from '@/utils/kbm-normalizer';
import { toLocalDate, toLocalMonth, formatLocalTimeFromISO, getTimezoneLabel } from '@/utils/attendance/time';
import { calculateStudentGamification } from '@/utils/attendance/attendanceGamification.utils';
import {
  Award,
  ShieldCheck,
  Compass,
  ShoppingCart,
  Sparkles,
  Briefcase,
} from 'lucide-react';
import type { StudentBadge, SiswaDisciplineItem, SiswaMonthStats } from './types';

export function useSiswaDashboardData() {
  const { user } = useAuthStore();
  const { tenant: tenantSettings } = useTenantSettings();
  const { can } = useCapabilities();
  const { subscribe, unsubscribe } = useSocket();
  const { tenantId } = useTenant();

  const isPetugasKelas = Boolean(
    (user as any)?.is_petugas_kelas ||
    (user?.siswa_profile as any)?.is_petugas ||
    can('attendance.class.input') ||
    can('attendance.ops') ||
    can('attendance.sessions.update.attendance')
  );

  const todayIso = useMemo(() => toLocalDate(), []);
  const monthIso = useMemo(() => toLocalMonth(), []);

  const todayFormattedDate = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(monthIso);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [catatanFilter, setCatatanFilter] = useState<'semua' | 'prestasi' | 'pelanggaran'>('semua');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // 1. Get Student Detailed Profile via Hook
  const { siswaProfile, isApiConnected, refetch: refetchProfile } = useSiswaMe();

  // 1.1 Fetch Sekolah Profile Data
  const { data: sekolahProfileRes } = useQuery({
    queryKey: ['sekolah-profile'],
    queryFn: sekolahApi.getProfile,
  });

  const sekolahName =
    tenantSettings?.name ||
    sekolahProfileRes?.nama ||
    sekolahProfileRes?.nama_sekolah ||
    (siswaProfile as any)?.Sekolah?.nama ||
    (siswaProfile as any)?.sekolah?.nama ||
    'Sekolah';

  const sekolahLogo = tenantSettings?.logo_url || sekolahProfileRes?.logo_url || null;

  // 1.2 Fetch Active Student Card Config
  const { data: studentCardConfigRes } = useQuery({
    queryKey: ['student-card-config-me'],
    queryFn: studentCardConfigApi.getConfig,
    enabled: true,
  });

  const activeCardConfig = studentCardConfigRes || null;

  // 1.3 Photo resolution
  const { data: siswaDocsForPhoto } = useQuery({
    queryKey: ['self-member-docs-foto', siswaProfile?.id],
    queryFn: () => listSiswaDocuments(siswaProfile!.id),
    enabled: !!siswaProfile?.id && !siswaProfile?.foto && !siswaProfile?.foto_url,
  });

  const studentPhotoDoc = useMemo(() => {
    return siswaDocsForPhoto?.data?.find((d: any) => d.kategori === 'FOTO');
  }, [siswaDocsForPhoto]);

  const rawStudentPhoto = useMemo(() => {
    if (siswaProfile?.foto) return siswaProfile.foto;
    if (siswaProfile?.foto_url) return siswaProfile.foto_url;
    if ((siswaProfile as any)?.foto_pas) return (siswaProfile as any).foto_pas;
    if ((user as any)?.foto) return (user as any).foto;
    if ((user as any)?.foto_url) return (user as any).foto_url;
    if (studentPhotoDoc && siswaProfile?.id) {
      return getMemberDocPreviewUrl('SISWA', siswaProfile.id, studentPhotoDoc.id);
    }
    return null;
  }, [siswaProfile, user, studentPhotoDoc]);

  const studentPhotoUrl = useMemo(() => {
    return rawStudentPhoto ? resolveProfilePhotoUrl(rawStudentPhoto) : null;
  }, [rawStudentPhoto]);

  const studentInitials = useMemo(() => {
    const name = siswaProfile?.nama || (user as any)?.nama_siswa || user?.full_name || user?.name || 'S';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [siswaProfile, user]);

  const studentName =
    siswaProfile?.nama || siswaProfile?.nama_siswa || (user as any)?.nama_siswa || user?.full_name || user?.name || '-';
  const currentClassName =
    siswaProfile?.Kelas?.nama_kelas || siswaProfile?.kelas?.nama_kelas || siswaProfile?.kelas_nama || (user as any)?.kelas_nama || '-';
  const currentNisn =
    (siswaProfile as any)?.nisn || (siswaProfile as any)?.nis || (user as any)?.nisn || (user as any)?.username || '-';
  const currentNik =
    siswaProfile?.nik || (user as any)?.nik || (user as any)?.nik_siswa || '-';
  const currentJurusan =
    siswaProfile?.Jurusan?.nama || siswaProfile?.jurusan?.nama || siswaProfile?.jurusan_nama || (user as any)?.jurusan_nama || '-';
  const currentOrtu =
    siswaProfile?.nama_ayah || siswaProfile?.nama_ibu || siswaProfile?.nama_wali || (user as any)?.nama_ortu || '-';

  // QR Code generator
  useEffect(() => {
    const rawNisn = currentNisn && currentNisn !== '-' ? currentNisn : '1234567890';
    QRCode.toDataURL(String(rawNisn), { errorCorrectionLevel: 'L', margin: 0, width: 300 })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [currentNisn]);

  // 2. Attendance & Schedule Data
  const studentKelasId = siswaProfile?.kelas_id || (user as any)?.kelas_id;

  const { data: dailyRecapRes, refetch: refetchDailyRecap } = useQuery({
    queryKey: ['rekap-harian-siswa-me', selectedDate, user?.siswa_id],
    queryFn: () => getRekapHarianSiswaMe({ tanggal: selectedDate }),
    enabled: !!user && !!user?.siswa_id,
  });

  const { data: monthlyRecapRes, refetch: refetchMonthlyRecap } = useQuery({
    queryKey: ['rekap-bulanan-siswa-me', selectedMonth, user?.siswa_id],
    queryFn: () => getRekapBulananSiswaMe({ bulan: selectedMonth }),
    enabled: !!user && !!user?.siswa_id,
  });

  const { data: scheduleRes, refetch: refetchSchedule, isLoading: isLoadingSchedule } = useQuery({
    queryKey: ['jadwal-kbm-siswa-unified', selectedDate, studentKelasId],
    queryFn: () =>
      getSesiAbsensiList({
        tanggal: selectedDate,
        kelas_id: studentKelasId || undefined,
        include_scheduled: true,
        summary: true,
        limit: 100,
      } as any),
    enabled: !!user && !!studentKelasId,
    staleTime: 30000,
  });

  const { data: pelanggaranRes, refetch: refetchPelanggaran } = useQuery({
    queryKey: ['pelanggaran-me', user?.siswa_id || user?.id],
    queryFn: async () => {
      try {
        const res = await api.get('/kesiswaan/pelanggaran/me');
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: !!user,
  });

  const { data: prestasiRes } = useQuery({
    queryKey: ['prestasi-me', user?.siswa_id || user?.id],
    queryFn: async () => {
      try {
        const res = await api.get('/kesiswaan/prestasi/me');
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: !!user,
  });

  const { data: kelasLeaderboardRes } = useQuery({
    queryKey: ['class-leaderboard-me-dashboard', selectedMonth],
    queryFn: () => getRekapBulananKelasMe({ bulan: selectedMonth }),
    enabled: !!user,
  });

  const myRank = useMemo(() => {
    const students = kelasLeaderboardRes?.data?.students || [];
    if (!students.length) return { rank: 0, totalStudents: 0 };
    const myIdx = students.findIndex(
      (s: any) =>
        s.id === user?.siswa_id ||
        s.id === user?.id ||
        s.nama === user?.name ||
        s.nama === siswaProfile?.nama
    );
    return {
      rank: myIdx !== -1 ? myIdx + 1 : 0,
      totalStudents: students.length,
    };
  }, [kelasLeaderboardRes, user, siswaProfile]);

  // PKL Siswa Queries
  const isPklStudent = can('hubin.self.pkl');

  const { data: myPenempatanRaw } = useQuery({
    queryKey: ['hubin-penempatan-me'],
    queryFn: () => hubinApi.getMyPenempatan(),
    enabled: isPklStudent,
    staleTime: 5 * 60 * 1000,
  });

  const myPenempatan = useMemo(() => {
    const raw = myPenempatanRaw;
    return (raw as any)?.data || raw || null;
  }, [myPenempatanRaw]);

  const isAktifPkl = useMemo(() => {
    if (!isPklStudent || !myPenempatan) return false;
    return (myPenempatan as any).status === 'AKTIF';
  }, [isPklStudent, myPenempatan]);

  const { data: pklAbsensiDashboardRaw } = useQuery({
    queryKey: ['pkl-absensi-dashboard', (myPenempatan as any)?.id],
    queryFn: () => hubinApi.getAbsensi((myPenempatan as any).id, { limit: 5 }),
    enabled: isAktifPkl && !!(myPenempatan as any)?.id,
    staleTime: 2 * 60 * 1000,
  });

  const pklAbsensiHistory = useMemo(() => {
    const raw = pklAbsensiDashboardRaw;
    return Array.isArray((raw as any)?.data) ? (raw as any).data : [];
  }, [pklAbsensiDashboardRaw]);

  const todayPklAbsensi = useMemo(() => {
    const todayStr = todayIso;
    return (
      pklAbsensiHistory.find((a: any) => {
        const rawTanggalStr = typeof a.tanggal === 'string' ? a.tanggal.substring(0, 10) : '';
        const dateFromTanggal = a.tanggal ? toLocalDate(new Date(a.tanggal)) : '';
        const dateFromJamMasuk = a.jam_masuk
          ? typeof a.jam_masuk === 'string'
            ? a.jam_masuk.substring(0, 10)
            : toLocalDate(new Date(a.jam_masuk))
          : '';
        return rawTanggalStr === todayStr || dateFromTanggal === todayStr || dateFromJamMasuk === todayStr;
      }) || null
    );
  }, [pklAbsensiHistory, todayIso]);

  const pklHadir = useMemo(
    () => pklAbsensiHistory.filter((a: any) => a.status === 'HADIR').length,
    [pklAbsensiHistory]
  );

  const pklSisaHari = useMemo(() => {
    const selesai = (myPenempatan as any)?.tanggal_selesai;
    if (!selesai) return null;
    const diff = Math.ceil((new Date(selesai).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [myPenempatan]);

  const dailyRecap = dailyRecapRes?.data ?? null;
  const monthlyRecap = monthlyRecapRes?.data ?? null;

  // Socket Live Subscription
  useEffect(() => {
    if (!user) return;
    const studentId = user.siswa_id || user.id;
    const kelasId = siswaProfile?.kelas_id || (user as any)?.kelas_id;

    const handleFeedUpdate = () => {
      refetchDailyRecap();
      refetchMonthlyRecap();
      refetchSchedule();
    };

    subscribe(`attendance_feed_student:${studentId}`, handleFeedUpdate);
    subscribe('attendance_feed_update', handleFeedUpdate);
    subscribe('sesi_status_update', handleFeedUpdate);
    if (kelasId) {
      subscribe(`sesi:created:${kelasId}`, handleFeedUpdate);
      subscribe(`sesi:updated:${kelasId}`, handleFeedUpdate);
    }

    return () => {
      unsubscribe(`attendance_feed_student:${studentId}`, handleFeedUpdate);
      unsubscribe('attendance_feed_update', handleFeedUpdate);
      unsubscribe('sesi_status_update', handleFeedUpdate);
      if (kelasId) {
        unsubscribe(`sesi:created:${kelasId}`, handleFeedUpdate);
        unsubscribe(`sesi:updated:${kelasId}`, handleFeedUpdate);
      }
    };
  }, [user, siswaProfile, subscribe, unsubscribe, refetchDailyRecap, refetchMonthlyRecap, refetchSchedule]);

  // Gamification Calculation
  const gamification = useMemo(() => {
    const detail = Array.isArray(monthlyRecapRes?.data?.detail)
      ? monthlyRecapRes.data.detail
      : Array.isArray(monthlyRecap?.detail)
      ? monthlyRecap.detail
      : [];

    let attendanceRate = 0;
    if (typeof monthlyRecapRes?.data?.persentase_kehadiran === 'number') {
      attendanceRate = monthlyRecapRes.data.persentase_kehadiran;
    } else if (typeof monthlyRecap?.persentase_kehadiran === 'number') {
      attendanceRate = monthlyRecap.persentase_kehadiran;
    } else {
      const h = monthlyRecapRes?.data?.total_hadir ?? 0;
      const i = monthlyRecapRes?.data?.total_izin ?? 0;
      const s = monthlyRecapRes?.data?.total_sakit ?? 0;
      const a = monthlyRecapRes?.data?.total_alpa ?? 0;
      const tot = h + i + s + a;
      attendanceRate = tot > 0 ? Math.round((h / tot) * 100) : 0;
    }

    const apiData = pelanggaranRes?.data;
    const rawList = Array.isArray(apiData)
      ? apiData
      : Array.isArray(apiData?.list)
      ? apiData.list
      : [];
    const totalPoinPelanggaran = rawList.reduce((acc: number, curr: any) => acc + (curr.poin || 0), 0);

    return calculateStudentGamification(detail, attendanceRate, totalPoinPelanggaran);
  }, [monthlyRecapRes, monthlyRecap, pelanggaranRes]);

  // Badges calculation
  const { data: coopMemberRes } = useQuery({
    queryKey: ['koperasi-member-status-me'],
    queryFn: async () => {
      try {
        const res = await api.get('/cooperative/members/me');
        const data = res?.data?.data;
        if (data && data.status === 'ACTIVE') {
          return { status: 'member' as const, data };
        }
        return { status: 'non-member' as const, data: null };
      } catch {
        return { status: 'non-member' as const, data: null };
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  });

  const isCoopMember = coopMemberRes?.status === 'member' || Boolean((siswaProfile as any)?.is_anggota_koperasi);

  const studentBadges = useMemo(() => {
    const list: StudentBadge[] = [];

    if (currentClassName && currentClassName !== '-') {
      list.push({
        key: 'kelas',
        label: `Kelas ${currentClassName}`,
        color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-extrabold',
      });
    }

    if (isAktifPkl) {
      list.push({
        key: 'pkl',
        label: 'PKL Aktif',
        icon: Briefcase,
        color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-black',
      });
    }

    if (isPetugasKelas) {
      list.push({
        key: 'petugas_kelas',
        label: 'Petugas Kelas',
        icon: Sparkles,
        color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-black',
      });
    }

    if (isCoopMember) {
      list.push({
        key: 'koperasi',
        label: 'Anggota Koperasi',
        icon: ShoppingCart,
        color: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-black',
      });
    }

    if (siswaProfile?.is_osis) {
      list.push({
        key: 'osis',
        label: 'Pengurus OSIS',
        icon: Award,
        color: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 font-black',
      });
    }
    if (siswaProfile?.is_mpk) {
      list.push({
        key: 'mpk',
        label: 'Anggota MPK',
        icon: ShieldCheck,
        color: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-black',
      });
    }

    const rawEskuls: string[] = [
      ...(Array.isArray((siswaProfile as any)?.ekskuls) ? (siswaProfile as any).ekskuls : []),
      siswaProfile?.ekskul_1,
      siswaProfile?.ekskul_2,
    ].filter((e): e is string => Boolean(e && typeof e === 'string' && e.trim().length > 0));

    const uniqueEskuls = Array.from(new Set(rawEskuls));
    uniqueEskuls.forEach((eskulName, idx) => {
      const cleanName = eskulName.replace(/^(eskul|ekstrakurikuler)\s+/i, '').trim();
      list.push({
        key: `eskul-${idx}-${cleanName}`,
        label: `Eskul ${cleanName}`,
        icon: Compass,
        color: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30 font-black',
      });
    });

    return list;
  }, [currentClassName, isAktifPkl, isPetugasKelas, isCoopMember, siswaProfile]);

  // Extract lists helper
  const extractListFromPayload = (payload: any): any[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    const target = payload?.data || payload;
    if (Array.isArray(target)) return target;
    if (Array.isArray(target?.list)) return target.list;
    if (Array.isArray(target?.rows)) return target.rows;
    return [];
  };

  const pelanggaranList = useMemo(() => extractListFromPayload(pelanggaranRes), [pelanggaranRes]);
  const prestasiList = useMemo(() => extractListFromPayload(prestasiRes), [prestasiRes]);

  const totalPoinPelanggaran = useMemo(
    () => pelanggaranList.reduce((acc: number, curr: any) => acc + (curr.poin || 0), 0),
    [pelanggaranList]
  );
  const totalPoinPrestasi = useMemo(
    () => prestasiList.reduce((acc: number, curr: any) => acc + (curr.poin || 0), 0),
    [prestasiList]
  );
  const netPoin = useMemo(() => totalPoinPrestasi - totalPoinPelanggaran, [totalPoinPrestasi, totalPoinPelanggaran]);

  const disciplineHistory = useMemo<SiswaDisciplineItem[]>(() => {
    const combined: SiswaDisciplineItem[] = [];
    for (const p of pelanggaranList) {
      combined.push({
        id: p.id || p.tanggal || `pel-${Math.random()}`,
        judul: p.nama_pelanggaran || p.kategori || p.keterangan || 'Catatan Pelanggaran',
        kategori: p.kategori || 'Kedisiplinan',
        tanggal: p.tanggal,
        poin: -(p.poin || 5),
        type: 'pelanggaran',
      });
    }
    for (const pr of prestasiList) {
      combined.push({
        id: pr.id || pr.tanggal || `pres-${Math.random()}`,
        judul: pr.nama_prestasi || pr.kategori || pr.keterangan || 'Catatan Prestasi',
        kategori: pr.kategori || 'Prestasi & Keahlian',
        tanggal: pr.tanggal,
        poin: +(pr.poin || 10),
        type: 'prestasi',
      });
    }
    combined.sort((a, b) => new Date(b.tanggal || 0).getTime() - new Date(a.tanggal || 0).getTime());
    return combined;
  }, [pelanggaranList, prestasiList]);

  const currentDisciplineScore = useMemo(() => {
    return Math.max(0, 100 - totalPoinPelanggaran + totalPoinPrestasi);
  }, [totalPoinPelanggaran, totalPoinPrestasi]);

  const monthStats = useMemo<SiswaMonthStats>(() => {
    return {
      hadir: monthlyRecapRes?.data?.total_hadir ?? monthlyRecap?.statistik?.HADIR ?? 0,
      sakit: monthlyRecapRes?.data?.total_sakit ?? monthlyRecap?.statistik?.SAKIT ?? 0,
      izin: monthlyRecapRes?.data?.total_izin ?? monthlyRecap?.statistik?.IZIN ?? 0,
      alpa: monthlyRecapRes?.data?.total_alpa ?? monthlyRecap?.statistik?.ALPA ?? 0,
    };
  }, [monthlyRecapRes, monthlyRecap]);

  const handlePrevMonth = () => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) - 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    setSelectedMonth(`${year}-${String(month).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    setSelectedMonth(`${year}-${String(month).padStart(2, '0')}`);
  };

  const selectedMonthFormatted = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }, [selectedMonth]);

  const calendarGridData = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = Number(yearStr) || new Date().getFullYear();
    const month = Number(monthStr) || new Date().getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayIndex = new Date(year, month - 1, 1).getDay();

    const detail = Array.isArray(monthlyRecap?.detail) ? monthlyRecap.detail : [];
    const statusMap = new Map<string, any>();
    detail.forEach((item: any) => {
      if (item.tanggal) {
        statusMap.set(item.tanggal, item);
      }
    });

    if (dailyRecap && selectedDate) {
      const isDailyInMonth = selectedDate.startsWith(selectedMonth);
      if (isDailyInMonth && !statusMap.has(selectedDate)) {
        statusMap.set(selectedDate, {
          tanggal: selectedDate,
          status: dailyRecap.status || (dailyRecap.rincian?.length ? dailyRecap.rincian[0].status : null),
        });
      }
    }

    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateIso = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const rec = statusMap.get(dateIso);
      days.push({
        day: d,
        dateIso,
        status: rec?.status || null,
        rec,
      });
    }

    return {
      year,
      month,
      daysInMonth,
      firstDayIndex,
      days,
    };
  }, [selectedMonth, monthlyRecap, dailyRecap, selectedDate]);

  const todayKbmSchedule = useMemo(() => {
    const rawList = scheduleRes?.data;
    const list = Array.isArray(rawList)
      ? rawList
      : Array.isArray((rawList as any)?.data)
      ? (rawList as any).data
      : Array.isArray(scheduleRes?.items)
      ? scheduleRes.items
      : [];

    if (list.length === 0) return [];

    return list.map((item: any, idx: number) => {
      const norm = normalizeFromSesiAbsensi(item);
      const isOverdue = norm.status.isOverdue;
      const isFinished = norm.status.isFinished;
      const isLive = norm.status.isLive;
      const isReadyToOpen = norm.status.isReadyToOpen;

      const calcStatus = isOverdue
        ? 'Terlewat'
        : isFinished
        ? 'Selesai'
        : isLive
        ? 'Sedang Berlangsung'
        : isReadyToOpen
        ? 'Siap Dimulai'
        : 'Mendatang';

      return {
        id: norm.id || String(idx),
        kode: item.Mapel?.kode_mapel || norm.mapel_nama,
        mapel: norm.mapel_nama,
        guru: norm.guru_nama,
        guru_nama: norm.guru_nama,
        guru_pengganti_nama:
          norm.guru_pengganti_nama ||
          (item as any).guru_pengganti_nama ||
          (item as any).GuruPelaksana?.nama_guru ||
          null,
        guru_pengampu_nama: norm.guru_pengampu_nama || norm.guru_nama || null,
        lokasi: norm.kelas_nama,
        jam: `${norm.jam_mulai} - ${norm.jam_selesai}`,
        jamLabel: norm.jamLabel,
        status: calcStatus,
        _raw: norm,
      };
    });
  }, [scheduleRes]);

  const sessionAttendanceHistory = useMemo(() => {
    const formatWaktu = (raw: any) => {
      if (!raw || raw === '-') return '-';
      const str = String(raw).trim();
      const tzLabel = getTimezoneLabel();
      if (str.includes('T') || str.includes('Z')) {
        const formatted = formatLocalTimeFromISO(str);
        if (formatted) return `${formatted} ${tzLabel}`;
      }
      const clean = str.replace(/(WIB|WITA|WIT)/gi, '').trim();
      return clean ? `${clean} ${tzLabel}` : '-';
    };

    let formattedDate = selectedDate;
    if (selectedDate && selectedDate.includes('-')) {
      try {
        const [y, m, d] = selectedDate.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        formattedDate = dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch {}
    }

    const dailyData = dailyRecapRes?.data;
    const rincianList = Array.isArray(dailyData?.rincian) ? dailyData.rincian : [];

    const result: any[] = [];
    const gateItem = rincianList.find(
      (r: any) =>
        r.asal_gerbang ||
        r.is_gerbang ||
        r.jenis_kegiatan === 'Pintu Gerbang' ||
        r.sesi_nama === 'Pintu Gerbang'
    );
    if (gateItem) {
      const waktuRaw =
        gateItem.waktu_tap || gateItem.waktu || gateItem.waktu_masuk || gateItem.created_at || '-';
      result.push({
        id: gateItem.id || 'gate-entry',
        sesi_id: gateItem.sesi_absensi_id || gateItem.sesi_id || 'gate',
        date: formattedDate,
        status: gateItem.status || 'HADIR',
        metode: gateItem.metode_absen || gateItem.metode || 'RFID',
        jamLabel: undefined,
        waktu: formatWaktu(waktuRaw),
        sesi: 'Presensi Pintu Gerbang',
        nama_guru: 'Petugas Piket Gerbang',
        status_guru: 'HADIR',
        keterangan: gateItem.keterangan || 'Presensi Gerbang Masuk',
      });
    }

    todayKbmSchedule.forEach((sch: any, idx: number) => {
      const matchedTap = rincianList.find((r: any) => {
        const rSesiId = r.sesi_absensi_id || r.sesi_id;
        if (rSesiId && sch.id && rSesiId === sch.id) return true;
        const rMapel = String(r.jenis_kegiatan || r.sesi_nama || r.nama_sesi || r.mapel || '').toLowerCase();
        const schMapel = String(sch.mapel || sch.kode || '').toLowerCase();
        return schMapel && rMapel && (rMapel.includes(schMapel) || schMapel.includes(rMapel));
      });

      const isTapped =
        matchedTap &&
        (matchedTap.status === 'HADIR' ||
          matchedTap.status === 'TEPAT_WAKTU' ||
          matchedTap.status === 'TERLAMBAT' ||
          matchedTap.status === 'SAKIT' ||
          matchedTap.status === 'IZIN');
      const tapWaktuRaw = matchedTap
        ? matchedTap.waktu_tap || matchedTap.waktu || matchedTap.waktu_masuk || matchedTap.created_at
        : null;
      const tapWaktuStr = tapWaktuRaw ? formatWaktu(tapWaktuRaw) : null;

      result.push({
        id: sch.id || `session-${idx}`,
        sesi_id: sch.id,
        date: formattedDate,
        status: isTapped ? matchedTap.status : sch.status === 'Selesai' ? 'BELUM_ABSEN' : sch.status,
        metode: matchedTap?.metode_absen || matchedTap?.metode || 'KBM',
        jamLabel: sch.jamLabel,
        waktu: tapWaktuStr || sch.jam,
        sesi: sch.mapel,
        nama_guru: sch.guru_pengganti_nama || sch.guru_nama || 'Guru Mapel',
        status_guru: sch.guru_pengganti_nama ? 'GURU_PENGGANTI' : 'GURU_UTAMA',
        keterangan: sch.lokasi ? `Ruang ${sch.lokasi}` : 'KBM Sesuai Jadwal',
      });
    });

    return result;
  }, [selectedDate, dailyRecapRes, todayKbmSchedule]);

  // Buku catatan list for points tab
  const bukuCatatanList = useMemo(() => {
    const list: any[] = [];
    pelanggaranList.forEach((p: any) => {
      list.push({
        id: p.id || `pel-${Math.random()}`,
        judul: p.nama_pelanggaran || p.keterangan || 'Catatan Pelanggaran',
        kategori: p.kategori || 'Kedisiplinan',
        pencatat: p.pencatat || p.guru_nama || 'Guru / Petugas Piket',
        tanggal: p.tanggal ? p.tanggal.substring(0, 10) : '-',
        poin: -(p.poin || 5),
        status: 'Pelanggaran Tercatat',
        type: 'PELANGGARAN',
      });
    });
    prestasiList.forEach((pr: any) => {
      list.push({
        id: pr.id || `pres-${Math.random()}`,
        judul: pr.nama_prestasi || pr.keterangan || 'Penghargaan Siswa',
        kategori: pr.kategori || 'Prestasi Akademik / Non-Akademik',
        pencatat: pr.pencatat || pr.guru_nama || 'Wali Kelas / Kesiswaan',
        tanggal: pr.tanggal ? pr.tanggal.substring(0, 10) : '-',
        poin: +(pr.poin || 10),
        status: 'Prestasi Terverifikasi',
        type: 'PRESTASI',
      });
    });
    list.sort((a, b) => new Date(b.tanggal || 0).getTime() - new Date(a.tanggal || 0).getTime());
    return list;
  }, [pelanggaranList, prestasiList]);

  const filteredBukuCatatan = useMemo(() => {
    if (catatanFilter === 'prestasi') {
      return bukuCatatanList.filter((item) => item.type === 'PRESTASI');
    }
    if (catatanFilter === 'pelanggaran') {
      return bukuCatatanList.filter((item) => item.type === 'PELANGGARAN');
    }
    return bukuCatatanList;
  }, [bukuCatatanList, catatanFilter]);

  return {
    user,
    tenantId,
    isPetugasKelas,
    todayIso,
    todayFormattedDate,
    selectedMonth,
    selectedMonthFormatted,
    selectedDate,
    setSelectedDate,
    catatanFilter,
    setCatatanFilter,
    qrCodeDataUrl,
    siswaProfile,
    isApiConnected,
    refetchProfile,
    sekolahName,
    dynamicLogoUrl: activeCardConfig?.logo_url || sekolahLogo,
    activeCardConfig,
    studentPhotoUrl,
    studentInitials,
    studentName,
    currentClassName,
    currentNisn,
    currentNik,
    currentJurusan,
    currentOrtu,
    isAktifPkl,
    todayPklAbsensi,
    pklHadir,
    pklSisaHari,
    dailyRecap,
    monthlyRecap,
    gamification,
    studentBadges,
    myRank,
    kelasLeaderboardStudents: kelasLeaderboardRes?.data?.students || [],
    todayKbmSchedule,
    isLoadingSchedule,
    sessionAttendanceHistory,
    calendarGridData,
    disciplineHistory,
    totalPoinPrestasi,
    totalPoinPelanggaran,
    netPoin,
    currentDisciplineScore,
    monthStats,
    handlePrevMonth,
    handleNextMonth,
    bukuCatatanList,
    filteredBukuCatatan,
    pelanggaranCount: pelanggaranList.length,
    prestasiCount: prestasiList.length,
  };
}
