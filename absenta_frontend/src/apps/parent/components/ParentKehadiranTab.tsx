import React, { useEffect, useMemo, useState } from 'react';
import {
  DoorOpen,
  BookOpen,
  GraduationCap,
  Briefcase,
  Layers,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { getStudentMonthlyRecap, type MonthlyRecapResponse } from '@/api/parent.api';
import { toLocalDate, toLocalMonth } from '@/utils/attendance/time';
import { cn } from '@/lib/utils';
import {
  MapelMultiChannelMatrixTable,
  type MapelMatrixData,
} from '@/components/attendance/tracking/MapelMultiChannelMatrixTable';
import { MonthlyAnomalyFeed } from '@/components/attendance/tracking/MonthlyAnomalyFeed';
import type { CalendarDayDetail } from '@/components/attendance/tracking/trackingTypes';

interface ParentKehadiranTabProps {
  siswaId: string;
  studentName?: string;
}

export const ParentKehadiranTab: React.FC<ParentKehadiranTabProps> = ({
  siswaId,
  studentName,
}) => {
  const [bulan, setBulan] = useState<string>(toLocalMonth());
  const [selectedDate, setSelectedDate] = useState<string>(toLocalDate());
  const [viewMode, setViewMode] = useState<'MATRIX' | 'ANOMALY'>('MATRIX');
  const [monthData, setMonthData] = useState<MonthlyRecapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMonthlyRecap = async () => {
    if (!siswaId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getStudentMonthlyRecap(siswaId, bulan);
      setMonthData(res);
    } catch (err: any) {
      console.error('[ParentKehadiranTab] Gagal memuat rekap bulanan:', err);
      setError('Gagal memuat tabel rekap kehadiran anak.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonthlyRecap();
  }, [siswaId, bulan]);

  const monthDetails: CalendarDayDetail[] = useMemo(() => {
    return Array.isArray(monthData?.rekap_detail) ? monthData.rekap_detail : [];
  }, [monthData]);

  const matrixData: MapelMatrixData | undefined = monthData?.mapel_matrix || undefined;

  const anomaliCount = useMemo(() => {
    return monthDetails.filter((d) => d.anomali?.is_anomali).length;
  }, [monthDetails]);

  const channelSummary = useMemo(() => {
    let gerbangHadir = 0;
    let gerbangTerlambat = 0;
    let pembiasaanHadir = 0;
    let pembiasaanAlpa = 0;
    let pklHadir = 0;
    let pklActive = false;

    for (const d of monthDetails) {
      if (d.gerbang?.datang_status === 'HADIR' || d.gerbang?.datang_status === 'TERLAMBAT') {
        gerbangHadir++;
      }
      if (d.gerbang?.is_terlambat || d.gerbang?.datang_status === 'TERLAMBAT') {
        gerbangTerlambat++;
      }
      if (d.pembiasaan?.status === 'HADIR') pembiasaanHadir++;
      if (d.pembiasaan?.status === 'ALPA') pembiasaanAlpa++;
      if (d.pkl?.status) {
        pklActive = true;
        if (d.pkl.status === 'HADIR') pklHadir++;
      }
    }

    let kbmTotal = 0;
    let kbmHadir = 0;
    if (matrixData?.summary_per_mapel) {
      Object.values(matrixData.summary_per_mapel).forEach((m) => {
        kbmTotal += m.total_sesi || 0;
        kbmHadir += m.hadir || 0;
      });
    }

    const kbmPersentase = kbmTotal > 0 ? Math.round((kbmHadir / kbmTotal) * 100) : 100;

    return {
      gerbang: { total_hadir: gerbangHadir, total_terlambat: gerbangTerlambat },
      pembiasaan: { total_hadir: pembiasaanHadir, total_alpa: pembiasaanAlpa },
      kbm: { hadir_sesi: kbmHadir, total_sesi: kbmTotal, persentase: kbmPersentase },
      pkl: { is_active: pklActive, total_hadir: pklHadir },
    };
  }, [monthDetails, matrixData]);

  return (
    <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
      {/* Header Title & Month Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Tabel Rekap Kehadiran {studentName ? `— ${studentName}` : 'Anak'}
          </h3>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Pantau kehadiran masuk gerbang, pembiasaan, dan setiap mata pelajaran selama sebulan
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Bulan:
            </span>
            <input
              type="month"
              value={bulan}
              onChange={(e) => setBulan(e.target.value)}
              className="h-9 px-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            />
          </div>
          <button
            type="button"
            onClick={loadMonthlyRecap}
            disabled={loading}
            title="Perbarui Tabel"
            className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={15} className={cn(loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Ringkasan 4 Kolom (Sama seperti tampilan Siswa) */}
      <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
        <div className="flex items-center gap-2.5 px-2 sm:px-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <DoorOpen size={15} />
          </div>
          <div className="min-w-0 leading-tight">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Gerbang Sekolah
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {channelSummary.gerbang.total_hadir} Hari
              </span>
              {channelSummary.gerbang.total_terlambat > 0 && (
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  ({channelSummary.gerbang.total_terlambat} Telat)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2 sm:px-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <BookOpen size={15} />
          </div>
          <div className="min-w-0 leading-tight">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Pembiasaan
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                {channelSummary.pembiasaan.total_hadir} Sesi
              </span>
              {channelSummary.pembiasaan.total_alpa > 0 && (
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                  ({channelSummary.pembiasaan.total_alpa} Alpa)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2 sm:px-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <GraduationCap size={15} />
          </div>
          <div className="min-w-0 leading-tight">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Pelajaran Kelas
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                {channelSummary.kbm.persentase}%
              </span>
              <span className="text-[10px] text-slate-400">
                ({channelSummary.kbm.hadir_sesi}/{channelSummary.kbm.total_sesi})
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 px-2 sm:px-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Briefcase size={15} />
          </div>
          <div className="min-w-0 leading-tight">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              PKL / Magang
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {channelSummary.pkl.is_active
                  ? `${channelSummary.pkl.total_hadir} Hari`
                  : 'Bukan PKL'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Switcher Tampilan: Tabel Rekap 30 Hari / Catatan Khusus */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('MATRIX')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
              viewMode === 'MATRIX'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            )}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tabel Rekap 30 Hari</span>
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
            <span>Catatan Ketidakhadiran ({anomaliCount})</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Tabel Rekap Presensi (Sama dengan di Dashboard Siswa) */}
      <div>
        {viewMode === 'MATRIX' ? (
          <MapelMultiChannelMatrixTable
            matrixData={matrixData}
            bulan={bulan}
            selectedDate={selectedDate}
            onDateSelect={(newDate) => setSelectedDate(newDate)}
            isLoading={loading}
          />
        ) : (
          <MonthlyAnomalyFeed
            details={monthDetails}
            selectedDate={selectedDate}
            onDateSelect={(newDate) => setSelectedDate(newDate)}
          />
        )}
      </div>
    </div>
  );
};
