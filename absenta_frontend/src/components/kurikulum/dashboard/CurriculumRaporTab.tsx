import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Award,
  CheckCircle2,
  AlertCircle,
  Info,
  FileSpreadsheet,
  Printer,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { AcademicFilterToolbar, useAcademicFilter } from '@/components/common/academic-filter';
import { raporApi } from '@/api/rapor.api';
import { TeacherMonitoringTable } from '@/components/rapor/dashboard/TeacherMonitoringTable';
import { useIsMobile } from '@/hooks/useIsMobile';

export const CurriculumRaporTab: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Konteks Akademik Terpusat (TP + Semester)
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
  });

  const {
    activeTpYear: activeYear,
    activeSemester,
  } = academicFilter;

  // Query: Monitoring Seluruh Guru Sekolah
  const {
    data: schoolMonitoringRes,
    isLoading: isLoadingSchool,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['school-teacher-monitoring', activeYear?.id, activeSemester?.id],
    queryFn: () =>
      raporApi.getMonitoringProgressGuru({
        tahun_pelajaran_id: activeYear?.id,
        semester_id: activeSemester?.id,
      }),
    enabled: !!activeYear?.id && !!activeSemester?.id,
  });

  const schoolData = schoolMonitoringRes?.data;
  const schoolMeta = schoolData?.meta;
  const schoolTeachers = schoolData?.teachers || [];

  return (
    <div className="space-y-5">
      {/* ── TOOLBAR & FILTER KHUSUS RAPOR ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
        <AcademicFilterToolbar
          {...academicFilter.toolbarProps}
          variant="compact"
        />

        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 px-2.5 text-xs text-slate-600 dark:text-slate-300 rounded-xl"
            title="Muat ulang data monitoring"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/rapor/staging')}
            className="h-8 px-3 text-xs font-bold gap-1.5 rounded-xl text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 hover:bg-indigo-100 dark:bg-indigo-950/30"
          >
            <FileSpreadsheet size={13} />
            <span>Penampung Google Sheet</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/rapor/cetak')}
            className="h-8 px-3 text-xs font-bold gap-1.5 rounded-xl text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
          >
            <Printer size={13} />
            <span>Cetak Rapor</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/rapor/settings')}
            className="h-8 px-2.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl"
            title="Pengaturan Titimangsa & Blanko Rapor"
          >
            <Settings size={14} />
          </Button>
        </div>
      </div>

      {/* ── 4 ANALYTICS CARDS (RINGKASAN KELULUSAN / KETUNTASAN PENILAIAN) ── */}
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

      {/* ── BANNER JIKA TIDAK ADA JADWAL KBM / KOSONG ── */}
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

      {/* ── MATRIKS TABEL MONITORING SELURUH GURU SEKOLAH ── */}
      <TeacherMonitoringTable
        teachers={schoolTeachers}
        isLoading={isLoadingSchool}
        tahunPelajaranId={activeYear?.id}
        semesterId={activeSemester?.id}
      />
    </div>
  );
};
