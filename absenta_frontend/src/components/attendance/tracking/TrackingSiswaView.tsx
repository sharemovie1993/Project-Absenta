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
  GraduationCap,
  DoorOpen,
  BookOpen,
  Briefcase,
  AlertTriangle,
  Clock,
  Layers
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
import { SharedAttendanceTimeline } from '../SharedAttendanceTimeline';
import {
  MultiChannelMonthlyCalendar,
  type CalendarDayDetail,
  type CalendarStatistik,
} from './MultiChannelMonthlyCalendar';
import { MonthlyAnomalyFeed } from './MonthlyAnomalyFeed';

const SearchableSelect = lazy(() =>
  import('@/components/ui/SearchableSelect').then((module) => ({
    default: module.SearchableSelect,
  }))
);

const instructionData = {
  title: 'Panduan Tracking Siswa',
  description: 'Lacak kehadiran multi-channel (Gerbang, Pembiasaan, KBM, PKL) siswa secara kronologis.',
  items: [
    { text: 'Pilih siswa dan bulan untuk menganalisis performa 4 channel kehadiran.' },
    { text: 'Gunakan kalender multi-strip atau tab log anomali untuk mendeteksi siswa yang bolos di tengah jam.' },
    { text: 'Klik tanggal mana pun untuk membedah linimasa menit-ke-menit pada hari tersebut.' },
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

interface RekapBulananResponse {
  nama_siswa?: string;
  bulan?: string;
  detail?: CalendarDayDetail[];
  statistik?: CalendarStatistik;
  persentase_kehadiran?: number;
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
  title = 'Tracking Multi-Channel Siswa',
  description = 'Lacak jejak kehadiran multi-channel (Gerbang, Pembiasaan, KBM, PKL) secara kronologis.',
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

  // Tab View Mode: 'CALENDAR' or 'ANOMALY'
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'ANOMALY'>('CALENDAR');

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

  // Jika selectedSiswaId belum ada di opsi dropdown, ambil detailnya
  const singleSiswaQuery = useQuery({
    queryKey: ['siswa-single-tracking', selectedSiswaId],
    queryFn: async () => {
      const res = await siswaApi.getById(selectedSiswaId);
      return res?.data || null;
    },
    enabled: !!selectedSiswaId && !siswaOptions.some((s) => s.value === selectedSiswaId),
    staleTime: 5 * 60 * 1000,
  });

  // Query Rekap Bulanan Siswa (Multi-Channel Full-Spectrum)
  const monthlyRekapQuery = useQuery({
    queryKey: ['rekap-bulanan-siswa-calendar', selectedSiswaId, bulan],
    queryFn: async () => {
      const res = await getRekapBulananSiswa(selectedSiswaId, { bulan });
      return (res?.data || res || null) as RekapBulananResponse;
    },
    enabled: !!selectedSiswaId && !!bulan && !isLocked,
    staleTime: 5 * 60 * 1000,
  });

  const rawMonthData: any = monthlyRekapQuery.data || null;
  const monthData: RekapBulananResponse | null = rawMonthData?.data || rawMonthData || null;
  const monthLoading = monthlyRekapQuery.isLoading;
  const channelSummary = monthData?.statistik?.channel_summary;
  const monthDetails = monthData?.detail || [];

  // Hitung jumlah anomali bulan ini
  const anomaliCount = useMemo(() => {
    if (typeof channelSummary?.anomali_count === 'number') {
      return channelSummary.anomali_count;
    }
    return monthDetails.filter((d) => d.anomali?.is_anomali).length;
  }, [channelSummary, monthDetails]);

  // Query Tracking Harian Siswa untuk tanggal terpilih
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

  // Konten Utama
  const contentBody = (
    <div className="space-y-5 w-full max-w-full min-w-0 pb-16 sm:pb-6">
      {/* ── 1. SCOPE BANNER ── */}
      {!hideScopeBanner && (propJurusanNama || propKelasNama) && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-2xs">
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
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Data pelacakan presensi terfilter khusus untuk rombel binaan.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hidden sm:inline-block">
            Scope Aktif
          </span>
        </div>
      )}

      {/* ── 2. MULTI-CHANNEL PERFORMANCE STRIP (4 CARDS) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Card 1: Gerbang */}
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <DoorOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span>Gerbang Masuk</span>
            </span>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {channelSummary?.gerbang?.total_hadir ?? 0} Hadir
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            {channelSummary?.gerbang?.total_terlambat ?? 0} Terlambat • {channelSummary?.gerbang?.total_tap_gantung ?? 0} Gantung
          </div>
        </div>

        {/* Card 2: Pembiasaan */}
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
              <span>Pembiasaan</span>
            </span>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {channelSummary?.pembiasaan?.total_hadir ?? 0} Sesi
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            {channelSummary?.pembiasaan?.total_alpa ?? 0} Terlewat (Alpa)
          </div>
        </div>

        {/* Card 3: KBM */}
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-amber-500" />
              <span>Sesi KBM</span>
            </span>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {channelSummary?.kbm?.persentase ?? 100}% Hadir
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            {channelSummary?.kbm?.hadir_sesi ?? 0}/{channelSummary?.kbm?.total_sesi ?? 0} JP • {channelSummary?.kbm?.alpa_sesi ?? 0} Alpa JP
          </div>
        </div>

        {/* Card 4: PKL */}
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-purple-500" />
              <span>DU/DI (PKL)</span>
            </span>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {channelSummary?.pkl?.is_active
              ? `${channelSummary.pkl.total_hadir} Hadir`
              : 'Non-PKL'}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            {channelSummary?.pkl?.is_active
              ? (channelSummary.pkl.mitra_nama || 'DU/DI Terkait')
              : 'KBM Sekolah Normal'}
          </div>
        </div>
      </div>

      {/* ── 3. DUA KOLOM: PROFIL/FILTER & KALENDER MULTI-CHANNEL ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
        {/* Kolom Kiri: Filter & Profil + Status Harian */}
        <div className="space-y-5">
          <SectionCard title="Filter & Profil Siswa" icon={User} fullWidth>
            <div className="space-y-4">
              <div className="space-y-1.5">
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
                    className="h-10 w-10 shrink-0 rounded-xl border-slate-200 dark:border-slate-800 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </Button>

                  <div className="flex-1 min-w-0">
                    <Suspense
                      fallback={
                        <div className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                      }
                    >
                      <SearchableSelect
                        id="pilih-siswa-select"
                        aria-label="Pilih siswa untuk tracking aktivitas"
                        value={selectedSiswaId}
                        onValueChange={(val) => setSelectedSiswaId(val)}
                        options={siswaOptions}
                        placeholder="Cari Nama Siswa..."
                        triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold text-xs"
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
                    className="h-10 w-10 shrink-0 rounded-xl border-slate-200 dark:border-slate-800 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>

              {/* Student Profile Identity Card */}
              {selectedSiswaId && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-2xs shrink-0 font-bold text-sm">
                      {displayStudentName.slice(0, 2).toUpperCase()}
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

          {/* Status Harian Siswa untuk Tanggal Terpilih */}
          <SectionCard title="Status Hari Terpilih" icon={Activity} fullWidth>
            {result ? (
              <div className="flex flex-col items-center py-2 space-y-2.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Tanggal: {tanggal}
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
                  className="h-8 px-4 rounded-xl text-[10.5px] font-black uppercase tracking-wider"
                >
                  {result.status || 'BELUM ABSEN'}
                </Badge>

                {/* Catatan / Keterangan Tambahan */}
                {(() => {
                  const kegiatanArr = Array.isArray(result?.kegiatan) ? result.kegiatan : [];
                  const catatanEntry = kegiatanArr.find(
                    (k) =>
                      k?.keterangan &&
                      k.keterangan.trim() &&
                      k.keterangan.toUpperCase() !== 'LOG TRANSAKSI'
                  );
                  return catatanEntry ? (
                    <div className="w-full">
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2">
                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                          Catatan Hari Ini
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
              <p className="text-center py-4 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                Pilih siswa untuk melihat status
              </p>
            )}
          </SectionCard>
        </div>

        {/* Kolom Kanan: Switcher Tab Kalender vs Log Anomali */}
        <div className="space-y-5">
          <SectionCard fullWidth className="p-3 sm:p-5">
            {/* View Mode Switcher Header */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('CALENDAR')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                    viewMode === 'CALENDAR'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  )}
                >
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Kalender Multi-Strip</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('ANOMALY')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                    viewMode === 'ANOMALY'
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                  )}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Log Anomali ({anomaliCount})</span>
                </button>
              </div>

              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Bulan Aktif: <span className="font-bold text-slate-800 dark:text-slate-200">{bulan}</span>
              </div>
            </div>

            {/* Content Based on View Mode */}
            <div className="pt-3">
              {viewMode === 'CALENDAR' ? (
                <MultiChannelMonthlyCalendar
                  bulan={bulan}
                  selectedDate={tanggal}
                  onBulanChange={setBulan}
                  onDateSelect={(newDate) => setTanggal(newDate)}
                  details={monthDetails}
                  statistik={monthData?.statistik}
                  isLoading={monthLoading}
                />
              ) : (
                <MonthlyAnomalyFeed
                  details={monthDetails}
                  selectedDate={tanggal}
                  onDateSelect={(newDate) => setTanggal(newDate)}
                />
              )}
            </div>
          </SectionCard>

          {/* Detailed Timeline Sesi Jam Pelajaran Hari Terpilih */}
          <SectionCard fullWidth className="p-3 sm:p-5 flex flex-col w-full min-w-0">
            <SharedAttendanceTimeline
              title={`Linimasa Detail Kronologis: ${tanggal}`}
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

  // Jika hideLayout true (saat dipanggil di dalam Modal atau Tab Role Dashboard)
  if (hideLayout) {
    return contentBody;
  }

  // Standalone Page Mode dengan AcademicPageLayout
  return (
    <PremiumFeatureGate
      isLocked={isLocked}
      moduleName="ABSENSI"
      featureName="Tracking Multi-Channel Siswa"
      description="Lacak kehadiran 4 channel (Gerbang, Pembiasaan, KBM, PKL) secara komprehensif dalam satu tampilan bulanan."
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
                { label: 'Tracking Multi-Channel Siswa', active: true },
              ]
            : undefined
        }
        toolbar={
          !hideHeader && (
            <Button
              variant="toolbarOutline"
              size="sm"
              onClick={() => navigate('/attendance/rekap')}
              className="gap-2"
            >
              <ArrowLeft size={16} />
              <span>Kembali ke Rekap</span>
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
export default TrackingSiswaView;
