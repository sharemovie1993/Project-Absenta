import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axiosInstance';
import { 
    Printer, 
    Filter, 
    CheckCircle2, 
    AlertTriangle,
    Building2,
    RefreshCw,
    Columns2,
    AlignJustify
} from 'lucide-react';
import { Button } from '../../ui';
import type { BalanceSheetReportData, FinancialAccountLine } from './types';
import type { CooperativeSettings } from '../../../pages/cooperative/Settings';

interface BalanceSheetReportProps {
    coopSettings?: CooperativeSettings | null;
    defaultYear?: number;
}

export const BalanceSheetReport: React.FC<BalanceSheetReportProps> = ({
    coopSettings,
    defaultYear = new Date().getFullYear(),
}) => {
    // State Filter Tanggal
    const [asOfDate, setAsOfDate] = useState<string>(`${defaultYear}-12-31`);
    const [viewMode, setViewMode] = useState<'skontro' | 'stafel'>('skontro');

    // Fetch Balance Sheet Data
    const { 
        data, 
        isLoading, 
        isRefetching, 
        refetch, 
        error 
    } = useQuery<BalanceSheetReportData>({
        queryKey: ['koperasi-balance-sheet-report', asOfDate],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (asOfDate) params.append('asOfDate', asOfDate);
            
            const res = await api.get(`/cooperative/reports/neraca?${params.toString()}`);
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

    const assets = data?.assets || [];
    const liabilities = data?.liabilities || [];
    const equity = data?.equity || [];
    const summary = data?.summary || {
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0,
        totalLiabilitiesAndEquity: 0,
        currentYearEarnings: 0,
        isBalanced: true,
        balanceCheck: 0,
    };

    // Pisahkan Aset Lancar vs Aset Tetap
    const currentAssets = assets.filter(a => 
        a.code.startsWith('10') || 
        a.name.toLowerCase().includes('kas') || 
        a.name.toLowerCase().includes('piutang') || 
        a.name.toLowerCase().includes('persediaan') || 
        a.name.toLowerCase().includes('bank')
    );
    const fixedAssets = assets.filter(a => !currentAssets.includes(a));

    const totalCurrentAssets = currentAssets.reduce((sum, a) => sum + Number(a.balance || 0), 0);
    const totalFixedAssets = fixedAssets.reduce((sum, a) => sum + Number(a.balance || 0), 0);
    const grandTotalAssets = summary.totalAssets;

    const totalLiabilities = summary.totalLiabilities;
    const totalEquity = summary.totalEquity;
    const grandTotalPasiva = summary.totalLiabilitiesAndEquity;

    return (
        <div className="space-y-6">
            {/* Toolbar Filter & View Mode (Disembunyikan saat dicetak) */}
            <div className="print:hidden flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-slate-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Posisi Per Tanggal:</span>
                    </div>

                    <input
                        type="date"
                        value={asOfDate}
                        onChange={(e) => setAsOfDate(e.target.value)}
                        className="h-8 px-2.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
                    />

                    {/* Mode Tampilan: Skontro (2 Kolom) vs Stafel (1 Kolom Vertikal) */}
                    <div className="inline-flex rounded-xl bg-slate-200/70 dark:bg-slate-800 p-0.5 text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => setViewMode('skontro')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                                viewMode === 'skontro'
                                    ? 'bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                            title="Format Skontro (2 Kolom berdampingan: Aktiva di Kiri, Pasiva di Kanan)"
                        >
                            <Columns2 size={13} />
                            Skontro (2 Kolom)
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('stafel')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                                viewMode === 'stafel'
                                    ? 'bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                            title="Format Stafel (Vertikal lurus)"
                        >
                            <AlignJustify size={13} />
                            Stafel (Vertikal)
                        </button>
                    </div>

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
                        Cetak Neraca<span className="hidden sm:inline"> (Accurate Format)</span>
                    </Button>
                </div>
            </div>

            {/* AUDIT BALANCE STATUS BANNER */}
            {!isLoading && (
                <div className={`print:hidden p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold border transition-all ${
                    summary.isBalanced 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                }`}>
                    <div className="flex items-center gap-2.5">
                        {summary.isBalanced ? (
                            <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
                        )}
                        <div>
                            <span>
                                {summary.isBalanced 
                                    ? `Neraca Seimbang (Balanced) — Total Aktiva (${formatCurrency(grandTotalAssets)}) = Total Pasiva (${formatCurrency(grandTotalPasiva)})`
                                    : `Perhatian Audit: Neraca belum seimbang! Selisih Aktiva & Pasiva: ${formatCurrency(summary.balanceCheck)}`
                                }
                            </span>
                            {summary.currentYearEarnings !== 0 && (
                                <p className="text-[10px] opacity-80 font-normal">
                                    Termasuk alokasi otomatis SHU Berjalan: {formatCurrency(summary.currentYearEarnings)} pada sisi Ekuitas.
                                </p>
                            )}
                        </div>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/40 border border-current">
                        {summary.isBalanced ? 'SEIMBANG (100%)' : 'SELISIH JURNAL'}
                    </span>
                </div>
            )}

            {/* LEMBAR NERACA RESMI (PRINTABLE ACCURATE VIEW) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm p-6 sm:p-10 max-w-5xl mx-auto print:p-0 print:border-none print:shadow-none print:max-w-full">
                
                {/* KOP RESMI LAPORAN */}
                <div className="text-center pb-6 border-b border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-center gap-2 text-indigo-700 dark:text-indigo-400 font-black tracking-widest text-xs uppercase">
                        <Building2 size={16} />
                        {coopSettings?.name || 'KOPERASI KELUARGA BESAR SEKOLAH'}
                    </div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                        NERACA (LAPORAN POSISI KEUANGAN)
                    </h2>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Per {new Date(asOfDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-[10px] text-slate-400 italic pt-0.5">
                        (Dinyatakan dalam Rupiah Indonesia - IDR)
                    </p>
                </div>

                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-3">
                        <div className="w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                        <span className="text-xs font-medium text-slate-500">Menyusun Neraca Koperasi...</span>
                    </div>
                ) : (
                    <div className="py-6 space-y-8">
                        
                        {/* TAMPILAN SKONTRO (2 KOLOM: AKTIVA VS PASIVA) */}
                        <div className={`grid gap-8 ${viewMode === 'skontro' ? 'grid-cols-1 md:grid-cols-2 md:divide-x md:divide-slate-200 md:dark:divide-slate-800' : 'grid-cols-1'}`}>
                            
                            {/* ─── SISI KIRI: ASET / AKTIVA ────────────────────── */}
                            <div className="space-y-6">
                                <div className="font-black text-sm uppercase text-slate-900 dark:text-white tracking-wider border-b-2 border-slate-900 dark:border-white pb-1 flex justify-between items-center">
                                    <span>AKTIVA (ASET)</span>
                                </div>

                                {/* Aset Lancar */}
                                <div className="space-y-2">
                                    <div className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-1">
                                        Aset Lancar
                                    </div>
                                    <div className="space-y-1">
                                        {currentAssets.length === 0 ? (
                                            <div className="text-xs text-slate-400 italic pl-3">Tidak ada akun aset lancar.</div>
                                        ) : (
                                            currentAssets.map(acc => (
                                                <div key={acc.id} className="flex justify-between items-center py-1 pl-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded">
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
                                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-300 dark:border-slate-700 font-bold text-xs">
                                        <span className="text-slate-700 dark:text-slate-300">Total Aset Lancar</span>
                                        <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(totalCurrentAssets)}</span>
                                    </div>
                                </div>

                                {/* Aset Tetap */}
                                {fixedAssets.length > 0 && (
                                    <div className="space-y-2 pt-2">
                                        <div className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-1">
                                            Aset Tetap & Inventaris
                                        </div>
                                        <div className="space-y-1">
                                            {fixedAssets.map(acc => (
                                                <div key={acc.id} className="flex justify-between items-center py-1 pl-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-[11px] text-slate-400">{acc.code}</span>
                                                        <span className="font-medium text-slate-700 dark:text-slate-300">{acc.name}</span>
                                                    </div>
                                                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                                                        {formatCurrency(acc.balance)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between items-center pt-1.5 border-t border-slate-300 dark:border-slate-700 font-bold text-xs">
                                            <span className="text-slate-700 dark:text-slate-300">Total Aset Tetap</span>
                                            <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(totalFixedAssets)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* TOTAL AKTIVA (DOUBLE UNDERLINE) */}
                                <div className="pt-6">
                                    <div className="flex justify-between items-center py-2 border-t-2 border-slate-400 dark:border-slate-600 border-b-4 border-double border-slate-900 dark:border-white font-black text-xs sm:text-sm">
                                        <span className="uppercase text-slate-900 dark:text-white">TOTAL AKTIVA</span>
                                        <span className="font-mono text-base font-black text-indigo-700 dark:text-indigo-400">
                                            {formatCurrency(grandTotalAssets)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* ─── SISI KANAN: KEWAJIBAN & EKUITAS / PASIVA ────── */}
                            <div className={`space-y-6 ${viewMode === 'skontro' ? 'md:pl-8' : ''}`}>
                                <div className="font-black text-sm uppercase text-slate-900 dark:text-white tracking-wider border-b-2 border-slate-900 dark:border-white pb-1 flex justify-between items-center">
                                    <span>PASIVA (KEWAJIBAN & EKUITAS)</span>
                                </div>

                                {/* 1. Kewajiban / Hutang */}
                                <div className="space-y-2">
                                    <div className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-1">
                                        Kewajiban Jangka Pendek
                                    </div>
                                    <div className="space-y-1">
                                        {liabilities.length === 0 ? (
                                            <div className="text-xs text-slate-400 italic pl-3">Tidak ada kewajiban.</div>
                                        ) : (
                                            liabilities.map(acc => (
                                                <div key={acc.id} className="flex justify-between items-center py-1 pl-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded">
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
                                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-300 dark:border-slate-700 font-bold text-xs">
                                        <span className="text-slate-700 dark:text-slate-300">Total Kewajiban</span>
                                        <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(totalLiabilities)}</span>
                                    </div>
                                </div>

                                {/* 2. Ekuitas / Modal Koperasi */}
                                <div className="space-y-2 pt-2">
                                    <div className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 pb-1">
                                        Ekuitas / Modal Sendiri
                                    </div>
                                    <div className="space-y-1">
                                        {equity.length === 0 ? (
                                            <div className="text-xs text-slate-400 italic pl-3">Tidak ada akun ekuitas.</div>
                                        ) : (
                                            equity.map(acc => (
                                                <div key={acc.id} className="flex justify-between items-center py-1 pl-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-[11px] text-slate-400">{acc.code}</span>
                                                        <span className={`font-medium ${acc.id === 'current-year-shu' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                                                            {acc.name}
                                                        </span>
                                                    </div>
                                                    <span className={`font-mono font-semibold ${acc.id === 'current-year-shu' ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-900 dark:text-slate-100'}`}>
                                                        {formatCurrency(acc.balance)}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-300 dark:border-slate-700 font-bold text-xs">
                                        <span className="text-slate-700 dark:text-slate-300">Total Ekuitas</span>
                                        <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCurrency(totalEquity)}</span>
                                    </div>
                                </div>

                                {/* TOTAL PASIVA (DOUBLE UNDERLINE) */}
                                <div className="pt-6">
                                    <div className="flex justify-between items-center py-2 border-t-2 border-slate-400 dark:border-slate-600 border-b-4 border-double border-slate-900 dark:border-white font-black text-xs sm:text-sm">
                                        <span className="uppercase text-slate-900 dark:text-white">TOTAL PASIVA</span>
                                        <span className="font-mono text-base font-black text-indigo-700 dark:text-indigo-400">
                                            {formatCurrency(grandTotalPasiva)}
                                        </span>
                                    </div>
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
