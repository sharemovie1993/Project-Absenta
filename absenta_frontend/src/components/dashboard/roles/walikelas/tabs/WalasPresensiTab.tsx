import React, { useState, useMemo, Suspense, lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ShieldAlert, 
} from 'lucide-react';
import { Button, Loader } from '@/components/ui';
import { getEwsPerKelasList } from '@/api/kurikulum/waliKelas.api';
import type { WalasDashboardData } from '../types';

// Code-splitting heavy components to reduce initial tab bundle (Pilar 21B & TBT Optimization)
const RekapKolektifView = lazy(() =>
  import('@/components/attendance/rekap/RekapKolektifView').then((m) => ({ default: m.RekapKolektifView }))
);
const TrackingSiswaModal = lazy(() =>
  import('@/components/attendance/tracking/TrackingSiswaModal').then((m) => ({ default: m.TrackingSiswaModal }))
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
  // Modal Tracking Siswa state
  const [trackingTarget, setTrackingTarget] = useState<{
    isOpen: boolean;
    siswaId: string;
    siswaNama: string;
  }>({
    isOpen: false,
    siswaId: '',
    siswaNama: '',
  });

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
      return raw.map((item: any) => ({
        id: item.siswa_id || item.id,
        nama: item.nama_siswa || item.nama || 'Siswa',
        nis: item.nis || '-',
        persentase: item.persentase_kehadiran || item.persentase || 80,
        alfaCount: item.total_alfa || item.alfaCount || 3,
        statusHariIni: item.status_hari_ini || 'BELUM_ADA',
        rekomendasi: item.rekomendasi_tindak_lanjut || 'Perlu bimbingan wali kelas',
      }));
    }
    // Fallback ke data agregator walas jika ada
    if (data?.earlyWarningAlerts && data.earlyWarningAlerts.length > 0) {
      return data.earlyWarningAlerts.map((a) => ({
        id: a.siswaId,
        nama: a.nama,
        nis: '-',
        persentase: 75,
        alfaCount: a.alfaCount,
        statusHariIni: 'BELUM_ADA',
        rekomendasi: a.rekomendasi,
      }));
    }
    return [];
  }, [ewsData, data]);

  const isHistorical = data?.academicContext?.isHistoricalPeriod ?? false;

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
          />
        </Suspense>
      </div>

      {/* MODAL TRACKING SISWA RESMI (STANDAR KAPROG & ABSENTA) - Lazy Mounted */}
      {trackingTarget.isOpen && (
        <Suspense fallback={<div className="p-8 flex justify-center"><Loader /></div>}>
          <TrackingSiswaModal
            isOpen={trackingTarget.isOpen}
            onClose={() => setTrackingTarget({ isOpen: false, siswaId: '', siswaNama: '' })}
            siswaId={trackingTarget.siswaId}
            siswaNama={trackingTarget.siswaNama}
            kelasId={kelasId}
            kelasNama={kelasNama}
            tahunPelajaranId={data?.academicContext?.selectedTahunPelajaranId}
            semesterId={data?.academicContext?.selectedSemesterId}
          />
        </Suspense>
      )}
    </div>
  );
});

WalasPresensiTab.displayName = 'WalasPresensiTab';
