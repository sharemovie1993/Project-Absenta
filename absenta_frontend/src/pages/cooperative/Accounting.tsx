import { z } from 'zod';
import { TabSwitcher, type TabOption } from '../../components/ui/TabSwitcher';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { BookOpen, FileText, Printer, Download, Calendar, CheckCircle2, AlertCircle, TrendingUp, Scale, FileSpreadsheet, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { fetchCoopSettings } from '../../utils/cooperative/coopDocUtils';
import type { CooperativeSettings } from '../../components/cooperative/loans/types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { invalidateAccountingCaches } from '../../lib/coopQueryKeys';

import { 
    JournalTable, 
    IncomeStatementReport, 
    BalanceSheetReport, 
    CashFlowStatementReport, 
    GeneralLedgerSection,
    TrialBalanceSection,
    type AccountingTabId
} from '../../components/cooperative/accounting';
import { WorkspaceAppLauncherCard } from '../../components/common/WorkspaceAppLauncherCard';
import type { JournalEntry, BalanceSheetItem, PayrollItem, TrialBalanceData } from '../../components/cooperative/accounting';
import { CoopSetupProgressBanner } from '../../components/cooperative/setup/CoopSetupProgressBanner';
import { CoopSetupWizardModal } from '../../components/cooperative/setup/CoopSetupWizardModal';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useModuleAccess } from '../../hooks/useModuleAccess';
import { useSocket } from '../../hooks/useSocket';

// Lazy loaded component for performance optimization
const PrintPayrollDeductions = lazy(() =>
    import('../../components/cooperative/loans/PrintPayrollDeductions').then(module => ({
        default: module.PrintPayrollDeductions
    }))
);
const PayrollDeductionsSection = lazy(() => import('../../components/cooperative/accounting/PayrollDeductionsSection').then(m => ({ default: m.PayrollDeductionsSection })));

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

export interface AccountingProps {
  hideLayout?: boolean;
}

const Accounting: React.FC<AccountingProps> = React.memo(({ hideLayout = false }) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { subscription } = useAuthStore();
    const { isKoperasiFinance, isKoperasiHead, isAdmin, isSuperAdmin, can } = useCapabilities();
    const isMobile = useIsMobile();
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get('tab');
    
    // Auto-redirect jika pengguna membuka tab legacy ke halaman mandiri masing-masing
    useEffect(() => {
        if (tabParam === 'expenses' || tabParam === 'beban' || tabParam === 'kas-keluar') {
            navigate('/cooperative/cash-bank', { replace: true });
        } else if (tabParam === 'coa' || tabParam === 'bagan-akun') {
            navigate('/cooperative/chart-of-accounts', { replace: true });
        }
    }, [tabParam, navigate]);

    const activeTab: AccountingTabId = useMemo(() => {
        if (tabParam === 'income-statement' || tabParam === 'laba-rugi') return 'income-statement';
        if (tabParam === 'neraca') return 'neraca';
        if (tabParam === 'cash-flow' || tabParam === 'arus-kas') return 'cash-flow';
        if (tabParam === 'ledger' || tabParam === 'buku-besar') return 'ledger';
        if (tabParam === 'balance') return 'balance';
        if (tabParam === 'payroll') return 'payroll';
        if (tabParam === 'journal') return 'journal';
        return 'income-statement';
    }, [tabParam]);

    const handleTabChange = useCallback((tabId: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('tab', tabId);
            return next;
        });
    }, [setSearchParams]);

    const tabOptions: TabOption[] = useMemo(() => [
        { id: 'income-statement', label: 'Laba Rugi', icon: TrendingUp },
        { id: 'neraca', label: 'Neraca', icon: Scale },
        { id: 'cash-flow', label: 'Arus Kas', icon: Activity },
        { id: 'ledger', label: 'Buku Besar', icon: BookOpen },
        { id: 'journal', label: 'Jurnal Umum', icon: FileText },
        { id: 'balance', label: 'Neraca Saldo', icon: FileSpreadsheet },
        { id: 'payroll', label: 'Potongan Gaji', icon: Calendar },
    ], []);

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

    // Gating Logic menggunakan useModuleAccess (Pilar Lisensi Hardening)
    const { isLocked } = useModuleAccess('KOPERASI');
    
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

    // Fetch daftar Periode / Tahun Buku Koperasi untuk dropdown filter konteks
    const periodsQuery = useQuery({
        queryKey: ['koperasi-shu-periods'],
        queryFn: async () => {
            const res = await api.get('/cooperative/shu/periods');
            return (res.data?.success ? res.data.data : []) as Array<{
                id: string;
                year: number;
                status: string;
                isActive?: boolean;
            }>;
        },
        staleTime: 5 * 60 * 1000,
    });
    const fiscalYears = periodsQuery.data || [];
    const activeFiscalYear = useMemo(() => fiscalYears.find(p => p.isActive) || fiscalYears[0] || null, [fiscalYears]);
    const [selectedFiscalYearId, setSelectedFiscalYearId] = useState<string>('');

    const currentFiscalYear = useMemo(() => {
        if (selectedFiscalYearId) {
            return fiscalYears.find(p => p.id === selectedFiscalYearId) || activeFiscalYear;
        }
        return activeFiscalYear;
    }, [selectedFiscalYearId, fiscalYears, activeFiscalYear]);

    const fiscalYearOptions = useMemo(() => {
        return fiscalYears?.map(fy => ({
            value: fy.id,
            label: `Tahun ${fy.year} ${fy.isActive ? '(Aktif)' : `(${fy.status})`}`
        })) || [];
    }, [fiscalYears]);

    const journalsQuery = useQuery({
        queryKey: ['koperasi-accounting-journals', currentFiscalYear?.id],
        queryFn: async () => {
            const res = await api.get('/cooperative/reports/journals');
            return (res.data as JournalEntry[]) || [];
        },
        enabled: activeTab === 'journal' && subscription !== undefined,
        staleTime: 5 * 60 * 1000,
    });
    const journals = journalsQuery.data || [];
    const fetchJournals = useCallback(async () => {
        await journalsQuery.refetch();
    }, [journalsQuery]);

    const trialBalanceQuery = useQuery({
        queryKey: ['koperasi-accounting-trial-balance', currentFiscalYear?.id],
        queryFn: async () => {
            const res = await api.get('/cooperative/reports/trial-balance');
            return res.data?.data as TrialBalanceData;
        },
        enabled: activeTab === 'balance' && subscription !== undefined,
        staleTime: 5 * 60 * 1000,
    });
    const trialBalanceData = trialBalanceQuery.data;
    const fetchTrialBalance = useCallback(async () => {
        await trialBalanceQuery.refetch();
    }, [trialBalanceQuery]);

    const payrollQuery = useQuery({
        queryKey: ['koperasi-accounting-payroll', selectedMonth, selectedYear],
        queryFn: async () => {
            const res = await api.get(`/cooperative/reports/payroll-deductions?month=${selectedMonth}&year=${selectedYear}`);
            return res.data;
        },
        enabled: activeTab === 'payroll' && subscription !== undefined,
        staleTime: 5 * 60 * 1000,
    });

    const payrollData: PayrollItem[] = useMemo(() => (payrollQuery.data?.data as PayrollItem[]) || [], [payrollQuery.data]);
    const savingCategories: { code: string; name: string }[] = useMemo(() => (payrollQuery.data?.savingCategories as { code: string; name: string }[]) || [], [payrollQuery.data]);
    const hasLoans: boolean = useMemo(() => !!payrollQuery.data?.hasLoans, [payrollQuery.data]);
    const isPosted: boolean = useMemo(() => !!payrollQuery.data?.isPosted, [payrollQuery.data]);

    const loading = (activeTab === 'journal' && journalsQuery.isLoading) ||
                    (activeTab === 'balance' && trialBalanceQuery.isLoading) ||
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

    const { subscribe, unsubscribe, isConnected } = useSocket();

    // Realtime synchronization across all cooperative financial operations
    useEffect(() => {
        if (!isConnected) return;

        const handleRealtimeUpdate = () => {
            invalidateAccountingCaches(queryClient);
        };

        subscribe('coop_accounting_update', handleRealtimeUpdate);
        subscribe('coop_pos_update', handleRealtimeUpdate);
        subscribe('coop_saving_update', handleRealtimeUpdate);
        subscribe('coop_loan_update', handleRealtimeUpdate);
        subscribe('coop_shu_update', handleRealtimeUpdate);

        return () => {
            unsubscribe('coop_accounting_update', handleRealtimeUpdate);
            unsubscribe('coop_pos_update', handleRealtimeUpdate);
            unsubscribe('coop_saving_update', handleRealtimeUpdate);
            unsubscribe('coop_loan_update', handleRealtimeUpdate);
            unsubscribe('coop_shu_update', handleRealtimeUpdate);
        };
    }, [isConnected, queryClient, subscribe, unsubscribe]);

    const postPayrollMutation = useMutation({
        mutationFn: async (payload: { month: number; year: number }) => {
            const res = await api.post('/cooperative/reports/payroll-deductions/post', payload, {
                headers: {
                    'Idempotency-Key': crypto.randomUUID()
                }
            });
            return res.data;
        },
        onSuccess: () => {
            toast.success('Potongan gaji massal berhasil diposting!');
            setShowPostConfirm(false);
            invalidateAccountingCaches(queryClient);
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
            const res = await api.post('/cooperative/reports/payroll-deductions/cancel', payload, {
                headers: {
                    'Idempotency-Key': crypto.randomUUID()
                }
            });
            return res.data;
        },
        onSuccess: () => {
            toast.success('Posting potongan gaji massal berhasil dibatalkan!');
            setShowCancelConfirm(false);
            invalidateAccountingCaches(queryClient);
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
        title: 'Panduan Laporan Keuangan & Akuntansi Koperasi',
        description: 'Halaman ini menyajikan laporan keuangan berstandar akuntansi resmi (Accurate / SAK ETAP), jurnal umum, neraca saldo, dan rekapitulasi potongan gaji anggota.',
        items: [
            { text: 'Tab Laba Rugi (PHU) menampilkan pendapatan usaha, HPP, laba kotor, dan beban operasional untuk menghasilkan Sisa Hasil Usaha (SHU) bersih koperasi.' },
            { text: 'Tab Neraca menyajikan posisi keuangan resmi: Aktiva (Aset) vs Pasiva (Kewajiban & Ekuitas) lengkap dengan indikator keseimbangan (Balance Check).' },
            { text: 'Tab Arus Kas (Cash Flow) menyajikan arus kas masuk & keluar dari aktivitas Operasi, Investasi, dan Pendanaan serta rekonsiliasi kas riil.' },
            { text: 'Tab Buku Besar Akun memungkinkan drill-down mutasi debit/kredit dan saldo berjalan (running balance) spesifik per nomor rekening akun.' },
            { text: 'Tab Jurnal Umum digunakan untuk audit jejak transaksi debit/kredit setiap mutasi keuangan koperasi.' },
            { text: 'Tab Neraca Saldo (Trial Balance) menampilkan rekapitulasi kontrol saldo buku besar seluruh akun koperasi untuk verifikasi audit Debit/Kredit.' },
            { text: 'Tab Rekap Potongan Gaji memfasilitasi operator untuk mengunduh laporan potongan gaji bulanan dan memposting setoran massal.' },
            { text: 'Untuk pencatatan pengeluaran harian (BKK) dan kas masuk (BKM), silakan akses menu terpisah "Kas & Bank".' }
        ]
    }), []);

    const [payrollPage, setPayrollPage] = useState<number>(1);
    const [payrollLimit, setPayrollLimit] = useState<number>(10);
    const [showSetupWizard, setShowSetupWizard] = useState(false);

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
                title={hideLayout ? undefined : "Laporan Keuangan & Akuntansi"}
                description={hideLayout ? undefined : "Laporan keuangan, jurnal, neraca saldo, dan rekapitulasi potongan gaji koperasi"}
                hardeningModuleKey="coop_accounting"
                breadcrumbs={hideLayout ? undefined : breadcrumbs}
                topSlot={hideLayout ? undefined : <WorkspaceAppLauncherCard workspaceId="COOPERATIVE_WORKSPACE" />}
                instruction={hideLayout ? undefined : instruction}
            >
            <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
            <div className="space-y-6 print:hidden w-full min-w-0 max-w-full">
                {/* Onboarding & Setup Wizard Banner */}
                <CoopSetupProgressBanner onOpenWizard={() => setShowSetupWizard(true)} />

                {/* Header Navigasi Tab & Konteks Tahun Buku Terpadu */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <TabSwitcher
                            tabs={tabOptions}
                            activeTab={activeTab}
                            onChange={handleTabChange}
                        />
                    </div>

                    {/* Badge Konteks Tahun Buku (Kompak & Elegan) */}
                    <div className="inline-flex items-center gap-2 self-start lg:self-center px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs shrink-0 shadow-2xs">
                        <Calendar size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {currentFiscalYear ? `Tahun Buku ${currentFiscalYear.year}` : 'Tahun Buku Berjalan'}
                        </span>
                        {currentFiscalYear?.isActive && (
                            <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 rounded border border-emerald-500/20">
                                AKTIF
                            </span>
                        )}
                        {currentFiscalYear && (currentFiscalYear.status === 'APPROVED' || currentFiscalYear.status === 'DISTRIBUTED') && (
                            <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 rounded">
                                CLOSED
                            </span>
                        )}
                        {fiscalYears.length > 1 && (
                            <div className="w-36 ml-1">
                                <SearchableSelect
                                    options={fiscalYearOptions}
                                    value={currentFiscalYear?.id || ''}
                                    onChange={(val) => setSelectedFiscalYearId(val)}
                                    placeholder="Ganti Tahun"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <Card className="p-0 border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden rounded-2xl">
                        {activeTab === 'income-statement' && (
                            <div className="p-4 sm:p-6">
                                <IncomeStatementReport 
                                    coopSettings={coopSettings} 
                                    defaultYear={currentFiscalYear?.year} 
                                />
                            </div>
                        )}

                        {activeTab === 'neraca' && (
                            <div className="p-4 sm:p-6">
                                <BalanceSheetReport 
                                    coopSettings={coopSettings} 
                                    defaultYear={currentFiscalYear?.year} 
                                />
                            </div>
                        )}

                        {activeTab === 'cash-flow' && (
                            <div className="p-4 sm:p-6">
                                <CashFlowStatementReport 
                                    coopSettings={coopSettings} 
                                    defaultYear={currentFiscalYear?.year} 
                                />
                            </div>
                        )}

                        {activeTab === 'ledger' && (
                            <div className="p-4 sm:p-6">
                                <GeneralLedgerSection />
                            </div>
                        )}

                        {activeTab === 'journal' && (
                            <JournalTable journals={journals} />
                        )}

                        {activeTab === 'balance' && (
                            <TrialBalanceSection 
                                data={trialBalanceData} 
                                loading={trialBalanceQuery.isLoading}
                                onRefresh={fetchTrialBalance} 
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

            {/* Modal Setup & Onboarding Wizard */}
            <CoopSetupWizardModal
                isOpen={showSetupWizard}
                onClose={() => setShowSetupWizard(false)}
            />
            </AcademicPageLayout>
        </PremiumFeatureGate>
    );
});

export default Accounting;
