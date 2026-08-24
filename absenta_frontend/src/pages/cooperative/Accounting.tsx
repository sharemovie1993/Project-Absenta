import { z } from 'zod';
import { TabSwitcher } from '../../components/ui/TabSwitcher';
import { generateImportTemplate } from '@/utils/export.utils';
import { formatDate } from '@/utils/date.utils';
import { SectionCard } from '../../components/ui/SectionCard';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import React, { useEffect, useState, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import api from '../../lib/axiosInstance';
import Table from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import Card from '../../components/ui/Card';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { BookOpen, FileText, Printer, Download, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { fetchCoopSettings } from '../../utils/cooperative/coopDocUtils';
import type { CooperativeSettings } from '../../components/cooperative/loans/types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

import { JournalTable } from '../../components/cooperative/accounting';
const PayrollDeductionsSection = lazy(() => import('../../components/cooperative/accounting/PayrollDeductionsSection').then(m => ({ default: m.PayrollDeductionsSection })));
import type { JournalEntry, BalanceSheetItem, PayrollItem } from '../../components/cooperative/accounting';

// Lazy loaded component for performance optimization
const PrintPayrollDeductions = lazy(() =>
    import('../../components/cooperative/loans/PrintPayrollDeductions').then(module => ({
        default: module.PrintPayrollDeductions
    }))
);

interface SubscriptionWithFeatures {
    features?: string[];
    Plan?: { features_json?: string[] };
    plan?: { features_json?: string[] };
}

const indonesianMonths = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const accountingFilterSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2020)
});

const Accounting: React.FC = React.memo(() => {
    const queryClient = useQueryClient();
    const { subscription } = useAuthStore();
    const { isKoperasiFinance, isKoperasiHead, isAdmin, isSuperAdmin, can } = useCapabilities();
    const [activeTab, setActiveTab] = useState<'journal' | 'balance' | 'payroll'>('journal');
    
    // Payroll recap states
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [isPrinting, setIsPrinting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [showPostConfirm, setShowPostConfirm] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    
    // Dynamic columns configurations
    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
    const [showLoans, setShowLoans] = useState(true);

    const printTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const sub = subscription as SubscriptionWithFeatures | null | undefined;
    const features = sub?.features || sub?.Plan?.features_json || sub?.plan?.features_json || [];
    const isLocked = !Array.isArray(features) || !features.includes('KOPERASI');
    
    // Capability checks for Accounting
    const canViewFinancials = can('cooperative.reports.view.financial');
    const canViewDaily = can('cooperative.reports.view.daily');
    const canViewMonthly = can('cooperative.reports.view.monthly');
    const canPostPayroll = can('cooperative.savings.deposit'); // Keep this as deposit for now as it affects savings
    
    const isOperator = canViewFinancials || canViewDaily || canViewMonthly || isSuperAdmin();

    // ─── REACT QUERY HOOKS ───────────────────────────────────────────────────

    const coopSettingsQuery = useQuery({
        queryKey: ['koperasi-settings-coop'],
        queryFn: async () => {
            const data = await fetchCoopSettings();
            return data as CooperativeSettings;
        },
        staleTime: 5 * 60 * 1000,
    });
    const coopSettings = coopSettingsQuery.data || null;

    const journalsQuery = useQuery({
        queryKey: ['koperasi-accounting-journals'],
        queryFn: async () => {
            const res = await api.get('/cooperative/reports/journals');
            return (res.data as JournalEntry[]) || [];
        },
        enabled: activeTab === 'journal' && !isLocked && subscription !== undefined,
        staleTime: 5 * 60 * 1000,
    });
    const journals = journalsQuery.data || [];
    const fetchJournals = useCallback(async () => {
        await journalsQuery.refetch();
    }, [journalsQuery]);

    const balanceSheetQuery = useQuery({
        queryKey: ['koperasi-accounting-balance-sheet'],
        queryFn: async () => {
            const res = await api.get('/cooperative/reports/balance-sheet');
            return (res.data as BalanceSheetItem[]) || [];
        },
        enabled: activeTab === 'balance' && !isLocked && subscription !== undefined,
        staleTime: 5 * 60 * 1000,
    });
    const balanceSheet = balanceSheetQuery.data || [];
    const fetchBalanceSheet = useCallback(async () => {
        await balanceSheetQuery.refetch();
    }, [balanceSheetQuery]);

    const payrollQuery = useQuery({
        queryKey: ['koperasi-accounting-payroll', selectedMonth, selectedYear],
        queryFn: async () => {
            const res = await api.get(`/cooperative/reports/payroll-deductions?month=${selectedMonth}&year=${selectedYear}`);
            return res.data;
        },
        enabled: activeTab === 'payroll' && !isLocked && subscription !== undefined,
        staleTime: 5 * 60 * 1000,
    });

    const payrollData: PayrollItem[] = useMemo(() => (payrollQuery.data?.data as PayrollItem[]) || [], [payrollQuery.data]);
    const savingCategories: { code: string; name: string }[] = useMemo(() => (payrollQuery.data?.savingCategories as { code: string; name: string }[]) || [], [payrollQuery.data]);
    const hasLoans: boolean = useMemo(() => !!payrollQuery.data?.hasLoans, [payrollQuery.data]);
    const isPosted: boolean = useMemo(() => !!payrollQuery.data?.isPosted, [payrollQuery.data]);

    const loading = (activeTab === 'journal' && journalsQuery.isLoading) ||
                    (activeTab === 'balance' && balanceSheetQuery.isLoading) ||
                    (activeTab === 'payroll' && payrollQuery.isLoading);

    useEffect(() => {
        if (savingCategories.length > 0) {
            setVisibleColumns(prev => {
                const updated = { ...prev };
                savingCategories.forEach((c) => {
                    if (updated[c.code] === undefined) {
                        updated[c.code] = true;
                    }
                });
                return updated;
            });
        }
    }, [savingCategories]);

    const fetchPayrollDeductions = useCallback(async () => {
        await payrollQuery.refetch();
    }, [payrollQuery]);

    const postPayrollMutation = useMutation({
        mutationFn: async (payload: { month: number; year: number }) => {
            const res = await api.post('/cooperative/reports/payroll-deductions/post', payload);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Potongan gaji massal berhasil diposting!');
            setShowPostConfirm(false);
            queryClient.invalidateQueries({ queryKey: ['koperasi-accounting-payroll'] });
        },
        onError: (e: unknown) => {
            console.error(e);
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Gagal memproses posting potongan gaji.');
        }
    });
    const postingLoading = postPayrollMutation.isPending;

    const handlePostPayroll = useCallback(async () => {
        await postPayrollMutation.mutateAsync({ month: selectedMonth, year: selectedYear });
    }, [selectedMonth, selectedYear, postPayrollMutation]);

    const cancelPayrollMutation = useMutation({
        mutationFn: async (payload: { month: number; year: number }) => {
            const res = await api.post('/cooperative/reports/payroll-deductions/cancel', payload);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Posting potongan gaji massal berhasil dibatalkan!');
            setShowCancelConfirm(false);
            queryClient.invalidateQueries({ queryKey: ['koperasi-accounting-payroll'] });
        },
        onError: (e: unknown) => {
            console.error(e);
            const err = e as { response?: { data?: { message?: string } } };
            toast.error(err.response?.data?.message || 'Gagal membatalkan posting potongan gaji.');
        }
    });

    const handleCancelPayroll = useCallback(async () => {
        await cancelPayrollMutation.mutateAsync({ month: selectedMonth, year: selectedYear });
    }, [selectedMonth, selectedYear, cancelPayrollMutation]);

    // Cleanup timers to prevent memory leaks
    useEffect(() => {
        return () => {
            if (printTimeoutRef.current) {
                clearTimeout(printTimeoutRef.current);
            }
        };
    }, []);

    const handlePrintPayroll = useCallback(() => {
        setIsPrinting(true);
        printTimeoutRef.current = setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 250);
    }, []);

    const calculateItemTotal = useCallback((item: PayrollItem) => {
        let sum = 0;
        savingCategories?.forEach(cat => {
            if (visibleColumns[cat.code]) {
                sum += Number(item.savings[cat.code] || 0);
            }
        });
        if (hasLoans && showLoans) sum += item.loan.pokok + item.loan.jasa;
        return sum;
    }, [savingCategories, visibleColumns, hasLoans, showLoans]);

    const handleExportExcel = useCallback(() => {
        setIsExporting(true);
        try {
            const monthName = indonesianMonths[selectedMonth - 1]?.toUpperCase() || 'JANUARI';
            const currentCoopName = coopSettings?.cooperative_name || 'KOPERASI SEKOLAH';
            
            // Build headers dynamically
            const headerRow1 = ['NO', 'NAMA ANGGOTA'];
            const headerRow2 = ['', ''];
            
            const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
            const cols: { wch: number }[] = [{ wch: 6 }, { wch: 30 }];
            
            let colIdx = 2;
            
            // Dynamic saving categories group
            const activeCats = savingCategories?.filter(cat => visibleColumns[cat.code]) || [];
            if (activeCats.length > 0) {
                const startCol = colIdx;
                activeCats?.forEach((cat, index) => {
                    if (index === 0) {
                        headerRow1.push('SIMPANAN');
                    } else {
                        headerRow1.push('');
                    }
                    headerRow2.push(cat.name.replace('Simpanan', '').trim().toUpperCase());
                    cols.push({ wch: 15 });
                    colIdx++;
                });
                merges.push({ s: { r: 4, c: startCol }, e: { r: 4, c: colIdx - 1 } });
            }
            
            // Pinjaman Angsuran group
            if (hasLoans && showLoans) {
                const startCol = colIdx;
                headerRow1.push('PINJAMAN ANGSURAN', '', '');
                headerRow2.push('KE-', 'POKOK', 'JASA');
                cols.push({ wch: 6 }, { wch: 15 }, { wch: 15 });
                colIdx += 3;
                merges.push({ s: { r: 4, c: startCol }, e: { r: 4, c: colIdx - 1 } });
            }
            
            headerRow1.push('JUMLAH');
            headerRow2.push('');
            cols.push({ wch: 18 });
            
            // Merge rows 4 and 5 for double header format
            merges.push({ s: { r: 4, c: 0 }, e: { r: 5, c: 0 } }); 
            merges.push({ s: { r: 4, c: 1 }, e: { r: 5, c: 1 } }); 
            merges.push({ s: { r: 4, c: colIdx }, e: { r: 5, c: colIdx } }); 
            
            // Build rows data
            const rowData = payrollData?.map((item, idx) => {
                const row: (string | number | null)[] = [idx + 1, item.name.toUpperCase()];
                
                activeCats?.forEach(cat => {
                    row.push(item.savings[cat.code] || null);
                });
                if (hasLoans && showLoans) {
                    row.push(item.loan.installmentNo || null);
                    row.push(item.loan.pokok || null);
                    row.push(item.loan.jasa || null);
                }
                row.push(calculateItemTotal(item));
                return row;
            }) || [];
            
            // Build totals row
            const totalRow: (string | number | null)[] = ['JUMLAH', ''];
            activeCats?.forEach(cat => {
                const colTotal = payrollData.reduce((acc, curr) => acc + (Number(curr.savings[cat.code]) || 0), 0);
                totalRow.push(colTotal);
            });
            if (hasLoans && showLoans) {
                const totalPokok = payrollData.reduce((acc, curr) => acc + curr.loan.pokok, 0);
                const totalJasa = payrollData.reduce((acc, curr) => acc + curr.loan.jasa, 0);
                totalRow.push('', totalPokok, totalJasa);
            }
            const grandTotal = payrollData.reduce((acc, curr) => acc + calculateItemTotal(curr), 0);
            totalRow.push(grandTotal);
            
            // Assemble Worksheet
            const worksheetData = [
                ['REKAPITULASI POTONGAN GAJI ANGGOTA KOPERASI'],
                [currentCoopName.toUpperCase()],
                [`BULAN: ${monthName} ${selectedYear}`],
                [],
                headerRow1,
                headerRow2,
                ...rowData,
                totalRow
            ];
            
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
            
            worksheet['!merges'] = merges;
            worksheet['!cols'] = cols;
            
            XLSX.writeFile(workbook, `Rekap_Potongan_Koperasi_${monthName}_${selectedYear}.xlsx`);
            toast.success('Rekap potongan gaji koperasi berhasil diekspor ke Excel!');
        } catch (err: unknown) {
            toast.error('Gagal mengekspor data ke Excel.');
        } finally {
            setIsExporting(false);
        }
    }, [selectedMonth, selectedYear, coopSettings, savingCategories, visibleColumns, hasLoans, showLoans, payrollData, calculateItemTotal]);

    const activeSavings = useMemo(() => {
        return savingCategories?.filter(cat => visibleColumns[cat.code]) || [];
    }, [savingCategories, visibleColumns]);

    const showSavings = activeSavings.length > 0;
    const savingsColSpan = activeSavings.length;

    // ─── BREADCRUMBS & USER GUIDANCE ─────────────────────────────────────────
    
    const breadcrumbs = useMemo(() => [
        { label: 'Koperasi', path: '/cooperative/dashboard' },
        { label: 'Laporan Keuangan', path: '/cooperative/accounting' }
    ], []);

    const instruction = useMemo(() => ({
        title: 'Panduan Laporan Keuangan & Akuntansi',
        description: 'Halaman ini digunakan untuk melihat jurnal umum, neraca saldo, dan mengelola rekapitulasi potongan gaji anggota koperasi.',
        items: [
            { text: 'Gunakan tab Jurnal Umum untuk memantau aliran kas dan pembukuan debit/kredit koperasi.' },
            { text: 'Tab Neraca Saldo menampilkan rekap saldo akun keuangan koperasi yang terstandar dengan pencarian dan pagination.' },
            { text: 'Tab Rekap Potongan Gaji memfasilitasi operator untuk mengunduh laporan bulanan Excel/PDF dan memposting setoran anggota secara massal.' }
        ]
    }), []);

    // ─── STANDARDIZED TABLE FOR BALANCE SHEET ────────────────────────────────
    
    const [balanceSortBy, setBalanceSortBy] = useState<string>('code');
    const [balanceSortOrder, setBalanceSortOrder] = useState<'asc' | 'desc'>('asc');
    const [balancePage, setBalancePage] = useState<number>(1);
    const [balanceLimit, setBalanceLimit] = useState<number>(10);

    const handleBalanceSort = useCallback((key: string, order: 'asc' | 'desc') => {
        setBalanceSortBy(key);
        setBalanceSortOrder(order);
    }, []);

    const balanceColumns: Column[] = useMemo(() => [
        {
            key: 'code',
            label: 'Kode Akun',
            sortable: true
        },
        {
            key: 'name',
            label: 'Nama Akun',
            sortable: true
        },
        {
            key: 'type',
            label: 'Tipe',
            sortable: true
        },
        {
            key: 'balance',
            label: 'Saldo Neraca',
            sortable: true,
            render: (_, row: unknown) => {
                const item = row as BalanceSheetItem;
                return (
                    <span className="font-black text-slate-800 dark:text-white">
                        Rp {Math.round(Number(item.balance)).toLocaleString('id-ID')}
                    </span>
                );
            }
        }
    ], []);

    const sortedBalanceSheet = useMemo(() => {
        const sorted = [...balanceSheet];
        if (!balanceSortBy) return sorted;

        sorted.sort((a, b) => {
            const valA = a[balanceSortBy as keyof BalanceSheetItem] ?? '';
            const valB = b[balanceSortBy as keyof BalanceSheetItem] ?? '';

            if (typeof valA === 'string' && typeof valB === 'string') {
                return balanceSortOrder === 'asc'
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
            }

            if (typeof valA === 'number' && typeof valB === 'number') {
                return balanceSortOrder === 'asc' ? valA - valB : valB - valA;
            }

            return 0;
        });

        return sorted;
    }, [balanceSheet, balanceSortBy, balanceSortOrder]);

    const paginatedBalanceSheet = useMemo(() => {
        const start = (balancePage - 1) * balanceLimit;
        return sortedBalanceSheet.slice(start, start + balanceLimit);
    }, [sortedBalanceSheet, balancePage, balanceLimit]);

    const balanceToolbarLeft = useMemo(() => (
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-2">
            Neraca Saldo Koperasi
        </div>
    ), []);

    const balanceToolbarRight = useMemo(() => (
        <div className="text-[10px] text-slate-400 font-semibold pr-2">
            Status: Aktif | Terstandarisasi
        </div>
    ), []);

    // ─── SEARCHABLE SELECT OPTIONS ───────────────────────────────────────────
    
    const monthOptions = useMemo(() => indonesianMonths?.map((m, idx) => ({
        label: m,
        value: String(idx + 1)
    })) || [], []);

    const yearOptions = useMemo(() => [2025, 2026, 2027, 2028]?.map(y => ({
        label: String(y),
        value: String(y)
    })) || [], []);

    return (
        <PremiumFeatureGate 
            moduleName="KOPERASI" 
            featureName="Laporan Keuangan"
        >
            <AcademicPageLayout
                title="Laporan Keuangan & Akuntansi"
                description="Laporan keuangan, jurnal, neraca saldo, dan rekapitulasi potongan gaji koperasi"
                hardeningModuleKey="coop_accounting"
                breadcrumbs={breadcrumbs}
                instruction={instruction}
            >
            <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
            <div className="space-y-6 print:hidden w-full min-w-0 max-w-full">
                <TabSwitcher
                    tabs={[
                        { id: 'journal', label: 'Jurnal Umum', icon: BookOpen },
                        { id: 'balance', label: 'Neraca Saldo', icon: FileText },
                        { id: 'payroll', label: 'Rekap Potongan Gaji', icon: Calendar }
                    ]}
                    activeTab={activeTab}
                    onChange={(id) => setActiveTab(id as 'journal' | 'balance' | 'payroll')}
                />

                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <Card className="p-0 border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden rounded-2xl">
                        {activeTab === 'journal' && (
                            <JournalTable journals={journals} />
                        )}

                        {activeTab === 'balance' && (
                            <Table 
                                data={paginatedBalanceSheet}
                                columns={balanceColumns}
                                rowKey="code"
                                loading={loading}
                                emptyMessage="Data neraca saldo tidak ditemukan."
                                sortBy={balanceSortBy}
                                sortOrder={balanceSortOrder}
                                onSort={handleBalanceSort}
                                toolbarLeft={balanceToolbarLeft}
                                toolbarRight={balanceToolbarRight}
                                pagination={{
                                    currentPage: balancePage,
                                    totalPages: Math.ceil(sortedBalanceSheet.length / balanceLimit) || 1,
                                    totalItems: sortedBalanceSheet.length,
                                    itemsPerPage: balanceLimit,
                                    onPageChange: setBalancePage,
                                    onLimitChange: setBalanceLimit
                                }}
                            />
                        )}

                        {activeTab === 'payroll' && (
                            <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Memuat rekapitulasi gaji...</div>}>
                                <PayrollDeductionsSection
                                    selectedMonth={selectedMonth}
                                    setSelectedMonth={setSelectedMonth}
                                    selectedYear={selectedYear}
                                    setSelectedYear={setSelectedYear}
                                    monthOptions={monthOptions}
                                    yearOptions={yearOptions}
                                    handlePrintPayroll={handlePrintPayroll}
                                    handleExportExcel={handleExportExcel}
                                    isOperator={isOperator}
                                    isPosted={isPosted}
                                    setShowCancelConfirm={setShowCancelConfirm}
                                    setShowPostConfirm={setShowPostConfirm}
                                    payrollData={payrollData}
                                    savingCategories={savingCategories}
                                    visibleColumns={visibleColumns}
                                    setVisibleColumns={setVisibleColumns}
                                    showLoans={showLoans}
                                    setShowLoans={setShowLoans}
                                    loading={loading}
                                    payrollPage={payrollPage}
                                    payrollLimit={payrollLimit}
                                    setPayrollPage={setPayrollPage}
                                    setPayrollLimit={setPayrollLimit}
                                />
                            </Suspense>
                        )}
                    </Card>
                )}
            </div>
            </SectionCard>

            {/* Style Cetak */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    #root {
                        display: none !important;
                    }
                    body {
                        background: white !important;
                        color: black !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    #print-payroll-deductions {
                        display: block !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                    }
                }
            `}} />

            <Suspense fallback={null}>
                {isPrinting && createPortal(
                    <PrintPayrollDeductions 
                        data={payrollData}
                        month={selectedMonth}
                        year={selectedYear}
                        coopSettings={coopSettings}
                        savingCategories={savingCategories}
                        visibleColumns={visibleColumns}
                        showLoans={hasLoans && showLoans}
                    />,
                    document.body
                )}
            </Suspense>

            {/* Modal Konfirmasi Posting Potongan Gaji */}
            <Modal
                isOpen={showPostConfirm}
                onClose={() => setShowPostConfirm(false)}
                title="Konfirmasi Posting Potongan Gaji Massal"
            >
                <div className="space-y-4 text-slate-700 dark:text-slate-300">
                    <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400">
                        <AlertCircle className="shrink-0 mt-0.5" size={16} />
                        <div className="text-xs font-semibold leading-relaxed">
                            <p className="font-bold uppercase tracking-wider text-[10px]">PENTING:</p>
                            Aksi ini akan mencatat transaksi setoran <b>Simpanan Wajib & Lainnya</b> serta <b>Angsuran Pinjaman</b> secara otomatis untuk seluruh {payrollData.length} anggota aktif pada bulan <b>{indonesianMonths[selectedMonth - 1]} {selectedYear}</b> ke dalam database, serta membukukan jurnal akuntansinya.
                        </div>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-500">
                        Pastikan Anda telah memeriksa kebenaran data pada tabel potongan sebelum melanjutkan. Transaksi yang telah diposting tidak dapat diubah secara manual satu per satu secara langsung.
                    </p>
                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            type="button"
                            aria-label="Batal Posting"
                            variant="toolbarOutline"
                            size="toolbar"
                            onClick={() => setShowPostConfirm(false)}
                            disabled={postingLoading}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            aria-label="Posting Sekarang"
                            variant="toolbarPrimary"
                            size="toolbar"
                            onClick={handlePostPayroll}
                            isLoading={postingLoading}
                        >
                            Posting Sekarang
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal Konfirmasi Batalkan Posting Potongan Gaji */}
            <Modal
                isOpen={showCancelConfirm}
                onClose={() => setShowCancelConfirm(false)}
                title="Konfirmasi Pembatalan Posting Potongan Gaji"
            >
                <div className="space-y-4 text-slate-700 dark:text-slate-300">
                    <div className="flex items-start gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-400">
                        <AlertCircle className="shrink-0 mt-0.5" size={16} />
                        <div className="text-xs font-semibold leading-relaxed">
                            <p className="font-bold uppercase tracking-wider text-[10px]">PERINGATAN:</p>
                            Aksi ini akan <b>menghapus seluruh transaksi setoran simpanan</b> dan <b>mengembalikan status pembayaran angsuran pinjaman</b> serta <b>menghapus jurnal umum</b> yang dicatatkan pada posting potongan gaji bulan <b>{indonesianMonths[selectedMonth - 1]} {selectedYear}</b>.
                        </div>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-500">
                        Tindakan ini akan mengembalikan saldo simpanan anggota dan tagihan pinjaman mereka ke keadaan semula sebelum proses posting dilakukan. Harap berhati-hati sebelum memproses.
                    </p>
                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            type="button"
                            aria-label="Batal Pembatalan Posting"
                            variant="toolbarOutline"
                            size="toolbar"
                            onClick={() => setShowCancelConfirm(false)}
                            disabled={postingLoading}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            aria-label="Ya, Batalkan Posting"
                            variant="toolbarDanger"
                            size="toolbar"
                            onClick={handleCancelPayroll}
                            isLoading={postingLoading}
                        >
                            Ya, Batalkan Posting
                        </Button>
                    </div>
                </div>
            </Modal>
            </AcademicPageLayout>
        </PremiumFeatureGate>
    );
});

export default Accounting;
