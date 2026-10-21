import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard,
  Briefcase, 
  CalendarCheck, 
  Users, 
  Wrench, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ChevronRight, 
  X, 
  AlertTriangle, 
  GraduationCap
} from 'lucide-react';
import { Button, Badge, Loader } from '@/components/ui';
import { cn } from '@/lib/utils';
import { hubinApi } from '@/api/hubin.api';
import { getKaprogStats } from '@/api/dashboard.api';
import { useAuthStore } from '@/store/authStore';
import { PklDeskripsiTpModal, EditingMitraSlot } from '@/components/hubin/nilai-pkl/PklDeskripsiTpModal';
import { AcademicContextBar, useAcademicContext } from '@/components/common';
import toast from 'react-hot-toast';

// Subkomponen Modular Ter-Hardening (Pilar 21B - God File Guard)
import { KaprogBerandaTab } from './kaprog/tabs/KaprogBerandaTab';
import { KaprogPklTab } from './kaprog/tabs/KaprogPklTab';
import { KaprogKehadiranTab } from './kaprog/tabs/KaprogKehadiranTab';
import { KaprogGuruTab } from './kaprog/tabs/KaprogGuruTab';
import { KaprogSaranaTab } from './kaprog/tabs/KaprogSaranaTab';
import { KaprogSideSummary } from './kaprog/tabs/KaprogSideSummary';
import { KaprogGuruDetailModal } from './kaprog/KaprogGuruDetailModal';
import { 
  KaprogTabId, 
  NavTabItem, 
  KelasKehadiranItem, 
  SiswaAtRiskItem, 
  PelanggaranSiswaItem,
  GuruProduktifItem, 
  SaranaItem, 
  ResolvedJurusan 
} from './kaprog/types';

export interface KaprogDashboardProps {
  user?: {
    id?: string;
    kaprog_jurusan?: { id?: string; nama?: string; singkatan?: string };
    [key: string]: unknown;
  };
  kaprogJurusan?: { id?: string; nama?: string; singkatan?: string } | null;
}

export const KaprogDashboard: React.FC<KaprogDashboardProps> = ({
  user: propUser,
  kaprogJurusan: propJurusan,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuthStore();

  const currentUser = propUser || authUser;

  // Active Tab State (beranda | pkl | kehadiran | guru | sarana)
  const [activeTab, setActiveTab] = useState<KaprogTabId>('beranda');

  // Dismissed Alert Strip state
  const [dismissedAlerts, setDismissedAlerts] = useState<Record<string, boolean>>({});

  // Search filter inside PKL tab
  const [mitraFilter, setMitraFilter] = useState('');

  // Floating Modal state for inline TP Editing
  const [activeEditingSlot, setActiveEditingSlot] = useState<EditingMitraSlot | null>(null);

  // Floating Modal state for Guru Penugasan & Kontak
  const [selectedGuruPenugasan, setSelectedGuruPenugasan] = useState<GuruProduktifItem | null>(null);

  // Konteks Akademik Standard Platform (useAcademicContext SSOT)
  const academic = useAcademicContext();

  // --------------------------------------------------------------------------
  // Data Fetching: 1. PKL Summary (Dual-Layer Cache)
  // --------------------------------------------------------------------------
  const jurusanId = propJurusan?.id || (currentUser as { kaprog_jurusan?: { id?: string } })?.kaprog_jurusan?.id || undefined;

  const {
    data: pklSummaryRes,
    isLoading: pklLoading,
    isFetching: pklFetching,
    refetch: refetchPkl
  } = useQuery({
    queryKey: ['kaprog-pkl-summary', jurusanId, academic.selectedTahunPelajaran, academic.selectedSemester],
    queryFn: () => hubinApi.getKaprogSummary({
      jurusan_id: jurusanId,
      tahun_pelajaran_id: academic.selectedTahunPelajaran || undefined,
      semester_id: academic.selectedSemester || undefined,
    }).catch(() => null),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // --------------------------------------------------------------------------
  // Data Fetching: 2. Kaprog Role Stats (Scoped Real Data Engine)
  // --------------------------------------------------------------------------
  const {
    data: kaprogStatsRes,
    isLoading: statsLoading,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['kaprog-stats', jurusanId, academic.selectedTahunPelajaran, academic.selectedSemester],
    queryFn: () => getKaprogStats({
      jurusan_id: jurusanId,
      tahun_pelajaran_id: academic.selectedTahunPelajaran || undefined,
      semester_id: academic.selectedSemester || undefined,
    }).catch(() => null),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const pklSummaryData = pklSummaryRes?.data || null;
  const kaprogStatsData = kaprogStatsRes?.data || kaprogStatsRes || null;

  // Konteks Akademik Aktif (Tahun Pelajaran & Semester)
  const konteksAkademik = useMemo(() => {
    return kaprogStatsData?.konteksAkademik || null;
  }, [kaprogStatsData]);

  // Resolved Jurusan Info
  const resolvedJurusan: ResolvedJurusan = useMemo(() => {
    return (
      kaprogStatsData?.jurusan ||
      pklSummaryData?.jurusan ||
      propJurusan ||
      (currentUser as { kaprog_jurusan?: { id?: string; nama?: string; singkatan?: string } })?.kaprog_jurusan || {
        id: 'jurusan-default',
        nama: 'Program Keahlian',
        singkatan: 'KAPROG',
        kode: 'KPR',
      }
    );
  }, [kaprogStatsData, pklSummaryData, propJurusan, currentUser]);

  // Status Perumusan TP Mitra (Dari API Riil Hubin)
  const tpStatus = useMemo(() => {
    return (
      pklSummaryData?.tpStatus ||
      kaprogStatsData?.pklSummary?.tpStatus || {
        totalMitra: 0,
        filledMitra: 0,
        pendingMitra: 0,
        completionPercentage: 0,
      }
    );
  }, [pklSummaryData, kaprogStatsData]);

  // Status Penilaian Siswa PKL (Dari API Riil Hubin)
  const penilaianStatus = useMemo(() => {
    return (
      pklSummaryData?.penilaianStatus ||
      kaprogStatsData?.pklSummary?.penilaianStatus || {
        totalSiswaPkl: 0,
        sudahDinilaiDudi: 0,
        belumDinilaiDudi: 0,
        sudahSidang: 0,
        belumSidang: 0,
      }
    );
  }, [pklSummaryData, kaprogStatsData]);

  // Daftar Perusahaan Mitra PKL
  const mitraList = useMemo(() => {
    return (
      pklSummaryData?.allMitraList ||
      pklSummaryData?.mitraList ||
      kaprogStatsData?.pklSummary?.allMitraList ||
      kaprogStatsData?.pklSummary?.mitraList ||
      []
    );
  }, [pklSummaryData, kaprogStatsData]);

  // Filtered Mitra List berdasarkan keyword search
  const filteredMitraList = useMemo(() => {
    if (!mitraFilter.trim()) return mitraList;
    const query = mitraFilter.toLowerCase();
    return (mitraList || [])?.filter(
      (m: { nama_mitra?: string; bidang_usaha?: string; rombel_list?: string[] }) =>
        m.nama_mitra?.toLowerCase().includes(query) ||
        m.bidang_usaha?.toLowerCase().includes(query) ||
        m.rombel_list?.some((r: string) => r.toLowerCase().includes(query))
    );
  }, [mitraList, mitraFilter]);

  // Daftar Kehadiran Siswa per Kelas Rombel (Data Riil Backend)
  const kelasKehadiranList: KelasKehadiranItem[] = useMemo(() => {
    return kaprogStatsData?.kehadiranKelas || [];
  }, [kaprogStatsData]);

  // Daftar Siswa Butuh Perhatian Khusus (Flag At-Risk Presensi)
  const atRiskStudents: SiswaAtRiskItem[] = useMemo(() => {
    return kaprogStatsData?.siswaAtRisk || [];
  }, [kaprogStatsData]);

  // Catatan Kedisiplinan & Pelanggaran Siswa Kejuruan (Opsi 2)
  const pelanggaranList: PelanggaranSiswaItem[] = useMemo(() => {
    return kaprogStatsData?.pelanggaranSiswa || [];
  }, [kaprogStatsData]);

  // Daftar Guru Produktif Mengajar Hari Ini (Data Riil Jadwal & Sesi KBM)
  const guruProduktifList: GuruProduktifItem[] = useMemo(() => {
    return kaprogStatsData?.guruProduktif || [];
  }, [kaprogStatsData]);

  // Sarana & Lab Bengkel Jurusan
  const saranaCounts = useMemo(() => {
    if (kaprogStatsData?.saranaBengkel) {
      return {
        total: kaprogStatsData.saranaBengkel.totalAlat || 0,
        dipinjam: kaprogStatsData.saranaBengkel.dipinjam || 0,
        rusak: kaprogStatsData.saranaBengkel.rusak || 0,
      };
    }
    return { total: 0, dipinjam: 0, rusak: 0 };
  }, [kaprogStatsData]);

  const saranaList: SaranaItem[] = useMemo(() => {
    return kaprogStatsData?.saranaBengkel?.items || [];
  }, [kaprogStatsData]);

  // Aktivitas Terbaru Jurusan (Log Cerdas)
  const recentActivities = useMemo(() => {
    const list: Array<{ id: string | number; title: string; desc: string; time: string }> = [];
    if (tpStatus.pendingMitra > 0) {
      list.push({
        id: 'act-tp',
        title: `${tpStatus.pendingMitra} Industri Perlu Rumusan TP`,
        desc: 'Tujuan Pembelajaran belum dirumuskan untuk penilaian semester ini',
        time: 'Penting',
      });
    }
    if (atRiskStudents.length > 0) {
      list.push({
        id: 'act-presensi',
        title: `${atRiskStudents.length} Siswa Terdeteksi Presensi Kurang`,
        desc: 'Akumulasi alfa & keterlambatan di atas batas toleransi',
        time: 'Hari Ini',
      });
    }
    list.push({
      id: 'act-kbm',
      title: 'Supervisi Pembelajaran Praktik Kejuruan',
      desc: `${guruProduktifList.length} Guru Produktif terdata mengajar di bengkel & lab`,
      time: 'Terkini',
    });
    return list;
  }, [tpStatus, atRiskStudents, guruProduktifList]);

  // Agenda Hari Ini
  const agendaHariIni = useMemo(() => {
    return [
      { jam: '07:15 - 09:30', agenda: 'Supervisi KBM Praktik Bengkel & Lab', tipe: 'KBM' },
      { jam: '10:00 - 11:30', agenda: 'Koordinasi Penempatan PKL Gelombang 2', tipe: 'HUBIN' },
      { jam: '13:00 - 14:30', agenda: 'Verifikasi Kesiapan Uji Kompetensi Keahlian', tipe: 'UKK' },
    ];
  }, []);

  // Tabs Navigation Definition
  const navTabs: NavTabItem[] = useMemo(
    () => [
      { id: 'beranda', label: 'Ringkasan', icon: LayoutDashboard },
      {
        id: 'pkl',
        label: 'PKL & Industri',
        icon: Briefcase,
        badge: tpStatus.pendingMitra > 0 ? tpStatus.pendingMitra : undefined,
      },
      {
        id: 'kehadiran',
        label: 'Presensi Rombel',
        icon: CalendarCheck,
        badge: atRiskStudents.length > 0 ? atRiskStudents.length : undefined,
      },
      { id: 'guru', label: 'Guru Produktif', icon: Users },
      {
        id: 'sarana',
        label: 'Sarana & Lab',
        icon: Wrench,
        badge: saranaCounts.rusak > 0 ? saranaCounts.rusak : undefined,
      },
    ],
    [tpStatus.pendingMitra, atRiskStudents.length, saranaCounts.rusak]
  );

  // Mutation: Simpan Deskripsi TP Inline
  const saveTpMutation = useMutation({
    mutationFn: (payload: { mitra_id: string; jurusan_id?: string; deskripsi_tp: string }) =>
      hubinApi.upsertSettingDeskripsiPkl({
        mitra_id: payload.mitra_id,
        deskripsi_tp: payload.deskripsi_tp,
        jurusan_id: payload.jurusan_id || resolvedJurusan?.id,
      }),
    onSuccess: () => {
      toast.success('Deskripsi Tujuan Pembelajaran berhasil disimpan');
      setActiveEditingSlot(null);
      queryClient.invalidateQueries({ queryKey: ['kaprog-pkl-summary'] });
      queryClient.invalidateQueries({ queryKey: ['kaprog-stats'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      const msg = err.response?.data?.message || 'Gagal menyimpan deskripsi TP';
      toast.error(msg);
    },
  });

  // Mutation: Hapus Deskripsi TP
  const deleteTpMutation = useMutation({
    mutationFn: (savedId: string) => hubinApi.deleteSettingDeskripsiPkl(savedId),
    onSuccess: () => {
      toast.success('Deskripsi TP berhasil dihapus');
      setActiveEditingSlot(null);
      queryClient.invalidateQueries({ queryKey: ['kaprog-pkl-summary'] });
      queryClient.invalidateQueries({ queryKey: ['kaprog-stats'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      const msg = err.response?.data?.message || 'Gagal menghapus deskripsi TP';
      toast.error(msg);
    },
  });

  // Handlers dibungkus useCallback (Pilar 3: Optimasi DOM Churn)
  const handleTabSelect = useCallback((tabId: KaprogTabId) => {
    setActiveTab(tabId);
  }, []);

  const handleRefresh = useCallback(() => {
    refetchPkl();
    refetchStats();
  }, [refetchPkl, refetchStats]);

  const handleSelectEditingSlot = useCallback((slot: EditingMitraSlot) => {
    setActiveEditingSlot(slot);
  }, []);

  const handleCloseEditingSlot = useCallback(() => {
    setActiveEditingSlot(null);
  }, []);

  const handleSelectGuru = useCallback((guru: GuruProduktifItem) => {
    setSelectedGuruPenugasan(guru);
  }, []);

  const handleCloseGuruModal = useCallback(() => {
    setSelectedGuruPenugasan(null);
  }, []);

  const handleNavigateToSesi = useCallback(() => {
    setSelectedGuruPenugasan(null);
    navigate('/attendance/sesi');
  }, [navigate]);

  const handleSaveTp = useCallback(
    (payload: { mitra_id: string; jurusan_id?: string; deskripsi_tp: string }) => {
      saveTpMutation.mutate(payload);
    },
    [saveTpMutation]
  );

  const handleDeleteTp = useCallback(
    (savedId: string) => {
      deleteTpMutation.mutate(savedId);
    },
    [deleteTpMutation]
  );

  const isLoadingTotal = pklLoading && statsLoading;

  return (
    <div className="w-full max-w-full min-w-0 space-y-5">
      {/* 1. Header Info Jurusan & Academic Context Scoping Bar (Pilar 21 Standard) */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm tracking-tight shrink-0">
            {resolvedJurusan?.singkatan || 'TKJ'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Dashboard Program Keahlian {resolvedJurusan?.nama || 'Kejuruan'}
              </h1>
              <Badge variant="outline" className="text-[10px] font-semibold">
                KAPROG VIEW
              </Badge>
              {!academic.isAcademicActive && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                  ARSIP PERIODE LAMPAU
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tahun Ajaran {academic.activeYear?.tahun || konteksAkademik?.tahunPelajaran?.tahun || '2026/2027'} &bull; Semester {academic.activeSemester?.nama_semester || konteksAkademik?.semester?.nama || 'Ganjil'} &bull; {kelasKehadiranList.length} Rombel Kejuruan
            </p>
          </div>
        </div>

        {/* Bilah Konteks Akademik & Tombol Aksi */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <AcademicContextBar
            tahunPelajaranId={academic.selectedTahunPelajaran}
            semesterId={academic.selectedSemester}
            onTahunPelajaranChange={academic.handleTpChange}
            onSemesterChange={academic.handleSemesterChange}
            tpOptions={academic.tpOptions}
            semesterOptions={academic.semesterOptions}
            isLoadingTp={academic.isLoadingTp}
            isLoadingSem={academic.isLoadingSem}
            variant="toolbar"
            className="w-full sm:w-auto"
          />

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={pklFetching || statsLoading}
              className="text-xs h-9 px-2.5 gap-1.5"
              title="Sinkronisasi ulang data"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', (pklFetching || statsLoading) && 'animate-spin')} />
              <span className="hidden sm:inline">Sinkron</span>
            </Button>

            <Button
              size="sm"
              onClick={() => navigate('/hubin/nilai-pkl?tab=deskripsi')}
              className="text-xs h-9 px-3 gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-xs"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Formulasi TP PKL</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Alert Strips (Dismissible) */}
      <AnimatePresence>
        {tpStatus.pendingMitra > 0 && !dismissedAlerts['tp-alert'] && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-semibold">Perhatian Kurikulum:</span>
                <span>
                  Terdapat {tpStatus.pendingMitra} industri mitra PKL yang belum dirumuskan Tujuan Pembelajaran (TP).
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleTabSelect('pkl')}
                  className="font-bold underline hover:text-amber-900 dark:hover:text-amber-100 cursor-pointer"
                >
                  Buka PKL
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedAlerts((prev) => ({ ...prev, 'tp-alert': true }))}
                  className="p-1 hover:bg-amber-500/20 rounded-md transition-colors text-amber-700 dark:text-amber-400"
                  aria-label="Tutup notifikasi"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {atRiskStudents.length > 0 && !dismissedAlerts['presensi-alert'] && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="font-semibold">Flag Presensi:</span>
                <span>
                  {atRiskStudents.length} siswa jurusan terdeteksi alfa &gt; 3 hari / kehadiran di bawah 85%.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleTabSelect('kehadiran')}
                  className="font-bold underline hover:text-rose-900 dark:hover:text-rose-100 cursor-pointer"
                >
                  Tinjau Siswa
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedAlerts((prev) => ({ ...prev, 'presensi-alert': true }))}
                  className="p-1 hover:bg-rose-500/20 rounded-md transition-colors text-rose-700 dark:text-rose-400"
                  aria-label="Tutup notifikasi"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Mobile Nav Pill Row (Top on < lg, hidden on desktop) */}
      <div className="flex lg:hidden overflow-x-auto gap-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs no-scrollbar">
        {(navTabs || [])?.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabSelect(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0',
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                    isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Desktop 3-Column Layout (>= lg: Left Nav Pill + Center Main Content + Right Side Summary) */}
      <div className="grid grid-cols-1 lg:grid-cols-[180px_minmax(0,1fr)_260px] gap-6 items-start">
        {/* Left Column: Nav Pill (Desktop sticky) */}
        <aside className="hidden lg:block sticky top-20">
          <nav className="p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
            {(navTabs || [])?.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabSelect(tab.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left',
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge !== undefined && (
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded-full text-[10px] font-mono',
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 font-bold'
                      )}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Center Column: Main Content */}
        <main className="min-w-0">
          {isLoadingTotal ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader size="md" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Memuat data operasional kejuruan...
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === 'beranda' && (
                  <KaprogBerandaTab
                    penilaianStatus={penilaianStatus}
                    tpStatus={tpStatus}
                    kaprogStatsData={kaprogStatsData}
                    recentActivities={recentActivities}
                    agendaHariIni={agendaHariIni}
                  />
                )}
                {activeTab === 'pkl' && (
                  <KaprogPklTab
                    penilaianStatus={penilaianStatus}
                    tpStatus={tpStatus}
                    mitraFilter={mitraFilter}
                    setMitraFilter={setMitraFilter}
                    filteredMitraList={filteredMitraList}
                    onSelectEditingSlot={handleSelectEditingSlot}
                  />
                )}
                {activeTab === 'kehadiran' && (
                  <KaprogKehadiranTab
                    kelasKehadiranList={kelasKehadiranList}
                    atRiskStudents={atRiskStudents}
                    pelanggaranList={pelanggaranList}
                    jurusanId={resolvedJurusan?.id}
                    jurusanNama={resolvedJurusan?.nama || 'Kejuruan'}
                    tahunPelajaranId={academic.selectedTahunPelajaran}
                    semesterId={academic.selectedSemester}
                  />
                )}
                {activeTab === 'guru' && (
                  <KaprogGuruTab
                    guruProduktifList={guruProduktifList}
                    resolvedJurusan={resolvedJurusan}
                    onSelectGuru={handleSelectGuru}
                  />
                )}
                {activeTab === 'sarana' && (
                  <KaprogSaranaTab
                    saranaCounts={saranaCounts}
                    saranaList={saranaList}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        {/* Right Column: Side Summary Strip (Desktop >= lg) */}
        <aside className="hidden lg:block sticky top-20">
          <KaprogSideSummary
            agendaHariIni={agendaHariIni}
            tpStatus={tpStatus}
          />
        </aside>
      </div>

      {/* 5. Floating Modal Formulasi TP PKL */}
      {activeEditingSlot && (
        <PklDeskripsiTpModal
          isOpen={!!activeEditingSlot}
          onClose={handleCloseEditingSlot}
          slot={activeEditingSlot}
          kaprogJurusan={resolvedJurusan}
          onSave={handleSaveTp}
          onDelete={handleDeleteTp}
          isSaving={saveTpMutation.isPending}
          isDeleting={deleteTpMutation.isPending}
        />
      )}

      {/* 6. Floating Modal Guru Penugasan & Kontak Cepat */}
      {selectedGuruPenugasan && (
        <KaprogGuruDetailModal
          guru={selectedGuruPenugasan}
          onClose={handleCloseGuruModal}
          onNavigateToSesi={handleNavigateToSesi}
        />
      )}
    </div>
  );
};

export default KaprogDashboard;
