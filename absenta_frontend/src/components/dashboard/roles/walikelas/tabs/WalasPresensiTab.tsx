import React, { useState, useMemo, Suspense, lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Activity, 
  ArrowUpRight, 
  ShieldAlert, 
  UserCheck, 
  AlertTriangle, 
  CalendarCheck,
  Send,
  Sparkles
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button, Badge, Loader } from '@/components/ui';
import { getEwsPerKelasList } from '@/api/kurikulum/waliKelas.api';
import { cn } from '@/lib/utils';
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
}

export const WalasPresensiTab: React.FC<WalasPresensiTabProps> = React.memo(({
  kelasId,
  kelasNama,
  data,
  onOpenRujukanModal,
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
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* 1. EARLY WARNING SYSTEM (EWS): SISWA AT-RISK DENGAN TOMBOL TRACKING (STANDAR KAPROG) */}
      {atRiskStudents.length > 0 && (
        <Card noPadding className="p-4 sm:p-5 rounded-2xl border border-rose-200/80 dark:border-rose-900/60 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-100 dark:border-rose-950/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Deteksi Dini: Siswa Butuh Perhatian Khusus</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                    {atRiskStudents.length} Siswa
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Daftar siswa dengan kehadiran di bawah batas minimum (85%) atau memiliki akumulasi alpa beruntun.
                </p>
              </div>
            </div>

            {onOpenRujukanModal && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenRujukanModal(atRiskStudents[0])}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Rujuk ke BP/BK</span>
              </Button>
            )}
          </div>

          {/* Tabel At-Risk Siswa dengan Tombol Tracking */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-y border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Nama Siswa</th>
                  <th className="py-2.5 px-3 text-center">Tingkat Kehadiran</th>
                  <th className="py-2.5 px-3 text-center">Akumulasi Alpa</th>
                  <th className="py-2.5 px-3">Rekomendasi Tindak Lanjut</th>
                  <th className="py-2.5 px-3 text-right">Aksi Penelusuran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {atRiskStudents.map((siswa) => (
                  <tr key={siswa.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                        {siswa.nama}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        NIS: {siswa.nis}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className={`font-mono font-bold text-xs ${siswa.persentase < 85 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {siswa.persentase}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
                        {siswa.alfaCount} Alpa
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 text-xs">
                      {siswa.rekomendasi}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {/* Tombol Tracking Standar Kaprog */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setTrackingTarget({
                              isOpen: true,
                              siswaId: siswa.id,
                              siswaNama: siswa.nama,
                            })
                          }
                          className="h-7 px-2.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800/60 rounded-lg inline-flex items-center gap-1.5 transition-all duration-150 shadow-2xs hover:shadow-xs group cursor-pointer"
                          title={`Lihat linimasa tracking presensi ${siswa.nama}`}
                        >
                          <Activity className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
                          <span>Tracking</span>
                          <ArrowUpRight className="w-3 h-3 text-indigo-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 2. REKAPITULASI KOLEKTIF ROMBEL TERPADU (KOMPONEN REKAP KOLEKTIF VIEW DRY) - Code-split Chunk */}
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

      {/* 3. MODAL TRACKING SISWA RESMI (STANDAR KAPROG & ABSENTA) - Lazy Mounted */}
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
