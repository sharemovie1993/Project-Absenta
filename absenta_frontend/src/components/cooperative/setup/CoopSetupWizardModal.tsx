import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  X, 
  Check, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft, 
  Building2, 
  Calendar, 
  FileText, 
  Upload, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  ShieldCheck, 
  Layers, 
  Scale, 
  Users, 
  Wallet, 
  Plus, 
  Trash2,
  Sparkles,
  HelpCircle,
  TrendingUp,
  Info
} from 'lucide-react';
import { 
  coopSetupApi, 
  type SetupMode, 
  type OpeningBalanceEntry, 
  type SubledgerMemberImport 
} from '../../../api/coopSetup.api';
import { coopAccountApi } from '../../../api/coopAccount.api';
import toast from 'react-hot-toast';

interface CoopSetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CoopSetupWizardModal: React.FC<CoopSetupWizardModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Status Setup
  const { data: status, isLoading: loadingStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['coop-setup-status'],
    queryFn: coopSetupApi.getStatus,
    enabled: isOpen,
  });

  // Step 1 State: Mode & Cutoff
  const [selectedMode, setSelectedMode] = useState<SetupMode>('NEW_COOP');
  const [cutoffDate, setCutoffDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showCutoffHelp, setShowCutoffHelp] = useState<boolean>(false);

  // Perhitungan Tanggal Cerdas & Anti-Human Error
  const smartDates = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const todayStr = now.toISOString().split('T')[0];
    const startOfYearStr = `${currentYear}-01-01`;
    const midYearSemester1Str = `${currentYear}-06-30`;

    // Hari terakhir bulan lalu (End of previous month)
    const firstDayThisMonth = new Date(currentYear, now.getMonth(), 1);
    const lastDayPrevMonth = new Date(firstDayThisMonth.getTime() - 86400000);
    const lastMonthEndStr = lastDayPrevMonth.toISOString().split('T')[0];

    return {
      todayStr,
      startOfYearStr,
      midYearSemester1Str,
      lastMonthEndStr,
      currentYear,
    };
  }, []);

  // Helper cerdas mendeteksi apakah tanggal jatuh pada akhir bulan (best practice SAK ETAP)
  const isDateEndOfMonth = (dateStr: string) => {
    if (!dateStr) return false;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return false;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const lastDay = new Date(y, m, 0).getDate();
    return d === lastDay;
  };

  // Handler pemilihan mode cerdas (mengunci tanggal default terbaik tanpa salah ketik)
  const handleSelectMode = (mode: SetupMode) => {
    setSelectedMode(mode);
    if (mode === 'NEW_COOP') {
      setCutoffDate(smartDates.todayStr);
    } else if (mode === 'MIGRATION_START_YEAR') {
      setCutoffDate(smartDates.startOfYearStr);
    } else if (mode === 'MIGRATION_MID_YEAR') {
      setCutoffDate(smartDates.lastMonthEndStr);
    }
  };

  // Reset Simulation State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetOptions, setResetOptions] = useState({
    purgeTransactions: true,
    purgeOpeningBalances: true,
    purgeMembers: false,
    purgeProducts: false,
    resetSetupStatus: true,
  });
  const [confirmText, setConfirmText] = useState('');

  // Step 2 State: Accounts list
  const { data: accountsData, isLoading: loadingAccounts, refetch: refetchAccounts } = useQuery({
    queryKey: ['cooperative-accounts-flat'],
    queryFn: () => coopAccountApi.getAccounts({ tree: false }),
    enabled: isOpen && currentStep >= 2,
  });

  // Step 3 State: Opening Balance Journal
  const [journalEntries, setJournalEntries] = useState<OpeningBalanceEntry[]>([]);
  const [journalNotes, setJournalNotes] = useState<string>('');

  // Step 4 State: Subledger Members
  const [subledgerMembers, setSubledgerMembers] = useState<SubledgerMemberImport[]>([
    {
      nik: '',
      nama: '',
      phone: '',
      simpanan_pokok: 0,
      simpanan_wajib: 0,
      simpanan_sukarela: 0,
      pinjaman_pokok_berjalan: 0,
      pinjaman_sisa_bunga: 0,
      pinjaman_sisa_tenor_bulan: 0,
    }
  ]);

  // Normalisasi daftar akun dari flat/nodes agar tahan format respon API
  const accountList: AccountNode[] = useMemo(() => {
    if (!accountsData) return [];
    if (Array.isArray(accountsData.flat)) return accountsData.flat;
    if (Array.isArray((accountsData as any).nodes)) return (accountsData as any).nodes;
    if (Array.isArray(accountsData)) return accountsData;
    return [];
  }, [accountsData]);

  // Guard agar refetch status di background TIDAK otomatis melompati step yang sedang aktif
  const hasInitializedStepRef = React.useRef(false);

  useEffect(() => {
    if (!isOpen) {
      hasInitializedStepRef.current = false;
    }
  }, [isOpen]);

  // Sinkronkan status data ke local state saat pertama dibuka
  useEffect(() => {
    if (status) {
      if (status.setupMode) {
        setSelectedMode(status.setupMode);
      }
      if (status.cutoffDate) {
        setCutoffDate(status.cutoffDate);
      }
      // Tentukan step rekomendasi HANYA 1 kali saat modal baru pertama kali terbuka
      if (!hasInitializedStepRef.current) {
        hasInitializedStepRef.current = true;
        if (!status.coaInitialized) {
          setCurrentStep(1);
        } else if (!status.hasOpeningJournal && status.setupMode !== 'NEW_COOP') {
          // Tetap mulai dari Step 1 agar pengurus bisa mereview skenario & tanggal
          setCurrentStep(1);
        } else if (status.memberCount === 0) {
          setCurrentStep(1);
        }
      }
    }
  }, [status]);

  // Inisialisasi daftar entri saldo awal dari akun detail (posting) yang tersedia
  useEffect(() => {
    if (accountList.length > 0 && journalEntries.length === 0) {
      const detailAccounts = accountList.filter(a => !(a.isHeader ?? (a as any).is_header));
      const initialEntries: OpeningBalanceEntry[] = detailAccounts.map(a => ({
        account_id: a.id,
        debit: 0,
        credit: 0,
        notes: `Saldo Awal ${a.code} - ${a.name}`
      }));
      setJournalEntries(initialEntries);
    }
  }, [accountList, journalEntries.length]);

  // Mutations
  const setModeMutation = useMutation({
    mutationFn: coopSetupApi.setMode,
    onSuccess: () => {
      toast.success('Skenario dan mode onboarding berhasil disimpan!');
      refetchStatus();
      setCurrentStep(2);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan mode onboarding');
    }
  });

  const initCoaMutation = useMutation({
    mutationFn: coopSetupApi.initializeCoa,
    onSuccess: (data) => {
      toast.success(`Berhasil menginisialisasi ${data.count} akun standar SAK ETAP!`);
      refetchStatus();
      refetchAccounts();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal inisialisasi COA');
    }
  });

  const postBalanceMutation = useMutation({
    mutationFn: coopSetupApi.postOpeningBalance,
    onSuccess: () => {
      toast.success('Jurnal saldo awal neraca berhasil diposting dan seimbang!');
      refetchStatus();
      setCurrentStep(4);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal memposting saldo awal');
    }
  });

  const importSubledgerMutation = useMutation({
    mutationFn: coopSetupApi.importSubledger,
    onSuccess: (res) => {
      toast.success(`Berhasil mengimpor & merekonsiliasi ${res.data.total_members_imported} anggota!`);
      refetchStatus();
      setCurrentStep(5);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal mengimpor sub-ledger anggota');
    }
  });

  const completeMutation = useMutation({
    mutationFn: coopSetupApi.completeSetup,
    onSuccess: () => {
      toast.success('Selamat! Setup Koperasi dinyatakan Selesai & Operasional Aktif 100%!');
      queryClient.invalidateQueries({ queryKey: ['coop-setup-status'] });
      queryClient.invalidateQueries({ queryKey: ['cooperative-dashboard'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menyelesaikan setup');
    }
  });

  const resetSimulationMutation = useMutation({
    mutationFn: coopSetupApi.resetSimulationData,
    onSuccess: (res) => {
      toast.success(res.message || 'Data simulasi berhasil dibersihkan!');
      setIsResetModalOpen(false);
      setConfirmText('');
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['coop-setup-status'] });
      queryClient.invalidateQueries({ queryKey: ['cooperative-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['cooperative-accounts-flat'] });
      setCurrentStep(1);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal membersihkan data simulasi');
    }
  });

  // Perhitungan Debit / Credit Saldo Awal
  const { totalDebit, totalCredit, diff, isBalanced } = useMemo(() => {
    let d = 0;
    let c = 0;
    journalEntries.forEach(entry => {
      d += Number(entry.debit) || 0;
      c += Number(entry.credit) || 0;
    });
    const difference = Math.abs(d - c);
    return {
      totalDebit: d,
      totalCredit: c,
      diff: difference,
      isBalanced: difference === 0 && (d > 0 || selectedMode === 'NEW_COOP')
    };
  }, [journalEntries, selectedMode]);

  // Perhitungan Subledger Anggota
  const subledgerSummary = useMemo(() => {
    let totPokok = 0;
    let totWajib = 0;
    let totSukarela = 0;
    let totPinjaman = 0;
    subledgerMembers.forEach(m => {
      totPokok += Number(m.simpanan_pokok) || 0;
      totWajib += Number(m.simpanan_wajib) || 0;
      totSukarela += Number(m.simpanan_sukarela) || 0;
      totPinjaman += Number(m.pinjaman_pokok_berjalan) || 0;
    });
    return {
      totPokok,
      totWajib,
      totSukarela,
      totPinjaman,
      count: subledgerMembers.filter(m => m.nama.trim().length > 0).length
    };
  }, [subledgerMembers]);

  if (!isOpen) return null;

  const steps = [
    { number: 1, title: 'Mode Operasional' },
    { number: 2, title: 'Bagan Akun (COA)' },
    { number: 3, title: 'Saldo Awal Neraca' },
    { number: 4, title: 'Sub-Ledger Anggota' },
    { number: 5, title: 'Aktivasi Konsolidasi' },
  ];

  const handleEntryChange = (accountId: string, field: 'debit' | 'credit', val: number) => {
    setJournalEntries(prev => prev.map(entry => {
      if (entry.account_id === accountId) {
        return {
          ...entry,
          [field]: Math.max(0, val)
        };
      }
      return entry;
    }));
  };

  const handleSubledgerRowChange = (index: number, field: keyof SubledgerMemberImport, val: any) => {
    setSubledgerMembers(prev => prev.map((row, idx) => {
      if (idx === index) {
        return { ...row, [field]: val };
      }
      return row;
    }));
  };

  const addSubledgerRow = () => {
    setSubledgerMembers(prev => [
      ...prev,
      {
        nik: '',
        nama: '',
        phone: '',
        simpanan_pokok: 0,
        simpanan_wajib: 0,
        simpanan_sukarela: 0,
        pinjaman_pokok_berjalan: 0,
        pinjaman_sisa_bunga: 0,
        pinjaman_sisa_tenor_bulan: 0,
      }
    ]);
  };

  const removeSubledgerRow = (index: number) => {
    if (subledgerMembers.length <= 1) return;
    setSubledgerMembers(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleDownloadCsvTemplate = () => {
    const headers = ['nik', 'nama', 'phone', 'simpanan_pokok', 'simpanan_wajib', 'simpanan_sukarela', 'pinjaman_pokok_berjalan', 'pinjaman_sisa_bunga', 'pinjaman_sisa_tenor_bulan'];
    const sampleRows = [
      ['32010001', 'Budi Santoso', '08123456789', '100000', '50000', '250000', '5000000', '250000', '10'],
      ['32010002', 'Siti Aminah', '08129876543', '100000', '50000', '500000', '0', '0', '0'],
    ];
    const csvContent = [headers.join(','), ...sampleRows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `template_migrasi_subledger_${selectedMode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Template CSV sub-ledger berhasil diunduh');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 pb-0 sm:pb-14 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-5xl max-h-[92vh] sm:max-h-[86vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                  Panduan Inisialisasi & Setup Koperasi
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  Accurate Standard
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                Pondasi akuntansi konsolidasi 360&deg; untuk koperasi baru dan migrasi pembukuan berjalan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Stepper Navigation - Horizontal Swipeable di HP */}
        <div className="px-3 sm:px-6 py-2 border-b border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900 overflow-x-auto scrollbar-none touch-pan-x shrink-0">
          <div className="flex items-center justify-between min-w-[480px] sm:min-w-[550px] gap-1.5 sm:gap-2">
            {steps.map((s, idx) => {
              const isPast = s.number < currentStep;
              const isCurrent = s.number === currentStep;
              return (
                <React.Fragment key={s.number}>
                  <button
                    onClick={() => setCurrentStep(s.number)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isCurrent
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : isPast
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      isCurrent
                        ? 'bg-white text-indigo-600 font-bold'
                        : isPast
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                      {isPast ? <Check className="w-3 h-3" /> : s.number}
                    </div>
                    <span>{s.title}</span>
                  </button>
                  {idx < steps.length - 1 && (
                    <div className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-800 mx-1" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Modal Body: Content per Step */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* ================= STEP 1: PILIH SKENARIO & MODE ================= */}
          {currentStep === 1 && (
            <div className="space-y-3.5 animate-in fade-in">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Langkah 1: Pilih Skenario Awal Koperasi Anda
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Pilihlah skenario yang sesuai agar sistem menyesuaikan struktur saldo awal dan tutup buku tahunan secara akurat.
                </p>
              </div>

              {/* Banner Notifikasi Data Simulasi / Transaksi Demo - Compact & Tenang */}
              {status?.simulationStats?.hasSimulationData && (
                <div className="rounded-xl px-3.5 py-2.5 border border-amber-200 dark:border-amber-800/60 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 dark:from-amber-950/20 dark:via-slate-900 dark:to-amber-950/10 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          Terdeteksi Data Simulasi Uji Coba
                        </span>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          {[
                            status.simulationStats.totalJournals > 0 ? `${status.simulationStats.totalJournals} Jurnal` : null,
                            status.simulationStats.totalSales > 0 ? `${status.simulationStats.totalSales} Penjualan` : null,
                            status.simulationStats.totalLoans > 0 ? `${status.simulationStats.totalLoans} Pinjaman` : null,
                            status.simulationStats.totalSavingsTransactions > 0 ? `${status.simulationStats.totalSavingsTransactions} Simpanan` : null,
                          ].filter(Boolean).join(' • ') || 'Data Demo'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Bersihkan data demo ini sebelum go-live jika Anda ingin memulai pembukuan dari angka nol yang bersih.
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setIsResetModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 transition-colors shadow-2xs"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Bersihkan Data Demo</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 3 Interactive Cards - Ringkas & Tidak Terpotong */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Mode 1: Baru Berdiri */}
                <div
                  onClick={() => handleSelectMode('NEW_COOP')}
                  className={`cursor-pointer rounded-xl p-3.5 border-2 transition-all flex flex-col justify-between ${
                    selectedMode === 'NEW_COOP'
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs ring-1 ring-indigo-600/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                        Fresh Start
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        1. Koperasi Baru Berdiri
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Mulai dari awal legalitas baru. Buku dibuka dari modal pendiri (simpanan pokok/wajib perintis) tanpa utang atau piutang masa lalu.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[10px] sm:text-[11px] font-medium text-slate-600 dark:text-slate-300 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${selectedMode === 'NEW_COOP' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>Saldo modal perintis</span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300">
                      Otomatis Hari Ini
                    </span>
                  </div>
                </div>

                {/* Mode 2: Migrasi Awal Tahun */}
                <div
                  onClick={() => handleSelectMode('MIGRATION_START_YEAR')}
                  className={`cursor-pointer rounded-xl p-3.5 border-2 transition-all flex flex-col justify-between ${
                    selectedMode === 'MIGRATION_START_YEAR'
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs ring-1 ring-indigo-600/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        Cut-Off 1 Januari
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        2. Koperasi Berjalan (Awal Tahun)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Migrasi tepat di awal tahun fiskal. Memindahkan Neraca Saldo Akhir (Trial Balance 31 Des) setelah tutup buku tahunan selesai.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[10px] sm:text-[11px] font-medium text-slate-600 dark:text-slate-300 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${selectedMode === 'MIGRATION_START_YEAR' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>Neraca awal periode</span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                      Otomatis 1 Jan
                    </span>
                  </div>
                </div>

                {/* Mode 3: Migrasi Tengah Tahun */}
                <div
                  onClick={() => handleSelectMode('MIGRATION_MID_YEAR')}
                  className={`cursor-pointer rounded-xl p-3.5 border-2 transition-all flex flex-col justify-between ${
                    selectedMode === 'MIGRATION_MID_YEAR'
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs ring-1 ring-indigo-600/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        Konsolidasi YTD
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        3. Koperasi Berjalan (Tengah Tahun)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Migrasi di pertengahan tahun (misal Juni/Sept). Membawa Neraca + Pendapatan/Beban YTD agar SHU membaca tahunan penuh 12 bulan.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[10px] sm:text-[11px] font-medium text-slate-600 dark:text-slate-300 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${selectedMode === 'MIGRATION_MID_YEAR' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>Akumulasi Laba Rugi YTD</span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                      Otomatis Akhir Bln
                    </span>
                  </div>
                </div>
              </div>

              {/* Tanggal Cut-Off - Bersifat Cerdas & Anti-Human Error */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        Tanggal Efektif Saldo Awal (Cut-Off Pembukuan)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCutoffHelp(prev => !prev)}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 transition-colors"
                        title="Klik untuk melihat penjelasan lengkap maksud tanggal efektif / cut-off"
                      >
                        <HelpCircle className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        <span>{showCutoffHelp ? 'Tutup Panduan' : 'Apa Maksud Tanggal Efektif?'}</span>
                      </button>
                    </div>

                    {/* Edukatif & Penjelasan Cerdas Berdasarkan Mode Terpilih */}
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {selectedMode === 'NEW_COOP' && (
                        <span>
                          🚀 <strong>Mode Koperasi Baru:</strong> Tanggal disetel ke <strong>Hari Ini</strong> sebagai titik awal legalitas & penyetoran modal perintis.
                        </span>
                      )}
                      {selectedMode === 'MIGRATION_START_YEAR' && (
                        <span>
                          📅 <strong>Mode Awal Tahun:</strong> Otomatis disetel ke <strong>01 Januari {smartDates.currentYear}</strong> untuk memindahkan neraca akhir (Trial Balance 31 Des).
                        </span>
                      )}
                      {selectedMode === 'MIGRATION_MID_YEAR' && (
                        <span>
                          📊 <strong>Mode Tengah Tahun:</strong> Disetel ke <strong>akhir periode buku sebelumnya</strong> ({cutoffDate}) agar SHU & transaksi berjalan tidak tumpang tindih.
                        </span>
                      )}
                    </p>

                    {/* Status Validasi Cerdas Anti Human Error */}
                    <div className="flex items-center gap-2 pt-0.5">
                      {selectedMode === 'NEW_COOP' && (
                        cutoffDate === smartDates.todayStr ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Tanggal Cerdas: Hari Ini (Akurat untuk Koperasi Baru)
                          </span>
                        ) : cutoffDate > smartDates.todayStr ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="w-3 h-3" /> Perhatian: Tanggal di masa depan (belum terjadi)
                          </span>
                        ) : null
                      )}

                      {selectedMode === 'MIGRATION_START_YEAR' && (
                        cutoffDate.endsWith('-01-01') ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Tanggal Cerdas: 1 Januari Awal Tahun Buku Standar SAK ETAP
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="w-3 h-3" /> Disarankan 1 Januari agar perhitungan SHU 1 tahun sinkron
                          </span>
                        )
                      )}

                      {selectedMode === 'MIGRATION_MID_YEAR' && (
                        isDateEndOfMonth(cutoffDate) ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Tanggal Cerdas: Akhir Bulan Standar (Buku Bulanan Tertutup Rapi)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="w-3 h-3" /> Sebaiknya pilih tanggal akhir bulan (contoh: {smartDates.lastMonthEndStr})
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Kontrol Input Tanggal & Pintasan 1-Klik Cerdas */}
                  <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={cutoffDate}
                        onChange={(e) => setCutoffDate(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                      />
                    </div>

                    {/* Pintasan 1-Klik Cerdas Anti-Salah Ketik */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setCutoffDate(smartDates.todayStr)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          cutoffDate === smartDates.todayStr
                            ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                        title="Setel ke tanggal Hari Ini"
                      >
                        Hari Ini
                      </button>
                      <button
                        type="button"
                        onClick={() => setCutoffDate(smartDates.startOfYearStr)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          cutoffDate === smartDates.startOfYearStr
                            ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                        title={`Setel ke 01 Januari ${smartDates.currentYear}`}
                      >
                        1 Jan
                      </button>
                      <button
                        type="button"
                        onClick={() => setCutoffDate(smartDates.lastMonthEndStr)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          cutoffDate === smartDates.lastMonthEndStr
                            ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                        title={`Setel ke Akhir Bulan Lalu (${smartDates.lastMonthEndStr})`}
                      >
                        Akhir Bln Lalu
                      </button>
                      <button
                        type="button"
                        onClick={() => setCutoffDate(smartDates.midYearSemester1Str)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          cutoffDate === smartDates.midYearSemester1Str
                            ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                        title="Setel ke Akhir Semester 1 (30 Juni)"
                      >
                        30 Jun (Sem 1)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Penjelasan Edukatif Tooltip / Accordion yang Ramah Pengguna & HP */}
                {showCutoffHelp && (
                  <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800/60 text-xs space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center justify-between text-indigo-900 dark:text-indigo-200 font-bold">
                      <div className="flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Panduan Memahami Tanggal Efektif (Cut-Off Pembukuan)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCutoffHelp(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                      <strong>Tanggal Cut-Off</strong> adalah garis batas waktu pemisah antara pembukuan manual/lama Anda dengan pencatatan di aplikasi Absenta. 
                      Tujuannya agar Anda <em>tidak perlu menginput ulang tumpukan nota, kwitansi, atau struk bertahun-tahun yang lalu satu per satu</em>.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
                        <span className="font-bold text-[11px] text-rose-700 dark:text-rose-400 flex items-center gap-1 mb-1">
                          ⏪ SEBELUM / PADA Tanggal Ini:
                        </span>
                        <p className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          Seluruh saldo uang di kasir/brankas, rekening bank koperasi, simpanan anggota, dan sisa pinjaman berjalan dimasukkan <strong>sekaligus sebagai satu angka Saldo Awal (Neraca)</strong> pada Langkah 3 & 4.
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
                        <span className="font-bold text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-1">
                          ⏩ SETELAH Tanggal Ini:
                        </span>
                        <p className="text-[10.5px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          Seluruh operasional harian (kasir warung/toko POS, setoran & penarikan simpanan, pencairan pinjaman baru, angsuran) dicatat <strong>satu per satu secara langsung (real-time)</strong> di menu harian Absenta.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white/90 dark:bg-slate-900/80 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40 text-[10.5px] text-slate-600 dark:text-slate-300 space-y-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        💡 Panduan Memilih Skenario yang Tepat:
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
                        <li><strong>Koperasi Baru:</strong> Pilih <em>Hari Ini</em>. Masukkan uang tunai modal perintis pertama kali.</li>
                        <li><strong>Awal Tahun:</strong> Pilih <em>1 Januari</em>. Masukkan angka Neraca Akhir per 31 Desember tahun lalu.</li>
                        <li><strong>Tengah Tahun:</strong> Pilih <em>Akhir Bulan Lalu</em> (misal 30 September). Transaksi bulan Oktober mulai dicatat harian di Absenta.</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 2: BAGAN AKUN (COA SAK ETAP) ================= */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Langkah 2: Bagan Akun Standar (COA SAK ETAP Koperasi)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Koperasi Indonesia wajib memiliki kode akun terstandarisasi untuk Neraca, SHU, Simpanan, dan Pinjaman.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => initCoaMutation.mutate()}
                  disabled={initCoaMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${initCoaMutation.isPending ? 'animate-spin' : ''}`} />
                  {initCoaMutation.isPending ? 'Menginisialisasi...' : 'Inisialisasi 31 Akun SAK ETAP'}
                </button>
              </div>

              {/* Status Box */}
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Status COA Saat Ini: {status?.coaCount || 0} Akun Terdaftar
                  </p>
                  <p className="mt-1">
                    Struktur akun yang diinisialisasi mencakup klasifikasi standar:
                    <strong className="text-indigo-600 dark:text-indigo-400"> 1000 Aktiva</strong> (Kas, Bank, Piutang Pinjaman), 
                    <strong className="text-indigo-600 dark:text-indigo-400"> 2000 Kewajiban</strong> (Simpanan Sukarela, Titipan), 
                    <strong className="text-indigo-600 dark:text-indigo-400"> 3000 Ekuitas</strong> (Simpanan Pokok, Simpanan Wajib, Cadangan SHU), 
                    <strong className="text-indigo-600 dark:text-indigo-400"> 4000 Pendapatan</strong> (Bunga Pinjaman, Penjualan Toko), dan 
                    <strong className="text-indigo-600 dark:text-indigo-400"> 5000 Beban</strong>.
                  </p>
                </div>
              </div>

              {/* Preview Tabel Akun - Touch & Mobile Scrollable */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto max-h-[350px] overflow-y-auto touch-pan-x">
                <table className="w-full text-left text-xs min-w-[460px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3 sm:px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300">Kode Akun</th>
                      <th className="px-3 sm:px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300">Nama Akun</th>
                      <th className="px-3 sm:px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300">Klasifikasi</th>
                      <th className="px-3 sm:px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300">Tipe Akun</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loadingAccounts ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-slate-500">Memuat bagan akun...</td>
                      </tr>
                    ) : accountList.length > 0 ? (
                      accountList.map(acc => {
                        const isHeader = Boolean(acc.isHeader ?? (acc as any).is_header);
                        return (
                          <tr key={acc.id} className={isHeader ? 'bg-slate-50/70 dark:bg-slate-800/40 font-bold' : 'hover:bg-slate-50/40 dark:hover:bg-slate-800/20'}>
                            <td className="px-4 py-2 font-mono text-indigo-600 dark:text-indigo-400">{acc.code}</td>
                            <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{acc.name}</td>
                            <td className="px-4 py-2 text-slate-500">{acc.type}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${isHeader ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'}`}>
                                {isHeader ? 'Induk (Header)' : 'Detail (Posting)'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                          Belum ada akun terdaftar. Klik "Inisialisasi 31 Akun SAK ETAP" di atas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= STEP 3: SALDO AWAL NERACA (DOUBLE ENTRY) ================= */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Langkah 3: Input Saldo Awal Neraca (Strict Double-Entry Balanced)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Masukkan saldo awal buku besar per tanggal cut-off ({cutoffDate}). Total Debit wajib sama dengan Total Kredit.
                  </p>
                </div>
              </div>

              {/* Real-time Balanced Status Card */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
                isBalanced
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/20 dark:border-rose-800 dark:text-rose-300'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isBalanced ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                  }`}>
                    {isBalanced ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      {isBalanced ? 'Jurnal Saldo Awal Seimbang (Balanced)' : 'Jurnal Belum Seimbang (Unbalanced)'}
                    </h4>
                    <p className="text-[11px] opacity-90">
                      {isBalanced 
                        ? 'Sempurna! Total Debit sama dengan Total Kredit. Saldo siap diposting ke Buku Besar.' 
                        : `Terdapat selisih Rp ${diff.toLocaleString('id-ID')}. Total Debit dan Kredit harus identik.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono font-bold shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block font-sans">Total Debit</span>
                    <span>Rp {totalDebit.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block font-sans">Total Kredit</span>
                    <span>Rp {totalCredit.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Table Input Jurnal Saldo Awal - Touch & Mobile Scrollable */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto max-h-[380px] overflow-y-auto touch-pan-x">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3 sm:px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300 w-24">Kode</th>
                      <th className="px-3 sm:px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300">Nama Akun</th>
                      <th className="px-3 sm:px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300 w-36 sm:w-44">Debit (Rp)</th>
                      <th className="px-3 sm:px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300 w-36 sm:w-44">Kredit (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {journalEntries.map(entry => {
                      const acc = accountList.find(a => a.id === entry.account_id);
                      if (!acc) return null;
                      return (
                        <tr key={entry.account_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-2 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                            {acc.code}
                          </td>
                          <td className="px-4 py-2 text-slate-800 dark:text-slate-200">
                            <span className="font-medium">{acc.name}</span>
                            <span className="text-[10px] text-slate-400 block">{acc.category || acc.type}</span>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="0"
                              value={entry.debit === 0 ? '' : entry.debit}
                              placeholder="0"
                              onChange={(e) => handleEntryChange(entry.account_id, 'debit', Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-mono font-semibold text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="0"
                              value={entry.credit === 0 ? '' : entry.credit}
                              placeholder="0"
                              onChange={(e) => handleEntryChange(entry.account_id, 'credit', Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-mono font-semibold text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= STEP 4: SUB-LEDGER ANGGOTA ================= */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Langkah 4: Impor Anggota & Saldo Sub-Ledger (Simpanan & Pinjaman)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Pastikan total simpanan & pinjaman anggota cocok dengan saldo akun buku besar (GL) pada Langkah 3.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadCsvTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Template CSV
                </button>
              </div>

              {/* Subledger Totals Summary Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Simpanan Pokok</span>
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                    Rp {subledgerSummary.totPokok.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Simpanan Wajib</span>
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                    Rp {subledgerSummary.totWajib.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Simpanan Sukarela</span>
                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                    Rp {subledgerSummary.totSukarela.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">Pinjaman Berjalan</span>
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    Rp {subledgerSummary.totPinjaman.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Subledger Rows Input Table - Touch & Mobile Scrollable */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto max-h-[350px] overflow-y-auto touch-pan-x">
                <table className="w-full text-left text-xs min-w-[720px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3 py-2.5 font-bold text-slate-700 dark:text-slate-300 w-28">NIK / ID</th>
                      <th className="px-3 py-2.5 font-bold text-slate-700 dark:text-slate-300">Nama Anggota</th>
                      <th className="px-3 py-2.5 font-bold text-slate-700 dark:text-slate-300 w-28">No HP</th>
                      <th className="px-3 py-2.5 font-bold text-slate-700 dark:text-slate-300 w-28">Simp. Pokok</th>
                      <th className="px-3 py-2.5 font-bold text-slate-700 dark:text-slate-300 w-28">Simp. Wajib</th>
                      <th className="px-3 py-2.5 font-bold text-slate-700 dark:text-slate-300 w-28">Simp. Sukarela</th>
                      <th className="px-3 py-2.5 font-bold text-slate-700 dark:text-slate-300 w-28">Sisa Pinjaman</th>
                      <th className="px-3 py-2.5 font-bold text-slate-700 dark:text-slate-300 w-12 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {subledgerMembers.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="3201..."
                            value={row.nik}
                            onChange={(e) => handleSubledgerRowChange(idx, 'nik', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="Nama Lengkap"
                            value={row.nama}
                            onChange={(e) => handleSubledgerRowChange(idx, 'nama', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="0812..."
                            value={row.phone || ''}
                            onChange={(e) => handleSubledgerRowChange(idx, 'phone', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            placeholder="0"
                            value={row.simpanan_pokok === 0 ? '' : row.simpanan_pokok}
                            onChange={(e) => handleSubledgerRowChange(idx, 'simpanan_pokok', Number(e.target.value))}
                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-right font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            placeholder="0"
                            value={row.simpanan_wajib === 0 ? '' : row.simpanan_wajib}
                            onChange={(e) => handleSubledgerRowChange(idx, 'simpanan_wajib', Number(e.target.value))}
                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-right font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            placeholder="0"
                            value={row.simpanan_sukarela === 0 ? '' : row.simpanan_sukarela}
                            onChange={(e) => handleSubledgerRowChange(idx, 'simpanan_sukarela', Number(e.target.value))}
                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-right font-mono"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            placeholder="0"
                            value={row.pinjaman_pokok_berjalan === 0 ? '' : row.pinjaman_pokok_berjalan}
                            onChange={(e) => handleSubledgerRowChange(idx, 'pinjaman_pokok_berjalan', Number(e.target.value))}
                            className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-right font-mono text-indigo-600 font-semibold"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeSubledgerRow(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={addSubledgerRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Baris Anggota
              </button>
            </div>
          )}

          {/* ================= STEP 5: AKTIVASI & KONSOLIDASI ================= */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Langkah 5: Verifikasi Konsolidasi 360&deg; & Aktivasi Operasional
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Seluruh fondasi akuntansi telah diverifikasi. Tinjau checklist kesiapan sebelum mengaktifkan operasional penuh.
                </p>
              </div>

              {/* Checklist 360 Card */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-5 border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Checklist Kesiapan Standar SAK ETAP
                </h4>
                <div className="space-y-2">
                  {status?.checklist?.map(item => (
                    <div key={item.key} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/60 dark:border-slate-700/60 last:border-none">
                      <div className="flex items-center gap-2">
                        {item.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        )}
                        <span className={item.passed ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-slate-500'}>
                          {item.label}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        item.passed 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' 
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}>
                        {item.passed ? 'Terpenuhi' : item.required ? 'Wajib' : 'Opsional'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Congratulatory Card */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-5 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                    Koperasi Anda Siap Melakukan Transaksi Harian
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1">
                    Seluruh modul Simpan Pinjam, Kasir POS Minimarket, Penagihan Payroll, dan Laporan Keuangan Neraca/SHU telah terkonsolidasi 100%.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation Buttons */}
        {/* Footer Navigation Buttons - Responsive Mobile & Desktop */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className={`inline-flex items-center justify-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
              currentStep === 1
                ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Sebelumnya</span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {currentStep === 1 && (
              <button
                type="button"
                onClick={() => setModeMutation.mutate({ mode: selectedMode, cutoff_date: cutoffDate })}
                disabled={setModeMutation.isPending}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
              >
                <span>{setModeMutation.isPending ? 'Menyimpan...' : 'Simpan & Lanjut ke Bagan Akun'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
              >
                <span>Lanjut ke Saldo Awal Neraca</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="button"
                disabled={!isBalanced || postBalanceMutation.isPending}
                onClick={() => {
                  const filteredEntries = journalEntries
                    .filter(e => e.debit > 0 || e.credit > 0)
                    .map(e => {
                      const acc = accountList.find(a => a.id === e.account_id);
                      return {
                        ...e,
                        accountCode: acc?.code || '',
                      };
                    });
                  postBalanceMutation.mutate({
                    mode: selectedMode,
                    cutoff_date: cutoffDate,
                    entries: filteredEntries,
                    notes: `Jurnal saldo awal setup wizard mode ${selectedMode}`
                  });
                }}
                className={`inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm ${
                  !isBalanced || postBalanceMutation.isPending
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                }`}
              >
                <span>{postBalanceMutation.isPending ? 'Memposting...' : 'Posting & Lanjut Subledger'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStep === 4 && (
              <button
                type="button"
                disabled={importSubledgerMutation.isPending}
                onClick={() => {
                  const validMembers = subledgerMembers.filter(m => m.nama.trim().length > 0);
                  if (validMembers.length === 0) {
                    // Skip jika koperasi baru belum ada anggota
                    setCurrentStep(5);
                    return;
                  }
                  importSubledgerMutation.mutate({ members: validMembers });
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
              >
                <span>{importSubledgerMutation.isPending ? 'Mengimpor...' : 'Simpan & Lanjut Aktivasi'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {currentStep === 5 && (
              <button
                type="button"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-98"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{completeMutation.isPending ? 'Mengaktifkan...' : 'Konfirmasi & Aktifkan Operasional Penuh'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Konfirmasi Reset Data Simulasi - 100% Mobile & Keyboard-Friendly Bottom-Sheet */}
        {isResetModalOpen && (
          <div className="fixed inset-0 z-60 bg-slate-900/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
              
              {/* Header Modal */}
              <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-rose-50/50 dark:bg-rose-950/20 shrink-0">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Reset & Pembersihan Data Simulasi
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body Modal - Scrollable & Keyboard Safe */}
              <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1 text-slate-700 dark:text-slate-300">
                {/* Warning Callout Box */}
                <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 text-[11px] sm:text-xs text-rose-900 dark:text-rose-200 leading-relaxed flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>Tindakan Permanen:</strong> Seluruh transaksi demo/simulasi (penjualan kasir, pinjaman uji coba, mutasi simpanan, dan jurnal lampau) akan dibersihkan agar pembukuan kembali ke titik nol yang bersih.
                  </p>
                </div>

                {/* Checkbox Options dengan Accent Rose Senada */}
                <div className="space-y-2 pt-1">
                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs select-none">
                    <input
                      type="checkbox"
                      checked={resetOptions.purgeTransactions}
                      disabled
                      className="mt-0.5 rounded accent-rose-600 w-4 h-4 text-rose-600 focus:ring-rose-500 cursor-not-allowed"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
                        Hapus Seluruh Transaksi & Jurnal Operasional (Wajib)
                      </span>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Membersihkan penjualan POS, stock opname, pinjaman, mutasi kas, dan jurnal umum.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer text-xs select-none transition-colors">
                    <input
                      type="checkbox"
                      checked={resetOptions.purgeOpeningBalances}
                      onChange={(e) => setResetOptions(prev => ({ ...prev, purgeOpeningBalances: e.target.checked }))}
                      className="mt-0.5 rounded accent-rose-600 w-4 h-4 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
                        Hapus Jurnal Saldo Awal Neraca (SETUP-OPENING)
                      </span>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Menghapus jurnal saldo awal neraca agar dapat diinput ulang secara presisi.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer text-xs select-none transition-colors">
                    <input
                      type="checkbox"
                      checked={resetOptions.purgeMembers}
                      onChange={(e) => setResetOptions(prev => ({ ...prev, purgeMembers: e.target.checked }))}
                      className="mt-0.5 rounded accent-rose-600 w-4 h-4 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
                        Kosongkan Anggota Koperasi Terdaftar
                      </span>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Hanya menghapus nomor anggota koperasi. <strong className="text-slate-700 dark:text-slate-300">Data Siswa, Guru, dan User sekolah tidak akan terhapus.</strong>
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer text-xs select-none transition-colors">
                    <input
                      type="checkbox"
                      checked={resetOptions.purgeProducts}
                      onChange={(e) => setResetOptions(prev => ({ ...prev, purgeProducts: e.target.checked }))}
                      className="mt-0.5 rounded accent-rose-600 w-4 h-4 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
                        Kosongkan Katalog Produk Toko
                      </span>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Jika tidak dicentang, daftar barang tetap ada namun stoknya direset kembali ke 0.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer text-xs select-none transition-colors">
                    <input
                      type="checkbox"
                      checked={resetOptions.resetSetupStatus}
                      onChange={(e) => setResetOptions(prev => ({ ...prev, resetSetupStatus: e.target.checked }))}
                      className="mt-0.5 rounded accent-rose-600 w-4 h-4 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
                        Kembalikan Status Wizard ke NOT_STARTED
                      </span>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Mengizinkan pengurus memilih ulang skenario awal dan tanggal cut-off dari awal.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Input Konfirmasi Text */}
                <div className="pt-1.5 pb-1">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ketik <span className="font-mono text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/40 px-1 py-0.5 rounded">RESET SIMULASI</span> untuk konfirmasi:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="RESET SIMULASI"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 uppercase tracking-wider"
                  />
                </div>
              </div>

              {/* Footer Tombol - Stacked Full-Width di HP, Inline di Desktop */}
              <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 sm:gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetModalOpen(false);
                    setConfirmText('');
                  }}
                  disabled={resetSimulationMutation.isPending}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-center"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => resetSimulationMutation.mutate(resetOptions)}
                  disabled={confirmText.trim() !== 'RESET SIMULASI' || resetSimulationMutation.isPending}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-rose-600/20 transition-all active:scale-98"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{resetSimulationMutation.isPending ? 'Membersihkan...' : 'Hapus Data Simulasi Sekarang'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
