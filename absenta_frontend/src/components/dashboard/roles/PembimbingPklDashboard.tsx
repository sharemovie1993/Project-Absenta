import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase, Users, Clock, Calendar, CalendarCheck, Award, Printer,
  ArrowLeft, SlidersHorizontal, RefreshCw, Building2, CheckCircle2, ChevronRight, UserCheck, ShieldCheck,
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
import { extractLogbooksFromPenempatan, rejectLogbookAction, mapSiswaBimbingan } from './pembimbing-pkl/logbookUtils';

const AbsensiPklView = lazy(() =>
  import('@/components/hubin/absensi/AbsensiPklView').then((m) => ({ default: m.AbsensiPklView }))
);

const RekapAbsensiPklView = lazy(() =>
  import('@/components/hubin/absensi/RekapAbsensiPklView').then((m) => ({ default: m.RekapAbsensiPklView }))
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

  const validTabs: PklTabId[] = ['ringkasan', 'bimbingan', 'verifikasi_absensi', 'absensi', 'jurnal', 'monitoring', 'penilaian', 'rekap'];

  // Mobile Filter Collapsible State
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDetailSiswa, setSelectedDetailSiswa] = useState<SiswaBimbinganItem | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'presensi' | 'logbook'>('presensi');

  // Active Tab State
  const [activeTab, setActiveTab] = useState<PklTabId>(() => (subtabParam && validTabs.includes(subtabParam) ? subtabParam : 'ringkasan'));
  const [visitedTabs, setVisitedTabs] = useState<Set<PklTabId>>(() => new Set([activeTab]));

  // Synchronize Tab with URL & Keep-Alive Cache
  useEffect(() => {
    if (subtabParam && validTabs.includes(subtabParam) && subtabParam !== activeTab) setActiveTab(subtabParam);
  }, [subtabParam, activeTab]);

  useEffect(() => {
    setVisitedTabs((prev) => (prev.has(activeTab) ? prev : new Set(prev).add(activeTab)));
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
      try {
        const res = await hubinApi.getPenempatan({ pembimbing_id: guruId, tahun_pelajaran_id: tpId, limit: 100 });
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) return res.data;
      } catch { /* Fallback to my penempatan */ }
      const myRes = await hubinApi.getMyPenempatan().catch(() => ({ data: [] }));
      if (Array.isArray(myRes?.data) && myRes.data.length > 0) return myRes.data;
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
  const { stats, siswaList, logbookList, kunjunganList } = useMemo(() => {
    const rawList: SiswaPkl[] = Array.isArray(penempatanRes) ? penempatanRes : (penempatanRes as any)?.data || [];

    const mappedSiswa = mapSiswaBimbingan(rawList);

    const uniqueMitra = new Set(mappedSiswa.map((s) => s.nama_mitra));
    const activeCount = mappedSiswa.filter((s) => s.status === 'AKTIF').length;
    const completedCount = mappedSiswa.filter((s) => s.status === 'SELESAI').length;

    // Deduplikasi sesi supervisi fisik nyata (berdasarkan mitra, tanggal & tahap)
    const sessionMap = new Map<string, KunjunganMonitoringItem & { tanggal_iso: string }>();
    rawList.forEach((p) => {
      let list: any[] = [];
      if (Array.isArray(p.kunjungan_json)) list = p.kunjungan_json;
      else if (typeof p.kunjungan_json === 'string') {
        try { list = JSON.parse(p.kunjungan_json); } catch { list = []; }
      }
      list.forEach((k: any, idx: number) => {
        const mId = p.Mitra?.id || p.mitra_id || 'mitra';
        const dateKey = k.tanggal ? String(k.tanggal).slice(0, 16) : `visit-${idx}`;
        const tahapKey = k.tahap || 'MONITORING';
        const sessionKey = `${mId}_${dateKey}_${tahapKey}`;
        const studentName = p.Siswa?.nama_siswa || 'Siswa';

        if (!sessionMap.has(sessionKey)) {
          sessionMap.set(sessionKey, {
            id: k.id || sessionKey,
            penempatan_id: p.id,
            nama_mitra: p.Mitra?.nama || 'Mitra Industri DU/DI',
            tanggal_iso: k.tanggal || '',
            tanggal_kunjungan: k.tanggal
              ? new Date(k.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'Sesi Supervisi',
            tahap: tahapKey,
            tujuan: tahapKey,
            catatan_supervisi: k.catatan || 'Monitoring pelaksanaan PKL siswa.',
            total_siswa: 1,
            siswa_names: [studentName],
          });
        } else {
          const item = sessionMap.get(sessionKey)!;
          if (item.siswa_names && !item.siswa_names.includes(studentName)) {
            item.siswa_names.push(studentName);
            item.total_siswa = item.siswa_names.length;
          }
        }
      });
    });

    const uniqueVisitSessions: KunjunganMonitoringItem[] = Array.from(sessionMap.values())
      .sort((a, b) => new Date(b.tanggal_iso).getTime() - new Date(a.tanggal_iso).getTime());

    const pendingAbsensiCount = rawList.reduce((sum, p: any) => {
      const absList = p.AbsensiPkl || [];
      return sum + absList.filter((a: any) => !a.is_verified).length;
    }, 0);

    const realLogbooks = extractLogbooksFromPenempatan(rawList);

    const computedStats: PklDashboardStats = {
      total_siswa_bimbingan: mappedSiswa.length,
      siswa_aktif: activeCount,
      siswa_selesai: completedCount,
      total_mitra_industri: uniqueMitra.size,
      absensi_pending_verification: pendingAbsensiCount,
      jurnal_pending_review: realLogbooks.filter((l) => l.status_verifikasi === 'MENUNGGU_REVIEW').length,
      total_kunjungan_terlaksana: uniqueVisitSessions.length,
      persentase_dinilai: 75,
      siswa_bimbingan_list: mappedSiswa,
      kunjungan_terbaru: uniqueVisitSessions,
    };

    return { stats: computedStats, siswaList: mappedSiswa, logbookList: realLogbooks, kunjunganList: uniqueVisitSessions };
  }, [penempatanRes]);

  const selectedRawSiswa = useMemo(() => {
    if (!selectedDetailSiswa) return null;
    const rawList: SiswaPkl[] = Array.isArray(penempatanRes) ? penempatanRes : (penempatanRes as any)?.data || [];
    return rawList.find((r) => r.id === selectedDetailSiswa.id) || {
      id: selectedDetailSiswa.id,
      siswa_id: selectedDetailSiswa.siswa_id,
      Siswa: { id: selectedDetailSiswa.siswa_id, nama_siswa: selectedDetailSiswa.nama_siswa, nis: selectedDetailSiswa.nis, foto: (selectedDetailSiswa as any)?.foto, Kelas: { nama_kelas: selectedDetailSiswa.kelas } },
      Mitra: { id: selectedDetailSiswa.mitra_id, nama: selectedDetailSiswa.nama_mitra },
    };
  }, [selectedDetailSiswa, penempatanRes]);

  // Navigation Items
  const navTabs: PklNavTabItem[] = useMemo(
    () => [
      { id: 'ringkasan', label: 'Ringkasan Beranda', shortLabel: 'Beranda', icon: Briefcase },
      { id: 'bimbingan', label: 'Siswa Bimbingan', shortLabel: 'Bimbingan', icon: Users, badge: stats.total_siswa_bimbingan },
      { id: 'verifikasi_absensi', label: 'Verifikasi Absensi', shortLabel: 'Verif Absen', icon: ShieldCheck, badge: stats.absensi_pending_verification },
      { id: 'absensi', label: 'Rekap Presensi', shortLabel: 'Presensi', icon: CalendarCheck },
      { id: 'jurnal', label: 'Verifikasi Jurnal', shortLabel: 'Jurnal', icon: Clock, badge: stats.jurnal_pending_review },
      { id: 'monitoring', label: 'Supervisi DU/DI', shortLabel: 'Supervisi', icon: Calendar },
      { id: 'penilaian', label: 'Penilaian Magang', shortLabel: 'Nilai', icon: Award },
      { id: 'rekap', label: 'Cetak Dokumen', shortLabel: 'Cetak', icon: Printer },
    ],
    [stats.total_siswa_bimbingan, stats.absensi_pending_verification, stats.jurnal_pending_review]
  );

  const activeTabMeta = useMemo(() => {
    return navTabs.find((t) => t.id === activeTab) || navTabs[0];
  }, [navTabs, activeTab]);

  const handleApproveLogbook = useCallback(async (id: string) => {
    await hubinApi.verifyAbsensi(id);
    queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-pembimbing'] });
  }, [queryClient]);

  const handleRejectLogbook = useCallback(async (id: string, notes: string) => {
    const rawList: SiswaPkl[] = Array.isArray(penempatanRes) ? penempatanRes : (penempatanRes as any)?.data || [];
    await rejectLogbookAction(rawList, id, notes);
    queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-pembimbing'] });
  }, [penempatanRes, queryClient]);

  const handleBackNavigation = useCallback(() => {
    if (activeTab !== 'ringkasan') {
      handleTabSelect('ringkasan');
    } else {
      navigate('/dashboard?tab=ringkasan');
    }
  }, [activeTab, handleTabSelect, navigate]);

  return (
    <PremiumFeatureGate feature="hubin">
      <div className="space-y-4 w-full max-w-full min-w-0">
        {/* 1. Shopee-Grade Clean Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackNavigation}
                title={activeTab !== 'ringkasan' ? 'Kembali ke Ringkasan PKL' : 'Kembali ke Portal Guru'}
                className="lg:hidden p-1.5 h-8 w-8 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 shrink-0 cursor-pointer"
              >
                <ArrowLeft size={16} />
              </Button>
              {/* Ikon disembunyikan di mobile agar teks judul tampil penuh tanpa terpotong */}
              <div className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 items-center justify-center shrink-0">
                {activeTab === 'ringkasan' ? (
                  <Briefcase size={18} className="sm:w-5 sm:h-5" />
                ) : (
                  <activeTabMeta.icon size={18} className="sm:w-5 sm:h-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm sm:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate">
                    {activeTab === 'ringkasan' ? (
                      <>
                        <span className="hidden sm:inline">Dashboard </span>Pembimbing PKL
                      </>
                    ) : (
                      activeTabMeta.label
                    )}
                  </h1>
                  <Badge variant="outline" className="hidden sm:inline-flex text-[9px] sm:text-[10px] font-bold text-teal-600 dark:text-teal-400 px-1.5 py-0 shrink-0">
                    DU/DI
                  </Badge>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                  {activeTab === 'ringkasan' ? 'Monitoring Bimbingan & Supervisi Industri' : 'Pembimbing PKL'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMobileFilter(!showMobileFilter)}
                className="sm:hidden text-xs font-bold rounded-xl h-8 px-2"
                title="Filter Tahun Pelajaran / Semester"
              >
                <SlidersHorizontal size={13} className="mr-1 text-teal-600" />
                Filter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-xs font-bold rounded-xl h-8 px-2 sm:px-3 gap-1"
                title="Perbarui Data"
              >
                <RefreshCw size={13} className={cn(isRefreshing && 'animate-spin text-teal-600')} />
                <span className="hidden sm:inline">Perbarui</span>
              </Button>
            </div>
          </div>

          {/* Academic Filter Toolbar */}
          <div className={cn('mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800', !showMobileFilter && 'hidden sm:block')}>
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
                  <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{user?.full_name || 'Guru Pembimbing'}</h4>
                  <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold truncate">Pembimbing PKL</p>
                </div>
              </div>

              {/* Status Banner */}
              <div className="p-2.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/40 text-[11px] text-teal-900 dark:text-teal-300">
                <span className="font-bold block text-[10px] uppercase tracking-wider text-teal-600 dark:text-teal-400">Tahun Pelajaran</span>
                <span className="font-extrabold">{tpTahun || '2026/2027'}</span>
                <span className="text-[10px] text-teal-700/80 dark:text-teal-400/80 block mt-0.5">{semesterNama || 'Semester Ganjil'}</span>
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
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer',
                        isActive ? 'bg-teal-600 text-white shadow-xs font-black' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <IconComp size={16} className={cn(isActive ? 'text-white' : 'text-slate-400')} />
                        <span className="truncate">{tab.label}</span>
                      </div>
                      {typeof tab.badge === 'number' && tab.badge > 0 && (
                        <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full font-bold', isActive ? 'bg-white/25 text-white' : 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300')}>
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
                {visitedTabs.has('ringkasan') && (
                  <div className={cn(activeTab === 'ringkasan' ? 'block' : 'hidden')}>
                    <PklRingkasanTab stats={stats} tpTahun={tpTahun} semesterNama={semesterNama} onSelectTab={handleTabSelect} onOpenSiswaDetail={(s) => { setModalInitialTab('presensi'); setSelectedDetailSiswa(s); }} />
                  </div>
                )}
                {visitedTabs.has('bimbingan') && (
                  <div className={cn(activeTab === 'bimbingan' ? 'block' : 'hidden')}>
                    <PklBimbinganTab guruId={guruId} tahunPelajaranId={tpId} semesterId={academicFilter.values.semesterId} siswaList={siswaList} onOpenSiswaDetail={(s) => { setModalInitialTab('presensi'); setSelectedDetailSiswa(s); }} onOpenKunjunganModal={() => handleTabSelect('monitoring')} />
                  </div>
                )}
                {visitedTabs.has('verifikasi_absensi') && (
                  <div className={cn(activeTab === 'verifikasi_absensi' ? 'block' : 'hidden')}>
                    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat verifikasi absensi...</div>}>
                      <AbsensiPklView guruId={guruId} guruNama={user?.full_name || (user as any)?.name || user?.guru_profile?.nama_lengkap} initialTpId={tpId} hideLayout hideScopeBanner hideHeaderStats={false} forcedSubTab="HARIAN" hideSubTabSwitcher attendanceVerificationOnly isModal={false} />
                    </Suspense>
                  </div>
                )}
                {visitedTabs.has('absensi') && (
                  <div className={cn(activeTab === 'absensi' ? 'block' : 'hidden')}>
                    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Memuat matriks presensi...</div>}>
                      <RekapAbsensiPklView guruId={guruId} guruNama={user?.full_name || (user as any)?.name || user?.guru_profile?.nama_lengkap} tahunPelajaranId={tpId} semesterId={academicFilter.values.semesterId} hideLayout className="w-full" />
                    </Suspense>
                  </div>
                )}
                {visitedTabs.has('jurnal') && (
                  <div className={cn(activeTab === 'jurnal' ? 'block' : 'hidden')}>
                    <PklJurnalTab
                      siswaList={siswaList}
                      logbookList={logbookList}
                      onApproveLogbook={handleApproveLogbook}
                      onRejectLogbook={handleRejectLogbook}
                      onOpenSiswaDetail={(pId) => {
                        const target = siswaList.find((s) => s.id === pId);
                        if (target) { setModalInitialTab('logbook'); setSelectedDetailSiswa(target); }
                      }}
                    />
                  </div>
                )}
                {visitedTabs.has('monitoring') && (
                  <div className={cn(activeTab === 'monitoring' ? 'block' : 'hidden')}>
                    <PklMonitoringTab guruId={guruId} tahunPelajaranId={tpId} semesterId={academicFilter.values.semesterId} siswaList={siswaList} />
                  </div>
                )}
                {visitedTabs.has('penilaian') && (
                  <div className={cn(activeTab === 'penilaian' ? 'block' : 'hidden')}>
                    <PklPenilaianTab guruId={guruId} tahunPelajaranId={tpId} semesterId={academicFilter.values.semesterId} siswaList={siswaList} />
                  </div>
                )}
                {visitedTabs.has('rekap') && (
                  <div className={cn(activeTab === 'rekap' ? 'block' : 'hidden')}>
                    <PklRekapTab siswaList={siswaList} kunjunganList={kunjunganList} tpTahun={tpTahun} semesterNama={semesterNama} />
                  </div>
                )}
              </>
            )}
          </main>
        </div>

        {/* Modal Drill-Down Detail Siswa */}
        {selectedDetailSiswa && selectedRawSiswa && (
          <Suspense fallback={null}>
            <SiswaBimbinganDetailModal
              isOpen={Boolean(selectedDetailSiswa)}
              onClose={() => setSelectedDetailSiswa(null)}
              siswaPkl={selectedRawSiswa}
              initialTab={modalInitialTab}
            />
          </Suspense>
        )}
      </div>
    </PremiumFeatureGate>
  );
};
