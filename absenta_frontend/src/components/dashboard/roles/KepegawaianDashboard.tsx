import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  CalendarCheck, 
  Clock, 
  Award, 
  GraduationCap, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Briefcase, 
  ArrowRight, 
  RefreshCw, 
  Search, 
  ExternalLink, 
  UserCheck, 
  Building2, 
  AlertCircle,
  FileCheck,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  UserX,
  HeartHandshake
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button, Badge, Loader } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getKepegawaianStats } from '@/api/dashboard.api';
import toast from 'react-hot-toast';

// ============================================================================
// 1. INTERFACES & TYPES
// ============================================================================

export type KepegawaianTabId = 'beranda' | 'ptk' | 'dapodik' | 'karir' | 'vokasi';

export interface KepegawaianDashboardProps {
  user?: any;
}

interface NavTabItem {
  id: KepegawaianTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

// ============================================================================
// 2. MAIN COMPONENT
// ============================================================================

export const KepegawaianDashboard: React.FC<KepegawaianDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<KepegawaianTabId>('beranda');
  const [searchPtk, setSearchPtk] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterJenis, setFilterJenis] = useState<string>('ALL');

  // TanStack Query untuk Mengambil Data Statistik Kepegawaian
  const { 
    data: statsRes, 
    isLoading, 
    isFetching, 
    refetch 
  } = useQuery({
    queryKey: ['kepegawaian-dashboard-stats'],
    queryFn: () => getKepegawaianStats(),
    staleTime: 60 * 1000,
  });

  const stats = statsRes?.data || null;
  const summary = stats?.summary || {
    totalPtk: 0,
    guruPendidikCount: 0,
    tenagaKependidikanCount: 0,
    pnsCount: 0,
    pppkCount: 0,
    gtyCount: 0,
    honorerCount: 0,
    sertifikasiCount: 0,
    asesorCount: 0,
    nuptkCount: 0,
    persenKehadiran: 0
  };

  const presensiHariIni = stats?.presensiHariIni || {
    hadir: 0,
    izin: 0,
    sakit: 0,
    cuti: 0,
    dinasLuar: 0,
    belumPresensi: 0,
    total: 0
  };

  const bebanAjar = stats?.bebanAjarDapodik || {
    memenuhiJamCount: 0,
    kurangJamCount: 0,
    kurangJamList: [],
    totalGuruEvaluated: 0
  };

  const urgentAlerts = stats?.urgentAlerts || {
    pendingIzinCount: 0,
    kurangJamCount: 0,
    mendekatiPensiunCount: 0,
    tanpaNuptkCount: 0
  };

  const ptkList: any[] = stats?.ptkList || [];
  const mendekatiPensiunList: any[] = stats?.mendekatiPensiunList || [];
  const recentIzinRequests: any[] = stats?.recentIzinRequests || [];

  // Filter PTK
  const filteredPtkList = useMemo(() => {
    return ptkList.filter(item => {
      const matchSearch = 
        item.nama?.toLowerCase().includes(searchPtk.toLowerCase()) ||
        item.nip?.toLowerCase().includes(searchPtk.toLowerCase()) ||
        item.nuptk?.toLowerCase().includes(searchPtk.toLowerCase());

      const matchStatus = filterStatus === 'ALL' || item.statusKepegawaian?.toUpperCase().includes(filterStatus);
      const matchJenis = filterJenis === 'ALL' || item.jenisPtk === filterJenis;

      return matchSearch && matchStatus && matchJenis;
    });
  }, [ptkList, searchPtk, filterStatus, filterJenis]);

  const handleSync = async () => {
    try {
      await refetch();
      toast.success('Data Kepegawaian & Dapodik berhasil diperbarui!');
    } catch {
      toast.error('Gagal memperbarui data statistik');
    }
  };

  // Nav Tabs Config
  const navTabs: NavTabItem[] = [
    { id: 'beranda', label: 'Ringkasan & Presensi', icon: Users },
    { id: 'ptk', label: 'Buku Induk PTK', icon: FileText, badge: summary.totalPtk || undefined },
    { id: 'dapodik', label: 'Beban 24 JP & Dapodik', icon: Clock, badge: urgentAlerts.kurangJamCount > 0 ? `${urgentAlerts.kurangJamCount} Kurang` : undefined },
    { id: 'karir', label: 'KGB & Pensiun', icon: Award, badge: urgentAlerts.mendekatiPensiunCount > 0 ? `${urgentAlerts.mendekatiPensiunCount} BUP` : undefined },
    { id: 'vokasi', label: 'Vokasi & Asesor LSP', icon: GraduationCap, badge: summary.asesorCount || undefined },
  ];

  // ============================================================================
  // RENDER: ZONE 1 - HEADER & STATS BAR
  // ============================================================================
  const renderHeader = () => {
    const todayStr = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());

    return (
      <div className="w-full max-w-full min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-violet-600/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  Dashboard TU Kepegawaian & Dapodik
                </h1>
                <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300">
                  SMK Vokasi
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Pemantauan Administrasi PTK, Beban Kerja Guru, Jenjang Karir, dan Sertifikasi Vokasi • {todayStr}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isFetching}
              className="text-xs font-medium"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isFetching && "animate-spin")} />
              {isFetching ? 'Menyinkronkan...' : 'Sinkron Data'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/academic/guru')}
              className="text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white"
            >
              Kelola Master Guru
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <span className="text-xs text-slate-500 dark:text-slate-400">Total PTK Aktif</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-slate-900 dark:text-white">{summary.totalPtk}</span>
              <span className="text-xs text-slate-500">({summary.guruPendidikCount} Guru, {summary.tenagaKependidikanCount} Tendik)</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <span className="text-xs text-slate-500 dark:text-slate-400">Kehadiran Hari Ini</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{summary.persenKehadiran}%</span>
              <span className="text-xs text-slate-500">({presensiHariIni.hadir} Hadir, {presensiHariIni.izin + presensiHariIni.sakit + presensiHariIni.cuti} Izin)</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <span className="text-xs text-slate-500 dark:text-slate-400">Kepatuhan Beban 24 JP</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-slate-900 dark:text-white">{bebanAjar.memenuhiJamCount}</span>
              <span className="text-xs text-amber-600 dark:text-amber-400">({bebanAjar.kurangJamCount} Kurang JP)</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <span className="text-xs text-slate-500 dark:text-slate-400">Asesor & Sertifikasi Guru</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-violet-600 dark:text-violet-400">{summary.asesorCount}</span>
              <span className="text-xs text-slate-500">Asesor LSP ({summary.sertifikasiCount} Gr. Pendidik)</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: ZONE 2 - SUB-NAV TABS
  // ============================================================================
  const renderNavTabs = () => {
    return (
      <div className="w-full max-w-full min-w-0 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all",
                  isActive
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-500")} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
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
    );
  };

  // ============================================================================
  // RENDER: TAB 1 - BERANDA & PRESENSI STRIP
  // ============================================================================
  const renderBerandaTab = () => {
    return (
      <div className="space-y-6">
        {/* Urgent Action Alerts */}
        {(urgentAlerts.kurangJamCount > 0 || urgentAlerts.pendingIzinCount > 0 || urgentAlerts.mendekatiPensiunCount > 0) && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pusat Tindakan & Perhatian Khusus (Urgent Alerts)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {urgentAlerts.kurangJamCount > 0 && (
                <div 
                  onClick={() => setActiveTab('dapodik')}
                  className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/40 cursor-pointer hover:shadow-sm transition-all flex items-start gap-3"
                >
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                      {urgentAlerts.kurangJamCount} Guru Kurang dari 24 JP
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                      Berisiko membuat SKTP / Tunjangan Sertifikasi di Info GTK tidak valid. Klik untuk audit ekuivalensi.
                    </p>
                  </div>
                </div>
              )}

              {urgentAlerts.pendingIzinCount > 0 && (
                <div 
                  onClick={() => navigate('/attendance/guru')}
                  className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-900/40 cursor-pointer hover:shadow-sm transition-all flex items-start gap-3"
                >
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                      {urgentAlerts.pendingIzinCount} Pengajuan Izin/Cuti Menunggu
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                      Ada permohonan cuti / tugas luar yang menunggu verifikasi dan surat tugas.
                    </p>
                  </div>
                </div>
              )}

              {urgentAlerts.mendekatiPensiunCount > 0 && (
                <div 
                  onClick={() => setActiveTab('karir')}
                  className="p-4 rounded-xl border border-rose-200 bg-rose-50/60 dark:bg-rose-950/20 dark:border-rose-900/40 cursor-pointer hover:shadow-sm transition-all flex items-start gap-3"
                >
                  <Award className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                      {urgentAlerts.mendekatiPensiunCount} PTK Mendekati Usia Pensiun
                    </div>
                    <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                      Batas usia pensiun (BUP) dalam waktu dekat. Perlu persiapan regenerasi & berkas Taspen/Dapodik.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Action Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Pintasan Aksi Cepat Kepegawaian
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => navigate('/attendance/guru')}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-violet-400 dark:hover:border-violet-500 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div className="font-semibold text-sm text-slate-900 dark:text-white">Rekap Absensi PTK</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Verifikasi presensi bulanan untuk pelaporan/gaji</p>
            </button>

            <button
              onClick={() => navigate('/academic/struktur-organisasi')}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-violet-400 dark:hover:border-violet-500 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="font-semibold text-sm text-slate-900 dark:text-white">SK Tugas Tambahan</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Plotting SK Kaprog, Walas, Piket & Pembimbing PKL</p>
            </button>

            <button
              onClick={() => setActiveTab('dapodik')}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-violet-400 dark:hover:border-violet-500 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <div className="font-semibold text-sm text-slate-900 dark:text-white">Audit Jam Mengajar</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cek beban tatap muka minimal 24 JP Dapodik</p>
            </button>

            <button
              onClick={() => setActiveTab('vokasi')}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-violet-400 dark:hover:border-violet-500 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="font-semibold text-sm text-slate-900 dark:text-white">Vokasi & Asesor LSP</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Data sertifikasi BNSP & magang industri guru</p>
            </button>
          </div>
        </div>

        {/* Live Presensi PTK Hari Ini */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Status Presensi Hari Ini</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Monitoring absensi real-time guru & staf tata usaha</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/attendance/guru')}
              className="text-xs"
            >
              Lihat Log Presensi Lengkap
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl text-center">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Hadir</span>
              <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">{presensiHariIni.hadir}</div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-xl text-center">
              <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 uppercase">Dinas Luar</span>
              <div className="text-2xl font-bold text-blue-800 dark:text-blue-300 mt-0.5">{presensiHariIni.dinasLuar}</div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl text-center">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase">Izin</span>
              <div className="text-2xl font-bold text-amber-800 dark:text-amber-300 mt-0.5">{presensiHariIni.izin}</div>
            </div>

            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30 rounded-xl text-center">
              <span className="text-[11px] font-semibold text-yellow-700 dark:text-yellow-400 uppercase">Sakit</span>
              <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-300 mt-0.5">{presensiHariIni.sakit}</div>
            </div>

            <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/30 rounded-xl text-center">
              <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 uppercase">Cuti</span>
              <div className="text-2xl font-bold text-purple-800 dark:text-purple-300 mt-0.5">{presensiHariIni.cuti}</div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase">Belum Absen</span>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-0.5">{presensiHariIni.belumPresensi}</div>
            </div>
          </div>
        </div>

        {/* Komposisi Status Kepegawaian */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Distribusi Status Kepegawaian</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">PNS (Pegawai Negeri Sipil)</span>
                <span className="font-bold text-slate-900 dark:text-white">{summary.pnsCount} Orang</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full" 
                  style={{ width: `${summary.totalPtk > 0 ? (summary.pnsCount / summary.totalPtk) * 100 : 0}%` }} 
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-medium text-slate-700 dark:text-slate-300">PPPK (Pegawai Pemerintah dg Perjanjian Kerja)</span>
                <span className="font-bold text-slate-900 dark:text-white">{summary.pppkCount} Orang</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-600 h-full rounded-full" 
                  style={{ width: `${summary.totalPtk > 0 ? (summary.pppkCount / summary.totalPtk) * 100 : 0}%` }} 
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-medium text-slate-700 dark:text-slate-300">GTY / PTY (Guru & Pegawai Tetap Yayasan)</span>
                <span className="font-bold text-slate-900 dark:text-white">{summary.gtyCount} Orang</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-violet-600 h-full rounded-full" 
                  style={{ width: `${summary.totalPtk > 0 ? (summary.gtyCount / summary.totalPtk) * 100 : 0}%` }} 
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-medium text-slate-700 dark:text-slate-300">Guru Honorer / Kontrak Provinsi</span>
                <span className="font-bold text-slate-900 dark:text-white">{summary.honorerCount} Orang</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full" 
                  style={{ width: `${summary.totalPtk > 0 ? (summary.honorerCount / summary.totalPtk) * 100 : 0}%` }} 
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Permohonan Izin / Cuti Terbaru</h3>
            {recentIzinRequests.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Tidak ada permohonan izin/cuti yang pending verifikasi.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentIzinRequests.map((req: any) => (
                  <div key={req.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">{req.guruNama}</div>
                      <div className="text-[11px] text-slate-500 truncate">{req.alasan || 'Tidak ada keterangan'}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold shrink-0">
                      {req.tipeIzin}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/attendance/guru')}
              className="w-full text-xs"
            >
              Buka Modul Pengajuan Izin
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: TAB 2 - BUKU INDUK PTK
  // ============================================================================
  const renderPtkTab = () => {
    return (
      <div className="space-y-4">
        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Nama, NIP, atau NUPTK..."
              value={searchPtk}
              onChange={(e) => setSearchPtk(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="ALL">Semua Status</option>
              <option value="PNS">PNS</option>
              <option value="PPPK">PPPK</option>
              <option value="TETAP">GTY / Yayasan</option>
              <option value="HONOR">Honorer / Kontrak</option>
            </select>

            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="ALL">Semua Jenis PTK</option>
              <option value="PENDIDIK">Guru Pendidik</option>
              <option value="TENAGA_KEPENDIDIKAN">Tenaga Kependidikan</option>
            </select>
          </div>
        </div>

        {/* Data List PTK */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Nama PTK & NIP</th>
                  <th className="py-3 px-4">Jenis & Status</th>
                  <th className="py-3 px-4">NUPTK & Ijazah</th>
                  <th className="py-3 px-4">Jabatan Pokok</th>
                  <th className="py-3 px-4 text-center">Beban JP</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredPtkList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Tidak ada data PTK yang sesuai kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredPtkList.map((ptk) => (
                    <tr key={ptk.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white text-xs">{ptk.nama}</div>
                        <div className="text-[11px] text-slate-400">NIP: {ptk.nip}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px] font-semibold mb-0.5">
                          {ptk.statusKepegawaian}
                        </Badge>
                        <div className="text-[10px] text-slate-400">{ptk.jenisPtk}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-900 dark:text-white font-mono text-[11px]">{ptk.nuptk}</div>
                        <div className="text-[10px] text-slate-400">{ptk.pendidikan}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-900 dark:text-white text-xs">{ptk.jabatan}</div>
                        {ptk.isAsesor && (
                          <Badge variant="outline" className="text-[9px] bg-violet-50 text-violet-700 border-violet-200 mt-0.5">
                            Asesor LSP
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn(
                          "font-bold text-xs px-2 py-0.5 rounded-md",
                          ptk.totalJamKumulatif >= 24
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        )}>
                          {ptk.totalJamKumulatif} JP
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/academic/guru')}
                          className="text-[11px] h-7 px-2.5"
                        >
                          Detail
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: TAB 3 - BEBAN 24 JP & AUDIT DAPODIK
  // ============================================================================
  const renderDapodikTab = () => {
    return (
      <div className="space-y-6">
        <div className="bg-amber-500/10 border border-amber-300/40 dark:border-amber-700/40 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-900 dark:text-amber-200 text-base">
                Standar Beban Kerja Guru Permendikbudristek No. 31/2024
              </h3>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-1">
                Guru wajib memenuhi minimal 24 jam tatap muka/minggu untuk kelayakan Tunjangan Profesi Guru (TPG) di Info GTK.
                Kekurangan jam tatap muka dapat diekuivalensikan dengan tugas tambahan struktural atau pembimbingan vokasi.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/academic/struktur-organisasi')}
            className="text-xs bg-white dark:bg-slate-900 shrink-0"
          >
            Plot Tugas Tambahan
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>

        {/* Tabel Guru Kurang Jam */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                Daftar Guru dengan Beban Ajar &lt; 24 Jam ({bebanAjar.kurangJamCount} Guru Terdeteksi)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Prioritaskan penambahan jadwal KBM atau tugas ekuivalensi (Waka/Kaprog: 12 JP, Walas: 2 JP, Piket: 1 JP)
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Nama Guru</th>
                  <th className="py-2.5 px-3">Mata Pelajaran</th>
                  <th className="py-2.5 px-3 text-center">Jam Tatap Muka</th>
                  <th className="py-2.5 px-3 text-center">Ekuivalensi</th>
                  <th className="py-2.5 px-3 text-center">Total JP</th>
                  <th className="py-2.5 px-3 text-center">Kekurangan</th>
                  <th className="py-2.5 px-3">Rekomendasi Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {bebanAjar.kurangJamList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-emerald-600 font-semibold">
                      Luar biasa! Seluruh guru telah memenuhi kuota minimal 24 JP tatap muka & ekuivalensi.
                    </td>
                  </tr>
                ) : (
                  bebanAjar.kurangJamList.map((g: any) => (
                    <tr key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {g.nama}
                        <div className="text-[10px] text-slate-400">{g.status}</div>
                      </td>
                      <td className="py-2.5 px-3">{g.mapel}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{g.totalJp} JP</td>
                      <td className="py-2.5 px-3 text-center font-mono text-violet-600">+{g.ekuivalensiJp} JP</td>
                      <td className="py-2.5 px-3 text-center font-bold text-amber-600">{g.totalJamKumulatif} JP</td>
                      <td className="py-2.5 px-3 text-center font-bold text-rose-600">-{g.selisihKurang} JP</td>
                      <td className="py-2.5 px-3">
                        <span className="text-[11px] text-slate-500">
                          {g.selisihKurang <= 2 
                            ? 'Beri tugas Wali Kelas (+2 JP) atau Piket (+1 JP)'
                            : 'Tambahkan jam paralel atau tugas pembimbing PKL'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: TAB 4 - TRACKER KGB & PENSIUN
  // ============================================================================
  const renderKarirTab = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tracker Batas Usia Pensiun */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-rose-600" />
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">
                  Monitoring Batas Usia Pensiun (BUP)
                </h4>
                <p className="text-xs text-slate-500">Regulasi: Guru 60 Tahun, Tenaga Kependidikan 58 Tahun</p>
              </div>
            </div>

            {mendekatiPensiunList.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Tidak ada PTK yang mendekati batas usia pensiun dalam waktu dekat.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {mendekatiPensiunList.map((item: any) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-white">{item.nama}</div>
                      <div className="text-[11px] text-slate-500">{item.jabatan} • Usia: {item.usia} Thn (BUP: {item.bupLimit})</div>
                    </div>
                    <Badge variant="outline" className="text-rose-600 border-rose-300 bg-rose-50 dark:bg-rose-950/40 text-[10px]">
                      Sisa &le; {item.sisaTahun} Thn
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pedoman Kenaikan Gaji Berkala (KGB) & Pangkat */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <FileCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">
                  Kenaikan Gaji Berkala (KGB)
                </h4>
                <p className="text-xs text-slate-500">Otomatisasi siklus 2 tahunan berdasarkan TMT SK Terakhir</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="font-semibold text-slate-900 dark:text-white">Alur Pengurusan KGB Sekolah:</div>
              <ul className="list-disc pl-4 space-y-1">
                <li>Pemeriksaan berkas SK Pangkat/KGB terakhir minimal 2 bulan sebelum jatuh tempo.</li>
                <li>Penarikan DP3 / Sasaran Kinerja Pegawai (SKP) dengan predikat minimal Baik.</li>
                <li>Penerbitan Surat Pemberitahuan Kenaikan Gaji Berkala ke Dinas Pendidikan / BPKAD.</li>
              </ul>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/academic/guru')}
              className="w-full text-xs"
            >
              Kelola Riwayat SK & Pangkat PTK
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: TAB 5 - VOKASI & ASESOR LSP KHUSUS SMK
  // ============================================================================
  const renderVokasiTab = () => {
    return (
      <div className="space-y-6">
        <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900/40 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <GraduationCap className="w-6 h-6 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-violet-900 dark:text-violet-200 text-base">
                Standar Kemitraan Vokasi & Asesor LSP SMK
              </h3>
              <p className="text-xs text-violet-800/80 dark:text-violet-300/80 mt-1">
                Karakteristik utama SMK adalah sertifikasi kejuruan guru (Asesor BNSP) dan pemenuhan magang industri guru di DUDI.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/hubin/mitra')}
            className="text-xs bg-violet-600 hover:bg-violet-700 text-white shrink-0"
          >
            Buka Mitra DUDI & Hubin
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <span className="text-xs text-slate-500">Guru Bersertifikat Asesor LSP</span>
            <div className="text-2xl font-bold text-violet-600 mt-1">{summary.asesorCount} Orang</div>
            <p className="text-[11px] text-slate-400 mt-1">Memiliki lisensi aktif BNSP untuk menguji UKK</p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <span className="text-xs text-slate-500">Guru Bersertifikat Pendidik (Gr.)</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{summary.sertifikasiCount} Orang</div>
            <p className="text-[11px] text-slate-400 mt-1">Kelayakan menerima Tunjangan Profesi Guru (TPG)</p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <span className="text-xs text-slate-500">Kelengkapan NUPTK Valid</span>
            <div className="text-2xl font-bold text-blue-600 mt-1">{summary.nuptkCount} / {summary.totalPtk}</div>
            <p className="text-[11px] text-slate-400 mt-1">{summary.totalPtk - summary.nuptkCount} PTK belum memiliki NUPTK</p>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: SIDE SUMMARY PANEL (DESKTOP)
  // ============================================================================
  const renderSideSummary = () => {
    return (
      <div className="w-full space-y-4">
        {/* Ringkasan Konteks Dapodik */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-violet-600" />
            <span>Kesiapan Info GTK</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Sinkron Terakhir:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Hari ini</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Status Validasi:</span>
              <span className="font-semibold text-emerald-600">Siap Audit</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Guru Tertampung 24 JP:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{bebanAjar.memenuhiJamCount} Guru</span>
            </div>
          </div>
        </div>

        {/* Bantuan & Regulasi Kepegawaian */}
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2 text-xs text-slate-500">
          <div className="font-semibold text-slate-900 dark:text-white">Standar Regulasi TU:</div>
          <p className="text-[11px] leading-relaxed">
            Permendiknas No. 24/2008 & PP No. 94/2021 tentang Administrasi TAS Kepegawaian & Disiplin Pegawai.
          </p>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RETURN
  // ============================================================================
  if (isLoading) {
    return (
      <div className="w-full space-y-6 py-6">
        <div className="h-28 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-80 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 space-y-6 pb-12">
      {/* Zone 1: Header */}
      {renderHeader()}

      {/* Zone 2: Sub-Nav Tabs */}
      {renderNavTabs()}

      {/* Zone 3: Main Dynamic Content + Contextual Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="lg:col-span-3 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'beranda' && renderBerandaTab()}
              {activeTab === 'ptk' && renderPtkTab()}
              {activeTab === 'dapodik' && renderDapodikTab()}
              {activeTab === 'karir' && renderKarirTab()}
              {activeTab === 'vokasi' && renderVokasiTab()}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="lg:col-span-1 min-w-0">
          {renderSideSummary()}
        </div>
      </div>
    </div>
  );
};
