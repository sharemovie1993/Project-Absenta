import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, 
  FileSpreadsheet, 
  Printer, 
  Search, 
  RefreshCw, 
  Users, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  X,
  Filter
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { hubinApi, type RekapBulananPklRow } from '@/api/hubin.api';
import { toLocalMonth } from '@/utils/attendance/time';
import { exportDataToExcel } from '@/utils/export.utils';
import { useRekapPklColumns, type ViewMode } from './rekapPklColumns';
import { SectionCard, Button, Input, Badge, Loader } from '@/components/ui';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useTahunPelajaranOptions } from '@/hooks/useTahunPelajaranOptions';

const Table = lazy(() => import('@/components/ui/Table').then(m => ({ default: m.Table })));
const RekapPresensiMobileCard = lazy(() =>
  import('./RekapPresensiMobileCard').then(m => ({ default: m.RekapPresensiMobileCard }))
);
const RekapPresensiPklPrintModal = lazy(() =>
  import('./RekapPresensiPklPrintModal').then(m => ({ default: m.RekapPresensiPklPrintModal }))
);

export interface UniversalRekapAbsensiPklViewProps {
  guruId?: string;
  guruNama?: string;
  kelasId?: string;
  jurusanId?: string;
  mitraId?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
  initialBulan?: string;
  hideLayout?: boolean;
  isModal?: boolean;
  readOnly?: boolean;
  onClose?: () => void;
  onNavigateDetail?: (row: RekapBulananPklRow) => void;
  className?: string;
}

export const RekapAbsensiPklView: React.FC<UniversalRekapAbsensiPklViewProps> = React.memo(({
  guruId: propGuruId,
  guruNama: propGuruNama,
  kelasId: propKelasId,
  jurusanId: propJurusanId,
  mitraId: propMitraId,
  tahunPelajaranId: propTpId,
  semesterId: propSemesterId,
  initialBulan,
  hideLayout = false,
  isModal = false,
  readOnly = false,
  onClose,
  onNavigateDetail,
  className = '',
}) => {
  const isMobile = useIsMobile();
  const [bulan, setBulan] = useState<string>(initialBulan || toLocalMonth());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('MATRIX');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Days in month calculation
  const daysInMonth = useMemo(() => {
    if (!bulan || !/^\d{4}-\d{2}$/.test(bulan)) return 31;
    const [y, m] = bulan.split('-');
    return new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
  }, [bulan]);

  const dayNumbers = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  // Resolving Tahun Pelajaran ke label human-readable
  const { rawList: tpList, activeYear } = useTahunPelajaranOptions();
  const currentTpLabel = useMemo(() => {
    if (propTpId) {
      const match = tpList.find((tp) => tp.id === propTpId);
      if (match?.tahun) return match.tahun;
    }
    return activeYear?.tahun || '';
  }, [propTpId, tpList, activeYear]);

  // Main Data Query
  const { data: responseData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['rekap-bulanan-pkl', {
      bulan,
      pembimbing_id: propGuruId,
      kelas_id: propKelasId,
      jurusan_id: propJurusanId,
      mitra_id: propMitraId,
      tahun_pelajaran_id: propTpId,
      semester_id: propSemesterId,
    }],
    queryFn: async () => {
      const res = await hubinApi.getRekapBulananPkl({
        bulan,
        pembimbing_id: propGuruId || undefined,
        kelas_id: propKelasId || undefined,
        jurusan_id: propJurusanId || undefined,
        mitra_id: propMitraId || undefined,
        tahun_pelajaran_id: propTpId || undefined,
        semester_id: propSemesterId || undefined,
      });
      return res?.data || [];
    },
    staleTime: 3 * 60 * 1000,
  });

  const rawRows: RekapBulananPklRow[] = Array.isArray(responseData) ? responseData : [];

  // Filtered rows by search term
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rawRows;
    const term = searchTerm.toLowerCase();
    return rawRows.filter(r => 
      r.nama_siswa?.toLowerCase().includes(term) ||
      r.nis?.toLowerCase().includes(term) ||
      r.nama_mitra?.toLowerCase().includes(term) ||
      r.nama_kelas?.toLowerCase().includes(term)
    );
  }, [rawRows, searchTerm]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const totalSiswa = filteredRows.length;
    let sumHadir = 0;
    let sumSakit = 0;
    let sumIzin = 0;
    let sumAlpa = 0;
    let sumTerlambat = 0;

    filteredRows.forEach(r => {
      sumHadir += r.HADIR || 0;
      sumSakit += r.SAKIT || 0;
      sumIzin += r.IZIN || 0;
      sumAlpa += r.ALPA || 0;
      sumTerlambat += r.TERLAMBAT || 0;
    });

    const totalAttendance = sumHadir + sumSakit + sumIzin + sumAlpa + sumTerlambat;
    const avgPercentage = totalAttendance > 0 
      ? Math.round(((sumHadir + sumTerlambat) / totalAttendance) * 100) 
      : 0;

    return {
      totalSiswa,
      sumHadir,
      sumSakit,
      sumIzin,
      sumAlpa,
      sumTerlambat,
      avgPercentage,
    };
  }, [filteredRows]);

  // Columns definition
  const columns = useRekapPklColumns({
    viewMode,
    dayNumbers,
    onNavigateDetail,
  });

  // Export to Excel handler
  const handleExportExcel = useCallback(() => {
    if (!filteredRows.length) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }

    try {
      const filename = `Rekap_Presensi_PKL_${bulan}${propGuruNama ? `_${propGuruNama}` : ''}`;
      const title = `Laporan Rekapitulasi Presensi PKL Bulan ${bulan}`;

      const excelCols: { header: string; key: keyof RekapBulananPklRow | string; width?: number }[] = [
        { header: 'Nama Siswa', key: 'nama_siswa', width: 25 },
        { header: 'NIS', key: 'nis', width: 14 },
        { header: 'Kelas', key: 'nama_kelas', width: 15 },
        { header: 'Mitra DUDI', key: 'nama_mitra', width: 25 },
        { header: 'Guru Pembimbing', key: 'nama_pembimbing', width: 22 },
      ];

      if (viewMode === 'MATRIX') {
        dayNumbers.forEach(d => {
          excelCols.push({ header: `Tgl ${d}`, key: `day_${d}`, width: 6 });
        });
      }

      excelCols.push(
        { header: 'Hadir', key: 'HADIR', width: 8 },
        { header: 'Sakit', key: 'SAKIT', width: 8 },
        { header: 'Izin', key: 'IZIN', width: 8 },
        { header: 'Alpa', key: 'ALPA', width: 8 },
        { header: 'Terlambat', key: 'TERLAMBAT', width: 10 },
        { header: '% Kehadiran', key: 'persentase', width: 12 }
      );

      // Map rows including dailyMap
      const exportRows = filteredRows.map(r => {
        const rowData: Record<string, unknown> = { ...r };
        if (viewMode === 'MATRIX') {
          dayNumbers.forEach(d => {
            rowData[`day_${d}`] = r.dailyMap?.[String(d)] || '-';
          });
        }
        return rowData;
      });

      exportDataToExcel(exportRows as any, excelCols as any, filename, title);
      toast.success(`Berhasil mengunduh ${filename}.xlsx`);
    } catch {
      toast.error('Gagal mengekspor data ke Excel');
    }
  }, [filteredRows, bulan, propGuruNama, viewMode, dayNumbers]);

  const handlePrint = useCallback(() => {
    if (!filteredRows.length) {
      toast.error('Tidak ada data untuk dicetak');
      return;
    }
    setIsPrintModalOpen(true);
  }, [filteredRows]);

  const content = (
    <div className={`space-y-4 ${className}`}>
      {/* Modal Header */}
      {isModal && onClose && (
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Rekapitulasi Presensi PKL (Matriks Bulanan)
              </h3>
              <p className="text-xs text-slate-500">
                {propGuruNama ? `Pembimbing: ${propGuruNama}` : 'Seluruh Siswa PKL'} • Bulan {bulan}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Overview Stat Badges: Shopee-Grade Hairline di Mobile vs 6-Grid di Desktop */}
      {isMobile ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-2.5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Tingkat Disiplin: <strong className="text-indigo-600 dark:text-indigo-400">{stats.avgPercentage}%</strong>
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              {stats.totalSiswa} Siswa
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 text-center">
            <div className="py-1 px-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60">
              <div className="text-[9px] font-bold text-emerald-600">Hadir</div>
              <div className="text-xs font-black text-emerald-700 dark:text-emerald-300">{stats.sumHadir}</div>
            </div>
            <div className="py-1 px-1 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60">
              <div className="text-[9px] font-bold text-purple-600">Telat</div>
              <div className="text-xs font-black text-purple-700 dark:text-purple-300">{stats.sumTerlambat}</div>
            </div>
            <div className="py-1 px-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60">
              <div className="text-[9px] font-bold text-amber-600">Sakit</div>
              <div className="text-xs font-black text-amber-700 dark:text-amber-300">{stats.sumSakit}</div>
            </div>
            <div className="py-1 px-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60">
              <div className="text-[9px] font-bold text-blue-600">Izin</div>
              <div className="text-xs font-black text-blue-700 dark:text-blue-300">{stats.sumIzin}</div>
            </div>
            <div className="py-1 px-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60">
              <div className="text-[9px] font-bold text-rose-600">Alpa</div>
              <div className="text-xs font-black text-rose-700 dark:text-rose-300">{stats.sumAlpa}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Siswa</span>
            <span className="text-lg font-black text-slate-900 dark:text-white">{stats.totalSiswa}</span>
          </div>
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl p-3 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Total Hadir (H)</span>
            <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">{stats.sumHadir}</span>
          </div>
          <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-xl p-3 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">Sakit (S)</span>
            <span className="text-lg font-black text-amber-700 dark:text-amber-300">{stats.sumSakit}</span>
          </div>
          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 rounded-xl p-3 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block">Izin (I)</span>
            <span className="text-lg font-black text-blue-700 dark:text-blue-300">{stats.sumIzin}</span>
          </div>
          <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 rounded-xl p-3 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 block">Alpa (A)</span>
            <span className="text-lg font-black text-rose-700 dark:text-rose-300">{stats.sumAlpa}</span>
          </div>
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 rounded-xl p-3 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">Tingkat Disiplin</span>
            <span className="text-lg font-black text-indigo-700 dark:text-indigo-300">{stats.avgPercentage}%</span>
          </div>
        </div>
      )}

      {/* Main Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Left Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Bulan Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-xl px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="month"
                value={bulan}
                onChange={(e) => setBulan(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                aria-label="Pilih Bulan Rekap Presensi PKL"
              />
            </div>

            {/* View Mode Switcher */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 h-9 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('SUMMARY')}
                className={`px-2.5 py-1 text-[11px] rounded-md font-bold uppercase tracking-tight transition-all cursor-pointer ${
                  viewMode === 'SUMMARY'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Akumulasi
              </button>
              <button
                type="button"
                onClick={() => setViewMode('MATRIX')}
                className={`px-2.5 py-1 text-[11px] rounded-md font-bold uppercase tracking-tight transition-all cursor-pointer ${
                  viewMode === 'MATRIX'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Per Hari
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[160px] sm:min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="text"
                placeholder="Cari siswa / mitra..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs rounded-xl"
                aria-label="Cari nama siswa atau mitra industri"
              />
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-9 px-2.5 rounded-xl border-slate-200/80 dark:border-slate-800"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="h-9 px-3 rounded-xl gap-1.5 border-emerald-200/80 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              title="Ekspor ke Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs font-bold">Excel</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-9 px-3 rounded-xl gap-1.5 border-indigo-200/80 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              title="Cetak Laporan"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs font-bold">Cetak</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content View: Mobile Cards vs Desktop Table */}
      {isLoading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center gap-2 shadow-xs">
          <Loader className="w-6 h-6 text-indigo-600 animate-spin" />
          <p className="text-xs text-slate-400">Memuat matriks presensi bulanan PKL...</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-slate-400 flex items-center justify-center mx-auto mb-2">
            <Calendar size={24} />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Tidak ada rekaman presensi PKL
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Belum ada data kehadiran siswa magang untuk bulan {bulan}.
          </p>
        </div>
      ) : isMobile ? (
        <div className="space-y-3">
          <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Menyiapkan kartu rekap...</div>}>
            {filteredRows.map((row) => (
              <RekapPresensiMobileCard
                key={row.nis || row.nama_siswa}
                row={row}
                dayNumbers={dayNumbers}
                viewMode={viewMode}
                onNavigateDetail={onNavigateDetail}
              />
            ))}
          </Suspense>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="w-full overflow-x-auto">
            <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Menyiapkan tabel...</div>}>
              <Table
                columns={columns as any}
                data={filteredRows}
                className="w-full text-xs"
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Official Skill Document Modal (True WYSIWYG & Browser Print) */}
      {isPrintModalOpen && (
        <Suspense fallback={null}>
          <RekapPresensiPklPrintModal
            isOpen={isPrintModalOpen}
            onClose={() => setIsPrintModalOpen(false)}
            bulan={bulan}
            tahunPelajaran={currentTpLabel || propTpId}
            pembimbingId={propGuruId}
            pembimbingNama={propGuruNama}
            viewMode={viewMode}
            rows={filteredRows}
            dayNumbers={dayNumbers}
          />
        </Suspense>
      )}
    </div>
  );

  if (hideLayout || isModal) {
    return content;
  }

  return (
    <SectionCard className="border-0 shadow-none p-0 bg-transparent">
      {content}
    </SectionCard>
  );
});

export default RekapAbsensiPklView;
