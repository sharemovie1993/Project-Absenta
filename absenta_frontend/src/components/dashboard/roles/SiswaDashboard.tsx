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
import { SiswaCardModal } from '../..//academic/siswa/dashboard/SiswaCardModal';

const SiswaOnboardingModal = lazy(() =>
  import('@/components/academic/siswa/SiswaOnboardingModal').then((m) => ({ default: m.SiswaOnboardingModal }))
);

export const SiswaDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') as SiswaTabId | null;
  const validTabs: SiswaTabId[] = ['ringkasan', 'portal', 'kehadiran', 'catatan', 'berkas', 'profil'];
  const activeTab: SiswaTabId = rawTab && validTabs.includes(rawTab) ? rawTab : 'ringkasan';

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
      { id: 'ringkasan', label: 'Ringkasan', icon: LayoutList },
      { id: 'portal', label: 'Portal', icon: LayoutGrid },
      { id: 'kehadiran', label: 'Kehadiran', icon: CheckCircle2 },
      { id: 'catatan', label: 'Catatan', icon: FileText, badge: data.pelanggaranCount },
      { id: 'berkas', label: 'Berkas Saya', icon: FolderOpen },
      { id: 'profil', label: 'Profil', icon: User },
    ],
    [data.pelanggaranCount]
  );

  const renderValueOrUnconnectedBadge = (val: any, customConnectedText?: React.ReactNode) => {
    return renderApiValue(val, customConnectedText, data.isApiConnected);
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-20">
      {/* 1. Header Banner */}
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
        tabs={navTabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenDigitalCard={() => setShowDigitalCardModal(true)}
        onOpenBelumAbsen={() => setShowBelumAbsenModal(true)}
        pelanggaranCount={data.pelanggaranCount}
      />

      {/* 2. Modular Subtabs with Keep-Alive Cache */}
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
