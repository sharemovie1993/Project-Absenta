import React, { useState, useMemo, Suspense, lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft,
  ShieldAlert, 
} from 'lucide-react';
import { Button, Loader } from '@/components/ui';
import { getEwsPerKelasList } from '@/api/kurikulum/waliKelas.api';
import type { WalasDashboardData } from '../types';

// Code-splitting heavy components to reduce initial tab bundle (Pilar 21B & TBT Optimization)
const RekapKolektifView = lazy(() =>
  import('@/components/attendance/rekap/RekapKolektifView').then((m) => ({ default: m.RekapKolektifView }))
);
const TrackingSiswaView = lazy(() =>
  import('@/components/attendance/tracking/TrackingSiswaView').then((m) => ({ default: m.TrackingSiswaView }))
);

export interface WalasPresensiTabProps {
  kelasId?: string;
  kelasNama?: string;
  data?: WalasDashboardData;
  onOpenRujukanModal?: (siswa: any) => void;
  onNavigateToDeteksi?: () => void;
}

export const WalasPresensiTab: React.FC<WalasPresensiTabProps> = React.memo(({
  kelasId,
  kelasNama,
  data,
  onNavigateToDeteksi,
}) => {
  // In-Tab Master-Detail State (Tampil Full di dalam Tab tanpa Modal & tanpa pindah halaman)
  const [selectedStudentTracking, setSelectedStudentTracking] = useState<{
    siswaId: string;
    siswaNama: string;
  } | null>(null);

  // Query EWS Siswa At-Risk Rombel (High-Performance Cache)
  const { data: ewsData } = useQuery({
    queryKey: ['walas-ews-presensi', kelasId],
    queryFn: () => getEwsPerKelasList(kelasId),
    enabled: Boolean(kelasId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const atRiskStudents = useMemo(() => {
    const raw = Array.isArray(ewsData?.data) ? ewsData.data : (Array.isArray(ewsData) ? ewsData : []);
    if (raw.length > 0) {
      return raw.map((item: any) => {
        const alfa = Number(item.totalAlphaThisMonth ?? item.consecutiveDays ?? item.total_alfa ?? item.alfaCount ?? 0);
        const persentase = item.persentase_kehadiran !== undefined 
          ? Number(item.persentase_kehadiran) 
          : item.persentase !== undefined 
          ? Number(item.persentase) 
          : Math.max(50, 100 - (alfa * 5));

        return {
          id: String(item.studentId || item.siswa_id || item.id || ''),
          nama: String(item.studentName || item.nama_siswa || item.nama || 'Siswa'),
          nis: String(item.nis || '-'),
          persentase,
          alfaCount: alfa,
          statusHariIni: String(item.status_hari_ini || item.status || 'BELUM_ADA'),
          rekomendasi: String(item.recommendation || item.rekomendasi_tindak_lanjut || item.atRiskReason || 'Perlu bimbingan wali kelas'),
        };
      });
    }
    // Fallback ke data agregator walas jika ada
    if (data?.earlyWarningAlerts && data.earlyWarningAlerts.length > 0) {
      return data.earlyWarningAlerts.map((a: any) => ({
        id: String(a.siswaId || a.id || ''),
        nama: String(a.nama || a.studentName || 'Siswa'),
        nis: '-',
        persentase: a.persentase !== undefined ? Number(a.persentase) : 75,
        alfaCount: Number(a.alfaCount || 0),
        statusHariIni: 'BELUM_ADA',
        rekomendasi: String(a.rekomendasi || 'Perlu bimbingan wali kelas'),
      }));
    }
    return [];
  }, [ewsData, data]);

  const isHistorical = data?.academicContext?.isHistoricalPeriod ?? false;

  // JIKA SISWA DIPILIH: TAMPILKAN TRACKING SECARA FULL DI DALAM TAB (TANPA MODAL, TANPA PINDAH HALAMAN)
  if (selectedStudentTracking) {
    return (
      <div className="space-y-3.5 w-full max-w-full min-w-0 pb-20 sm:pb-8 animate-in fade-in duration-200">
        {/* Navigation Toolbar Kembali ke Rekap Rombel */}
        <div className="flex items-center justify-between gap-3 p-2.5 sm:p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedStudentTracking(null)}
            className="gap-2 font-bold text-xs rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-500" />
            <span>Kembali ke Rekap Rombel</span>
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
              Detail Tracking Siswa Rombel:
            </span>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
              {selectedStudentTracking.siswaNama}
            </span>
          </div>
        </div>

        {/* Full Tracking Siswa View */}
        <Suspense fallback={<div className="p-12 flex justify-center"><Loader size="lg" /></div>}>
          <TrackingSiswaView
            hideLayout={true}
            hideHeader={true}
            hideScopeBanner={true}
            siswaId={selectedStudentTracking.siswaId}
            initialSiswaNama={selectedStudentTracking.siswaNama}
            kelasId={kelasId}
            kelasNama={kelasNama}
            tahunPelajaranId={data?.academicContext?.selectedTahunPelajaranId}
            semesterId={data?.academicContext?.selectedSemesterId}
            onClose={() => setSelectedStudentTracking(null)}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full min-w-0 pb-28 sm:pb-8">
      {/* Shortcut Elegan ke Tab Deteksi Dini jika ada siswa at-risk */}
      {atRiskStudents.length > 0 && onNavigateToDeteksi && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:p-3.5 rounded-2xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                  Deteksi Dini Rombel:
                </span>
                <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-rose-200/80 text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                  {atRiskStudents.length} Siswa
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5">
                Terdapat peserta didik dengan kehadiran &lt; 85% atau alpa beruntun yang memerlukan intervensi.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToDeteksi}
            className="h-7.5 px-3 text-xs font-bold text-rose-600 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 shrink-0 self-end sm:self-auto cursor-pointer"
          >
            Lihat Deteksi Dini &gt;
          </Button>
        </div>
      )}

      {/* REKAPITULASI KOLEKTIF ROMBEL TERPADU (KOMPONEN REKAP KOLEKTIF VIEW DRY) - Code-split Chunk */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4 sm:p-5">
        <Suspense fallback={<div className="p-12 flex justify-center"><Loader size="lg" /></div>}>
          <RekapKolektifView
            kelasId={kelasId}
            kelasNama={kelasNama}
            initialKelasId={kelasId}
            tahunPelajaranId={data?.academicContext?.selectedTahunPelajaranId}
            semesterId={data?.academicContext?.selectedSemesterId}
            hideLayout={true}
            hideScopeBanner={true}
            readOnly={isHistorical}
            onStudentTrackingClick={(siswaId, siswaNama) => {
              setSelectedStudentTracking({
                siswaId,
                siswaNama: siswaNama || '',
              });
            }}
          />
        </Suspense>
      </div>
    </div>
  );
});

WalasPresensiTab.displayName = 'WalasPresensiTab';
