import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard,
  GraduationCap,
  Briefcase, 
  CalendarCheck, 
  Users, 
  Wrench, 
  CheckCircle2, 
  ChevronRight,
  ClipboardList,
  Layers,
  Award,
  ShieldAlert
} from 'lucide-react';
import { Button, Badge, Loader } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { hubinApi } from '@/api/hubin.api';
import { getKaprogStats } from '@/api/dashboard.api';
import { useAuthStore } from '@/store/authStore';
import { PklDeskripsiTpModal, EditingMitraSlot } from '@/components/hubin/nilai-pkl/PklDeskripsiTpModal';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { PenempatanPklView } from '@/components/hubin/penempatan/PenempatanPklView';
import { KelasView } from '@/components/academic/kelas/KelasView';
import { NilaiPklView } from '@/components/hubin/nilai-pkl/NilaiPklView';
import { AbsensiPklView } from '@/components/hubin/absensi/AbsensiPklView';
import toast from 'react-hot-toast';

// Subkomponen Modular Ter-Hardening (Pilar 21B - God File Guard)
import { KaprogBerandaTab } from './kaprog/tabs/KaprogBerandaTab';
import { KaprogSiswaTab } from './kaprog/tabs/KaprogSiswaTab';
import { KaprogPklTab } from './kaprog/tabs/KaprogPklTab';
import { KaprogKehadiranTab } from './kaprog/tabs/KaprogKehadiranTab';
import { KaprogPelanggaranTab } from './kaprog/tabs/KaprogPelanggaranTab';
import { KaprogGuruTab } from './kaprog/tabs/KaprogGuruTab';
import { KaprogSaranaTab } from './kaprog/tabs/KaprogSaranaTab';
import { KaprogUkkTab } from './kaprog/tabs/KaprogUkkTab';
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

  const [searchParams, setSearchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab') as KaprogTabId | null;

  // Active Tab State (beranda | siswa | pkl | kehadiran | pelanggaran | guru | sarana | ukk)
  const [activeTab, setActiveTab] = useState<KaprogTabId>(() => {
    if (subtabParam && ['beranda', 'siswa', 'pkl', 'kehadiran', 'pelanggaran', 'guru', 'sarana', 'ukk'].includes(subtabParam)) {
      return subtabParam;
    }
    return 'beranda';
  });

  useEffect(() => {
    if (subtabParam && ['beranda', 'siswa', 'pkl', 'kehadiran', 'pelanggaran', 'guru', 'sarana', 'ukk'].includes(subtabParam)) {
      setActiveTab(subtabParam);
    }
  }, [subtabParam]);

  // Search filter inside PKL tab
  const [mitraFilter, setMitraFilter] = useState('');

  // Floating Modal state for inline TP Editing
  const [activeEditingSlot, setActiveEditingSlot] = useState<EditingMitraSlot | null>(null);

  // Floating Modal state for Guru Penugasan & Kontak
  const [selectedGuruPenugasan, setSelectedGuruPenugasan] = useState<GuruProduktifItem | null>(null);

  // Floating Modal state for Scoped PKL Plotting View
  const [isPlottingPklModalOpen, setIsPlottingPklModalOpen] = useState(false);

  const handleClosePlottingModal = useCallback(() => {
    setIsPlottingPklModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['kaprog-pkl-summary'] });
    queryClient.invalidateQueries({ queryKey: ['kaprog-stats'] });
  }, [queryClient]);

  // Floating Modal state for Scoped Struktur Kelas View
  const [isStrukturKelasModalOpen, setIsStrukturKelasModalOpen] = useState(false);

  const handleCloseStrukturKelasModal = useCallback(() => {
    setIsStrukturKelasModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['kaprog-stats'] });
    queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
  }, [queryClient]);

  // Floating Modal state for Scoped Rekap & Nilai PKL View
  const [isRekapNilaiModalOpen, setIsRekapNilaiModalOpen] = useState(false);

  const handleCloseRekapNilaiModal = useCallback(() => {
    setIsRekapNilaiModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['kaprog-pkl-summary'] });
    queryClient.invalidateQueries({ queryKey: ['kaprog-stats'] });
    queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
  }, [queryClient]);

  // Floating Modal state for Scoped Monitoring & Presensi PKL View
  const [isMonitoringPklModalOpen, setIsMonitoringPklModalOpen] = useState(false);

  const handleCloseMonitoringPklModal = useCallback(() => {
    setIsMonitoringPklModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['kaprog-pkl-summary'] });
    queryClient.invalidateQueries({ queryKey: ['kaprog-stats'] });
    queryClient.invalidateQueries({ queryKey: ['absensi-pkl-history'] });
  }, [queryClient]);

  // Konteks Akademik Standard Platform (useAcademicFilter SSOT)
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });

  const academic = useMemo(() => ({
    selectedTahunPelajaran: academicFilter.values.tahunPelajaranId,
    selectedSemester: academicFilter.values.semesterId,
    activeYear: academicFilter.activeTpYear,
    activeSemester: academicFilter.activeSemester,
    tpOptions: academicFilter.tpOptions,
    semesterOptions: academicFilter.semesterOptions,
    handleTpChange: academicFilter.handleTpChange,
    handleSemesterChange: academicFilter.setSemesterId,
    isLoadingTp: academicFilter.isLoadingTp,
    isLoadingSem: academicFilter.isLoadingSem,
  }), [academicFilter]);

  // --------------------------------------------------------------------------
  // Data Fetching: 1. PKL Summary (Dual-Layer Cache)
  // --------------------------------------------------------------------------
  const jurusanId = propJurusan?.id || (currentUser as { kaprog_jurusan?: { id?: string } })?.kaprog_jurusan?.id || undefined;

  const {
    data: pklSummaryRes,
    isLoading: pklLoading,
    isFetching: pklFetching,
  } = useQuery({
    queryKey: ['kaprog-pkl-summary', jurusanId, academic.selectedTahunPelajaran, academic.selectedSemester],
    queryFn: () => hubinApi.getKaprogSummary({
      jurusan_id: jurusanId,
      tahun_pelajaran_id: academic.selectedTahunPelajaran || undefined,
      semester_id: academic.selectedSemester || undefined,
    }).catch(() => null),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // --------------------------------------------------------------------------
  // Data Fetching: 2. Kaprog Role Stats (Scoped Real Data Engine - Auto-Sync)
  // --------------------------------------------------------------------------
  const {
    data: kaprogStatsRes,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ['kaprog-stats', jurusanId, academic.selectedTahunPelajaran, academic.selectedSemester],
    queryFn: () => getKaprogStats({
      jurusan_id: jurusanId,
      tahun_pelajaran_id: academic.selectedTahunPelajaran || undefined,
      semester_id: academic.selectedSemester || undefined,
    }).catch(() => null),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
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
      { id: 'siswa', label: 'Data Siswa', icon: GraduationCap },
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
      {
        id: 'pelanggaran',
        label: 'Pelanggaran Siswa',
        icon: ShieldAlert,
        badge: (pelanggaranList || []).length > 0 ? (pelanggaranList || []).length : undefined,
      },
      { id: 'guru', label: 'Guru Produktif', icon: Users },
      {
        id: 'sarana',
        label: 'Sarana & Lab',
        icon: Wrench,
        badge: saranaCounts.rusak > 0 ? saranaCounts.rusak : undefined,
      },
      {
        id: 'ukk',
        label: 'UKK & Sertifikasi',
        icon: Award,
      },
    ],
    [tpStatus.pendingMitra, atRiskStudents.length, (pelanggaranList || []).length, saranaCounts.rusak]
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
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tabId === 'beranda') {
        next.delete('subtab');
      } else {
        next.set('subtab', tabId);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

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
      {/* 1. Mobile Top Controls (< lg only: Identity + Action Buttons + Filter + Tab Pills) */}
      <div className="flex lg:hidden flex-col gap-3">
        {/* Mobile Identity Bar */}
        <div className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs tracking-wider shrink-0 overflow-hidden">
              {(resolvedJurusan as any)?.logo_url ? (
                <img 
                  src={(resolvedJurusan as any).logo_url} 
                  alt={resolvedJurusan?.nama || 'Logo Jurusan'} 
                  className="w-full h-full object-contain p-0.5"
                />
              ) : (
                resolvedJurusan?.singkatan?.toUpperCase() || 'KUL'
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-black text-slate-900 dark:text-slate-100 tracking-wider truncate uppercase">
                {resolvedJurusan?.nama || 'KULINER'}
              </h2>
            </div>
          </div>
        </div>

        {/* Mobile Academic Filter Toolbar */}
        <AcademicFilterToolbar
          {...academicFilter.toolbarProps}
          variant="compact"
          className="w-full"
        />

        {/* Mobile Nav Pill Row */}
        <div className="flex overflow-x-auto gap-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs no-scrollbar">
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
      </div>

      {/* 2. Desktop 2-Column Layout (>= lg: Left Sidebar Controls + Wide Main Content Canvas) */}
      <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
        {/* Left Column: Sidebar Controls (Desktop sticky) */}
        <aside className="hidden lg:block sticky top-20 space-y-3">
          {/* Identitas Jurusan Ringkas & Minimalis */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs tracking-wider shrink-0 overflow-hidden shadow-xs">
              {(resolvedJurusan as any)?.logo_url ? (
                <img 
                  src={(resolvedJurusan as any).logo_url} 
                  alt={resolvedJurusan?.nama || 'Logo Jurusan'} 
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                resolvedJurusan?.singkatan?.toUpperCase() || 'KUL'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-wider truncate uppercase">
                {resolvedJurusan?.nama || 'KULINER'}
              </h2>
            </div>
          </div>

          {/* Academic Filter Toolbar (Sidebar Variant SSOT) */}
          <AcademicFilterToolbar
            {...academicFilter.toolbarProps}
            variant="sidebar"
          />

          {/* Navigasi Menu Vertikal */}
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

        {/* Main Content Area */}
        <main className="min-w-0 space-y-4">
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
                    onOpenPenempatan={() => setIsPlottingPklModalOpen(true)}
                    onOpenStrukturKelas={() => setIsStrukturKelasModalOpen(true)}
                    onOpenRekapNilai={() => setIsRekapNilaiModalOpen(true)}
                    onOpenMonitoringPkl={() => setIsMonitoringPklModalOpen(true)}
                    onSelectTab={handleTabSelect}
                  />
                )}
                {activeTab === 'siswa' && (
                  <KaprogSiswaTab
                    jurusanId={resolvedJurusan?.id}
                    jurusanNama={resolvedJurusan?.nama || 'Kejuruan'}
                    kelasList={kelasKehadiranList}
                    tahunPelajaranId={academic.selectedTahunPelajaran}
                    semesterId={academic.selectedSemester}
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
                    onOpenPlottingModal={() => setIsPlottingPklModalOpen(true)}
                    onOpenRekapNilai={() => setIsRekapNilaiModalOpen(true)}
                    onOpenMonitoringPkl={() => setIsMonitoringPklModalOpen(true)}
                    jurusanNama={resolvedJurusan?.nama}
                  />
                )}
                {activeTab === 'kehadiran' && (
                  <KaprogKehadiranTab
                    kelasKehadiranList={kelasKehadiranList}
                    atRiskStudents={atRiskStudents}
                    jurusanId={resolvedJurusan?.id}
                    jurusanNama={resolvedJurusan?.nama || 'Kejuruan'}
                    tahunPelajaranId={academic.selectedTahunPelajaran}
                    semesterId={academic.selectedSemester}
                  />
                )}
                {activeTab === 'pelanggaran' && (
                  <KaprogPelanggaranTab
                    pelanggaranList={pelanggaranList}
                    jurusanId={resolvedJurusan?.id}
                    jurusanNama={resolvedJurusan?.nama || 'Kejuruan'}
                    kelasList={kelasKehadiranList}
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
                {activeTab === 'ukk' && (
                  <KaprogUkkTab
                    jurusanId={resolvedJurusan?.id}
                    jurusanNama={resolvedJurusan?.nama || 'Kejuruan'}
                    tahunPelajaranId={academic.selectedTahunPelajaran}
                    tahunAjaran={academic.activeYear}
                    semesterId={academic.selectedSemester}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
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

      {/* 7. Modal Reusable View: Plotting & Penempatan Siswa PKL Scoped Jurusan */}
      {isPlottingPklModalOpen && (
        <Modal
          isOpen={isPlottingPklModalOpen}
          onClose={handleClosePlottingModal}
          size="full"
          className="w-[98vw] max-w-[98vw] 2xl:max-w-[1720px]"
          title={
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Penempatan & Plotting Siswa PKL
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                    {resolvedJurusan?.nama || 'Kejuruan'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kelola penempatan siswa ke mitra industri, tunjuk pembimbing, dan pantau masa penempatan jurusan Anda.
                </p>
              </div>
            </div>
          }
        >
          <div className="p-4 sm:p-5 max-h-[85vh] overflow-y-auto">
            <PenempatanPklView
              isModal={true}
              jurusanId={resolvedJurusan?.id}
              jurusanNama={resolvedJurusan?.nama}
              initialTpId={academic.selectedTahunPelajaran}
              onClose={handleClosePlottingModal}
            />
          </div>
        </Modal>
      )}

      {/* 8. Modal Reusable View: Struktur Rombel & Kelas Belajar Scoped Jurusan */}
      {isStrukturKelasModalOpen && (
        <Modal
          isOpen={isStrukturKelasModalOpen}
          onClose={handleCloseStrukturKelasModal}
          size="full"
          className="w-[98vw] max-w-[98vw] 2xl:max-w-[1720px]"
          title={
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Struktur Rombel & Kelas Belajar
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                    {resolvedJurusan?.nama || 'Kejuruan'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Daftar rombel, penetapan wali kelas, dan struktur kelas khusus program keahlian Anda.
                </p>
              </div>
            </div>
          }
        >
          <div className="p-4 sm:p-5 max-h-[85vh] overflow-y-auto">
            <KelasView
              isModal={true}
              jurusanId={resolvedJurusan?.id}
              jurusanNama={resolvedJurusan?.nama}
              onClose={handleCloseStrukturKelasModal}
            />
          </div>
        </Modal>
      )}

      {/* 9. Modal Reusable View: Rekap & Entri Nilai PKL Scoped Jurusan */}
      {isRekapNilaiModalOpen && (
        <Modal
          isOpen={isRekapNilaiModalOpen}
          onClose={handleCloseRekapNilaiModal}
          size="full"
          className="w-[98vw] max-w-[98vw] 2xl:max-w-[1720px]"
          title={
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Rekapitulasi & Nilai Siswa PKL
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                    {resolvedJurusan?.nama || 'Kejuruan'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Rekap nilai industri, nilai sidang, presensi DUDI, dan sertifikasi khusus program keahlian Anda.
                </p>
              </div>
            </div>
          }
        >
          <div className="p-4 sm:p-5 max-h-[85vh] overflow-y-auto">
            <NilaiPklView
              isModal={true}
              jurusanId={resolvedJurusan?.id}
              jurusanNama={resolvedJurusan?.nama}
              tahunPelajaranId={academic.selectedTahunPelajaran}
              semesterId={academic.selectedSemester}
              onClose={handleCloseRekapNilaiModal}
            />
          </div>
        </Modal>
      )}

      {/* 10. Modal Reusable View: Monitoring & Presensi PKL Scoped Jurusan */}
      {isMonitoringPklModalOpen && (
        <Modal
          isOpen={isMonitoringPklModalOpen}
          onClose={handleCloseMonitoringPklModal}
          size="full"
          className="w-[98vw] max-w-[98vw] 2xl:max-w-[1720px]"
          title={
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Monitoring & Presensi Siswa PKL
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                    {resolvedJurusan?.nama || 'Kejuruan'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Monitoring kehadiran harian, jurnal kegiatan siswa, dan status verifikasi bimbingan PKL kejuruan.
                </p>
              </div>
            </div>
          }
        >
          <div className="p-4 sm:p-5 max-h-[85vh] overflow-y-auto">
            <AbsensiPklView
              isModal={true}
              jurusanId={resolvedJurusan?.id}
              jurusanNama={resolvedJurusan?.nama}
              initialTpId={academic.selectedTahunPelajaran}
              onClose={handleCloseMonitoringPklModal}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default KaprogDashboard;
