import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../lib/axiosInstance';
import toast from 'react-hot-toast';
import { useAuth } from '../../../hooks/useAuth';
import type { Saving, SavingCategory, ConfirmTxData, Transaction } from './types';
import type { Student } from '../../common/SmartStudentPicker';
import {
  printThermalSlip,
  exportTransactions,
  exportSingleSavingPdf,
  exportAllSavingsPdf
} from './savingsExportUtils';

interface SubscriptionWithFeatures {
  features?: string[];
  logo_url?: string;
  Plan?: {
    features_json?: string;
  };
  plan?: {
    features_json?: string;
  };
}

export const useSavingsState = () => {
  const { user, subscription, can } = useAuth();

  const isManageMode = window.location.pathname.endsWith('/manage');
  const isOperator = can('cooperative.savings.deposit');
  const isStudent = !isManageMode || !isOperator;

  const sub = subscription as SubscriptionWithFeatures | null | undefined;
  const features = sub?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const [savings, setSavings] = useState<Saving[]>([]);
  const [categories, setCategories] = useState<SavingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSaving, setSelectedSaving] = useState<Saving | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [memberStatus, setMemberStatus] = useState<'loading' | 'member' | 'non-member'>('loading');

  // Scanned member states
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null);
  const [scannedMemberSavings, setScannedMemberSavings] = useState<Saving[]>([]);
  const [selectedScannedSavingId, setSelectedScannedSavingId] = useState<string>('');
  const [quickAmount, setQuickAmount] = useState<string>('');
  const [quickDescription, setQuickDescription] = useState<string>('');
  const [quickTxType, setQuickTxType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [processingQuickTx, setProcessingQuickTx] = useState(false);
  const [accountsExpanded, setAccountsExpanded] = useState(() => {
    return localStorage.getItem('saving_accounts_expanded') === 'true';
  });

  const toggleAccountsExpand = useCallback(() => {
    setAccountsExpanded((prev) => {
      const nextVal = !prev;
      localStorage.setItem('saving_accounts_expanded', String(nextVal));
      return nextVal;
    });
  }, []);

  const scannerInputRef = useRef<HTMLInputElement | null>(null);

  // Confirmation States
  const [showQuickTxConfirm, setShowQuickTxConfirm] = useState(false);
  const [confirmTxData, setConfirmTxData] = useState<ConfirmTxData | null>(null);

  // Export states
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [exportEndDate, setExportEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [exportLoading, setExportLoading] = useState(false);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Sorting state
  const [sortBy, setSortBy] = useState<string>('member');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const isLocked = !Array.isArray(features) || !features.includes('KOPERASI');

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchSavings = useCallback(async (active: boolean = true) => {
    try {
      setLoading(true);
      const url = isStudent ? '/cooperative/savings?personal=true' : '/cooperative/savings';
      const response = await api.get(url);
      if (active) {
        setSavings(response.data);
      }
    } catch (err) {
      console.error(err);
      if (active) {
        toast.error('Gagal mengambil data simpanan.');
      }
    } finally {
      if (active) {
        setLoading(false);
      }
    }
  }, [isStudent]);

  const fetchCategories = useCallback(async (active: boolean = true) => {
    try {
      const response = await api.get('/cooperative/saving-categories');
      if (active && response.data?.success) {
        setCategories(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch saving categories:', err);
    }
  }, []);

  // Check membership status
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/cooperative/members/me');
        if (!cancelled) {
          const data = res?.data?.data;
          setMemberStatus(data && data.status === 'ACTIVE' ? 'member' : 'non-member');
        }
      } catch {
        if (!cancelled) setMemberStatus('non-member');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (subscription === undefined) return;
    if (isOperator || memberStatus === 'member') {
      let active = true;
      fetchSavings(active);
      fetchCategories(active);
      return () => {
        active = false;
      };
    } else if (memberStatus === 'non-member') {
      setLoading(false);
    }
  }, [subscription, fetchSavings, fetchCategories, isOperator, memberStatus]);

  const handleShowTransactions = useCallback(async (saving: Saving) => {
    if (isLocked) return;
    setSelectedSaving(saving);
    try {
      const response = await api.get(`/cooperative/savings/${saving.id}`);
      if (isMountedRef.current) {
        setTransactions(response.data.transactions || []);
      }
    } catch (err) {
      console.error(err);
      if (isMountedRef.current) {
        toast.error('Gagal mengambil riwayat transaksi');
      }
    }
  }, [isLocked]);

  const handlePrintThermalSlip = useCallback(async (txData: {
    id: string;
    amount: number;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    date: string;
    description: string;
    savingType: string;
    memberName: string;
    memberNo: string;
    newBalance: number;
  }) => {
    await printThermalSlip(txData, user?.name || 'Teller');
  }, [user]);

  /** Generate memo otomatis berdasarkan kode kategori simpanan */
  const getAutoMemo = useCallback((saving: Saving | undefined, txType: 'DEPOSIT' | 'WITHDRAWAL'): string => {
    if (!saving) return txType === 'DEPOSIT' ? 'Setoran Tabungan' : 'Penarikan Tabungan';
    const code = (saving.category?.code || saving.type || '').toUpperCase();
    const now = new Date();
    const bulan = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const tahun = now.getFullYear();

    if (code === 'POKOK') return 'Simpanan Pokok – Iuran Keanggotaan';
    if (code === 'WAJIB') return txType === 'DEPOSIT' ? `Iuran Wajib – ${bulan}` : `Penarikan Wajib – ${bulan}`;
    if (code === 'SUKARELA') return txType === 'DEPOSIT' ? `Setoran Sukarela – ${bulan}` : `Penarikan Sukarela – ${bulan}`;
    if (code === 'HARIRAYA' || code === 'HARI_RAYA' || code.includes('RAYA')) return txType === 'DEPOSIT' ? `Simpanan Hari Raya – ${tahun}` : `Penarikan Simpanan Hari Raya – ${tahun}`;
    // fallback generic
    return txType === 'DEPOSIT' ? `Setoran ${saving.category?.name || code}` : `Penarikan ${saving.category?.name || code}`;
  }, []);

  /** Filter simpanan yang valid untuk tipe transaksi cepat (DEPOSIT atau WITHDRAWAL) */
  const getVisibleSavingsForTx = useCallback((savingsList: Saving[], txType: 'DEPOSIT' | 'WITHDRAWAL') => {
    return savingsList.filter(s => {
      const code = (s.category?.code || s.type || '').toUpperCase();
      if (code === 'POKOK') {
        // Simpanan Pokok hanya untuk DEPOSIT dan jika saldo saat ini adalah 0
        return txType === 'DEPOSIT' && (parseFloat(s.amount) || 0) === 0;
      }
      if (code === 'WAJIB') {
        // Simpanan Wajib hanya boleh didepositkan
        return txType === 'DEPOSIT';
      }
      return true;
    });
  }, []);

  const handleSelectStudent = useCallback((student: Student, memberNo?: string) => {
    const matchingSavings = savings.filter(s => {
      if (memberNo) {
        return s.member.memberNo === memberNo;
      }
      return (student.id && (s.member.siswaId === student.id || s.member.guruId === student.id));
    });

    if (matchingSavings.length === 0) {
      toast.error(`${student.nama_siswa || student.nama_guru || 'User'} belum terdaftar sebagai anggota koperasi.`);
      setScannedStudent(null);
      setScannedMemberSavings([]);
      setSelectedScannedSavingId('');
      setTimeout(() => scannerInputRef.current?.focus(), 500);
      return;
    }

    toast.success(`Anggota ditemukan: ${student.nama_siswa || student.nama_guru}`);
    setScannedStudent(student);
    setScannedMemberSavings(matchingSavings);

    const visibleSavings = getVisibleSavingsForTx(matchingSavings, quickTxType);
    const sukarelaSaving = visibleSavings.find(s => s.category?.code === 'SUKARELA' || s.type === 'SUKARELA');
    const defaultSelect = sukarelaSaving || visibleSavings[0];
    setSelectedScannedSavingId(defaultSelect ? defaultSelect.id : '');

    if (defaultSelect && defaultSelect.category?.defaultAmount) {
      setQuickAmount(String(defaultSelect.category.defaultAmount));
    } else {
      setQuickAmount('');
    }

    setQuickDescription(getAutoMemo(defaultSelect, quickTxType));

    setTimeout(() => {
      const amtInput = document.getElementById('quick-amount-input');
      amtInput?.focus();
    }, 150);
  }, [savings, quickTxType, getAutoMemo, getVisibleSavingsForTx]);

  const executeQuickTransaction = useCallback(async () => {
    if (!confirmTxData || isLocked) return;

    setProcessingQuickTx(true);
    try {
      const response = await api.post('/cooperative/savings/transaction', {
        savingId: confirmTxData.savingId,
        type: confirmTxData.type,
        amount: confirmTxData.amount,
        description: confirmTxData.description
      });

      const txResult = response.data as { id: string; date: string };

      const selectedAcc = scannedMemberSavings.find(s => s.id === confirmTxData.savingId);
      const prevBal = selectedAcc ? parseFloat(selectedAcc.amount) : 0;
      const newBalance = confirmTxData.type === 'DEPOSIT' ? prevBal + confirmTxData.amount : prevBal - confirmTxData.amount;

      toast.success('Transaksi berhasil diproses!');

      await printThermalSlip({
        id: txResult.id,
        amount: confirmTxData.amount,
        type: confirmTxData.type,
        date: txResult.date,
        description: confirmTxData.description,
        savingType: confirmTxData.savingType,
        memberName: confirmTxData.memberName,
        memberNo: confirmTxData.memberNo,
        newBalance: newBalance
      }, user?.name || 'Teller');

      setQuickAmount('');
      setQuickDescription('');
      setScannedStudent(null);
      setScannedMemberSavings([]);
      setSelectedScannedSavingId('');
      setShowQuickTxConfirm(false);
      setConfirmTxData(null);
      await fetchSavings(isMountedRef.current);
    } catch (err) {
      console.error(err);
      const errorLike = err as { response?: { data?: { message?: string } }; message?: string };
      const errMsg = errorLike.response?.data?.message || errorLike.message || 'Gagal memproses transaksi';
      toast.error(errMsg);
    } finally {
      setProcessingQuickTx(false);
      setTimeout(() => scannerInputRef.current?.focus(), 500);
    }
  }, [confirmTxData, isLocked, scannedMemberSavings, fetchSavings, user]);

  const handleQuickTransactionSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScannedSavingId || isLocked || !scannedStudent) return;

    const amountNum = parseFloat(quickAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Masukkan nominal transaksi yang valid.');
      return;
    }

    const selectedAcc = scannedMemberSavings.find(s => s.id === selectedScannedSavingId);
    if (!selectedAcc) return;

    if (quickTxType === 'WITHDRAWAL' && parseFloat(selectedAcc.amount) < amountNum) {
      toast.error(`Saldo tidak mencukupi. Saldo saat ini: Rp ${parseFloat(selectedAcc.amount).toLocaleString('id-ID')}`);
      return;
    }

    setConfirmTxData({
      savingId: selectedScannedSavingId,
      savingType: selectedAcc.category?.name || selectedAcc.type || 'Simpanan',
      memberName: scannedStudent.nama_siswa || scannedStudent.nama_guru || 'Unknown',
      memberNo: selectedAcc.member.memberNo,
      amount: amountNum,
      type: quickTxType,
      description: quickDescription || (quickTxType === 'DEPOSIT' ? 'Setoran Tabungan' : 'Penarikan Tabungan')
    });
    setShowQuickTxConfirm(true);
  }, [selectedScannedSavingId, quickAmount, quickTxType, quickDescription, scannedMemberSavings, scannedStudent, isLocked]);

  const handleQuickTxTypeChange = useCallback((type: 'DEPOSIT' | 'WITHDRAWAL') => {
    setQuickTxType(type);

    const visible = getVisibleSavingsForTx(scannedMemberSavings, type);
    const currentIsValid = visible.some(s => s.id === selectedScannedSavingId);

    if (!currentIsValid) {
      const sukarelaSaving = visible.find(s => s.category?.code === 'SUKARELA' || s.type === 'SUKARELA');
      const defaultSelect = sukarelaSaving || visible[0];
      setSelectedScannedSavingId(defaultSelect ? defaultSelect.id : '');

      if (defaultSelect && defaultSelect.category?.defaultAmount) {
        setQuickAmount(String(defaultSelect.category.defaultAmount));
      } else {
        setQuickAmount('');
      }
      setQuickDescription(getAutoMemo(defaultSelect, type));
    } else {
      const currentSaving = scannedMemberSavings.find(s => s.id === selectedScannedSavingId);
      setQuickDescription(getAutoMemo(currentSaving, type));
    }
  }, [scannedMemberSavings, selectedScannedSavingId, getVisibleSavingsForTx, getAutoMemo]);

  const handleExportTransactions = useCallback(async (formatType: 'EXCEL' | 'PDF') => {
    await exportTransactions(
      formatType,
      exportStartDate,
      exportEndDate,
      sub?.logo_url,
      () => setExportLoading(true),
      () => {
        setExportLoading(false);
        setIsExportModalOpen(false);
      }
    );
  }, [exportStartDate, exportEndDate, sub]);

  const handleExportSingleSavingPdf = useCallback(async (savingParam?: Saving) => {
    const targetSaving = savingParam || selectedSaving;
    if (!targetSaving) return;
    await exportSingleSavingPdf(targetSaving, sub?.logo_url);
  }, [selectedSaving, sub]);

  const handleExportAllSavingsPdf = useCallback(async (savingParam?: Saving) => {
    const targetSaving = savingParam || selectedSaving;
    if (!targetSaving) return;
    await exportAllSavingsPdf(targetSaving, savings, sub?.logo_url);
  }, [selectedSaving, savings, sub]);

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  }, []);

  return {
    user,
    subscription,
    isStudent,
    isOperator,
    isLocked,
    savings,
    categories,
    loading,
    selectedSaving,
    setSelectedSaving,
    transactions,
    memberStatus,
    scannedStudent,
    setScannedStudent,
    scannedMemberSavings,
    setScannedMemberSavings,
    selectedScannedSavingId,
    setSelectedScannedSavingId,
    quickAmount,
    setQuickAmount,
    quickDescription,
    setQuickDescription,
    quickTxType,
    setQuickTxType,
    processingQuickTx,
    accountsExpanded,
    toggleAccountsExpand,
    scannerInputRef,
    showQuickTxConfirm,
    setShowQuickTxConfirm,
    confirmTxData,
    setConfirmTxData,
    isExportModalOpen,
    setIsExportModalOpen,
    exportStartDate,
    setExportStartDate,
    exportEndDate,
    setExportEndDate,
    exportLoading,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    page,
    setPage,
    limit,
    setLimit,
    fetchSavings,
    fetchCategories,
    handleShowTransactions,
    handlePrintThermalSlip,
    getAutoMemo,
    getVisibleSavingsForTx,
    handleSelectStudent,
    executeQuickTransaction,
    handleQuickTransactionSubmit,
    handleQuickTxTypeChange,
    handleExportTransactions,
    handleExportSingleSavingPdf,
    handleExportAllSavingsPdf,
    handleSort
  };
};
