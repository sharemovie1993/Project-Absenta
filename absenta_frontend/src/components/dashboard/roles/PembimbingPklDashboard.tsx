import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase, Users, Clock, Calendar, CalendarCheck, Award, Printer,
  ArrowLeft, SlidersHorizontal, RefreshCw, Building2, CheckCircle2, ChevronRight, UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { hubinApi, type SiswaPkl } from '@/api/hubin.api';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { Badge, Button } from '@/components/ui';
import toast from 'react-hot-toast';

// Types & Skeletons
import type { PklTabId, PklNavTabItem, PklDashboardStats, SiswaBimbinganItem, KunjunganMonitoringItem } from './pembimbing-pkl/types';
import { PembimbingPklDashboardSkeleton } from './pembimbing-pkl/PembimbingPklDashboardSkeleton';

// Subtabs
import { PklRingkasanTab } from './pembimbing-pkl/tabs/PklRingkasanTab';
import { PklBimbinganTab } from './pembimbing-pkl/tabs/PklBimbinganTab';
import { PklJurnalTab } from './pembimbing-pkl/tabs/PklJurnalTab';
import { PklMonitoringTab } from './pembimbing-pkl/tabs/PklMonitoringTab';
import { PklPenilaianTab } from './pembimbing-pkl/tabs/PklPenilaianTab';
import { PklRekapTab } from './pembimbing-pkl/tabs/PklRekapTab';

const AbsensiPklView = lazy(() =>
  import('@/components/hubin/absensi/AbsensiPklView').then((m) => ({ default: m.AbsensiPklView }))
);

const SiswaBimbinganDetailModal = lazy(() =>
  import('@/components/hubin/SiswaBimbinganDetailModal').then((m) => ({ default: m.SiswaBimbinganDetailModal }))
);

export interface PembimbingPklDashboardProps {
  user?: {
    id?: string;
    full_name?: string;
    guru_profile?: {
      id?: string;
      nama_lengkap?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

export const PembimbingPklDashboard: React.FC<PembimbingPklDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab') as PklTabId | null;

  const validTabs: PklTabId[] = ['ringkasan', 'bimbingan', 'absensi', 'jurnal', 'monitoring', 'penilaian', 'rekap'];

  // Mobile Filter Collapsible State
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDetailSiswa, setSelectedDetailSiswa] = useState<SiswaBimbinganItem | null>(null);

  // Active Tab State
  const [activeTab, setActiveTab] = useState<PklTabId>(() => {
    if (subtabParam && validTabs.includes(subtabParam)) {
      return subtabParam;
    }
    return 'ringkasan';
  });

  // Keep-Alive Tab Cache
  const [visitedTabs, setVisitedTabs] = useState<Set<PklTabId>>(
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
    (tabId: PklTabId) => {
      setActiveTab(tabId);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'pembimbing_pkl');
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

  const tpId = academicFilter.activeTpYear?.id;
  const tpTahun = academicFilter.activeTpYear?.tahun || '';
  const semesterNama = (academicFilter.activeSemester as any)?.nama_semester || (academicFilter.activeSemester as any)?.nama || '';

  // Data Queries: Siswa Penempatan PKL untuk Pembimbing ini
  const guruId = user?.guru_profile?.id || user?.id;

  const { data: penempatanRes, isLoading, refetch: refetchPenempatan } = useQuery({
    queryKey: ['hubin-penempatan-pembimbing', guruId, tpId],
    queryFn: async () => {
      // Coba ambil penempatan spesifik pembimbing
      try {
        const res = await hubinApi.getPenempatan({
          pembimbing_id: guruId,
          tahun_pelajaran_id: tpId,
          limit: 100,
        });
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) return res.data;
      } catch {
        // Fallback to my penempatan
      }
      const myRes = await hubinApi.getMyPenempatan().catch(() => ({ data: [] }));
      const list = myRes?.data;
      if (Array.isArray(list) && list.length > 0) return list;
      
      // Fallback umum bila pembimbing admin / koordinator
      const allRes = await hubinApi.getPenempatan({ limit: 50 }).catch(() => ({ data: [] }));
      return allRes?.data || [];
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchPenempatan();
      toast.success('Data bimbingan PKL diperbarui!');
    } catch {
      toast.error('Gagal memperbarui data.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Compute Stats & Data Model
  const { stats, siswaList, kunjunganList } = useMemo(() => {
    const rawList: SiswaPkl[] = Array.isArray(penempatanRes)
      ? penempatanRes
      : (penempatanRes as any)?.data || [];

    const mappedSiswa: SiswaBimbinganItem[] = rawList.map((p) => {
      const s = p.Siswa || ({} as any);
      const m = p.Mitra || ({} as any);
      const k = p.kunjungan_json || [];

      return {
        id: p.id,
        siswa_id: p.siswa_id,
        nama_siswa: s.nama_siswa || 'Siswa PKL',
        nis: s.nis || '-',
        kelas: s.Kelas?.nama_kelas || 'Kelas XII',
        mitra_id: p.mitra_id,
        nama_mitra: m.nama || 'Mitra Industri DU/DI',
        alamat_mitra: m.alamat || '',
        kontak_mitra: s.no_hp || '',
        pembimbing_industri: p.Pembimbing?.nama_guru || 'Instruktur DU/DI',
        tanggal_mulai: p.tanggal_mulai || '2026-07-15',
        tanggal_selesai: p.tanggal_selesai || '2026-11-30',
        status: p.status || 'AKTIF',
        total_kehadiran: 45,
        jurnal_pending_count: p.jurnal_json?.status === 'MENUNGGU_REVIEW' ? 1 : 0,
        nilai_akhir: p.nilai_json?.nilai_akhir || null,
        predikat: p.nilai_json?.predikat || '',
      };
    });

    const uniqueMitra = new Set(mappedSiswa.map((s) => s.nama_mitra));
    const activeCount = mappedSiswa.filter((s) => s.status === 'AKTIF').length;
    const completedCount = mappedSiswa.filter((s) => s.status === 'SELESAI').length;

    const dummyVisits: KunjunganMonitoringItem[] = [
      {
        id: 'kunj-1',
        penempatan_id: mappedSiswa[0]?.id || '1',
        nama_mitra: mappedSiswa[0]?.nama_mitra || 'PT Telkom Indonesia',
        tanggal_kunjungan: '15 Okt 2026',
        tujuan: 'Monitoring Rutin',
        catatan_supervisi: 'Siswa aktif, koordinasi dengan mentor lapangan berjalan lancar.',
      },
    ];

    const computedStats: PklDashboardStats = {
      total_siswa_bimbingan: mappedSiswa.length,
      siswa_aktif: activeCount,
      siswa_selesai: completedCount,
      total_mitra_industri: uniqueMitra.size,
      jurnal_pending_review: mappedSiswa.filter((s) => (s.jurnal_pending_count || 0) > 0).length,
      total_kunjungan_terlaksana: 4,
      persentase_dinilai: 75,
      siswa_bimbingan_list: mappedSiswa,
      kunjungan_terbaru: dummyVisits,
    };

    return { stats: computedStats, siswaList: mappedSiswa, kunjunganList: dummyVisits };
  }, [penempatanRes]);

  // Navigation Items
  const navTabs: PklNavTabItem[] = useMemo(
    () => [
      { id: 'ringkasan', label: 'Ringkasan Beranda', shortLabel: 'Beranda', icon: Briefcase },
      { id: 'bimbingan', label: 'Siswa Bimbingan', shortLabel: 'Bimbingan', icon: Users, badge: stats.total_siswa_bimbingan },
      { id: 'absensi', label: 'Presensi Siswa', shortLabel: 'Presensi', icon: CalendarCheck },
      { id: 'jurnal', label: 'Verifikasi Jurnal', shortLabel: 'Jurnal', icon: Clock, badge: stats.jurnal_pending_review },
      { id: 'monitoring', label: 'Supervisi DU/DI', shortLabel: 'Supervisi', icon: Calendar },
      { id: 'penilaian', label: 'Penilaian Magang', shortLabel: 'Nilai', icon: Award },
      { id: 'rekap', label: 'Cetak Dokumen', shortLabel: 'Cetak', icon: Printer },
    ],
    [stats.total_siswa_bimbingan, stats.jurnal_pending_review]
  );

  const activeTabMeta = useMemo(() => {
    return navTabs.find((t) => t.id === activeTab) || navTabs[0];
  }, [navTabs, activeTab]);

  return (
    <PremiumFeatureGate feature="hubin">
      <div className="space-y-4 w-full max-w-full min-w-0">
        {/* 1. Shopee-Grade Clean Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard?tab=ringkasan')}
                className="lg:hidden p-1.5 h-8 w-8 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 shrink-0"
              >
                <ArrowLeft size={16} />
              </Button>
              <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Briefcase size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate">
                    Dashboard Pembimbing PKL
                  </h1>
                  <Badge variant="outline" className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
                    DU/DI &amp; Magang
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                  Monitoring Siswa Bimbingan, Logbook Jurnal &amp; Supervisi Industri
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMobileFilter(!showMobileFilter)}
                className="sm:hidden text-xs font-bold rounded-xl h-9 px-2.5"
              >
                <SlidersHorizontal size={14} className="mr-1 text-teal-600" />
                Filter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-xs font-bold rounded-xl h-9 px-3 gap-1.5"
              >
                <RefreshCw size={14} className={cn(isRefreshing && 'animate-spin text-teal-600')} />
                <span className="hidden sm:inline">Perbarui</span>
              </Button>
            </div>
          </div>

          {/* Academic Filter Toolbar */}
          <div className={cn('mt-3 pt-3 border-t border-slate-100 dark:border-slate-800', !showMobileFilter && 'hidden sm:block')}>
            <AcademicFilterToolbar {...academicFilter.toolbarProps} variant="compact" />
          </div>
        </div>

        {/* 2. Desktop 2-Column Sidebar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-4 sm:gap-5 items-start">
          {/* Left Sidebar (Desktop Only) */}
          <aside className="hidden lg:block sticky top-20 space-y-3.5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                  <UserCheck size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {user?.full_name || 'Guru Pembimbing'}
                  </h4>
                  <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold truncate">
                    Pembimbing PKL
                  </p>
                </div>
              </div>

              {/* Status Banner */}
              <div className="p-2.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/40 text-[11px] text-teal-900 dark:text-teal-300">
                <span className="font-bold block text-[10px] uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  Tahun Pelajaran
                </span>
                <span className="font-extrabold">{tpTahun || '2026/2027'}</span>
                <span className="text-[10px] text-teal-700/80 dark:text-teal-400/80 block mt-0.5">
                  {semesterNama || 'Semester Ganjil'}
                </span>
              </div>

              {/* Vertical Tab Navigation */}
              <nav className="space-y-1">
                {navTabs.map((tab) => {
                  const IconComp = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabSelect(tab.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left',
                        isActive
                          ? 'bg-teal-600 text-white shadow-xs font-black'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <IconComp size={16} className={cn(isActive ? 'text-white' : 'text-slate-400')} />
                        <span className="truncate">{tab.label}</span>
                      </div>
                      {typeof tab.badge === 'number' && tab.badge > 0 && (
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                            isActive ? 'bg-white/25 text-white' : 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
                          )}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Quick Shortcuts */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/hubin/mitra')}
                  className="w-full justify-start text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 h-8 px-2"
                >
                  <Building2 size={13} className="mr-2 text-slate-400" />
                  Katalog Mitra DU/DI
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard?tab=ringkasan')}
                  className="w-full justify-start text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 h-8 px-2"
                >
                  <ArrowLeft size={13} className="mr-2 text-slate-400" />
                  Kembali ke Portal Guru
                </Button>
              </div>
            </div>
          </aside>

          {/* Right Main Body (Keep-Alive Subtabs) */}
          <main className="min-w-0 flex-1 space-y-4">
            {isLoading ? (
              <PembimbingPklDashboardSkeleton />
            ) : (
              <>
                {/* 1. Ringkasan Beranda Tab */}
                {visitedTabs.has('ringkasan') && (
                  <div className={cn(activeTab === 'ringkasan' ? 'block' : 'hidden')}>
                    <PklRingkasanTab
                      stats={stats}
                      tpTahun={tpTahun}
                      semesterNama={semesterNama}
                      onSelectTab={handleTabSelect}
                      onOpenSiswaDetail={(s) => setSelectedDetailSiswa(s)}
                    />
                  </div>
                )}

                {/* 2. Siswa Bimbingan Tab */}
                {visitedTabs.has('bimbingan') && (
                  <div className={cn(activeTab === 'bimbingan' ? 'block' : 'hidden')}>
                    <PklBimbinganTab
                      guruId={guruId}
                      tahunPelajaranId={tpId}
                      semesterId={academicFilter.values.semesterId}
                      siswaList={siswaList}
                      onOpenSiswaDetail={(s) => setSelectedDetailSiswa(s)}
                      onOpenKunjunganModal={() => handleTabSelect('monitoring')}
                    />
                  </div>
                )}

                {/* 2b. Presensi Siswa Bimbingan (Verifikasi Harian & Rekap Matriks) */}
                {visitedTabs.has('absensi') && (
                  <div className={cn(activeTab === 'absensi' ? 'block' : 'hidden')}>
                    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Memuat presensi siswa bimbingan...</div>}>
                      <AbsensiPklView
                        guruId={guruId}
                        guruNama={user?.full_name || (user as any)?.name || user?.guru_profile?.nama_lengkap}
                        initialTpId={tpId}
                        hideLayout={true}
                        hideScopeBanner={true}
                        hideHeaderStats={true}
                        isModal={false}
                      />
                    </Suspense>
                  </div>
                )}

                {/* 3. Verifikasi Jurnal Tab */}
                {visitedTabs.has('jurnal') && (
                  <div className={cn(activeTab === 'jurnal' ? 'block' : 'hidden')}>
                    <PklJurnalTab siswaList={siswaList} />
                  </div>
                )}

                {/* 4. Supervisi DU/DI Tab */}
                {visitedTabs.has('monitoring') && (
                  <div className={cn(activeTab === 'monitoring' ? 'block' : 'hidden')}>
                    <PklMonitoringTab siswaList={siswaList} kunjunganList={kunjunganList} />
                  </div>
                )}

                {/* 5. Penilaian Magang Tab */}
                {visitedTabs.has('penilaian') && (
                  <div className={cn(activeTab === 'penilaian' ? 'block' : 'hidden')}>
                    <PklPenilaianTab
                      guruId={guruId}
                      tahunPelajaranId={tpId}
                      semesterId={academicFilter.values.semesterId}
                      siswaList={siswaList}
                    />
                  </div>
                )}

                {/* 6. Rekap & Cetak Tab */}
                {visitedTabs.has('rekap') && (
                  <div className={cn(activeTab === 'rekap' ? 'block' : 'hidden')}>
                    <PklRekapTab
                      siswaList={siswaList}
                      kunjunganList={kunjunganList}
                      tpTahun={tpTahun}
                      semesterNama={semesterNama}
                    />
                  </div>
                )}
              </>
            )}
          </main>
        </div>

        {/* Modal Drill-Down Detail Siswa */}
        {selectedDetailSiswa && (
          <Suspense fallback={null}>
            <SiswaBimbinganDetailModal
              isOpen={Boolean(selectedDetailSiswa)}
              onClose={() => setSelectedDetailSiswa(null)}
              siswaPklId={selectedDetailSiswa.id}
              canEdit={true}
            />
          </Suspense>
        )}
      </div>
    </PremiumFeatureGate>
  );
};
