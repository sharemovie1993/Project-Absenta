import React, { useEffect, useMemo, useState, Suspense, lazy } from 'react';
import { z } from 'zod';
import toast from 'react-hot-toast';

const instructionData = {
  title: "Panduan Tracking Siswa",
  description: "Lacak kehadiran dan aktivitas log siswa pada hari tertentu.",
  items: [
    { text: "Pilih siswa dan masukkan tanggal untuk melacak aktivitas." },
    { text: "Log aktivitas akan diurutkan secara kronologis berdasarkan waktu pencatatan." }
  ]
};
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  SectionCard, 
  Button, 
  Badge, 
  Loader, 
  Input, 
  Alert, 
  AlertDescription
} from '../../components/ui';
import { useCapabilities } from '../../hooks/useCapabilities';
import { dropdownApi, type DropdownOption } from '../../api/dropdown.api';
import { getTrackingHarianSiswa, getRekapBulananSiswa } from '../../api/attendanceGerbang.api';
import { siswaApi } from '../../api/academic.api';
import { toLocalDate, toLocalMonth } from '../../utils/attendance/time';
import { 
  Calendar, 
  User, 
  Clock, 
  Activity, 
  LayoutGrid, 
  FileText,
  MapPin,
  ArrowLeft,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

const SearchableSelect = lazy(() => import('../../components/ui/SearchableSelect').then(module => ({ default: module.SearchableSelect })));

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
  keterangan?: string | null;  // Catatan dari tap gerbang/sesi — termasuk warisan kegiatan pembiasaan overtime
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

// ─── Skema Validasi Zod — Google Platform Standards (Pilar 25) ────────────────
// Memetakan seluruh field input form secara riil.
// DILARANG KERAS mengganti dengan skema kosong atau komentar palsu untuk bypass audit.
const trackingSearchSchema = z.object({
  siswaId: z.string().min(1, 'Siswa wajib dipilih terlebih dahulu'),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid (YYYY-MM-DD)'),
});

const calendarFilterSchema = z.object({
  siswaId: z.string().min(1, 'ID siswa tidak boleh kosong'),
  bulan: z.string().regex(/^\d{4}-\d{2}$/, 'Format bulan tidak valid (YYYY-MM)'),
});

import { SharedVisualAttendanceCalendar } from '../../components/attendance/SharedVisualAttendanceCalendar';
import { SharedAttendanceTimeline } from '../../components/attendance/SharedAttendanceTimeline';


// Calendar Card Component using Shared Visual Attendance Calendar
function CalendarCard({ 
  siswaId, 
  bulan, 
  selectedDate,
  onBulanChange,
  onDateSelect,
  isLocked
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

  if (!data && !loading) return (
    <div className="p-12 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 mb-4 border border-slate-100 dark:border-slate-800">
        <Calendar size={32} />
      </div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Pilih siswa untuk memuat kalender kehadiran</p>
    </div>
  );

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

export function TrackingSiswaContent({ hideHeader = false, kelasId }: { hideHeader?: boolean; kelasId?: string }) {
  const [searchParams] = useSearchParams();
  const paramSiswaId = searchParams.get('siswa_id') || '';

  const { subscription } = useAuthStore();
  const navigate = useNavigate();
  const { can } = useCapabilities();
  const [tanggal, setTanggal] = useState<string>(toLocalDate());
  const [bulan, setBulan] = useState<string>(toLocalMonth());
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>(paramSiswaId);

  useEffect(() => {
    if (paramSiswaId) {
      setSelectedSiswaId(paramSiswaId);
    }
  }, [paramSiswaId]);

  const canView = useMemo(() => can('attendance.reports.view'), [can]);
  const subFeatures = (subscription as unknown as Record<string, unknown>)?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(subFeatures) || !subFeatures.includes('ABSENSI');

  const siswaOptionsQuery = useQuery({
    queryKey: ['siswa-options-tracking', kelasId],
    queryFn: async () => {
      if (kelasId) {
        const res = await siswaApi.getAll({ kelas_id: kelasId, limit: 1000 });
        return (Array.isArray(res?.data) ? (res.data as StudentOptionResponse[]) : [])?.map((s) => ({
          value: s?.id || '',
          label: s?.nama_siswa || ''
        })) || [];
      } else {
        const rawOpts = await dropdownApi.getSiswaForDropdown();
        return (Array.isArray(rawOpts) ? rawOpts : [])?.map((opt) => ({
          ...opt,
          label: opt?.label?.includes(' - ') ? opt.label.split(' - ')[0] : (opt?.label || '')
        })) || [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const siswaOptions = siswaOptionsQuery.data || [];

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

  const handleSearch = React.useCallback(async () => {
    await trackingQuery.refetch();
  }, [trackingQuery]);

  const currentIndex = useMemo(() => {
    return (Array.isArray(siswaOptions) ? siswaOptions : [])?.findIndex(opt => opt?.value === selectedSiswaId) ?? -1;
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

  if (isLoading) return <div className="flex justify-center py-20"><Loader size="lg" /></div>;
  if (!canView) return <Alert variant="destructive" className="m-4"><AlertDescription>Akses Ditolak</AlertDescription></Alert>;

  const pageContent = (
    <AcademicPageLayout
      title="Tracking Aktivitas Siswa"
      description="Lihat jejak kehadiran dan aktivitas siswa secara kronologis."
      instruction={instructionData}
      hardeningModuleKey="trackingsiswapage"
      breadcrumbs={!hideHeader ? [
        { label: 'Presensi', path: '/attendance/rekap' },
        { label: 'Tracking Aktivitas Siswa', active: true }
      ] : undefined}
      toolbar={!hideHeader && (
        <Button 
          variant="outline" 
          onClick={() => navigate('/attendance/rekap')} 
          size="sm"
          className="rounded-xl border-slate-200 dark:border-slate-800 font-bold text-[10px] uppercase tracking-widest h-10 px-4"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Kembali ke Rekap
        </Button>
      )}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8">
        {/* Sidebar Filter & Info */}
        <div className="space-y-6">
          <SectionCard title="Filter & Profil" icon={User} fullWidth>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="pilih-siswa-select" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pilih Siswa</label>
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
                    className="h-12 w-12 shrink-0 rounded-xl border-slate-200 dark:border-slate-800 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                  >
                    <ChevronLeft size={20} />
                  </Button>

                  <div className="flex-1 min-w-0">
                    <Suspense fallback={<div className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />}>
                      <SearchableSelect
                        id="pilih-siswa-select"
                        aria-label="Pilih siswa untuk tracking aktivitas"
                        value={selectedSiswaId}
                        onValueChange={(val) => setSelectedSiswaId(val)}
                        options={siswaOptions}
                        placeholder="Cari Nama Siswa..."
                        triggerClassName="h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold"
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
                    className="h-12 w-12 shrink-0 rounded-xl border-slate-200 dark:border-slate-800 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                  >
                    <ChevronRight size={20} />
                  </Button>
                </div>
              </div>


              {result && (
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                      <User size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">{result.nama}</h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{result.nis || 'No NIS'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Status Harian" icon={Activity} fullWidth>
            {result ? (
              <div className="flex flex-col items-center py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 border transition-all ${
                  result.status?.toUpperCase().includes('HADIR') && !result.status?.toUpperCase().includes('BELUM')
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/30' 
                    : result.status?.toUpperCase().includes('TERLAMBAT')
                    ? 'bg-purple-50 border-purple-100 text-purple-600 dark:bg-purple-900/20 dark:border-purple-900/30'
                    : result.status?.toUpperCase().includes('SAKIT') || result.status?.toUpperCase().includes('IZIN') || result.status?.toUpperCase().includes('DISPEN')
                    ? 'bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-950/20 dark:border-blue-900/30'
                    : result.status?.toUpperCase().includes('ALPA')
                    ? 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30'
                    : 'bg-slate-50 border-slate-100 text-slate-400 dark:bg-slate-900 dark:border-slate-800'
                }`}>
                  <Activity size={40} />
                </div>

                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Keterangan Hari Ini</div>
                <Badge 
                  variant={
                    result.status?.toUpperCase().includes('HADIR') && !result.status?.toUpperCase().includes('BELUM') ? 'success' :
                    result.status?.toUpperCase().includes('TERLAMBAT') ? 'warning' :
                    result.status?.toUpperCase().includes('ALPA') ? 'error' :
                    result.status?.toUpperCase().includes('SAKIT') || result.status?.toUpperCase().includes('IZIN') || result.status?.toUpperCase().includes('DISPEN') ? 'info' : 'secondary'
                  } 
                  className="h-10 px-8 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] border-none"
                >
                  {result.status || 'BELUM ABSEN'}
                </Badge>
                {/* Catatan: ambil dari entri gerbang utama atau entri pertama yang memiliki keterangan */}
                {(() => {
                  const kegiatanList = Array.isArray(result?.kegiatan) ? result.kegiatan : [];
                  const catatanEntry = kegiatanList.find(
                    k => k?.keterangan && k.keterangan.trim() &&
                         k.keterangan.toUpperCase() !== 'LOG TRANSAKSI' &&
                         String(k?.status || '').toUpperCase() === (result?.status || '').toUpperCase()
                  ) || kegiatanList.find(
                    k => k?.keterangan && k.keterangan.trim() &&
                         k.keterangan.toUpperCase() !== 'LOG TRANSAKSI'
                  );
                  return catatanEntry ? (
                    <div className="mt-4 w-full px-2">
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3">
                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Catatan</div>
                        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 italic leading-relaxed">
                          {catatanEntry.keterangan}
                        </p>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            ) : (
              <p className="text-center py-8 text-[11px] font-bold text-slate-400 uppercase tracking-tight">Data harian akan tampil di sini</p>
            )}
          </SectionCard>
        </div>

        {/* Main Tracking Area */}
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
              emptyDescription={selectedSiswaId ? "Tidak ada rincian aktivitas untuk tanggal ini." : "Pilih siswa untuk melihat timeline aktivitas."}
            />
          </SectionCard>

        </div>
      </div>
    </AcademicPageLayout>
  );

  return (
    <PremiumFeatureGate
      isLocked={isLocked}
      moduleName="ABSENSI"
      featureName="Tracking Aktivitas Siswa"
      description="Dapatkan laporan jejak aktivitas siswa secara kronologis, mulai dari gerbang kedatangan hingga setiap sesi pelajaran yang diikuti."
    >
      {pageContent}
    </PremiumFeatureGate>
  );
}

export default React.memo(function TrackingSiswaPage() {
  return <TrackingSiswaContent />;
});
