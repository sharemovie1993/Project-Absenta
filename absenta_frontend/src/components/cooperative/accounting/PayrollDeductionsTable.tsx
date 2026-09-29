import React, { useMemo, useCallback } from 'react';
import type { PayrollItem } from './types';

interface SavingCategoryData {
    code: string;
    name: string;
}

interface PaginationConfig {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onLimitChange?: (limit: number) => void;
}

interface PayrollDeductionsTableProps {
    data?: PayrollItem[];
    payrollData?: PayrollItem[];
    savingCategories?: SavingCategoryData[];
    visibleColumns?: Record<string, boolean>;
    hasLoans?: boolean;
    showLoans?: boolean;
    showSavings?: boolean;
    savingsColSpan?: number;
    calculateItemTotal?: (item: PayrollItem) => number;
    loading?: boolean;
    pagination?: PaginationConfig;
}

export const PayrollDeductionsTable = React.memo<PayrollDeductionsTableProps>(({
    data,
    payrollData,
    savingCategories = [],
    visibleColumns = {},
    hasLoans,
    showLoans = true,
    showSavings,
    savingsColSpan,
    calculateItemTotal: customCalculateItemTotal,
    loading = false,
    pagination
}) => {
    // Robust data fallback
    const items = useMemo(() => data || payrollData || [], [data, payrollData]);

    // Active saving categories
    const activeSavings = useMemo(() => (
        savingCategories.filter(cat => visibleColumns[cat.code] !== false)
    ), [savingCategories, visibleColumns]);

    const isShowingSavings = showSavings ?? activeSavings.length > 0;
    const computedColSpan = savingsColSpan ?? Math.max(1, activeSavings.length);

    // Auto-detect loans if hasLoans not explicitly passed
    const isShowingLoans = hasLoans ?? items.some(item => (item.loan?.pokok > 0 || item.loan?.jasa > 0));

    // Internal item total calculator fallback
    const computeItemTotal = useCallback((item: PayrollItem): number => {
        if (customCalculateItemTotal) {
            return customCalculateItemTotal(item);
        }
        let total = 0;
        if (item.savings) {
            Object.keys(item.savings).forEach(key => {
                if (visibleColumns[key] !== false) {
                    total += Number(item.savings[key]) || 0;
                }
            });
        }
        if (showLoans && item.loan) {
            total += (Number(item.loan.pokok) || 0) + (Number(item.loan.jasa) || 0);
        }
        return total;
    }, [customCalculateItemTotal, visibleColumns, showLoans]);

    // Sliced items for current page
    const displayItems = useMemo(() => {
        if (!pagination) return items;
        const start = (pagination.currentPage - 1) * pagination.itemsPerPage;
        return items.slice(start, start + pagination.itemsPerPage);
    }, [items, pagination]);

    const startIndex = pagination ? (pagination.currentPage - 1) * pagination.itemsPerPage : 0;

    return (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                    <thead>
                        {/* Grouped Headers */}
                        <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                            <th className="p-3 border-r border-slate-200 dark:border-slate-800 text-center w-12" rowSpan={2}>NO</th>
                            <th className="p-3 border-r border-slate-200 dark:border-slate-800 text-left" rowSpan={2}>NAMA ANGGOTA</th>
                            {isShowingSavings && (
                                <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-center" colSpan={computedColSpan}>SIMPANAN</th>
                            )}
                            {isShowingLoans && showLoans && (
                                <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-center" colSpan={3}>PINJAMAN KOPERASI</th>
                            )}
                            <th className="p-3 text-right" rowSpan={2}>JUMLAH</th>
                        </tr>
                        {/* Detail Headers */}
                        <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                            {activeSavings.map(cat => (
                                <th key={cat.code} className="p-2 border-r border-slate-200 dark:border-slate-800 text-center w-24 uppercase">
                                    {cat.name.replace(/simpanan/i, '').trim().toUpperCase()}
                                </th>
                            ))}
                            {isShowingLoans && showLoans && (
                                <>
                                    <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-center w-12">KE-</th>
                                    <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-right w-24">POKOK</th>
                                    <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-right w-24">JASA</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                        {loading ? (
                            <tr>
                                <td colSpan={2 + (isShowingSavings ? computedColSpan : 0) + (isShowingLoans && showLoans ? 3 : 0) + 1} className="p-12 text-center text-xs text-slate-400">
                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent mx-auto mb-2" />
                                    Memuat data rekapitulasi...
                                </td>
                            </tr>
                        ) : displayItems.length === 0 ? (
                            <tr>
                                <td colSpan={2 + (isShowingSavings ? computedColSpan : 0) + (isShowingLoans && showLoans ? 3 : 0) + 1} className="p-10 text-center text-slate-400 font-bold uppercase tracking-wider">
                                    Belum ada data rekap potongan untuk periode ini.
                                </td>
                            </tr>
                        ) : (
                            displayItems.map((item, idx) => (
                                <tr key={item.memberNo || `${item.name}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                    <td className="p-3 border-r border-slate-100 dark:border-slate-800 text-center font-bold text-slate-400">
                                        {startIndex + idx + 1}
                                    </td>
                                    <td className="p-3 border-r border-slate-100 dark:border-slate-800 font-bold uppercase text-slate-900 dark:text-slate-100">
                                        {item.name}
                                    </td>
                                    
                                    {/* SIMPANAN */}
                                    {activeSavings.map(cat => (
                                        <td key={cat.code} className="p-2 border-r border-slate-100 dark:border-slate-800 text-right font-mono">
                                            {(item.savings && item.savings[cat.code] > 0)
                                                ? `Rp ${Math.round(item.savings[cat.code]).toLocaleString('id-ID')}`
                                                : '-'}
                                        </td>
                                    ))}
                                    
                                    {/* PINJAMAN ANGSURAN */}
                                    {isShowingLoans && showLoans && (
                                        <>
                                            <td className="p-2 border-r border-slate-100 dark:border-slate-800 text-center font-bold text-slate-500">
                                                {item.loan?.installmentNo || '-'}
                                            </td>
                                            <td className="p-2 border-r border-slate-100 dark:border-slate-800 text-right text-slate-800 dark:text-slate-200 font-mono">
                                                {(item.loan && item.loan.pokok > 0)
                                                    ? `Rp ${Math.round(item.loan.pokok).toLocaleString('id-ID')}`
                                                    : '-'}
                                            </td>
                                            <td className="p-2 border-r border-slate-100 dark:border-slate-800 text-right text-slate-800 dark:text-slate-200 font-mono">
                                                {(item.loan && item.loan.jasa > 0)
                                                    ? `Rp ${Math.round(item.loan.jasa).toLocaleString('id-ID')}`
                                                    : '-'}
                                            </td>
                                        </>
                                    )}
                                    
                                    {/* JUMLAH */}
                                    <td className="p-3 text-right font-black text-slate-900 dark:text-white font-mono">
                                        Rp {Math.round(computeItemTotal(item)).toLocaleString('id-ID')}
                                    </td>
                                </tr>
                            ))
                        )}

                        {/* Cumulative totals row across all items */}
                        {items.length > 0 && !loading && (
                            <tr className="bg-slate-50 dark:bg-slate-900/60 font-black border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                                <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-center" colSpan={2}>
                                    TOTAL KESELURUHAN
                                </td>
                                
                                {activeSavings.map(cat => (
                                    <td key={cat.code} className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono text-emerald-600 dark:text-emerald-400">
                                        Rp {Math.round(items.reduce((sum, i) => sum + (i.savings?.[cat.code] || 0), 0)).toLocaleString('id-ID')}
                                    </td>
                                ))}
                                
                                {isShowingLoans && showLoans && (
                                    <>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-center">-</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                                            Rp {Math.round(items.reduce((sum, i) => sum + (i.loan?.pokok || 0), 0)).toLocaleString('id-ID')}
                                        </td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono">
                                            Rp {Math.round(items.reduce((sum, i) => sum + (i.loan?.jasa || 0), 0)).toLocaleString('id-ID')}
                                        </td>
                                    </>
                                )}

                                <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                                    Rp {Math.round(items.reduce((sum, item) => sum + computeItemTotal(item), 0)).toLocaleString('id-ID')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 bg-white dark:bg-slate-900">
                    <div>
                        Menampilkan <span className="font-bold text-slate-800 dark:text-slate-200">{displayItems.length}</span> dari <span className="font-bold text-slate-800 dark:text-slate-200">{items.length}</span> anggota
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={pagination.currentPage <= 1}
                            onClick={() => pagination.onPageChange(Math.max(1, pagination.currentPage - 1))}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 font-bold transition-colors cursor-pointer"
                        >
                            Sebelumnya
                        </button>
                        <span className="font-bold px-2">
                            Halaman {pagination.currentPage} dari {pagination.totalPages}
                        </span>
                        <button
                            type="button"
                            disabled={pagination.currentPage >= pagination.totalPages}
                            onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.currentPage + 1))}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 font-bold transition-colors cursor-pointer"
                        >
                            Selanjutnya
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

PayrollDeductionsTable.displayName = 'PayrollDeductionsTable';
export default PayrollDeductionsTable;
