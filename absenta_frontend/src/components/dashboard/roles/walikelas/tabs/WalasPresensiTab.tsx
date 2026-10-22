import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  CalendarCheck, 
  UserCheck, 
  AlertTriangle, 
  Clock, 
  Phone, 
  ShieldAlert, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button, Badge } from '@/components/ui';
import { getRekapKelasBulanan } from '@/api/attendance/rekap.api';
import { getEwsPerKelasList } from '@/api/kurikulum/waliKelas.api';
import { cn } from '@/lib/utils';
import type { WalasDashboardData } from '../types';

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
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Rekap Bulanan Kelas (Reuse Attendance Rekap Module)
  const { data: rekapData, isLoading: isLoadingRekap } = useQuery({
    queryKey: ['walas-rekap-bulanan', kelasId, selectedMonth],
    queryFn: () => getRekapKelasBulanan(kelasId || '', selectedMonth),
    enabled: Boolean(kelasId),
    staleTime: 60 * 1000,
  });

  // 2. Fetch EWS Per Kelas (Reuse Kurikulum Wali Kelas Module)
  const { data: ewsData, isLoading: isLoadingEws } = useQuery({
    queryKey: ['walas-ews-presensi', kelasId],
    queryFn: () => getEwsPerKelasList(kelasId),
    enabled: Boolean(kelasId),
    staleTime: 60 * 1000,
  });

  const rawEws = Array.isArray(ewsData?.data) ? ewsData.data : (Array.isArray(ewsData) ? ewsData : []);
  const rawRekapList = Array.isArray(rekapData?.data?.rekap) ? rekapData.data.rekap : (Array.isArray(rekapData?.data) ? rekapData.data : []);

  // Filter siswa berdasarkan search query
  const filteredRekap = rawRekapList?.filter((s: any) => 
    !searchQuery || 
    s?.nama_siswa?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
    s?.nis?.includes(searchQuery)
  );

  const formatBulanDisplay = (ym: string) => {
    const [y, m] = ym.split('-');
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  const handleChangeMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(d.toISOString().slice(0, 7));
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* 1. TOP CONTROLS & FILTER BULAN */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Rekapitulasi Presensi {kelasNama || data?.kelasInfo?.nama_kelas || 'Rombel'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Matriks kehadiran bulanan peserta didik terintegrasi mesin presensi Absenta
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 p-1">
            <button
              onClick={() => handleChangeMonth(-1)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[130px] text-center">
              {formatBulanDisplay(selectedMonth)}
            </span>
            <button
              onClick={() => handleChangeMonth(1)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. EARLY WARNING CARDS (EWS SISWA BERISIKO) */}
      {rawEws?.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Early Warning System (EWS) — Siswa Berisiko Tinggi
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rawEws.map((item: any, idx: number) => (
              <Card 
                key={idx}
                className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {item.studentName?.charAt(0) || 'S'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.studentName}</p>
                      <p className="text-[11px] text-slate-400">NIS: {item.nis || '-'}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-rose-100 text-rose-700 border-rose-300 text-[10px] shrink-0 font-bold">
                    {item.riskCategory || 'Alfa Tinggi'}
                  </Badge>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/30 text-xs space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Total Alfa Bulan Ini:</span>
                    <strong className="text-rose-600">{item.totalAlphaThisMonth || item.consecutiveDays || 0} Hari</strong>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Rekomendasi:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{item.recommendation}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 bg-white dark:bg-slate-900 text-xs text-rose-700 border-rose-200 hover:bg-rose-50 font-semibold"
                    onClick={() => onOpenRujukanModal && onOpenRujukanModal(item)}
                  >
                    <ShieldAlert className="w-3.5 h-3.5 mr-1 text-rose-500" /> Rujuk ke BK
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 3. MATRIKS TABEL KEHADIRAN SISWA */}
      <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau NIS siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Hadir</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Sakit</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Izin</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Alfa</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4 w-28">NIS</th>
                <th className="py-3 px-3 w-16 text-center text-emerald-600">H</th>
                <th className="py-3 px-3 w-16 text-center text-blue-600">S</th>
                <th className="py-3 px-3 w-16 text-center text-amber-600">I</th>
                <th className="py-3 px-3 w-16 text-center text-rose-600">A</th>
                <th className="py-3 px-4 w-24 text-center">% Hadir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRekap && filteredRekap.length > 0 ? (
                filteredRekap.map((s: any, idx: number) => {
                  const hadir = s?.hadir ?? s?.h ?? 0;
                  const sakit = s?.sakit ?? s?.s ?? 0;
                  const izin = s?.izin ?? s?.i ?? 0;
                  const alfa = s?.alfa ?? s?.a ?? 0;
                  const total = hadir + sakit + izin + alfa;
                  const persen = total > 0 ? Math.round((hadir / total) * 100) : 100;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-center font-medium text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {s?.nama_siswa || s?.nama || `Siswa ${idx + 1}`}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono">{s?.nis || '-'}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-600">{hadir}</td>
                      <td className="py-3 px-3 text-center font-bold text-blue-600">{sakit}</td>
                      <td className="py-3 px-3 text-center font-bold text-amber-600">{izin}</td>
                      <td className="py-3 px-3 text-center font-bold text-rose-600">{alfa}</td>
                      <td className="py-3 px-4 text-center font-extrabold">
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg text-xs",
                          persen >= 90 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" :
                          persen >= 75 ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" :
                          "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                        )}>
                          {persen}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    {isLoadingRekap ? "Memuat matriks presensi..." : "Belum ada rekaman presensi pada periode bulan ini."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
});

WalasPresensiTab.displayName = 'WalasPresensiTab';
