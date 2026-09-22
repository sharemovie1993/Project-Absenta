import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FileText, 
  CheckSquare, 
  Award, 
  Users, 
  BookOpen, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Calculator, 
  Printer, 
  UserCheck,
  GraduationCap,
  Info
} from 'lucide-react';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { WorkspaceAppLauncherCard } from '@/components/common/WorkspaceAppLauncherCard';
import { AcademicContextBar } from '@/components/common/AcademicContextBar';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { TvModeToggle } from '@/components/ui/TvModeToggle';
import { cn } from '@/lib/utils';
import { raporApi } from '@/api/rapor.api';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAcademicContext } from '@/hooks/useAcademicContext';
import { TeacherMonitoringTable } from '@/components/rapor/dashboard/TeacherMonitoringTable';
import { PersonalTeacherProgressWidget } from '@/components/rapor/dashboard/PersonalTeacherProgressWidget';
import { ClassSubjectProgressCard } from '@/components/rapor/cetak-rapor/ClassSubjectProgressCard';

export default React.memo(function RaporDashboard() {
  const isMobile = useIsMobile();
  const { isAdmin, isKurikulum, isKepsek, isWaliKelas, walikelasKelas, walikelasKelasIds } = useCapabilities();
  const userKelasId = walikelasKelas?.id || (walikelasKelasIds && walikelasKelasIds.length > 0 ? walikelasKelasIds[0] : null);
  const canViewSchoolMonitoring = isAdmin || isKurikulum || isKepsek;

  // ── Tab Switcher (Khusus Akun Kurikulum/Admin/Kepsek) ──
  const [activeTab, setActiveTab] = useState<'monitoring' | 'personal'>('monitoring');

  // ── Konteks Akademik (TP + Semester) ──
  const {
    selectedTahunPelajaran,
    selectedSemester,
    handleTpChange,
    handleSemesterChange,
    tpOptions,
    semesterOptions,
    isLoadingTp,
    isLoadingSem,
    activeYear,
    activeSemester,
  } = useAcademicContext();

  // ── Query 1: Monitoring Seluruh Guru (Untuk Kurikulum / Admin / Kepsek) ──
  const { data: schoolMonitoringRes, isLoading: isLoadingSchool } = useQuery({
    queryKey: ['school-teacher-monitoring', activeYear?.id, activeSemester?.id],
    queryFn: () =>
      raporApi.getMonitoringProgressGuru({
        tahun_pelajaran_id: activeYear?.id,
        semester_id: activeSemester?.id,
      }),
    enabled: !!canViewSchoolMonitoring && !!activeYear?.id && !!activeSemester?.id,
  });

  const schoolData = schoolMonitoringRes?.data;
  const schoolMeta = schoolData?.meta;
  const schoolTeachers = schoolData?.teachers || [];

  // ── Query 2: Progres Pribadi Guru (Untuk Semua Akun Pengampu) ──
  const { data: personalProgressRes, isLoading: isLoadingPersonal } = useQuery({
    queryKey: ['personal-teacher-progress', activeYear?.id, activeSemester?.id],
    queryFn: () =>
      raporApi.getTeacherProgress({
        tahun_pelajaran_id: activeYear?.id,
        semester_id: activeSemester?.id,
      }),
    enabled: !!activeYear?.id && !!activeSemester?.id,
  });

  const personalProgress = personalProgressRes?.data || null;

  // ── Query 3: Kelengkapan Nilai Mapel Kelas Binaan (Khusus Wali Kelas) ──
  const { data: homeroomProgressRes, isLoading: isLoadingHomeroomProgress } = useQuery({
    queryKey: ['homeroom-subject-progress', userKelasId, activeYear?.id, activeSemester?.id],
    queryFn: () =>
      raporApi.getClassSubjectProgress(userKelasId!, {
        tahun_pelajaran_id: activeYear?.id,
        semester_id: activeSemester?.id,
      }),
    enabled: !!isWaliKelas && !!userKelasId && !!activeYear?.id && !!activeSemester?.id,
  });

  const homeroomProgressData = homeroomProgressRes?.data || null;

  return (
    <AcademicPageLayout
      title="Dashboard E-Rapor"
      description="Pusat monitoring progres pengisian nilai rapor, kelengkapan mata pelajaran, dan verifikasi wali kelas"
      topSlot={<WorkspaceAppLauncherCard workspaceId="RAPOR_WORKSPACE" />}
      toolbar={
        <div className={`flex items-center gap-2 flex-wrap ${isMobile ? 'w-full' : ''}`}>
          <AcademicContextBar
            id="dash-rapor"
            tahunPelajaranId={selectedTahunPelajaran}
            semesterId={selectedSemester}
            onTahunPelajaranChange={handleTpChange}
            onSemesterChange={handleSemesterChange}
            tpOptions={tpOptions}
            semesterOptions={semesterOptions}
            isLoadingTp={isLoadingTp}
            isLoadingSem={isLoadingSem}
            variant="toolbar"
          />
          <TvModeToggle />
        </div>
      }
    >
      <div className="space-y-5">
        {/* ── SEGMENTED TAB SWITCHER (Untuk Kurikulum / Admin / Kepsek) ── */}
        {canViewSchoolMonitoring && (
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-full sm:w-fit border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab('monitoring')}
              className={cn(
                "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                activeTab === 'monitoring'
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <Users size={14} />
              <span>Monitoring Guru ({schoolTeachers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('personal')}
              className={cn(
                "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                activeTab === 'personal'
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <UserCheck size={14} />
              <span>Progres Rapor Saya</span>
            </button>
          </div>
        )}

        {/* ── TAB 1: MONITORING SEKOLAH (Kurikulum / Admin View) ── */}
        {canViewSchoolMonitoring && activeTab === 'monitoring' && (
          <div className="space-y-5">
            {/* 4 Analytics Cards (Compact 2x2 grid di Mobile) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              <AnalyticsCard
                title="Rombel KBM"
                value={`${schoolMeta?.total_tasks || 0} Tugas`}
                icon={<BookOpen size={18} />}
                gradient="from-sky-500 to-sky-700 text-white"
                subtitle={`${schoolMeta?.total_guru || 0} Guru Pengampu`}
                mobileCompact={true}
              />
              <AnalyticsCard
                title="Penyelesaian"
                value={`${schoolMeta?.percentage || 0}%`}
                icon={<Award size={18} />}
                gradient="from-indigo-500 to-indigo-700 text-white"
                subtitle={`${schoolMeta?.completed_tasks || 0} dari ${schoolMeta?.total_tasks || 0} tuntas`}
                mobileCompact={true}
              />
              <AnalyticsCard
                title="Guru Tuntas"
                value={`${schoolMeta?.guru_completed || 0} Guru`}
                icon={<CheckCircle2 size={18} />}
                gradient="from-emerald-500 to-emerald-700 text-white"
                subtitle="Seluruh rombel selesai"
                mobileCompact={true}
              />
              <AnalyticsCard
                title="Perlu Pengingat"
                value={`${(schoolMeta?.guru_empty || 0) + (schoolMeta?.guru_partial || 0)} Guru`}
                icon={<AlertCircle size={18} />}
                gradient="from-rose-500 to-rose-700 text-white"
                subtitle={`${schoolMeta?.guru_empty || 0} belum ada input`}
                mobileCompact={true}
              />
            </div>

            {/* Informational banner bila tidak ada jadwal KBM pada periode yang dipilih */}
            {!isLoadingSchool && schoolTeachers.length === 0 && (
              <div className="p-4 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-800 dark:text-amber-300">
                  <p className="font-bold">
                    Tidak Ditemukan Jadwal KBM [{activeYear?.nama} • {activeSemester?.nama}]
                  </p>
                  <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                    Belum ada rombongan belajar atau jadwal mengajar guru yang terdaftar pada periode akademik ini. Seluruh statistik monitoring bernilai 0.
                  </p>
                </div>
              </div>
            )}

            {/* Matriks Tabel Monitoring Seluruh Guru */}
            <TeacherMonitoringTable
              teachers={schoolTeachers}
              isLoading={isLoadingSchool}
              tahunPelajaranId={activeYear?.id}
              semesterId={activeSemester?.id}
            />
          </div>
        )}

        {/* ── TAB 2 (Atau default jika bukan kurikulum): PROGRES PRIBADI GURU & SHORTCUT WALI KELAS ── */}
        {(!canViewSchoolMonitoring || activeTab === 'personal') && (
          <div className="space-y-5">
            <PersonalTeacherProgressWidget
              progressInfo={personalProgress}
              isLoading={isLoadingPersonal}
              isWaliKelas={isWaliKelas}
              tahunPelajaranId={activeYear?.id}
              semesterId={activeSemester?.id}
            />

            {/* Kelengkapan Nilai Seluruh Mapel di Kelas Binaan (Khusus Wali Kelas) */}
            {isWaliKelas && userKelasId && (
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap size={15} className="text-indigo-600 dark:text-indigo-400" />
                    <span>Kelengkapan Nilai Mata Pelajaran ({walikelasKelas?.nama_kelas || 'Kelas Binaan'}):</span>
                  </h3>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    Klik kartu mapel untuk membuka lembar nilai siswa
                  </span>
                </div>
                <ClassSubjectProgressCard
                  data={homeroomProgressData}
                  isLoading={isLoadingHomeroomProgress}
                  tahunPelajaranId={activeYear?.id}
                  semesterId={activeSemester?.id}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </AcademicPageLayout>
  );
});
