import React, { useEffect, useMemo, useState, Suspense, lazy } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Calendar,
  User,
  Activity,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  GraduationCap
} from 'lucide-react';

import {
  SectionCard,
  Button,
  Badge,
  Alert,
  AlertDescription,
  Card
} from '@/components/ui';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useAuthStore } from '@/store/authStore';
import { dropdownApi } from '@/api/dropdown.api';
import { getTrackingHarianSiswa, getRekapBulananSiswa } from '@/api/attendanceGerbang.api';
import { siswaApi } from '@/api/academic.api';
import { toLocalDate, toLocalMonth } from '@/utils/attendance/time';
import { cn } from '@/lib/utils';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { SharedVisualAttendanceCalendar } from '../SharedVisualAttendanceCalendar';
import { SharedAttendanceTimeline } from '../SharedAttendanceTimeline';

const SearchableSelect = lazy(() =>
  import('@/components/ui/SearchableSelect').then((module) => ({
    default: module.SearchableSelect,
  }))
);

const instructionData = {
  title: 'Panduan Tracking Siswa',
  description: 'Lacak kehadiran dan aktivitas log siswa pada hari tertentu secara kronologis.',
  items: [
    { text: 'Pilih siswa dan masukkan tanggal untuk melacak aktivitas harian.' },
    { text: 'Log aktivitas akan diurutkan secara kronologis berdasarkan waktu pencatatan.' },
  ],
};

// ─── Skema Validasi Zod — Google Platform Standards (Pilar 25) ────────────────
const trackingSearchSchema = z.object({
  siswaId: z.string().min(1, 'Siswa wajib dipilih terlebih dahulu'),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid (YYYY-MM-DD)'),
});

const calendarFilterSchema = z.object({
  siswaId: z.string().min(1, 'ID siswa tidak boleh kosong'),
  bulan: z.string().regex(/^\d{4}-\d{2}$/, 'Format bulan tidak valid (YYYY-MM)'),
});

interface RekapDetailItem {
  tanggal?: string;
  waktu?: string;
  status?: string;
  keterangan?: string;
}

interface RekapStatistik {
  HADIR?: number;
  IZIN?: number;
  SAKIT?: number;
  ALPA?: number;
  TERLAMBAT?: number;
}

interface RekapBulananResponse {
  detail?: RekapDetailItem[];
  statistik?: RekapStatistik;
}

interface StudentActivityItem {
  mapel?: string;
  jenis_kegiatan?: string;
  waktu?: string;
  keterangan?: string | null;
  status?: string;
}

interface TrackingHarianResponse {
  nama?: string;
  nis?: string;
  tanggal?: string;
  status?: string;
  kegiatan?: StudentActivityItem[];
}

interface StudentOptionResponse {
  id: string;
  nama_siswa: string;
  nis?: string;
}

// Subkomponen Kalender Visual Presensi Siswa
function CalendarCard({
  siswaId,
  bulan,
  selectedDate,
  onBulanChange,
  onDateSelect,
  isLocked,
}: {
  siswaId: string;
  bulan: string;
  selectedDate?: string;
  onBulanChange: (val: string) => void;
  onDateSelect?: (dateStr: string) => void;
  isLocked: boolean;
}) {
  const calendarQuery = useQuery({
    queryKey: ['rekap-bulanan-siswa-calendar', siswaId, bulan],
    queryFn: async () => {
      const res = await getRekapBulananSiswa(siswaId, { bulan });
      return (res.data || null) as RekapBulananResponse;
    },
    enabled: !!siswaId && !!bulan && !isLocked,
    staleTime: 5 * 60 * 1000,
  });

  const data = calendarQuery.data || null;
  const loading = calendarQuery.isLoading;

  if (!data && !loading) {
    return (
      <div className="p-10 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-3 border border-slate-100 dark:border-slate-800">
          <Calendar size={28} />
        </div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          Pilih siswa untuk memuat kalender kehadiran
        </p>
      </div>
    );
  }

  return (
    <SharedVisualAttendanceCalendar
      title="Kalender Visual Presensi Siswa"
      bulan={bulan}
      selectedDate={selectedDate}
      onBulanChange={onBulanChange}
      onDateSelect={onDateSelect}
      details={data?.detail}
      statistik={data?.statistik}
      isLoading={loading}
    />
  );
}

export interface UniversalTrackingSiswaViewProps {
  // Target & Context Overrides
  siswaId?: string;
  initialSiswaNama?: string;
  kelasId?: string;
  kelasNama?: string;
  jurusanId?: string;
  jurusanNama?: string;
  tahunPelajaranId?: string;
  semesterId?: string;

  // Presentation & Layout Modes
  isModal?: boolean;
  hideLayout?: boolean; // When true, does NOT wrap with AcademicPageLayout (suitable for Tabs & Modals)
  hideHeader?: boolean; // When true, hides "Kembali ke Rekap"
  hideScopeBanner?: boolean; // Hides scope badge/pill if needed
  readOnly?: boolean;

  // Custom Titles/Breadcrumbs
  title?: string;
  description?: string;
  onClose?: () => void;
}

export const TrackingSiswaView: React.FC<UniversalTrackingSiswaViewProps> = React.memo(({
  siswaId: propSiswaId,
  initialSiswaNama,
  kelasId: propKelasId,
  kelasNama: propKelasNama,
  jurusanId: propJurusanId,
  jurusanNama: propJurusanNama,
  tahunPelajaranId,
  semesterId,
  isModal = false,
  hideLayout = false,
  hideHeader = false,
  hideScopeBanner = false,
  readOnly = false,
  title = 'Tracking Aktivitas Siswa',
  description = 'Lihat jejak kehadiran dan aktivitas siswa secara kronologis.',
  onClose,
}) => {
  const [searchParams] = useSearchParams();
  const paramSiswaId = searchParams.get('siswa_id') || '';
  const navigate = useNavigate();

  const { subscription } = useAuthStore();
  const { can } = useCapabilities();

  const [tanggal, setTanggal] = useState<string>(toLocalDate());
  const [bulan, setBulan] = useState<string>(toLocalMonth());
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>(
    propSiswaId || paramSiswaId || ''
  );

  // Sync prop changes
  useEffect(() => {
    if (propSiswaId) {
      setSelectedSiswaId(propSiswaId);
    } else if (paramSiswaId) {
      setSelectedSiswaId(paramSiswaId);
    }
  }, [propSiswaId, paramSiswaId]);

  const canView = useMemo(() => can('attendance.reports.view'), [can]);
  const subFeatures =
    (subscription as unknown as Record<string, unknown>)?.features ||
    subscription?.Plan?.features_json ||
    subscription?.plan?.features_json ||
    [];
  const isLocked = !Array.isArray(subFeatures) || !subFeatures.includes('ABSENSI');

  // Query opsi siswa (didukung filter kelas atau jurusan)
  const siswaOptionsQuery = useQuery({
    queryKey: ['siswa-options-tracking', propKelasId, propJurusanId],
    queryFn: async () => {
      if (propKelasId) {
        const res = await siswaApi.getAll({ kelas_id: propKelasId, limit: 1000 });
        return (
          (Array.isArray(res?.data) ? (res.data as StudentOptionResponse[]) : [])?.map((s) => ({
            value: s?.id || '',
            label: s?.nama_siswa || '',
          })) || []
        );
      } else if (propJurusanId) {
        const res = await siswaApi.getAll({ jurusan_id: propJurusanId, limit: 1000 });
        return (
          (Array.isArray(res?.data) ? (res.data as StudentOptionResponse[]) : [])?.map((s) => ({
            value: s?.id || '',
            label: s?.nama_siswa || '',
          })) || []
        );
      } else {
        const rawOpts = await dropdownApi.getSiswaForDropdown();
        return (
          (Array.isArray(rawOpts) ? rawOpts : [])?.map((opt) => ({
            ...opt,
            label: opt?.label?.includes(' - ') ? opt.label.split(' - ')[0] : opt?.label || '',
          })) || []
        );
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const siswaOptions = siswaOptionsQuery.data || [];

  // Jika selectedSiswaId belum ada di opsi dropdown (misal dari prop spesifik), ambil detailnya
  const singleSiswaQuery = useQuery({
    queryKey: ['siswa-single-tracking', selectedSiswaId],
    queryFn: async () => {
      const res = await siswaApi.getById(selectedSiswaId);
      return res?.data || null;
    },
    enabled: !!selectedSiswaId && !siswaOptions.some((s) => s.value === selectedSiswaId),
    staleTime: 5 * 60 * 1000,
  });

  // Query Tracking Harian Siswa
  const trackingQuery = useQuery({
    queryKey: ['tracking-harian-siswa', selectedSiswaId, tanggal],
    queryFn: async () => {
      const res = await getTrackingHarianSiswa(selectedSiswaId, { tanggal });
      return (res.data || null) as TrackingHarianResponse;
    },
    enabled: !!selectedSiswaId && !!tanggal && !isLocked,
    staleTime: 5 * 60 * 1000,
  });

  const result = trackingQuery.data || null;
  const loading = trackingQuery.isLoading;

  const currentIndex = useMemo(() => {
    return (
      (Array.isArray(siswaOptions) ? siswaOptions : [])?.findIndex(
        (opt) => opt?.value === selectedSiswaId
      ) ?? -1
    );
  }, [siswaOptions, selectedSiswaId]);

  const handlePrevSiswa = () => {
    if (currentIndex > 0) {
      setSelectedSiswaId(siswaOptions[currentIndex - 1].value);
    }
  };

  const handleNextSiswa = () => {
    if (currentIndex >= 0 && currentIndex < siswaOptions.length - 1) {
      setSelectedSiswaId(siswaOptions[currentIndex + 1].value);
    }
  };

  if (!canView) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertDescription>Akses Ditolak: Anda tidak memiliki izin melihat laporan tracking presensi.</AlertDescription>
      </Alert>
    );
  }

  // Nama dan NIS yang akan ditampilkan pada profil
  const displayStudentName =
    result?.nama ||
    (singleSiswaQuery.data as { nama_siswa?: string })?.nama_siswa ||
    initialSiswaNama ||
    siswaOptions.find((o) => o.value === selectedSiswaId)?.label ||
    'Siswa';

  const displayStudentNis =
    result?.nis ||
    (singleSiswaQuery.data as { nis?: string })?.nis ||
    '-';

  // Grid Konten Utama
  const contentBody = (
    <div className="space-y-6">
      {/* Scope Banner (bila dipanggil dari Dashboard Role dengan filter Jurusan/Kelas) */}
      {!hideScopeBanner && (propJurusanNama || propKelasNama) && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {propJurusanNama || 'Kejuruan'}
                </span>
                {propKelasNama && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                    Kelas: {propKelasNama}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Data pelacakan presensi terfilter khusus untuk rombel binaan.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hidden sm:inline-block">
            Scope Aktif
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Kolom Kiri: Filter & Profil */}
        <div className="space-y-6">
          <SectionCard title="Filter & Profil" icon={User} fullWidth>
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="pilih-siswa-select"
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
                  >
                    Pilih Siswa
                  </label>
                  {siswaOptions.length > 0 && currentIndex !== -1 && (
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                      {currentIndex + 1} / {siswaOptions.length} Siswa
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Siswa sebelumnya"
                    onClick={handlePrevSiswa}
                    disabled={currentIndex <= 0}
                    className="h-11 w-11 shrink-0 rounded-xl border-slate-200 dark:border-slate-800 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft size={18} />
                  </Button>

                  <div className="flex-1 min-w-0">
                    <Suspense
                      fallback={
                        <div className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                      }
                    >
                      <SearchableSelect
                        id="pilih-siswa-select"
                        aria-label="Pilih siswa untuk tracking aktivitas"
                        value={selectedSiswaId}
                        onValueChange={(val) => setSelectedSiswaId(val)}
                        options={siswaOptions}
                        placeholder="Cari Nama Siswa..."
                        triggerClassName="h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold text-xs"
                      />
                    </Suspense>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Siswa berikutnya"
                    onClick={handleNextSiswa}
                    disabled={currentIndex === -1 || currentIndex >= siswaOptions.length - 1}
                    className="h-11 w-11 shrink-0 rounded-xl border-slate-200 dark:border-slate-800 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight size={18} />
                  </Button>
                </div>
              </div>

              {/* Student Profile Identity Card */}
              {selectedSiswaId && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                    <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
                      <GraduationCap size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {displayStudentName}
                      </h4>
                      <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        NIS: {displayStudentNis}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Status Harian Siswa */}
          <SectionCard title="Status Harian" icon={Activity} fullWidth>
            {result ? (
              <div className="flex flex-col items-center py-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div
                  className={cn(
                    'w-16 h-16 rounded-2xl flex items-center justify-center mb-3 border transition-all',
                    result.status?.toUpperCase().includes('HADIR') &&
                      !result.status?.toUpperCase().includes('BELUM')
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30'
                      : result.status?.toUpperCase().includes('TERLAMBAT')
                      ? 'bg-purple-50 border-purple-100 text-purple-600 dark:bg-purple-900/20 dark:border-purple-900/30'
                      : result.status?.toUpperCase().includes('SAKIT') ||
                        result.status?.toUpperCase().includes('IZIN') ||
                        result.status?.toUpperCase().includes('DISPEN')
                      ? 'bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-950/20 dark:border-blue-900/30'
                      : result.status?.toUpperCase().includes('ALPA') ||
                        result.status?.toUpperCase().includes('ALFA')
                      ? 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30'
                      : 'bg-slate-50 border-slate-100 text-slate-400 dark:bg-slate-900 dark:border-slate-800'
                  )}
                >
                  <Activity size={32} />
                </div>

                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Keterangan Hari Ini
                </div>
                <Badge
                  variant={
                    result.status?.toUpperCase().includes('HADIR') &&
                    !result.status?.toUpperCase().includes('BELUM')
                      ? 'success'
                      : result.status?.toUpperCase().includes('TERLAMBAT')
                      ? 'warning'
                      : result.status?.toUpperCase().includes('ALPA') ||
                        result.status?.toUpperCase().includes('ALFA')
                      ? 'error'
                      : result.status?.toUpperCase().includes('SAKIT') ||
                        result.status?.toUpperCase().includes('IZIN') ||
                        result.status?.toUpperCase().includes('DISPEN')
                      ? 'info'
                      : 'secondary'
                  }
                  className="h-9 px-6 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border-none"
                >
                  {result.status || 'BELUM ABSEN'}
                </Badge>

                {/* Catatan / Keterangan Tambahan */}
                {(() => {
                  const kegiatanArr = Array.isArray(result?.kegiatan) ? result.kegiatan : [];
                  const catatanEntry =
                    kegiatanArr.find(
                      (k) =>
                        k?.keterangan &&
                        k.keterangan.trim() &&
                        k.keterangan.toUpperCase() !== 'LOG TRANSAKSI' &&
                        String(k?.status || '').toUpperCase() === (result?.status || '').toUpperCase()
                    ) ||
                    kegiatanArr.find(
                      (k) =>
                        k?.keterangan &&
                        k.keterangan.trim() &&
                        k.keterangan.toUpperCase() !== 'LOG TRANSAKSI'
                    );
                  return catatanEntry ? (
                    <div className="mt-3.5 w-full">
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3.5 py-2.5">
                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                          Catatan
                        </div>
                        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 italic leading-relaxed">
                          {catatanEntry.keterangan}
                        </p>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            ) : (
              <p className="text-center py-6 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                Pilih siswa untuk melihat status hari ini
              </p>
            )}
          </SectionCard>
        </div>

        {/* Kolom Kanan: Visualisasi Kalender & Timeline */}
        <div className="space-y-6">
          <SectionCard title="Visualisasi Kehadiran" icon={Calendar} fullWidth>
            <CalendarCard
              siswaId={selectedSiswaId}
              bulan={bulan}
              selectedDate={tanggal}
              onBulanChange={setBulan}
              onDateSelect={(newDate) => setTanggal(newDate)}
              isLocked={isLocked}
            />
          </SectionCard>

          <SectionCard fullWidth className="p-5 flex flex-col w-full min-w-0">
            <SharedAttendanceTimeline
              title="Timeline Aktivitas Siswa"
              selectedDate={tanggal}
              items={result?.kegiatan || []}
              isLoading={loading}
              emptyDescription={
                selectedSiswaId
                  ? 'Tidak ada rincian aktivitas tercatat untuk tanggal ini.'
                  : 'Pilih siswa untuk melihat timeline aktivitas.'
              }
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );

  // Jika hideLayout true (misal saat dipanggil di dalam Modal atau Tab Role Dashboard)
  if (hideLayout) {
    return contentBody;
  }

  // Jika standalone Page dengan AcademicPageLayout
  return (
    <PremiumFeatureGate
      isLocked={isLocked}
      moduleName="ABSENSI"
      featureName="Tracking Aktivitas Siswa"
      description="Dapatkan laporan jejak aktivitas siswa secara kronologis, mulai dari gerbang kedatangan hingga setiap sesi pelajaran yang diikuti."
    >
      <AcademicPageLayout
        title={title}
        description={description}
        instruction={instructionData}
        hardeningModuleKey="trackingsiswapage"
        breadcrumbs={
          !hideHeader
            ? [
                { label: 'Presensi', path: '/attendance/rekap' },
                { label: 'Tracking Aktivitas Siswa', active: true },
              ]
            : undefined
        }
        toolbar={
          !hideHeader && (
            <Button
              variant="toolbarOutline"
              onClick={() => navigate('/attendance/rekap')}
              size="toolbar"
              className="rounded-xl border-slate-200 dark:border-slate-800 font-bold text-[10px] uppercase tracking-widest h-10 px-4 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Kembali ke Rekap
            </Button>
          )
        }
      >
        {contentBody}
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

TrackingSiswaView.displayName = 'TrackingSiswaView';
