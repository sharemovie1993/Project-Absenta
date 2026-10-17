import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axiosInstance';
import { 
    Printer, 
    Download, 
    Calendar, 
    Filter, 
    FileText, 
    TrendingUp, 
    CheckCircle2, 
    AlertCircle,
    Building2,
    RefreshCw
} from 'lucide-react';
import { Button } from '../../ui';
import type { IncomeStatementData, FinancialAccountLine } from './types';
import type { CooperativeSettings } from '../../../pages/cooperative/Settings';

interface IncomeStatementReportProps {
    coopSettings?: CooperativeSettings | null;
    defaultYear?: number;
    startDate?: string;
    endDate?: string;
}

export const IncomeStatementReport: React.FC<IncomeStatementReportProps> = ({
    coopSettings,
    defaultYear = new Date().getFullYear(),
    startDate: initialStartDate,
    endDate: initialEndDate
}) => {
    // State Filter Periode
    const [periodPreset, setPeriodPreset] = useState<'year' | 'custom'>('year');
    const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
    const [customStartDate, setCustomStartDate] = useState<string>(
        initialStartDate || `${defaultYear}-01-01`
    );
    const [customEndDate, setCustomEndDate] = useState<string>(
        initialEndDate || `${defaultYear}-12-31`
    );

    const effectiveStartDate = periodPreset === 'year' 
        ? `${selectedYear}-01-01` 
        : customStartDate;
    const effectiveEndDate = periodPreset === 'year' 
        ? `${selectedYear}-12-31` 
        : customEndDate;

    // Fetch Income Statement Data
    const { 
        data, 
        isLoading, 
        isRefetching, 
        refetch, 
        error 
    } = useQuery<IncomeStatementData>({
        queryKey: ['koperasi-income-statement', effectiveStartDate, effectiveEndDate],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (effectiveStartDate) params.append('startDate', effectiveStartDate);
            if (effectiveEndDate) params.append('endDate', effectiveEndDate);
            
            const res = await api.get(`/cooperative/reports/laba-rugi?${params.toString()}`);
            return res.data?.data;
        },
        staleTime: 30 * 1000,
    });

    const formatCurrency = (amount: number) => {
        if (amount < 0) {
            return `(Rp ${Math.abs(amount).toLocaleString('id-ID')})`;
        }
        return `Rp ${amount.toLocaleString('id-ID')}`;
    };

    const handlePrint = () => {
        window.print();
    };

    // Filter Akun Pendapatan vs HPP vs Beban Operasional
    const revenues = data?.revenue || [];
    const expenses = data?.expense || [];

    // Saring akun induk (Header) bersaldo 0 agar tidak mengotori baris laporan
    const validRevenues = revenues.filter(r => Number(r.balance) !== 0 || !r.name.toUpperCase().includes('HEADER'));
    const validExpenses = expenses.filter(e => Number(e.balance) !== 0 || !e.name.toUpperCase().includes('HEADER'));

    // Pisahkan COGS/HPP (kode akun 501x atau nama 'Beban Pokok Penjualan' / 'HPP')
    const cogsAccounts = validExpenses.filter(e => 
        e.code.startsWith('501') || 
        e.name.toLowerCase().includes('pokok') || 
        e.name.toLowerCase().includes('hpp') ||
        e.name.toLowerCase().includes('cogs')
    );

    // Beban Operasional (seluruh beban operasional & administrasi selain COGS)
    const operatingExpenseAccounts = validExpenses.filter(e => !cogsAccounts.includes(e));

    const totalRevenue = validRevenues.reduce((sum, r) => sum + Number(r.balance || 0), 0);
    const totalCogs = cogsAccounts.reduce((sum, c) => sum + Number(c.balance || 0), 0);
    const grossProfit = totalRevenue - totalCogs;
    const totalOperatingExpense = operatingExpenseAccounts.reduce((sum, o) => sum + Number(o.balance || 0), 0);
    const netIncome = grossProfit - totalOperatingExpense;

    return (
        <div className="space-y-6">
            {/* Toolbar Filter & Aksi (Disembunyikan saat dicetak) */}
            <div className="print:hidden flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-slate-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Periode:</span>
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
                            Kustom Rentang Tanggal
                        </button>
                    </div>

                    {periodPreset === 'year' ? (
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="h-8 px-3 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            {[2024, 2025, 2026, 2027, 2028].map(y => (
                                <option key={y} value={y}>Tahun {y}</option>
                            ))}
                        </select>
                    ) : (
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="h-8 px-2.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 font-medium"
                            />
                            <span className="text-xs text-slate-400">s/d</span>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="h-8 px-2.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 font-medium"
                            />
                        </div>
                    )}

                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isLoading || isRefetching}
                        className="h-8 px-3 rounded-xl gap-1.5 text-xs"
                    >
                        <RefreshCw size={13} className={isRefetching ? 'animate-spin' : ''} />
                        Segarkan
                    </Button>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handlePrint}
                        className="h-8 px-4 rounded-xl gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 font-bold shadow-sm"
                    >
                        <Printer size={14} />
                        Cetak Laporan<span className="hidden sm:inline"> (Accurate Format)</span>
                    </Button>
                </div>
            </div>

            {/* AREA LEMBAR LAPORAN KEUANGAN (PRINTABLE ACCURATE VIEW) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-10 max-w-4xl mx-auto print:p-0 print:border-none print:shadow-none print:max-w-full">
                
                {/* KOP LAPORAN RESMI KOPERASI */}
                <div className="text-center pb-6 border-b border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-center gap-2 text-indigo-700 dark:text-indigo-400 font-black tracking-widest text-xs uppercase">
                        <Building2 size={16} />
                        {coopSettings?.name || 'KOPERASI KELUARGA BESAR SEKOLAH'}
                    </div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                        LAPORAN LABA RUGI (PERHITUNGAN HASIL USAHA)
                    </h2>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {periodPreset === 'year' 
                            ? `Untuk Tahun Buku yang Berakhir pada 31 Desember ${selectedYear}`
                            : `Periode: ${effectiveStartDate} s/d ${effectiveEndDate}`
                        }
                    </p>
                    <p className="text-[10px] text-slate-400 italic pt-0.5">
                        (Dinyatakan dalam Rupiah Indonesia - IDR)
                    </p>
                </div>

                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-3">
                        <div className="w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                        <span className="text-xs font-medium text-slate-500">Menyusun Laporan Laba Rugi...</span>
                    </div>
                ) : error ? (
                    <div className="py-12 text-center text-rose-500 space-y-2">
                        <AlertCircle size={32} className="mx-auto" />
                        <p className="text-xs font-bold">Gagal memuat Laporan Laba Rugi.</p>
                    </div>
                ) : (
                    <div className="py-6 space-y-8 text-sm text-slate-800 dark:text-slate-200 font-sans">
                        
                        {/* 1. PENDAPATAN USAHA (REVENUE) */}
                        <div className="space-y-2">
                            <div className="font-bold text-xs uppercase text-slate-900 dark:text-white tracking-wider border-b border-slate-300 dark:border-slate-700 pb-1">
                                Pendapatan Usaha Koperasi
                            </div>
                            <div className="space-y-1 pt-1">
                                {validRevenues.length === 0 ? (
                                    <div className="text-xs text-slate-400 italic pl-4 py-1">Tidak ada pendapatan pada periode ini.</div>
                                ) : (
                                    validRevenues.map(acc => (
                                        <div key={acc.id} className="flex justify-between items-center py-1 pl-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded transition-colors text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[11px] text-slate-400">{acc.code}</span>
                                                <span className="font-medium text-slate-700 dark:text-slate-300">{acc.name}</span>
                                            </div>
                                            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                                                {formatCurrency(acc.balance)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-300 dark:border-slate-700 font-bold text-xs">
                                <span className="uppercase text-slate-800 dark:text-slate-200">Total Pendapatan Usaha</span>
                                <span className="font-mono font-extrabold text-slate-900 dark:text-white">
                                    {formatCurrency(totalRevenue)}
                                </span>
                            </div>
                        </div>

                        {/* 2. BEBAN POKOK PENJUALAN (HPP / COGS) */}
                        <div className="space-y-2">
                            <div className="font-bold text-xs uppercase text-slate-900 dark:text-white tracking-wider border-b border-slate-300 dark:border-slate-700 pb-1">
                                Beban Pokok Penjualan (HPP)
                            </div>
                            <div className="space-y-1 pt-1">
                                {cogsAccounts.length === 0 ? (
                                    <div className="text-xs text-slate-400 italic pl-4 py-1">Tidak ada catatan HPP pada periode ini.</div>
                                ) : (
                                    cogsAccounts.map(acc => (
                                        <div key={acc.id} className="flex justify-between items-center py-1 pl-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded transition-colors text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[11px] text-slate-400">{acc.code}</span>
                                                <span className="font-medium text-slate-700 dark:text-slate-300">{acc.name}</span>
                                            </div>
                                            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                                                {formatCurrency(acc.balance)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-300 dark:border-slate-700 font-bold text-xs">
                                <span className="uppercase text-slate-800 dark:text-slate-200">Total Beban Pokok Penjualan</span>
                                <span className="font-mono font-extrabold text-slate-900 dark:text-white">
                                    {formatCurrency(totalCogs)}
                                </span>
                            </div>
                        </div>

                        {/* SUB-TOTAL: LABA KOTOR (GROSS PROFIT) */}
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700">
                            <span className="uppercase font-extrabold text-slate-900 dark:text-white">
                                Laba Kotor (Gross Profit)
                            </span>
                            <span className="font-mono text-sm font-black text-indigo-700 dark:text-indigo-300">
                                {formatCurrency(grossProfit)}
                            </span>
                        </div>

                        {/* 3. BEBAN OPERASIONAL & UMUM */}
                        <div className="space-y-2">
                            <div className="font-bold text-xs uppercase text-slate-900 dark:text-white tracking-wider border-b border-slate-300 dark:border-slate-700 pb-1">
                                Beban Operasional & Administrasi
                            </div>
                            <div className="space-y-1 pt-1">
                                {operatingExpenseAccounts.length === 0 ? (
                                    <div className="text-xs text-slate-400 italic pl-4 py-1">Tidak ada beban operasional pada periode ini.</div>
                                ) : (
                                    operatingExpenseAccounts.map(acc => (
                                        <div key={acc.id} className="flex justify-between items-center py-1 pl-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded transition-colors text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[11px] text-slate-400">{acc.code}</span>
                                                <span className="font-medium text-slate-700 dark:text-slate-300">{acc.name}</span>
                                            </div>
                                            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                                                {formatCurrency(acc.balance)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-300 dark:border-slate-700 font-bold text-xs">
                                <span className="uppercase text-slate-800 dark:text-slate-200">Total Beban Operasional</span>
                                <span className="font-mono font-extrabold text-slate-900 dark:text-white">
                                    {formatCurrency(totalOperatingExpense)}
                                </span>
                            </div>
                        </div>

                        {/* HASIL AKHIR: SISA HASIL USAHA (SHU) BERSIH — DOUBLE UNDERLINE STANDAR AKUNTANSI */}
                        <div className="pt-4 border-t-2 border-slate-400 dark:border-slate-600">
                            <div className="flex justify-between items-center pb-2 border-b-4 border-double border-slate-900 dark:border-white">
                                <div>
                                    <span className="text-sm font-black uppercase tracking-wider block text-slate-900 dark:text-white">
                                        Sisa Hasil Usaha (SHU) Bersih
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-medium">
                                        Laba Bersih Koperasi yang dialokasikan pada RAT
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className={`font-mono text-base sm:text-lg font-black tracking-tight ${
                                        netIncome >= 0 
                                            ? 'text-emerald-700 dark:text-emerald-400' 
                                            : 'text-rose-600 dark:text-rose-400'
                                    }`}>
                                        {formatCurrency(netIncome)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* LEMBAR PENGESAHAN TANDA TANGAN (UNTUK AUDIT & RAT) */}
                        <div className="pt-12 grid grid-cols-3 gap-6 text-center text-xs font-medium text-slate-600 dark:text-slate-400">
                            <div className="space-y-16">
                                <p>Disiapkan Oleh,<br /><strong className="text-slate-800 dark:text-slate-200">Bendahara Koperasi</strong></p>
                                <div className="border-b border-slate-400 dark:border-slate-600 mx-6"></div>
                                <p className="text-[11px] text-slate-500">( Nama Bendahara )</p>
                            </div>
                            <div className="space-y-16">
                                <p>Diperiksa & Disetujui,<br /><strong className="text-slate-800 dark:text-slate-200">Ketua Koperasi</strong></p>
                                <div className="border-b border-slate-400 dark:border-slate-600 mx-6"></div>
                                <p className="text-[11px] text-slate-500">( Nama Ketua )</p>
                            </div>
                            <div className="space-y-16">
                                <p>Mengetahui,<br /><strong className="text-slate-800 dark:text-slate-200">Badan Pengawas</strong></p>
                                <div className="border-b border-slate-400 dark:border-slate-600 mx-6"></div>
                                <p className="text-[11px] text-slate-500">( Nama Pengawas )</p>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};
