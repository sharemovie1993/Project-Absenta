import React from 'react';
import type { PayrollItem } from './types';

interface SavingCategoryData {
    code: string;
    name: string;
}

interface PayrollDeductionsTableProps {
    payrollData: PayrollItem[];
    savingCategories: SavingCategoryData[];
    visibleColumns: Record<string, boolean>;
    hasLoans: boolean;
    showLoans: boolean;
    showSavings: boolean;
    savingsColSpan: number;
    calculateItemTotal: (item: PayrollItem) => number;
}

export const PayrollDeductionsTable = React.memo<PayrollDeductionsTableProps>(({
    payrollData,
    savingCategories,
    visibleColumns,
    hasLoans,
    showLoans,
    showSavings,
    savingsColSpan,
    calculateItemTotal
}) => {
    return (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                    <thead>
                        {/* Grouped Headers */}
                        <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                            <th className="p-3 border-r border-slate-200 dark:border-slate-800 text-center w-12" rowSpan={2}>NO</th>
                            <th className="p-3 border-r border-slate-200 dark:border-slate-800 text-left" rowSpan={2}>NAMA ANGGOTA</th>
                            {showSavings && (
                                <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-center" colSpan={savingsColSpan}>SIMPANAN</th>
                            )}
                            {hasLoans && showLoans && (
                                <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-center" colSpan={3}>PINJAMAN KOPERASI</th>
                            )}
                            <th className="p-3 text-right" rowSpan={2}>JUMLAH</th>
                        </tr>
                        {/* Detail Headers */}
                        <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 text-[9px] font-black text-slate-455 uppercase tracking-wider">
                            {savingCategories?.map(cat => visibleColumns[cat.code] && (
                                <th key={cat.code} className="p-2 border-r border-slate-200 dark:border-slate-800 text-center w-20 uppercase">
                                    {cat.name.replace('Simpanan', '').trim().toUpperCase()}
                                </th>
                            ))}
                            {hasLoans && showLoans && (
                                <>
                                    <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-center w-12">KE-</th>
                                    <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-right w-24">POKOK</th>
                                    <th className="p-2 border-r border-slate-200 dark:border-slate-800 text-right w-24">JASA</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-850 font-medium text-slate-700 dark:text-slate-355">
                        {!payrollData || payrollData.length === 0 ? (
                            <tr>
                                <td colSpan={2 + (showSavings ? savingsColSpan : 0) + (hasLoans && showLoans ? 3 : 0) + 1} className="p-10 text-center text-slate-400 font-bold uppercase tracking-wider">
                                    Belum ada data rekap potongan untuk periode ini.
                                </td>
                            </tr>
                        ) : (
                            payrollData?.map((item, idx) => (
                                <tr key={item.memberNo} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                    <td className="p-3 border-r border-slate-150 dark:border-slate-850 text-center font-bold text-slate-400">{idx + 1}</td>
                                    <td className="p-3 border-r border-slate-150 dark:border-slate-850 font-black uppercase text-slate-850 dark:text-slate-100">{item.name}</td>
                                    
                                    {/* SIMPANAN */}
                                    {savingCategories?.map(cat => visibleColumns[cat.code] && (
                                        <td key={cat.code} className="p-2 border-r border-slate-150 dark:border-slate-850 text-right">
                                            {item.savings[cat.code] > 0 ? `Rp ${Math.round(item.savings[cat.code]).toLocaleString('id-ID')}` : '-'}
                                        </td>
                                    ))}
                                    
                                    {/* PINJAMAN ANGSURAN */}
                                    {hasLoans && showLoans && (
                                        <>
                                            <td className="p-2 border-r border-slate-150 dark:border-slate-850 text-center font-bold text-slate-500">
                                                {item.loan.installmentNo || '-'}
                                            </td>
                                            <td className="p-2 border-r border-slate-150 dark:border-slate-850 text-right text-slate-800 dark:text-slate-200">
                                                {item.loan.pokok > 0 ? `Rp ${Math.round(item.loan.pokok).toLocaleString('id-ID')}` : '-'}
                                            </td>
                                            <td className="p-2 border-r border-slate-150 dark:border-slate-850 text-right text-slate-800 dark:text-slate-200">
                                                {item.loan.jasa > 0 ? `Rp ${Math.round(item.loan.jasa).toLocaleString('id-ID')}` : '-'}
                                            </td>
                                        </>
                                    )}
                                    
                                    {/* JUMLAH */}
                                    <td className="p-3 text-right font-black text-slate-900 dark:text-white">
                                        Rp {Math.round(calculateItemTotal(item)).toLocaleString('id-ID')}
                                    </td>
                                </tr>
                            ))
                        )}

                        {/* Cumulative totals row */}
                        {payrollData.length > 0 && (
                            <tr className="bg-slate-50 dark:bg-slate-900/60 font-black border-t border-slate-350 dark:border-slate-700 text-slate-900 dark:text-white">
                                <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-center" colSpan={2}>JUMLAH</td>
                                
                                {savingCategories?.map(cat => visibleColumns[cat.code] && (
                                    <td key={cat.code} className="p-2 border-r border-slate-200 dark:border-slate-800 text-right">
                                        Rp {Math.round(payrollData?.reduce((sum, i) => sum + (i.savings[cat.code] || 0), 0) || 0).toLocaleString('id-ID')}
                                    </td>
                                ))}
                                
                                {hasLoans && showLoans && (
                                    <>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-center">-</td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right">
                                            Rp {Math.round(payrollData?.reduce((sum, i) => sum + i.loan.pokok, 0) || 0).toLocaleString('id-ID')}
                                        </td>
                                        <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right">
                                            Rp {Math.round(payrollData?.reduce((sum, i) => sum + i.loan.jasa, 0) || 0).toLocaleString('id-ID')}
                                        </td>
                                    </>
                                )}

                                <td className="p-3 text-right font-black text-indigo-650 dark:text-indigo-400">
                                    Rp {Math.round(payrollData?.reduce((sum, item) => sum + calculateItemTotal(item), 0) || 0).toLocaleString('id-ID')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

PayrollDeductionsTable.displayName = 'PayrollDeductionsTable';
