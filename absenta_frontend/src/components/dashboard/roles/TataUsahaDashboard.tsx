import React, { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  ArrowLeftRight,
  Award,
  FileSpreadsheet,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Loader } from '@/components/ui';
import { useAcademicFilter } from '@/components/common/academic-filter';
import { useAuthStore } from '@/store/authStore';
import { getTuStats } from '@/api/dashboard.api';
import { TuBerandaTab } from './tu/tabs/TuBerandaTab';
import type { TuTabId, TuNavTabItem, TuStatsData } from './tu/types';

// Code-splitting Universal Views (Pilar 21B & TBT Optimization)
const BukuIndukView = lazy(() =>
  import('@/components/academic/buku-induk/BukuIndukView').then((m) => ({ default: m.BukuIndukView }))
);
const SuratKeteranganView = lazy(() =>
  import('@/components/correspondence/surat-keterangan/SuratKeteranganView').then((m) => ({
    default: m.SuratKeteranganView,
  }))
);
const MutasiSiswaView = lazy(() =>
  import('@/components/correspondence/mutasi/MutasiSiswaView').then((m) => ({ default: m.MutasiSiswaView }))
);
const BastIjazahView = lazy(() =>
  import('@/components/correspondence/bast-ijazah/BastIjazahView').then((m) => ({ default: m.BastIjazahView }))
);
const DknView = lazy(() =>
  import('@/components/correspondence/dkn/DknView').then((m) => ({ default: m.DknView }))
);

// Modals untuk 1-click Action Center dari Beranda
const SuratKeteranganModal = lazy(() =>
  import('@/components/correspondence/surat-keterangan/SuratKeteranganModal').then((m) => ({
    default: m.SuratKeteranganModal,
  }))
);
const MutasiKeluarModal = lazy(() =>
  import('@/components/correspondence/mutasi/MutasiKeluarModal').then((m) => ({ default: m.MutasiKeluarModal }))
);
const BastIjazahModal = lazy(() =>
  import('@/components/correspondence/bast-ijazah/BastIjazahModal').then((m) => ({ default: m.BastIjazahModal }))
);
const DknPrintModal = lazy(() =>
  import('@/components/correspondence/dkn/DknPrintModal').then((m) => ({ default: m.DknPrintModal }))
);

export interface TataUsahaDashboardProps {
  user?: any;
}

export const TataUsahaDashboard: React.FC<TataUsahaDashboardProps> = ({ user: propUser }) => {
  const { user: authUser } = useAuthStore();
  const currentUser = propUser || authUser;

  const [searchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab') as TuTabId | null;

  // Active Tab State
  const [activeTab, setActiveTab] = useState<TuTabId>(() => {
    if (
      subtabParam &&
      ['beranda', 'buku-induk', 'surat-keterangan', 'mutasi', 'bast-ijazah', 'dkn'].includes(subtabParam)
    ) {
      return subtabParam;
    }
    return 'beranda';
  });

  // Keep-Alive Cache: Catat tab yang pernah dibuka agar TIDAK DIHANCURKAN saat switch tab (Instant 0ms Switch)
  const [visitedTabs, setVisitedTabs] = useState<Set<TuTabId>>(() => new Set([activeTab]));

  useEffect(() => {
    if (
      subtabParam &&
      ['beranda', 'buku-induk', 'surat-keterangan', 'mutasi', 'bast-ijazah', 'dkn'].includes(subtabParam)
    ) {
      setActiveTab((curr) => (curr !== subtabParam ? subtabParam : curr));
      setVisitedTabs((prev) => (prev.has(subtabParam) ? prev : new Set(prev).add(subtabParam)));
    }
  }, [subtabParam]);

  const handleSelectTab = (tabId: TuTabId) => {
    setActiveTab(tabId);
    setVisitedTabs((prev) => (prev.has(tabId) ? prev : new Set(prev).add(tabId)));
  };

  // Floating Modals State (1-Click Action Center)
  const [isSuratKetModalOpen, setIsSuratKetModalOpen] = useState(false);
  const [isMutasiModalOpen, setIsMutasiModalOpen] = useState(false);
  const [isBastModalOpen, setIsBastModalOpen] = useState(false);
  const [isDknModalOpen, setIsDknModalOpen] = useState(false);

  // Konteks Akademik Standard Platform
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });

  const activeTpId = academicFilter.values.tahunPelajaranId;
  const activeSemesterId = academicFilter.values.semesterId;

  // Query Data Statistik TU Terpadu
  const { data: statsResponse } = useQuery({
    queryKey: ['tu-dashboard-stats', { activeTpId, activeSemesterId }],
    queryFn: () =>
      getTuStats({
        tahun_pelajaran_id: activeTpId,
        semester_id: activeSemesterId,
      }),
  });

  const tuStats: TuStatsData = statsResponse?.data || {};

  // Definisi Navigasi Tabs TU
  const navTabs: TuNavTabItem[] = useMemo(
    () => [
      { id: 'beranda', label: 'Ringkasan TU', icon: LayoutDashboard },
      { id: 'buku-induk', label: 'Buku Induk & Klapper', icon: BookOpen },
      { id: 'surat-keterangan', label: 'Layanan Surat Keterangan', icon: FileText },
      { id: 'mutasi', label: 'Dokumen Mutasi Siswa', icon: ArrowLeftRight },
      { id: 'bast-ijazah', label: 'Bebas Adm & BAST Ijazah', icon: Award },
      { id: 'dkn', label: 'DKN & Arsip Kelulusan', icon: FileSpreadsheet },
    ],
    []
  );

  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  const userName = currentUser?.name || currentUser?.full_name || 'Staf Tata Usaha';
  const userRole = currentUser?.role?.name || currentUser?.jabatan || 'Koordinator Tata Usaha';

  return (
    <div className="space-y-6">
      {/* ─── 1. HEADER BANNER: IDENTITAS & KONTEKS OPERASIONAL TU (MIRROR KAPROGDASHBOARD) ─── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-lg relative overflow-hidden">
        {/* Background glow & subtle accent */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            {/* Avatar Profile */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-xl sm:text-2xl text-white shadow-inner shrink-0">
              {userName.substring(0, 2).toUpperCase()}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  <Building2 className="w-3.5 h-3.5" /> Unit Tata Usaha & Kearsipan
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <CheckCircle2 className="w-3 h-3" /> Sistem Aktif
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">{userName}</h1>
              <p className="text-xs sm:text-sm text-blue-200/90 font-medium">
                {userRole} &bull; Administrasi Sekolah Terpadu (Permendiknas No. 24/2008)
              </p>
            </div>
          </div>

          {/* Konteks Akademik & Tanggal Operasional */}
          <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 text-xs">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/15">
              <Calendar className="w-3.5 h-3.5 text-blue-300" />
              <span className="font-semibold text-white">
                TP {academicFilter.selectedTpNama || '2025/2026'} &bull; {academicFilter.selectedSemNama || 'Semester Ganjil'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-200/80 text-[11px] px-1">
              <Clock className="w-3 h-3" />
              <span>{todayStr}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. SUBTAB NAVIGATION (HORIZONTAL SCROLLABLE WITH ICONS & BADGES) ─── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectTab(tab.id)}
              className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── 3. TAB PANES (KEEP-ALIVE CACHING PATTERN) ─── */}
      {/* TAB 1: BERANDA COMMAND CENTER */}
      {visitedTabs.has('beranda') && (
        <div className={activeTab === 'beranda' ? 'block animate-in fade-in duration-100' : 'hidden'}>
          <TuBerandaTab
            stats={tuStats}
            onSelectTab={handleSelectTab}
            onOpenSuratKeterangan={() => setIsSuratKetModalOpen(true)}
            onOpenMutasi={() => setIsMutasiModalOpen(true)}
            onOpenBastIjazah={() => setIsBastModalOpen(true)}
            onOpenDknPrint={() => setIsDknModalOpen(true)}
          />
        </div>
      )}

      {/* TAB 2: BUKU INDUK & KLAPPER */}
      {visitedTabs.has('buku-induk') && (
        <div className={activeTab === 'buku-induk' ? 'block animate-in fade-in duration-100' : 'hidden'}>
          <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
            <BukuIndukView hideLayout={true} />
          </Suspense>
        </div>
      )}

      {/* TAB 3: SURAT KETERANGAN */}
      {visitedTabs.has('surat-keterangan') && (
        <div className={activeTab === 'surat-keterangan' ? 'block animate-in fade-in duration-100' : 'hidden'}>
          <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
            <SuratKeteranganView hideLayout={true} />
          </Suspense>
        </div>
      )}

      {/* TAB 4: DOKUMEN MUTASI SISWA */}
      {visitedTabs.has('mutasi') && (
        <div className={activeTab === 'mutasi' ? 'block animate-in fade-in duration-100' : 'hidden'}>
          <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
            <MutasiSiswaView hideLayout={true} />
          </Suspense>
        </div>
      )}

      {/* TAB 5: BAST IJAZAH & CLEARANCE */}
      {visitedTabs.has('bast-ijazah') && (
        <div className={activeTab === 'bast-ijazah' ? 'block animate-in fade-in duration-100' : 'hidden'}>
          <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
            <BastIjazahView hideLayout={true} />
          </Suspense>
        </div>
      )}

      {/* TAB 6: DKN & ARSIP KELULUSAN */}
      {visitedTabs.has('dkn') && (
        <div className={activeTab === 'dkn' ? 'block animate-in fade-in duration-100' : 'hidden'}>
          <Suspense fallback={<div className="py-20 flex justify-center"><Loader /></div>}>
            <DknView hideLayout={true} />
          </Suspense>
        </div>
      )}

      {/* ─── FLOATING MODALS (1-CLICK DARI BERANDA) ─── */}
      {isSuratKetModalOpen && (
        <Suspense fallback={null}>
          <SuratKeteranganModal
            isOpen={isSuratKetModalOpen}
            onClose={() => setIsSuratKetModalOpen(false)}
          />
        </Suspense>
      )}

      {isMutasiModalOpen && (
        <Suspense fallback={null}>
          <MutasiKeluarModal
            isOpen={isMutasiModalOpen}
            onClose={() => setIsMutasiModalOpen(false)}
          />
        </Suspense>
      )}

      {isBastModalOpen && (
        <Suspense fallback={null}>
          <BastIjazahModal
            isOpen={isBastModalOpen}
            onClose={() => setIsBastModalOpen(false)}
            siswaId=""
          />
        </Suspense>
      )}

      {isDknModalOpen && (
        <Suspense fallback={null}>
          <DknPrintModal
            isOpen={isDknModalOpen}
            onClose={() => setIsDknModalOpen(false)}
            tahunPelajaran={academicFilter.selectedTpNama}
          />
        </Suspense>
      )}
    </div>
  );
};

export default TataUsahaDashboard;
