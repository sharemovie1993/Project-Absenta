import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axiosInstance';
import { 
  Printer, 
  Calendar, 
  Filter, 
  ArrowDownLeft, 
  ArrowUpRight, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CheckCircle2, 
  Building2,
  RefreshCw
} from 'lucide-react';
import { Button } from '../../ui';
import type { CooperativeSettings } from '../../../pages/cooperative/Settings';

interface CashFlowStatementReportProps {
  coopSettings?: CooperativeSettings | null;
  defaultYear?: number;
}

export const CashFlowStatementReport: React.FC<CashFlowStatementReportProps> = ({
  coopSettings,
  defaultYear = new Date().getFullYear(),
}) => {
  const [periodPreset, setPeriodPreset] = useState<'year' | 'custom'>('year');
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [customStartDate, setCustomStartDate] = useState<string>(`${defaultYear}-01-01`);
  const [customEndDate, setCustomEndDate] = useState<string>(`${defaultYear}-12-31`);

  const effectiveStartDate = periodPreset === 'year' ? `${selectedYear}-01-01` : customStartDate;
  const effectiveEndDate = periodPreset === 'year' ? `${selectedYear}-12-31` : customEndDate;

  const { data, isLoading, isRefetching, refetch } = useQuery<{
    operating: {
      inflows: { date: string; description: string; reference: string; accountName: string; amount: number }[];
      outflows: { date: string; description: string; reference: string; accountName: string; amount: number }[];
      totalInflows: number;
      totalOutflows: number;
      net: number;
    };
    investing: {
      inflows: any[];
      outflows: { date: string; description: string; reference: string; accountName: string; amount: number }[];
      totalInflows: number;
      totalOutflows: number;
      net: number;
    };
    financing: {
      inflows: { date: string; description: string; reference: string; accountName: string; amount: number }[];
      outflows: { date: string; description: string; reference: string; accountName: string; amount: number }[];
      totalInflows: number;
      totalOutflows: number;
      net: number;
    };
    netChangeInCash: number;
    beginningCash: number;
    endingCash: number;
  }>({
    queryKey: ['koperasi-cash-flow', effectiveStartDate, effectiveEndDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (effectiveStartDate) params.append('startDate', effectiveStartDate);
      if (effectiveEndDate) params.append('endDate', effectiveEndDate);
      const res = await api.get(`/cooperative/reports/arus-kas?${params.toString()}`);
      return res.data?.data;
    },
    staleTime: 30 * 1000,
  });

  const formatCurrency = (val: number) => {
    if (val < 0) return `(Rp ${Math.abs(val).toLocaleString('id-ID')})`;
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const cf = data || {
    operating: { inflows: [], outflows: [], totalInflows: 0, totalOutflows: 0, net: 0 },
    investing: { inflows: [], outflows: [], totalInflows: 0, totalOutflows: 0, net: 0 },
    financing: { inflows: [], outflows: [], totalInflows: 0, totalOutflows: 0, net: 0 },
    netChangeInCash: 0,
    beginningCash: 0,
    endingCash: 0
  };

  return (
    <div className="space-y-6">
      {/* Toolbar Filter & Aksi */}
      <div className="print:hidden flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Periode Arus Kas:</span>
          </div>

          <div className="inline-flex rounded-xl bg-slate-200/70 dark:bg-slate-800 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPeriodPreset('year')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                periodPreset === 'year'
                  ? 'bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Tahun Buku
            </button>
            <button
              type="button"
              onClick={() => setPeriodPreset('custom')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                periodPreset === 'custom'
                  ? 'bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Kustom
            </button>
          </div>

          {periodPreset === 'year' ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                aria-label="Tahun Laporan Arus Kas"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                min="2020"
                max="2035"
                className="w-24 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="date"
                aria-label="Tanggal Mulai"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
              />
              <span className="text-xs text-slate-400">s/d</span>
              <input
                type="date"
                aria-label="Tanggal Akhir"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
              />
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-1.5 border-slate-300 dark:border-slate-700 text-xs"
          >
            <RefreshCw size={13} className={isRefetching ? 'animate-spin' : ''} />
            <span>Segarkan</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={handlePrint}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
          >
            <Printer size={14} />
            <span>Cetak Laporan</span>
          </Button>
        </div>
      </div>

      {/* Lembar Laporan Keuangan Format Standar Accurate */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8 print:border-none print:shadow-none print:p-0">
        
        {/* Kop Formal Laporan */}
        <div className="text-center pb-6 border-b-2 border-slate-800 dark:border-slate-200 space-y-1">
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
            {coopSettings?.name || 'KOPERASI KONSUMEN KELUARGA BESAR'}
          </h2>
          <h1 className="text-base sm:text-lg font-black uppercase text-indigo-700 dark:text-indigo-400 tracking-wide">
            LAPORAN ARUS KAS (STATEMENT OF CASH FLOWS)
          </h1>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Periode: {periodPreset === 'year' ? `Tahun Buku ${selectedYear}` : `${effectiveStartDate} s/d ${effectiveEndDate}`}
          </p>
          <p className="text-[11px] italic text-slate-500">
            (Dinyatakan dalam Rupiah Indonesia - Metode Langsung SAK ETAP)
          </p>
        </div>

        {/* Isi Laporan Arus Kas */}
        <div className="space-y-6 text-xs text-slate-800 dark:text-slate-200">
          
          {/* 1. AKTIVITAS OPERASI */}
          <div className="space-y-2">
            <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-1">
              I. ARUS KAS DARI AKTIVITAS OPERASI
            </h3>
            <div className="pl-4 space-y-1.5">
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span>Penerimaan Kas dari Pelanggan, Toko & Sewa</span>
                <span className="font-mono">{formatCurrency(cf.operating.totalInflows)}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span>Pengeluaran Kas untuk Operasional, Listrik, Internet & Pemasok</span>
                <span className="font-mono">({formatCurrency(cf.operating.totalOutflows)})</span>
              </div>
              <div className="flex justify-between font-black pt-1.5 border-t border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                <span>Arus Kas Bersih dari Aktivitas Operasi</span>
                <span className="font-mono text-sm">{formatCurrency(cf.operating.net)}</span>
              </div>
            </div>
          </div>

          {/* 2. AKTIVITAS INVESTASI */}
          <div className="space-y-2">
            <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-1">
              II. ARUS KAS DARI AKTIVITAS INVESTASI
            </h3>
            <div className="pl-4 space-y-1.5">
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span>Pengeluaran Kas untuk Pengadaan Aktiva Tetap & Peralatan</span>
                <span className="font-mono">
                  {cf.investing.totalOutflows > 0 ? `(${formatCurrency(cf.investing.totalOutflows)})` : 'Rp 0'}
                </span>
              </div>
              <div className="flex justify-between font-black pt-1.5 border-t border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                <span>Arus Kas Bersih dari Aktivitas Investasi</span>
                <span className="font-mono text-sm">{formatCurrency(cf.investing.net)}</span>
              </div>
            </div>
          </div>

          {/* 3. AKTIVITAS PENDANAAN */}
          <div className="space-y-2">
            <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-1">
              III. ARUS KAS DARI AKTIVITAS PENDANAAN
            </h3>
            <div className="pl-4 space-y-1.5">
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span>Penerimaan Setoran Simpanan Pokok/Wajib & Modal Hibah</span>
                <span className="font-mono">{formatCurrency(cf.financing.totalInflows)}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span>Pengeluaran Penarikan Simpanan Sukarela & Anggota</span>
                <span className="font-mono">
                  {cf.financing.totalOutflows > 0 ? `(${formatCurrency(cf.financing.totalOutflows)})` : 'Rp 0'}
                </span>
              </div>
              <div className="flex justify-between font-black pt-1.5 border-t border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                <span>Arus Kas Bersih dari Aktivitas Pendanaan</span>
                <span className="font-mono text-sm">{formatCurrency(cf.financing.net)}</span>
              </div>
            </div>
          </div>

          {/* 4. REKONSILIASI SALDO KAS */}
          <div className="space-y-2 pt-4 border-t-2 border-slate-400 dark:border-slate-600">
            <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
              <span>Kenaikan (Penurunan) Bersih Kas & Setara Kas</span>
              <span className="font-mono text-sm font-black">{formatCurrency(cf.netChangeInCash)}</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
              <span>Saldo Kas & Bank Awal Periode</span>
              <span className="font-mono">{formatCurrency(cf.beginningCash)}</span>
            </div>
            <div className="flex justify-between font-black text-base pt-2 border-b-4 border-double border-slate-900 dark:border-slate-100 text-indigo-700 dark:text-indigo-400">
              <span>SALDO KAS & BANK AKHIR PERIODE</span>
              <span className="font-mono">{formatCurrency(cf.endingCash)}</span>
            </div>
          </div>

        </div>

        {/* Kolom Tanda Tangan Formal */}
        <div className="pt-10 grid grid-cols-3 gap-6 text-center text-xs">
          <div className="space-y-12">
            <p className="font-semibold text-slate-600 dark:text-slate-400">Disiapkan Oleh:</p>
            <div>
              <p className="font-bold underline text-slate-900 dark:text-white">
                {coopSettings?.treasurerName || 'BENDAHARA KOPERASI'}
              </p>
              <p className="text-[10px] text-slate-500">Bendahara</p>
            </div>
          </div>
          <div className="space-y-12">
            <p className="font-semibold text-slate-600 dark:text-slate-400">Diperiksa Oleh:</p>
            <div>
              <p className="font-bold underline text-slate-900 dark:text-white">
                {coopSettings?.supervisorName || 'PENGAWAS KOPERASI'}
              </p>
              <p className="text-[10px] text-slate-500">Ketua Pengawas</p>
            </div>
          </div>
          <div className="space-y-12">
            <p className="font-semibold text-slate-600 dark:text-slate-400">Disetujui Oleh:</p>
            <div>
              <p className="font-bold underline text-slate-900 dark:text-white">
                {coopSettings?.chairmanName || 'KETUA KOPERASI'}
              </p>
              <p className="text-[10px] text-slate-500">Ketua Pengurus</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
