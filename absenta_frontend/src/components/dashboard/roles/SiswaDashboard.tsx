import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  LayoutList,
  LayoutGrid,
  CheckCircle2,
  FileText,
  FolderOpen,
  User,
  ArrowLeft,
  RefreshCw,
  QrCode,
  Trophy,
  ShieldCheck,
  Flame,
  Sparkles,
} from 'lucide-react';
import { renderApiValue } from '@/components/ui';
import { cn } from '@/lib/utils';
import { changePassword } from '@/api/auth.api';
import { DEFAULT_CONFIG } from '@/components/academic/student-card/constants';
import { calculateProfileCompleteness, type SectionEditType } from '@/components/academic/siswa/SiswaOnboardingModal';
import { useGerbangAttendanceData } from '@/hooks/attendance/useGerbangAttendanceData';

// Types & Skeletons
import type { SiswaTabId, SiswaNavTabItem } from './siswa/types';
import { SiswaDashboardSkeleton } from './siswa/SiswaDashboardSkeleton';
import { useSiswaDashboardData } from './siswa/useSiswaDashboardData';

// Components
import { SiswaHeaderBanner } from './siswa/components/SiswaHeaderBanner';

// Subtabs
import { SiswaRingkasanTab } from './siswa/tabs/SiswaRingkasanTab';
import { SiswaKehadiranTab } from './siswa/tabs/SiswaKehadiranTab';
import { SiswaCatatanTab } from './siswa/tabs/SiswaCatatanTab';
import { SiswaBerkasTab } from './siswa/tabs/SiswaBerkasTab';
import { SiswaPortalTab } from './siswa/tabs/SiswaPortalTab';
import { SiswaProfilTab } from './siswa/tabs/SiswaProfilTab';

// Modals
import { SiswaChangePasswordModal } from './siswa/modals/SiswaChangePasswordModal';
import { SiswaLeaderboardModal } from './siswa/modals/SiswaLeaderboardModal';
import { SiswaPrestasiModal } from './siswa/modals/SiswaPrestasiModal';
import { SiswaKehadiranModal } from './siswa/modals/SiswaKehadiranModal';
import { SiswaBelumAbsenModal } from './siswa/modals/SiswaBelumAbsenModal';
import { SiswaCardModal } from '../../academic/siswa/dashboard/SiswaCardModal';
import Modal from '@/components/ui/Modal';

const AbsensiPklView = lazy(() =>
  import('../../hubin/absensi/AbsensiPklView').then((m) => ({ default: m.AbsensiPklView }))
);

const SiswaOnboardingModal = lazy(() =>
  import('@/components/academic/siswa/SiswaOnboardingModal').then((m) => ({ default: m.SiswaOnboardingModal }))
);

export const SiswaDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') as SiswaTabId | null;
  const validTabs: SiswaTabId[] = ['ringkasan', 'portal', 'kehadiran', 'catatan', 'berkas', 'profil'];
  const activeTab: SiswaTabId = rawTab && validTabs.includes(rawTab) ? rawTab : 'ringkasan';

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Keep-Alive Tab Cache
  const [visitedTabs, setVisitedTabs] = useState<Set<SiswaTabId>>(() => new Set([activeTab]));

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const handleTabChange = useCallback(
    (newTab: SiswaTabId | string) => {
      setSearchParams({ tab: newTab });
    },
    [setSearchParams]
  );

  // Data hook
  const data = useSiswaDashboardData();

  // Modals state
  const [showDigitalCardModal, setShowDigitalCardModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showPrestasiModal, setShowPrestasiModal] = useState(false);
  const [showKehadiranModal, setShowKehadiranModal] = useState(false);
  const [showBelumAbsenModal, setShowBelumAbsenModal] = useState(false);
  const [showPklModal, setShowPklModal] = useState(false);
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionEditType>('pribadi');

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const handleOpenEditSection = (section: SectionEditType) => {
    setActiveSection(section);
    setShowOnboardingModal(true);
  };

  const handleOpenPklModal = useCallback(() => {
    setShowPklModal(true);
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      toast.error('Password lama dan password baru harus diisi');
      return;
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      toast.error('Konfirmasi password baru tidak cocok');
      return;
    }
    setPasswordSubmitting(true);
    try {
      await changePassword({
        current_password: oldPassword,
        new_password: newPassword,
      });
      toast.success('Password berhasil diperbarui!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePasswordModal(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mengubah password');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await data.refetchProfile();
      toast.success('Data dashboard siswa berhasil diperbarui!');
    } catch {
      toast.error('Gagal memperbarui data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Gerbang data for Belum Absen modal
  const {
    notPresent: notPresentData = [],
    notPresentLoading,
    miniStats: miniStatsData = { masuk: 0, keluar: 0 },
    fetchNotPresent: refetchNotPresent,
    refreshStats: refetchMiniStats,
    removePendingStudent,
  } = useGerbangAttendanceData({
    tenantId: data.tenantId,
    selectedKelasId: data.siswaProfile?.kelas_id || '',
    enabled: showBelumAbsenModal,
  });

  // Onboarding auto prompt
  useEffect(() => {
    if (data.siswaProfile) {
      const comp = calculateProfileCompleteness(data.siswaProfile);
      const hasDismissed = sessionStorage.getItem(`onboarding_dismissed_${data.user?.siswa_id || data.user?.id}`);
      if (!comp.isComplete && !hasDismissed) {
        setShowOnboardingModal(true);
      }
    }
  }, [data.siswaProfile, data.user]);

  // Tab items config
  const navTabs: SiswaNavTabItem[] = useMemo(
    () => [
      { id: 'ringkasan', label: 'Ringkasan Beranda', icon: LayoutList },
      { id: 'kehadiran', label: 'Presensi & KBM', icon: CheckCircle2 },
      { id: 'catatan', label: 'Catatan Kedisiplinan', icon: FileText, badge: data.pelanggaranCount },
      { id: 'berkas', label: 'Berkas Dokumen', icon: FolderOpen },
      { id: 'portal', label: 'Portal Aplikasi', icon: LayoutGrid },
      { id: 'profil', label: 'Profil & Kartu', icon: User },
    ],
    [data.pelanggaranCount]
  );

  const activeTabMeta = useMemo(() => {
    return navTabs.find((t) => t.id === activeTab) || navTabs[0];
  }, [navTabs, activeTab]);

  const renderValueOrUnconnectedBadge = (val: any, customConnectedText?: React.ReactNode) => {
    return renderApiValue(val, customConnectedText, data.isApiConnected);
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-20 w-full max-w-full min-w-0">
      {/* 1. Shopee-Grade Clean Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {activeTab !== 'ringkasan' && (
              <button
                type="button"
                onClick={() => handleTabChange('ringkasan')}
                className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0 cursor-pointer"
                title="Kembali ke Ringkasan"
                aria-label="Kembali ke Ringkasan"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                  Portal Siswa
                </span>
                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                  Kelas {data.currentClassName}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate mt-0.5">
                {activeTab === 'ringkasan' ? 'Pusat Kendali Siswa' : activeTabMeta.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Digital Card Button */}
            <button
              type="button"
              onClick={() => setShowDigitalCardModal(true)}
              className="px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-100 transition-all cursor-pointer"
              title="Buka Kartu Pelajar Digital"
            >
              <QrCode size={14} />
              <span className="hidden sm:inline">Kartu Digital</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
              title="Segarkan Data"
            >
              <RefreshCw size={14} className={cn(isRefreshing && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Desktop 2-Column Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
        {/* Left Column: Sidebar Controls (Desktop sticky) */}
        <aside className="hidden lg:block sticky top-20 space-y-3">
          {/* Identity Mini Card */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                {data.studentPhotoUrl ? (
                  <img
                    src={data.studentPhotoUrl}
                    alt={data.studentName}
                    className="w-10 h-10 rounded-xl object-cover ring-1 ring-blue-500/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-sm flex items-center justify-center ring-1 ring-blue-500/30">
                    {data.studentInitials}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 px-1 rounded-full text-[8px] font-black bg-amber-500 text-slate-950 ring-1 ring-white dark:ring-slate-900">
                  Lv.{data.gamification.level}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block truncate">
                  Kelas {data.currentClassName}
                </span>
                <h2 className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {data.studentName}
                </h2>
              </div>
            </div>

            {/* Streak & XP Strip */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold">
                <Flame size={12} className="animate-pulse" />
                <span>{data.gamification.streakDays} Hari Streak</span>
              </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {data.gamification.points} XP
              </span>
            </div>
          </div>

          {/* Desktop Vertical Nav Menu */}
          <nav className="p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left',
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs font-extrabold'
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
                        isActive ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                      )}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Shortcuts Card (Leaderboard & Discipline) */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Status Kedisiplinan
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Skor Disiplin</span>
              </span>
              <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                {data.currentDisciplineScore}/100
              </span>
            </div>
            {data.myRank.rank > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Trophy size={14} className="text-amber-500" />
                  <span>Peringkat</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowLeaderboardModal(true)}
                  className="text-xs font-black font-mono text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  #{data.myRank.rank} di Kelas
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Right Column: Main Content & Subtabs */}
        <main className="space-y-4 min-w-0">
          {/* Header Identity Banner */}
          <SiswaHeaderBanner
            studentName={data.studentName}
            studentInitials={data.studentInitials}
            studentPhotoUrl={data.studentPhotoUrl}
            currentNisn={data.currentNisn}
            currentJurusan={data.currentJurusan}
            currentClassName={data.currentClassName}
            isPetugasKelas={data.isPetugasKelas}
            studentBadges={data.studentBadges}
            gamification={data.gamification}
            onOpenDigitalCard={() => setShowDigitalCardModal(true)}
            onOpenBelumAbsen={() => setShowBelumAbsenModal(true)}
          />

          {/* Subtab Panels with Keep-Alive Cache */}
          {visitedTabs.has('ringkasan') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'ringkasan'}
              className={cn('w-full min-w-0', activeTab === 'ringkasan' ? 'block' : 'hidden')}
            >
              <SiswaRingkasanTab
                isAktifPkl={data.isAktifPkl}
                todayFormattedDate={data.todayFormattedDate}
                todayIso={data.todayIso}
                todayPklAbsensi={data.todayPklAbsensi}
                pklHadir={data.pklHadir}
                pklSisaHari={data.pklSisaHari}
                dailyRecap={data.dailyRecap}
                monthStats={data.monthStats}
                gamification={data.gamification}
                myRank={data.myRank}
                kelasLeaderboardStudents={data.kelasLeaderboardStudents}
                currentClassName={data.currentClassName}
                currentUserId={data.user?.siswa_id || data.user?.id}
                studentName={data.studentName}
                onOpenLeaderboard={() => setShowLeaderboardModal(true)}
                todayKbmSchedule={data.todayKbmSchedule}
                isLoadingSchedule={data.isLoadingSchedule}
                disciplineHistory={data.disciplineHistory}
                totalPoinPrestasi={data.totalPoinPrestasi}
                totalPoinPelanggaran={data.totalPoinPelanggaran}
                currentDisciplineScore={data.currentDisciplineScore}
                onOpenPrestasiModal={() => setShowPrestasiModal(true)}
                onOpenKehadiranModal={() => setShowKehadiranModal(true)}
                onOpenPklModal={handleOpenPklModal}
                onNavigateTab={handleTabChange}
              />
            </div>
          )}

          {visitedTabs.has('portal') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'portal'}
              className={cn('w-full min-w-0', activeTab === 'portal' ? 'block' : 'hidden')}
            >
              <SiswaPortalTab
                onBackToBeranda={() => handleTabChange('ringkasan')}
                onNavigateTab={handleTabChange}
              />
            </div>
          )}

          {visitedTabs.has('kehadiran') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'kehadiran'}
              className={cn('w-full min-w-0', activeTab === 'kehadiran' ? 'block' : 'hidden')}
            >
              <SiswaKehadiranTab
                gamification={data.gamification}
                handlePrevMonth={data.handlePrevMonth}
                handleNextMonth={data.handleNextMonth}
                selectedMonthFormatted={data.selectedMonthFormatted}
                calendarGridData={data.calendarGridData}
                todayIso={data.todayIso}
                selectedDate={data.selectedDate}
                onSelectDate={data.setSelectedDate}
                sessionAttendanceHistory={data.sessionAttendanceHistory}
                todayKbmSchedule={data.todayKbmSchedule}
                isLoadingSchedule={data.isLoadingSchedule}
                isApiConnected={data.isApiConnected}
                kelasId={data.siswaProfile?.kelas_id || ''}
              />
            </div>
          )}

          {visitedTabs.has('catatan') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'catatan'}
              className={cn('w-full min-w-0', activeTab === 'catatan' ? 'block' : 'hidden')}
            >
              <SiswaCatatanTab
                bukuCatatanList={data.bukuCatatanList}
                catatanFilter={data.catatanFilter}
                setCatatanFilter={data.setCatatanFilter}
                filteredBukuCatatan={data.filteredBukuCatatan}
                totalPoinPrestasi={data.totalPoinPrestasi}
                totalPoinPelanggaran={data.totalPoinPelanggaran}
                netPoin={data.netPoin}
              />
            </div>
          )}

          {visitedTabs.has('berkas') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'berkas'}
              className={cn('w-full min-w-0', activeTab === 'berkas' ? 'block' : 'hidden')}
            >
              <SiswaBerkasTab
                siswaId={data.siswaProfile?.id}
                siswaName={data.studentName}
                nis={data.siswaProfile?.nis}
                nisn={data.currentNisn}
              />
            </div>
          )}

          {visitedTabs.has('profil') && (
            <div
              role="tabpanel"
              aria-hidden={activeTab !== 'profil'}
              className={cn('w-full min-w-0', activeTab === 'profil' ? 'block' : 'hidden')}
            >
              <SiswaProfilTab
                siswaProfile={data.siswaProfile}
                user={data.user}
                studentPhotoUrl={data.studentPhotoUrl}
                studentInitials={data.studentInitials}
                currentClassName={data.currentClassName}
                currentJurusan={data.currentJurusan}
                currentNisn={data.currentNisn}
                currentNik={data.currentNik}
                currentOrtu={data.currentOrtu}
                qrCodeDataUrl={data.qrCodeDataUrl}
                renderValueOrUnconnectedBadge={renderValueOrUnconnectedBadge}
                handleOpenEditSection={handleOpenEditSection}
                setShowDigitalCardModal={setShowDigitalCardModal}
                handlePasswordSubmit={handlePasswordSubmit}
                oldPassword={oldPassword}
                setOldPassword={setOldPassword}
                newPassword={newPassword}
                setNewPassword={setNewPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                passwordSubmitting={passwordSubmitting}
              />
            </div>
          )}
        </main>
      </div>

      {/* 3. Modals */}
      <SiswaChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSubmit={handlePasswordSubmit}
        oldPassword={oldPassword}
        setOldPassword={setOldPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        isSubmitting={passwordSubmitting}
      />

      <SiswaLeaderboardModal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        students={data.kelasLeaderboardStudents}
        currentClassName={data.currentClassName}
        selectedMonthFormatted={data.selectedMonthFormatted}
        currentUserId={data.user?.siswa_id || data.user?.id}
        studentName={data.studentName}
      />

      <SiswaPrestasiModal
        isOpen={showPrestasiModal}
        onClose={() => setShowPrestasiModal(false)}
        bukuCatatanList={data.bukuCatatanList}
        totalPoinPrestasi={data.totalPoinPrestasi}
        prestasiCount={data.prestasiCount}
      />

      <SiswaKehadiranModal
        isOpen={showKehadiranModal}
        onClose={() => setShowKehadiranModal(false)}
        onNavigateToTab={handleTabChange}
        selectedMonthFormatted={data.selectedMonthFormatted}
        attendanceRate={data.gamification.attendanceRate}
        monthStats={data.monthStats}
      />

      <SiswaBelumAbsenModal
        isOpen={showBelumAbsenModal}
        onClose={() => {
          setShowBelumAbsenModal(false);
          refetchMiniStats();
          refetchNotPresent();
        }}
        currentClassName={data.currentClassName}
        kelasId={data.siswaProfile?.kelas_id || ''}
        notPresentData={notPresentData}
        notPresentLoading={notPresentLoading}
        miniStatsData={miniStatsData}
        onRefreshData={async () => {
          await refetchMiniStats();
          await refetchNotPresent();
        }}
        onRemovePendingStudent={removePendingStudent}
      />

      {showPklModal && (
        <Modal
          isOpen={showPklModal}
          onClose={() => {
            setShowPklModal(false);
            data.refetchPklAbsensi();
            data.refetchProfile();
          }}
          title="Presensi & Jurnal PKL Siswa"
          size="6xl"
        >
          <div className="p-1 sm:p-2 max-h-[82vh] overflow-y-auto w-full min-w-0">
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center p-12 gap-3">
                  <RefreshCw className="animate-spin text-indigo-500" size={28} />
                  <span className="text-xs font-bold text-slate-400">Memuat Modul Presensi PKL...</span>
                </div>
              }
            >
              <AbsensiPklView
                isModal={true}
                hideLayout={true}
                onClose={() => {
                  setShowPklModal(false);
                  data.refetchPklAbsensi();
                  data.refetchProfile();
                }}
              />
            </Suspense>
          </div>
        </Modal>
      )}

      <SiswaCardModal
        showDigitalCardModal={showDigitalCardModal}
        setShowDigitalCardModal={setShowDigitalCardModal}
        cardSide={cardSide}
        setCardSide={setCardSide}
        activeCardConfig={data.activeCardConfig}
        DEFAULT_CONFIG={DEFAULT_CONFIG}
        dynamicLogoUrl={data.dynamicLogoUrl}
        sekolahName={data.sekolahName}
        dynamicCardTitle="KARTU TANDA PELAJAR DIGITAL"
        studentPhotoUrl={data.studentPhotoUrl}
        studentName={data.studentName}
        currentNisn={data.currentNisn}
        currentClassName={data.currentClassName}
        currentJurusan={data.currentJurusan}
        qrCodeDataUrl={data.qrCodeDataUrl}
        dynamicRules="Gunakan QR Code ini untuk scan Tap Presensi Gerbang Sekolah & Akses Perpustakaan Digital."
      />

      <Suspense fallback={null}>
        {showOnboardingModal && (
          <SiswaOnboardingModal
            isOpen={showOnboardingModal}
            onClose={() => setShowOnboardingModal(false)}
            initialSection={activeSection}
            siswaId={data.siswaProfile?.id}
            onSuccess={() => data.refetchProfile()}
          />
        )}
      </Suspense>
    </div>
  );
};

export default SiswaDashboard;
