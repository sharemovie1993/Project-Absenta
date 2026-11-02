import React, { useMemo, useState, useCallback, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Users, ClipboardList, Clock, ArrowRight, CheckCircle2, ShieldCheck, Loader } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { piketApi } from '../../../../api/piket.api';
import { kurikulumApi } from '../../../../api/kurikulum.api';
import { getRekapBulananGuruMe } from '../../../../api/attendance/rekap.api';
import { getMyActionHub } from '../../../../api/dashboard.api';
import { TimelineItem } from './StaffKbmAbsenTab';
import { StaffWeeklyScheduleWidget } from '../../widgets/StaffWeeklyScheduleWidget';
import { BebanMengajarWidget } from '../widgets/BebanMengajarWidget';
import { PengajuanIzinGuruModal } from '../profil/PengajuanIzinGuruModal';
import { useTenant } from '../../../../hooks/useTenant';
import { toLocalDate } from '../../../../utils/attendance/time';
import { safeArr } from '@/components/kurikulum/dashboard/DashboardComponents';

// Subkomponen High-Density Beranda
import { TeacherDailyStatusStrip } from '../beranda/TeacherDailyStatusStrip';
import { TeacherOpsMicroGrid } from '../beranda/TeacherOpsMicroGrid';
import { TeacherCoreWorkspaceBento } from '../beranda/TeacherCoreWorkspaceBento';
import { TeacherActionHubWidget } from '../beranda/TeacherActionHubWidget';
import { DirectKbmFeed } from '../beranda/DirectKbmFeed';
import { TeacherSidebarNav } from '../beranda/TeacherSidebarNav';
import { TeacherSubTabId } from '../beranda/TeacherSubNavPills';
import { TeacherBukuNilaiSubTab } from '../beranda/TeacherBukuNilaiSubTab';

// Universal Role-Ready Views (In-Place Sub-Tab)
const PerangkatAjarView = lazy(() =>
  import('@/components/kurikulum/perangkat-ajar/PerangkatAjarView').then((m) => ({ default: m.PerangkatAjarView }))
);
const SupervisiAkademikView = lazy(() =>
  import('@/components/kurikulum/supervisi/SupervisiAkademikView').then((m) => ({ default: m.SupervisiAkademikView }))
);
const StaffRekapMapelTab = lazy(() =>
  import('./StaffRekapMapelTab').then((m) => ({ default: m.StaffRekapMapelTab }))
);

// Lazy load GateInputModule untuk satpam
const GateInputModule = lazy(() =>
  import('../../../../pages/attendance/ops/components/GateInputModule').then((m) => ({ default: m.GateInputModule }))
);

interface StaffBerandaTabProps {
  user?: any;
  guruId?: string;
  guruNama?: string;
  waliKelasNama?: string;
  waliKelasId?: string;
  isWaliKelas?: boolean;
  isPembimbingPkl?: boolean;
  isKaprog?: boolean;
  kaprogJurusan?: { id?: string; nama?: string; singkatan?: string } | null;
  hasGerbangDuty?: boolean;
  isPureGerbang?: boolean;
  isPendidik?: boolean;
  timelineItems?: TimelineItem[];
  onNavigateTab: (tabId: string) => void;
  onOpenAttendance?: (sesi: any) => void;
  onOpenJournal?: (sesi: any) => void;
}

export const StaffBerandaTab: React.FC<StaffBerandaTabProps> = React.memo(({
  user,
  guruId,
  guruNama,
  waliKelasNama,
  waliKelasId,
  isWaliKelas = false,
  isPembimbingPkl = false,
  isKaprog = false,
  kaprogJurusan,
  hasGerbangDuty = false,
  isPureGerbang = false,
  isPendidik = true,
  timelineItems = [],
  onNavigateTab,
  onOpenAttendance,
  onOpenJournal,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenantId } = useTenant();
  const [showIzinModal, setShowIzinModal] = useState(false);

  // Status apakah guru merupakan pendidik pengajar aktif
  const isActualTeachingStaff = isPendidik && !isPureGerbang && !hasGerbangDuty;

  // Sub-tab Navigation State via Search Params (DRY & Direct-Linkable)
  const subTabParam = (searchParams.get('subtab') as TeacherSubTabId) || 'agenda';
  const validSubTabs: TeacherSubTabId[] = ['agenda', 'tugas', 'perangkat', 'nilai', 'rekap', 'supervisi'];
  const activeSubTab = validSubTabs.includes(subTabParam) ? subTabParam : 'agenda';

  const handleSubTabChange = useCallback((newSubTab: TeacherSubTabId) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newSubTab === 'agenda') {
        next.delete('subtab');
      } else {
        next.set('subtab', newSubTab);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Presensi Kehadiran Guru Bulan Ini
  const { data: rekapGuruRes, isLoading: loadingRekap } = useQuery({
    queryKey: ['attendance-rekap-guru-me-bulanan'],
    queryFn: () => getRekapBulananGuruMe().catch(() => ({ success: true, data: null })),
    staleTime: 5 * 60 * 1000,
  });

  const rekapStats = rekapGuruRes?.data?.statistik || {
    HADIR: 0,
    TERLAMBAT: 0,
    DISPEN: 0,
    IZIN: 0,
    SAKIT: 0,
    JAM_MASUK: null,
  };

  // Query Beban Mengajar Guru (KBM JP & Ekuivalensi)
  const { data: bebanGuruRes, isLoading: loadingBeban } = useQuery({
    queryKey: ['kurikulum-beban-guru-all'],
    queryFn: () => kurikulumApi.getBebanMengajar().catch(() => ({ success: true, data: [] })),
    enabled: isActualTeachingStaff,
    staleTime: 5 * 60 * 1000,
  });

  // Query Perangkat Ajar Guru Sendiri (Untuk Notification Badges di Sidebar)
  const { data: myPerangkatRes } = useQuery({
    queryKey: ['my-perangkat-workspace', guruId],
    queryFn: () => kurikulumApi.getPerangkatAjar({ guru_id: guruId }).catch(() => ({ success: true, data: [] })),
    enabled: Boolean(guruId) && isActualTeachingStaff,
    staleTime: 60 * 1000,
  });

  const perangkatList = safeArr<any>(myPerangkatRes?.data || myPerangkatRes);
  const rejectedPerangkatCount = perangkatList.filter((p: any) => p.status?.toUpperCase() === 'REJECTED').length;

  // Pusat Tindakan & Peringatan Terpadu Guru (Cross-Divisional Action Hub)
  const { data: actionHubRes, isLoading: loadingActionHub } = useQuery({
    queryKey: ['my-action-hub-dashboard'],
    queryFn: () => getMyActionHub().catch(() => ({ success: true, data: { summary: { total: 0, critical: 0, today: 0, upcoming: 0 }, actions: [] } })),
    enabled: isActualTeachingStaff,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const actionHubData = actionHubRes?.data || { summary: { total: 0, critical: 0, today: 0, upcoming: 0 }, actions: [] };

  const teacherBeban = useMemo(() => {
    const list = Array.isArray(bebanGuruRes?.data)
      ? bebanGuruRes.data
      : Array.isArray(bebanGuruRes)
      ? bebanGuruRes
      : [];
    if (!list.length) return null;
    return list.find((b: any) =>
      (guruId && b.id === guruId) ||
      (guruNama && b.nama_guru?.toLowerCase().trim() === guruNama.toLowerCase().trim())
    );
  }, [bebanGuruRes, guruId, guruNama]);

  // Kalkulasi JP Mengajar Hari Ini
  const { totalJp, totalMinutes } = useMemo(() => {
    let jpCount = 0;
    let minutes = 0;

    timelineItems.forEach((item) => {
      const slots = (item.slot_selesai && item.slot_mulai) 
        ? (item.slot_selesai - item.slot_mulai + 1) 
        : 2;
      jpCount += slots;

      if (item.jam_mulai && item.jam_selesai) {
        const [hMulai, mMulai] = item.jam_mulai.split(':').map(Number);
        const [hSelesai, mSelesai] = item.jam_selesai.split(':').map(Number);
        const duration = (hSelesai * 60 + mSelesai) - (hMulai * 60 + mMulai);
        if (duration > 0) minutes += duration;
      }
    });

    return {
      totalJp: jpCount,
      totalMinutes: minutes > 0 ? minutes : jpCount * 45
    };
  }, [timelineItems]);

  // Active & Next KBM Session
  const activeKbm = useMemo(() => {
    return timelineItems.find((i) => i.isLive && !i.isFinished);
  }, [timelineItems]);

  const nextKbm = useMemo(() => {
    return timelineItems.find((i) => !i.isLive && !i.isFinished);
  }, [timelineItems]);

  const isAllFinished = useMemo(() => {
    return timelineItems.length > 0 && timelineItems.every((i) => i.isFinished);
  }, [timelineItems]);

  // Hutang Jurnal KBM (Sesi yang selesai tapi belum ada jurnal)
  const unfilledJournalsCount = useMemo(() => {
    return timelineItems.filter((i) => i.isFinished && !i.session?.jurnal_kbm).length;
  }, [timelineItems]);

  // Fallback handler jika modal dihandle langsung oleh komponen
  const handleOpenAttendance = useCallback((item: TimelineItem) => {
    if (onOpenAttendance) {
      onOpenAttendance(item.session || { id: item.id, kelas_nama: item.kelas_nama, kegiatan: item.kegiatan });
    } else {
      navigate('/attendance/ops?tab=sesi');
    }
  }, [onOpenAttendance, navigate]);

  const handleOpenJournal = useCallback((item: TimelineItem) => {
    if (onOpenJournal) {
      onOpenJournal(item);
    } else {
      navigate('/kurikulum/jurnal');
    }
  }, [onOpenJournal, navigate]);

  return (
    <motion.div
      key="tab-ringkasan-kbm-integrated"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      className="max-w-full"
    >
      {/* ────────────────────────────────────────────────────────────────── */}
      {/* 2-COLUMN LAYOUT ALA KAPROG / KURIKULUM (Left Sidebar + Right Main)  */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {isActualTeachingStaff ? (
        <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-5 items-start">
          {/* Kolom Kiri: Sidebar Sub-Menu Guru (Desktop sticky) */}
          <aside className="space-y-3 lg:sticky lg:top-20">
            <TeacherSidebarNav
              activeSubTab={activeSubTab}
              onChangeSubTab={handleSubTabChange}
              guruNama={guruNama}
              perangkatRejectedCount={rejectedPerangkatCount}
              unfilledJournalsCount={unfilledJournalsCount}
              actionHubTotalCount={actionHubData.summary?.total || 0}
              actionHubCriticalCount={actionHubData.summary?.critical || 0}
              totalJp={totalJp}
              currentBebanJp={teacherBeban?.total_calculated_jp ?? teacherBeban?.current_jp ?? 0}
              targetBebanJp={teacherBeban?.max_jp ?? 24}
            />
          </aside>

          {/* Kolom Kanan: Main Content Canvas */}
          <main className="min-w-0 space-y-4">
            {/* SUB-TAB 1: AGENDA & KBM HARI INI */}
            {activeSubTab === 'agenda' && (
              <div className="space-y-3 sm:space-y-4">
                {/* Daily Status Strip */}
                <TeacherDailyStatusStrip
                  activeKbm={activeKbm}
                  nextKbm={nextKbm}
                  isAllFinished={isAllFinished}
                  totalJp={totalJp}
                  totalMinutes={totalMinutes}
                  guruTapTime={(rekapStats as any)?.JAM_MASUK || null}
                  isGuruHadir={Boolean(rekapStats.HADIR > 0 || (rekapStats as any)?.JAM_MASUK)}
                />

                {/* Operational Micro-Grid */}
                <TeacherOpsMicroGrid
                  totalJp={totalJp}
                  totalMinutes={totalMinutes}
                  unfilledJournalsCount={unfilledJournalsCount}
                  currentJp={teacherBeban?.total_calculated_jp ?? teacherBeban?.current_jp ?? 0}
                  targetJp={teacherBeban?.max_jp ?? 24}
                  onOpenSchedule={() => {}}
                  onOpenJournals={() => {}}
                  onOpenBeban={() => onNavigateTab('profil')}
                  onOpenRekapMapel={() => handleSubTabChange('rekap')}
                />

                {/* Meja Kerja Pendidik (4 Pilar Terpadu) */}
                <TeacherCoreWorkspaceBento
                  guruId={guruId}
                  guruNama={guruNama}
                  timelineItems={timelineItems}
                  unfilledJournalsCount={unfilledJournalsCount}
                  totalJpToday={totalJp}
                  onOpenJournal={handleOpenJournal}
                  onNavigateTab={onNavigateTab}
                  onSelectSubTab={handleSubTabChange}
                />

                {/* Pusat Tindakan & Peringatan Guru (Cross-Divisional Action Hub) */}
                <TeacherActionHubWidget
                  actions={actionHubData.actions || []}
                  summary={actionHubData.summary || { total: 0, critical: 0, today: 0, upcoming: 0 }}
                  isLoading={loadingActionHub}
                  onOpenJournal={handleOpenJournal}
                  onNavigateTab={onNavigateTab}
                />

                {/* Direct KBM Execution Feed (Sesi Mengajar Langsung di Layar) */}
                <DirectKbmFeed
                  timelineItems={timelineItems}
                  onOpenAttendance={handleOpenAttendance}
                  onOpenJournal={handleOpenJournal}
                />

                {/* Desktop Wide View (Jadwal Mingguan & Beban Mengajar Luas) */}
                <div className="hidden md:block space-y-4 pt-2">
                  <StaffWeeklyScheduleWidget
                    guruId={guruId}
                    guruNama={guruNama}
                  />

                  <BebanMengajarWidget
                    currentJp={teacherBeban?.total_calculated_jp ?? teacherBeban?.current_jp ?? 0}
                    kbmJp={teacherBeban?.current_jp ?? 0}
                    ekuivalenJp={teacherBeban?.ekuivalen_position_jp ?? 0}
                    targetJp={teacherBeban?.max_jp ?? 24}
                    teacherName={guruNama}
                    positions={teacherBeban?.positions || []}
                    hadirBulanIni={rekapStats.HADIR || 0}
                    terlambatBulanIni={rekapStats.TERLAMBAT || 0}
                    dinasLuarBulanIni={rekapStats.DISPEN || 0}
                    izinBulanIni={(rekapStats.IZIN || 0) + (rekapStats.SAKIT || 0)}
                    isLoading={loadingBeban || loadingRekap}
                    onOpenAjukanIzin={() => setShowIzinModal(true)}
                  />
                </div>
              </div>
            )}

            {/* SUB-TAB TUGAS SAYA (Action Hub Full View) */}
            {activeSubTab === 'tugas' && (
              <div className="space-y-4">
                <TeacherActionHubWidget
                  title="Pusat Tugas & Peringatan Saya"
                  actions={actionHubData.actions || []}
                  summary={actionHubData.summary || { total: 0, critical: 0, today: 0, upcoming: 0 }}
                  isLoading={loadingActionHub}
                  onOpenJournal={handleOpenJournal}
                  onNavigateTab={onNavigateTab}
                />
              </div>
            )}

            {/* SUB-TAB 2: PERANGKAT AJAR SAYA (Universal Role-Ready View In-Place) */}
            {activeSubTab === 'perangkat' && (
              <Suspense
                fallback={
                  <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
                    <Loader className="animate-spin text-emerald-600" size={32} />
                    <p className="text-xs text-slate-500 font-semibold">Memuat Meja Perangkat Ajar...</p>
                  </div>
                }
              >
                <PerangkatAjarView guruId={guruId} hideLayout={true} />
              </Suspense>
            )}

            {/* SUB-TAB 3: BUKU NILAI & ASESMEN SISWA */}
            {activeSubTab === 'nilai' && (
              <TeacherBukuNilaiSubTab guruId={guruId} guruNama={guruNama} />
            )}

            {/* SUB-TAB 4: REKAPITULASI PRESENSI MAPEL */}
            {activeSubTab === 'rekap' && (
              <Suspense
                fallback={
                  <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
                    <Loader className="animate-spin text-indigo-600" size={32} />
                    <p className="text-xs text-slate-500 font-semibold">Memuat Rekapitulasi Mapel...</p>
                  </div>
                }
              >
                <StaffRekapMapelTab user={user} />
              </Suspense>
            )}

            {/* SUB-TAB 5: SUPERVISI AKADEMIK SAYA */}
            {activeSubTab === 'supervisi' && (
              <Suspense
                fallback={
                  <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
                    <Loader className="animate-spin text-amber-600" size={32} />
                    <p className="text-xs text-slate-500 font-semibold">Memuat Catatan Supervisi Akademik...</p>
                  </div>
                }
              >
                <SupervisiAkademikView guruId={guruId} hideLayout={true} readOnly={true} />
              </Suspense>
            )}
          </main>
        </div>
      ) : (
        /* TERMINAL SCANNER (Khusus Staf Satpam / Gerbang Non-Guru) */
        <div className="space-y-4">
          <Suspense
            fallback={
              <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center gap-3">
                <Loader className="animate-spin text-rose-600" size={36} />
              </div>
            }
          >
            <GateInputModule />
          </Suspense>
        </div>
      )}

      {/* Modal Pengajuan Izin Mandiri Guru */}
      {showIzinModal && (
        <PengajuanIzinGuruModal
          isOpen={showIzinModal}
          onClose={() => setShowIzinModal(false)}
        />
      )}
    </motion.div>
  );
});

StaffBerandaTab.displayName = 'StaffBerandaTab';
