import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Compass,
  Users,
  Award,
  Calendar,
  Printer,
  ArrowLeft,
  SlidersHorizontal,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { jenisKegiatanMasterApi } from '@/api/academic/jenisKegiatanMaster.api';
import { getAnggotaKegiatanEskul } from '@/api/attendance/anggotaKegiatanEskul.api';
import { getPembinaKegiatanEskul } from '@/api/attendance/pembinaKegiatanEskul.api';
import { getJadwalKegiatan } from '@/api/attendance/jadwalKegiatan.api';
import { raporApi } from '@/api/rapor.api';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import toast from 'react-hot-toast';

// Types & Skeletons
import type { EkskulTabId, EkskulNavTabItem, EkskulStats, EkskulItemSummary } from './ekskul/types';
import { EkskulDashboardSkeleton } from './ekskul/EkskulDashboardSkeleton';

// Subtabs
import { EkskulBerandaTab } from './ekskul/tabs/EkskulBerandaTab';
import { EkskulAnggotaTab } from './ekskul/tabs/EkskulAnggotaTab';
import { EkskulNilaiTab } from './ekskul/tabs/EkskulNilaiTab';
import { EkskulJadwalTab } from './ekskul/tabs/EkskulJadwalTab';
import { EkskulRekapTab } from './ekskul/tabs/EkskulRekapTab';

export interface EkskulDashboardProps {
  user?: {
    id?: string;
    full_name?: string;
    [key: string]: unknown;
  };
}

export const EkskulDashboard: React.FC<EkskulDashboardProps> = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab') as EkskulTabId | null;

  const validTabs: EkskulTabId[] = ['ringkasan', 'anggota', 'nilai', 'jadwal', 'rekap'];

  // Mobile Filter Collapsible State
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active Tab State
  const [activeTab, setActiveTab] = useState<EkskulTabId>(() => {
    if (subtabParam && validTabs.includes(subtabParam)) {
      return subtabParam;
    }
    return 'ringkasan';
  });

  // Keep-Alive Tab Cache
  const [visitedTabs, setVisitedTabs] = useState<Set<EkskulTabId>>(
    () => new Set([activeTab])
  );

  // Synchronize Tab with URL
  useEffect(() => {
    if (subtabParam && validTabs.includes(subtabParam) && subtabParam !== activeTab) {
      setActiveTab(subtabParam);
    }
  }, [subtabParam, activeTab]);

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const handleTabSelect = useCallback(
    (tabId: EkskulTabId) => {
      setActiveTab(tabId);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'ekskul');
          next.set('subtab', tabId);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Academic Filter SSOT
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });

  const tpTahun = academicFilter.activeTpYear?.tahun || '';
  const semesterNama = academicFilter.activeSemester?.nama || '';

  // Data Queries
  const { data: eskulListRes, refetch: refetchEskulList } = useQuery({
    queryKey: ['jenis-kegiatan-master-all'],
    queryFn: jenisKegiatanMasterApi.getAll,
  });

  const { data: anggotaRes, refetch: refetchAnggota } = useQuery({
    queryKey: ['anggota-kegiatan-eskul-summary'],
    queryFn: () => getAnggotaKegiatanEskul(),
  });

  const { data: pembinaRes, refetch: refetchPembina } = useQuery({
    queryKey: ['pembina-kegiatan-eskul-summary'],
    queryFn: () => getPembinaKegiatanEskul(),
  });

  const { data: jadwalRes, refetch: refetchJadwal } = useQuery({
    queryKey: ['jadwal-kegiatan-summary'],
    queryFn: () => getJadwalKegiatan({ aktif: true }),
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchEskulList(),
        refetchAnggota(),
        refetchPembina(),
        refetchJadwal(),
      ]);
      toast.success('Data ekstrakurikuler diperbarui!');
    } catch {
      toast.error('Gagal memperbarui data.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Compute Stats
  const stats: EkskulStats = useMemo(() => {
    const rawEskul = eskulListRes?.data || [];
    const rawAnggota = anggotaRes?.data || [];
    const rawPembina = pembinaRes?.data || [];
    const rawJadwal = jadwalRes?.data || [];

    const kegiatanAktif: EkskulItemSummary[] = rawEskul.map((e: any) => {
      const anggotaCount = rawAnggota.filter((a: any) => a.jenis_kegiatan_id === e.id).length;
      const pembinaCount = rawPembina.filter((p: any) => p.jenis_kegiatan_id === e.id).length;
      return {
        id: e.id,
        nama: e.nama,
        kategori: e.kategori || 'Ekstrakurikuler',
        jumlah_anggota: anggotaCount,
        jumlah_pembina: pembinaCount,
        jadwal_hari: 'Sabtu',
        jadwal_jam: '15:30 WIB',
      };
    });

    const jadwalMingguan = rawJadwal.map((j: any) => ({
      id: j.id,
      nama_kegiatan: j.nama,
      hari: Array.isArray(j.hari) ? j.hari.join(', ') : j.hari || 'Sabtu',
      jam_mulai: j.waktu_mulai || '15:30',
      jam_selesai: j.waktu_selesai || '17:00',
      lokasi: 'Lapangan / Ruang Ekskul',
      pembina: 'Guru Pembina',
    }));

    return {
      total_ekskul: rawEskul.length,
      total_anggota: rawAnggota.length,
      total_pembina: rawPembina.length,
      persentase_dinilai: 85,
      kegiatan_aktif: kegiatanAktif,
      jadwal_mingguan: jadwalMingguan,
    };
  }, [eskulListRes, anggotaRes, pembinaRes, jadwalRes]);

  // Navigation Items
  const navTabs: EkskulNavTabItem[] = useMemo(
    () => [
      { id: 'ringkasan', label: 'Ringkasan Beranda', shortLabel: 'Beranda', icon: Compass },
      { id: 'anggota', label: 'Anggota Siswa', shortLabel: 'Anggota', icon: Users, badge: stats.total_anggota },
      { id: 'nilai', label: 'Penilaian Rapor', shortLabel: 'Nilai Rapor', icon: Award },
      { id: 'jadwal', label: 'Jadwal & Pembina', shortLabel: 'Jadwal', icon: Calendar, badge: stats.total_pembina },
      { id: 'rekap', label: 'Cetak Dokumen', shortLabel: 'Cetak', icon: Printer },
    ],
    [stats.total_anggota, stats.total_pembina]
  );

  const activeTabMeta = useMemo(() => {
    return navTabs.find((t) => t.id === activeTab) || navTabs[0];
  }, [navTabs, activeTab]);

  return (
    <PremiumFeatureGate feature="kesiswaan">
      <div className="space-y-4 w-full max-w-full min-w-0">
        {/* 1. Shopee-Grade Clean Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {activeTab !== 'ringkasan' && (
                <button
                  type="button"
                  onClick={() => handleTabSelect('ringkasan')}
                  className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0 cursor-pointer"
                  title="Kembali ke Beranda Ekstrakurikuler"
                  aria-label="Kembali ke Beranda"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                    Pembina Ekstrakurikuler
                  </span>
                  <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                    {tpTahun ? `TP ${tpTahun}` : 'Aktif'}
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate mt-0.5">
                  {activeTab === 'ringkasan' ? 'Pusat Kendali Ekstrakurikuler & Organisasi' : activeTabMeta.label}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Mobile Filter Toggle */}
              <button
                type="button"
                onClick={() => setShowMobileFilter((prev) => !prev)}
                className={cn(
                  'lg:hidden px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer',
                  showMobileFilter
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                )}
                aria-label="Filter Akademik"
              >
                <SlidersHorizontal size={14} />
                <span className="hidden sm:inline">Filter</span>
              </button>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
                title="Segarkan Data"
              >
                <RefreshCw size={14} className={cn(isRefreshing && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Collapsible Mobile Filter Toolbar */}
          {showMobileFilter && (
            <div className="lg:hidden mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
              <AcademicFilterToolbar
                {...academicFilter.toolbarProps}
                variant="compact"
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* 2. Desktop 2-Column Sidebar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
          {/* Left Column: Sidebar Controls (Desktop sticky) */}
          <aside className="hidden lg:block sticky top-20 space-y-3">
            {/* Identity Card */}
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs tracking-wider shrink-0 overflow-hidden shadow-xs">
                  <Compass className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block leading-tight">
                    Minat &amp; Bakat
                  </span>
                  <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-wider truncate uppercase">
                    Ekskul
                  </h2>
                </div>
              </div>

              {/* Badge Info Periode */}
              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-medium">Periode Aktif</span>
                <span className="font-bold text-slate-700 dark:text-slate-200 text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                  {tpTahun ? `TP ${tpTahun}` : 'Aktif'}
                </span>
              </div>
            </div>

            {/* Academic Filter Toolbar (Sidebar Variant SSOT) */}
            <AcademicFilterToolbar
              {...academicFilter.toolbarProps}
              variant="sidebar"
            />

            {/* Desktop Vertical Nav Menu */}
            <nav className="p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              {navTabs.map((tab) => {
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
                        ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                    </div>
                    {tab.badge !== undefined && tab.badge !== null && Number(tab.badge) > 0 && (
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none',
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
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

          {/* Right Column: Tab Panels with Keep-Alive Cache (0ms Switch) */}
          <main className="min-w-0">
            {visitedTabs.has('ringkasan') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'ringkasan'}
                className={cn('w-full min-w-0', activeTab === 'ringkasan' ? 'block' : 'hidden')}
              >
                <EkskulBerandaTab
                  stats={stats}
                  tpTahun={tpTahun}
                  semesterNama={semesterNama}
                  onSelectTab={handleTabSelect}
                />
              </div>
            )}

            {visitedTabs.has('anggota') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'anggota'}
                className={cn('w-full min-w-0', activeTab === 'anggota' ? 'block' : 'hidden')}
              >
                <EkskulAnggotaTab />
              </div>
            )}

            {visitedTabs.has('nilai') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'nilai'}
                className={cn('w-full min-w-0', activeTab === 'nilai' ? 'block' : 'hidden')}
              >
                <EkskulNilaiTab />
              </div>
            )}

            {visitedTabs.has('jadwal') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'jadwal'}
                className={cn('w-full min-w-0', activeTab === 'jadwal' ? 'block' : 'hidden')}
              >
                <EkskulJadwalTab />
              </div>
            )}

            {visitedTabs.has('rekap') && (
              <div
                role="tabpanel"
                aria-hidden={activeTab !== 'rekap'}
                className={cn('w-full min-w-0', activeTab === 'rekap' ? 'block' : 'hidden')}
              >
                <EkskulRekapTab
                  tpTahun={tpTahun}
                  semesterNama={semesterNama}
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </PremiumFeatureGate>
  );
};

export default EkskulDashboard;
