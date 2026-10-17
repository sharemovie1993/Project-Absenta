import React, { useState, useMemo, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Wallet, 
  CreditCard, 
  DollarSign, 
  Printer, 
  RotateCcw, 
  Zap, 
  Check, 
  ChevronRight,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import type { Saving } from './types';
import type { Student } from '../../common/SmartStudentPicker';
import { formatIndonesianDate, formatTerbilangIndonesian } from '../../../utils/cooperative/coopDocUtils';
import { printUnifiedThermalSlip } from './savingsExportUtils';
import { useAuthStore } from '../../../store/authStore';

export interface LoanInstallmentItem {
  id: string;
  loanId: string;
  amount: number;
  dueDate: string;
  status: 'PAID' | 'UNPAID';
  installmentNo?: number;
}

export interface MemberLoanItem {
  id: string;
  amount: number;
  totalAmount: number;
  interestRate: number;
  duration: number;
  status: string;
  installments?: LoanInstallmentItem[];
}

interface UnifiedPaymentPanelProps {
  student: Student;
  savings: Saving[];
  memberLoans: MemberLoanItem[];
  loadingLoans: boolean;
  onCancel: () => void;
  onResetMember?: () => void;
  onSuccessTransaction?: () => void;
  onProcessUnifiedPayment: (payload: {
    memberId: string;
    savingsTransactions: Array<{ savingId: string; type: 'DEPOSIT' | 'WITHDRAWAL'; amount: number; description?: string }>;
    loanInstallments: Array<{ installmentId: string; installmentNo?: number }>;
    notes?: string;
  }) => Promise<any>;
  isProcessing: boolean;
}

export const UnifiedPaymentPanel: React.FC<UnifiedPaymentPanelProps> = React.memo(({
  student,
  savings,
  memberLoans,
  loadingLoans,
  onCancel,
  onResetMember,
  onSuccessTransaction,
  onProcessUnifiedPayment,
  isProcessing,
}) => {
  const { user } = useAuthStore();
  const operatorName = user?.full_name || user?.name || 'Operator Loket';

  // Dual-mode Cashier: Deposit/Bill Payment vs Cash Withdrawal
  const [tellerMode, setTellerMode] = useState<'DEPOSIT_AND_BILL' | 'WITHDRAWAL'>('DEPOSIT_AND_BILL');

  // 1. Simpanan Wajib Evaluation
  const wajibSaving = useMemo(() => {
    return savings.find(s => (s.category?.code || s.type || '').toUpperCase() === 'WAJIB');
  }, [savings]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const isWajibPaidThisMonth = useMemo(() => {
    if (!wajibSaving) return false;
    return wajibSaving.transactions?.some(t => {
      if (t.type !== 'DEPOSIT') return false;
      const txDate = new Date(t.date);
      return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
    });
  }, [wajibSaving, currentMonth, currentYear]);

  const defaultWajibAmount = useMemo(() => {
    if (!wajibSaving) return 20000;
    return Number(wajibSaving.category?.defaultAmount || 20000);
  }, [wajibSaving]);

  // States for bill selections
  const [includeWajib, setIncludeWajib] = useState<boolean>(!isWajibPaidThisMonth);
  const [wajibAmount, setWajibAmount] = useState<number>(defaultWajibAmount);

  // Auto-sync selection states when member or payment status changes
  useEffect(() => {
    setIncludeWajib(!isWajibPaidThisMonth);
    setWajibAmount(defaultWajibAmount);
  }, [student?.id, isWajibPaidThisMonth, defaultWajibAmount]);

  // 2. Active Loan Installment Evaluation
  const activeLoan = useMemo(() => {
    return memberLoans.find(l => l.status === 'APPROVED');
  }, [memberLoans]);

  const nextUnpaidInstallment = useMemo(() => {
    if (!activeLoan?.installments) return null;
    const unpaid = activeLoan.installments
      .filter(i => i.status === 'UNPAID')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return unpaid[0] || null;
  }, [activeLoan]);

  const installmentNumber = useMemo(() => {
    if (!activeLoan?.installments || !nextUnpaidInstallment) return 1;
    const sorted = [...activeLoan.installments].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    const idx = sorted.findIndex(i => i.id === nextUnpaidInstallment.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [activeLoan, nextUnpaidInstallment]);

  const [includeLoan, setIncludeLoan] = useState<boolean>(Boolean(nextUnpaidInstallment));

  useEffect(() => {
    setIncludeLoan(Boolean(nextUnpaidInstallment));
    setIncludeSukarela(false);
    setSukarelaAmount(0);
    setCashReceived('');
  }, [student?.id, nextUnpaidInstallment?.id]);

  // 3. Simpanan Sukarela Evaluation (for Deposit)
  const sukarelaSaving = useMemo(() => {
    return savings.find(s => (s.category?.code || s.type || '').toUpperCase() === 'SUKARELA');
  }, [savings]);

  const [includeSukarela, setIncludeSukarela] = useState<boolean>(false);
  const [sukarelaAmount, setSukarelaAmount] = useState<number>(0);

  // Cash Calculation (for Deposit)
  const totalAmountToPay = useMemo(() => {
    let total = 0;
    if (includeWajib && wajibSaving) total += wajibAmount;
    if (includeLoan && nextUnpaidInstallment) total += Number(nextUnpaidInstallment.amount);
    if (includeSukarela && sukarelaSaving) total += sukarelaAmount;
    return total;
  }, [includeWajib, wajibSaving, wajibAmount, includeLoan, nextUnpaidInstallment, includeSukarela, sukarelaSaving, sukarelaAmount]);

  const [cashReceived, setCashReceived] = useState<string>('');
  const cashNum = Number(cashReceived) || 0;
  const changeAmount = Math.max(0, cashNum - totalAmountToPay);

  // 4. Withdrawal Specific Evaluation & State
  const withdrawableSavings = useMemo(() => {
    return savings.filter(s => {
      const code = (s.category?.code || s.type || '').toUpperCase();
      return code !== 'POKOK' && code !== 'WAJIB' && s.category?.isWithdrawable !== false;
    });
  }, [savings]);

  const [selectedWithdrawSavingId, setSelectedWithdrawSavingId] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [withdrawNote, setWithdrawNote] = useState<string>('');

  useEffect(() => {
    if (withdrawableSavings.length > 0) {
      if (!selectedWithdrawSavingId || !withdrawableSavings.some(s => s.id === selectedWithdrawSavingId)) {
        setSelectedWithdrawSavingId(withdrawableSavings[0].id);
      }
    } else {
      setSelectedWithdrawSavingId('');
    }
    setWithdrawAmount(0);
    setWithdrawNote('');
  }, [student?.id, withdrawableSavings]);

  const selectedWithdrawSaving = useMemo(() => {
    return withdrawableSavings.find(s => s.id === selectedWithdrawSavingId) || withdrawableSavings[0] || null;
  }, [withdrawableSavings, selectedWithdrawSavingId]);

  const maxWithdrawBalance = useMemo(() => {
    if (!selectedWithdrawSaving) return 0;
    return parseFloat(selectedWithdrawSaving.amount) || 0;
  }, [selectedWithdrawSaving]);

  // Success result for printing
  const [lastReceiptData, setLastReceiptData] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const memberId = savings[0]?.memberId || savings[0]?.member?.id || student.id;
    if (!memberId) {
      alert('ID Anggota tidak valid.');
      return;
    }

    if (tellerMode === 'WITHDRAWAL') {
      if (!selectedWithdrawSaving) {
        alert('Pilih rekening simpanan yang ingin ditarik.');
        return;
      }
      if (withdrawAmount <= 0) {
        alert('Nominal penarikan harus lebih besar dari 0.');
        return;
      }
      if (withdrawAmount > maxWithdrawBalance) {
        alert(`Nominal penarikan melebihi saldo tersedia (Maks. Rp ${maxWithdrawBalance.toLocaleString('id-ID')}).`);
        return;
      }

      try {
        const res = await onProcessUnifiedPayment({
          memberId,
          savingsTransactions: [
            {
              savingId: selectedWithdrawSaving.id,
              type: 'WITHDRAWAL',
              amount: withdrawAmount,
              description: withdrawNote || `Tarik Tunai ${selectedWithdrawSaving.category?.name || 'Simpanan Sukarela'} Loket Kasir`,
            }
          ],
          loanInstallments: [],
          notes: withdrawNote || `Tarik Tunai Kasir (${student.nama_siswa || student.nama_guru})`,
        });

        if (res?.success) {
          const remainingBalance = Math.max(0, maxWithdrawBalance - withdrawAmount);
          const slipPayload = {
            receiptNumber: res.receiptNumber,
            date: res.timestamp || new Date().toISOString(),
            memberName: student.nama_siswa || student.nama_guru || 'Anggota Koperasi',
            memberNo: savings[0]?.member?.memberNo || student.memberNo || '-',
            transactionType: 'WITHDRAWAL' as const,
            items: [
              {
                title: `Penarikan: ${selectedWithdrawSaving.category?.name || 'Simpanan Sukarela'}`,
                amount: withdrawAmount,
                subtext: `Sisa Saldo: Rp ${remainingBalance.toLocaleString('id-ID')}`,
              }
            ],
            totalAmount: withdrawAmount,
            operatorName,
          };

          setLastReceiptData(slipPayload);
          onSuccessTransaction?.();
        }
      } catch (err) {
        console.error(err);
      }
      return;
    }

    // Default: DEPOSIT_AND_BILL Mode
    if (totalAmountToPay <= 0) {
      alert('Pilih setidaknya satu komponen setoran simpanan atau cicilan pinjaman.');
      return;
    }

    const savingsTransactions: any[] = [];
    if (includeWajib && wajibSaving && wajibAmount > 0) {
      savingsTransactions.push({
        savingId: wajibSaving.id,
        type: 'DEPOSIT',
        amount: wajibAmount,
        description: `Setoran Simpanan Wajib (${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})`,
      });
    }

    if (includeSukarela && sukarelaSaving && sukarelaAmount > 0) {
      savingsTransactions.push({
        savingId: sukarelaSaving.id,
        type: 'DEPOSIT',
        amount: sukarelaAmount,
        description: 'Setoran Tambahan Simpanan Sukarela',
      });
    }

    const loanInstallments: any[] = [];
    if (includeLoan && nextUnpaidInstallment) {
      loanInstallments.push({
        installmentId: nextUnpaidInstallment.id,
        installmentNo: installmentNumber,
      });
    }

    try {
      const res = await onProcessUnifiedPayment({
        memberId,
        savingsTransactions,
        loanInstallments,
        notes: `Transaksi Terpadu Loket (${student.nama_siswa || student.nama_guru})`,
      });

      if (res?.success) {
        // Prepare items for receipt
        const items: Array<{ title: string; amount: number; subtext?: string }> = [];
        if (includeWajib && wajibSaving) {
          items.push({
            title: 'Simpanan Wajib',
            amount: wajibAmount,
            subtext: `Bulan ${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`,
          });
        }
        if (includeLoan && nextUnpaidInstallment) {
          items.push({
            title: `Angsuran Pinjaman #${installmentNumber}`,
            amount: Number(nextUnpaidInstallment.amount),
            subtext: `Jatuh Tempo: ${formatIndonesianDate(nextUnpaidInstallment.dueDate)}`,
          });
        }
        if (includeSukarela && sukarelaSaving && sukarelaAmount > 0) {
          items.push({
            title: 'Simpanan Sukarela',
            amount: sukarelaAmount,
            subtext: 'Tabungan Tambahan',
          });
        }

        const slipPayload = {
          receiptNumber: res.receiptNumber,
          date: res.timestamp || new Date().toISOString(),
          memberName: student.nama_siswa || student.nama_guru || 'Anggota Koperasi',
          memberNo: savings[0]?.member?.memberNo || student.memberNo || '-',
          transactionType: 'DEPOSIT' as const,
          items,
          totalAmount: totalAmountToPay,
          cashReceived: cashNum > 0 ? cashNum : totalAmountToPay,
          change: changeAmount,
          operatorName,
        };

        setLastReceiptData(slipPayload);
        onSuccessTransaction?.();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrintAgain = () => {
    if (lastReceiptData) {
      printUnifiedThermalSlip(lastReceiptData);
    }
  };

  if (lastReceiptData) {
    const isWithdrawalReceipt = lastReceiptData.transactionType === 'WITHDRAWAL';
    return (
      <div className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-md space-y-4 animate-in fade-in zoom-in-95 ${
        isWithdrawalReceipt
          ? 'border-rose-200 dark:border-rose-800/80'
          : 'border-emerald-200 dark:border-emerald-800/80'
      }`}>
        <div className="text-center space-y-2">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-sm ${
            isWithdrawalReceipt
              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
          }`}>
            {isWithdrawalReceipt ? <ArrowDownCircle className="w-7 h-7" /> : <CheckCircle2 className="w-7 h-7" />}
          </div>
          <h4 className="font-black text-slate-800 dark:text-slate-100 text-base">
            {isWithdrawalReceipt ? 'Penarikan Kasir Berhasil!' : 'Pembayaran Terpadu Berhasil!'}
          </h4>
          <p className="text-xs text-slate-500 font-mono">
            {lastReceiptData.receiptNumber}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
            <span>Anggota:</span>
            <span>{lastReceiptData.memberName}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
            <span>{isWithdrawalReceipt ? 'Total Diserahkan ke Anggota:' : 'Total Diterima:'}</span>
            <span className={`font-mono font-black ${
              isWithdrawalReceipt
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              Rp {lastReceiptData.totalAmount.toLocaleString('id-ID')}
            </span>
          </div>
          {!isWithdrawalReceipt && lastReceiptData.change > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Kembalian:</span>
              <span className="font-mono">Rp {lastReceiptData.change.toLocaleString('id-ID')}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            type="button"
            variant="primary"
            onClick={handlePrintAgain}
            className={`w-full gap-2 justify-center py-2.5 text-white font-bold text-xs shadow-sm ${
              isWithdrawalReceipt
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Ulang Struk Kasir</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-full justify-center py-2 text-xs font-semibold"
          >
            Selesai / Layani Anggota Lain
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ── 1. Scanned Member Header ─────────────────────────────────── */}
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-indigo-50/80 to-purple-50/50 dark:from-slate-800/80 dark:to-slate-800/40 rounded-xl border border-indigo-100/80 dark:border-slate-800/80 relative overflow-hidden">
        <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
          {student.nama_siswa?.charAt(0) || student.nama_guru?.charAt(0) || 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              TERPADU
            </span>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate uppercase">
              {student.nama_siswa || student.nama_guru}
            </h4>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-medium">
            <span>NIS/NIP: {student.nis || student.nip || '-'}</span>
            <span>&bull;</span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
              No. {savings[0]?.member?.memberNo || student.memberNo || '-'}
            </span>
          </div>
        </div>
        {onResetMember && (
          <button
            type="button"
            onClick={onResetMember}
            className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-white/80 dark:hover:bg-slate-700/60 rounded-lg transition-colors flex items-center gap-1 border border-indigo-200 dark:border-indigo-800/60 bg-white/60 dark:bg-slate-800/60 shrink-0"
            title="Ganti Anggota Lain"
          >
            <RotateCcw size={12} />
            <span>Ganti</span>
          </button>
        )}
      </div>

      {/* ── 2. Teller Mode Switcher (Kas Masuk vs Kas Keluar) ───────────── */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl gap-1 border border-slate-200/60 dark:border-slate-700/60">
        <button
          type="button"
          onClick={() => setTellerMode('DEPOSIT_AND_BILL')}
          className={`flex-1 py-1.5 px-3 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
            tellerMode === 'DEPOSIT_AND_BILL'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50'
              : 'text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowUpCircle size={14} className={tellerMode === 'DEPOSIT_AND_BILL' ? 'text-emerald-500' : 'text-slate-400'} />
          <span>Setoran & Tagihan</span>
          {nextUnpaidInstallment && (
            <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse ml-0.5" title="Ada tagihan pinjaman aktif" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setTellerMode('WITHDRAWAL')}
          className={`flex-1 py-1.5 px-3 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 transition-all ${
            tellerMode === 'WITHDRAWAL'
              ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50'
              : 'text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowDownCircle size={14} className={tellerMode === 'WITHDRAWAL' ? 'text-rose-500' : 'text-slate-400'} />
          <span>Tarik Tunai Simpanan</span>
        </button>
      </div>

      {/* ── 3. Mode Content ─────────────────────────────────────────────── */}
      {tellerMode === 'WITHDRAWAL' ? (
        <div className="space-y-3">
          {withdrawableSavings.length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Tidak Ada Rekening yang Dapat Ditarik</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                Simpanan Pokok dan Simpanan Wajib merupakan modal penyertaan tetap anggota yang <strong>tidak dapat ditarik</strong> selama status keanggotaan masih aktif.
              </p>
              <p className="text-[11px] text-slate-500">
                Untuk penarikan tunai, anggota harus memiliki saldo pada <strong>Simpanan Sukarela</strong> atau jenis tabungan sukarela lainnya.
              </p>
            </div>
          ) : (
            <>
              {/* Account Selector */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Pilih Rekening Penarikan
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {withdrawableSavings.map((s) => {
                    const isSelected = s.id === (selectedWithdrawSaving?.id);
                    const bal = parseFloat(s.amount) || 0;
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelectedWithdrawSavingId(s.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isSelected
                              ? 'bg-rose-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            <Wallet size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                              {s.category?.name || s.type || 'Simpanan Sukarela'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              No. Rek: {s.accountNumber || '-'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Saldo Tersedia</span>
                          <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                            Rp {bal.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Withdrawal Amount Input & Quick Chips */}
              <div className="space-y-2 p-3.5 rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Nominal Penarikan
                  </label>
                  <span className="text-[10px] font-mono font-bold text-slate-500">
                    Maks: Rp {maxWithdrawBalance.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    min={1000}
                    max={maxWithdrawBalance}
                    step={1000}
                    value={withdrawAmount || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setWithdrawAmount(val);
                    }}
                    placeholder="0"
                    className="w-full pl-9 pr-3 py-2 text-base font-black font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                {/* Quick chips */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[50000, 100000, 200000, 500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      disabled={amt > maxWithdrawBalance}
                      onClick={() => setWithdrawAmount(amt)}
                      className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                        withdrawAmount === amt
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : amt > maxWithdrawBalance
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-50'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {amt / 1000}k
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={maxWithdrawBalance <= 0}
                    onClick={() => setWithdrawAmount(maxWithdrawBalance)}
                    className={`py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                      withdrawAmount === maxWithdrawBalance && maxWithdrawBalance > 0
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                    }`}
                  >
                    Semua
                  </button>
                </div>

                {/* Warning if amount > balance */}
                {withdrawAmount > maxWithdrawBalance && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 mt-1">
                    <AlertTriangle size={12} />
                    <span>Nominal penarikan melebihi saldo tersedia!</span>
                  </p>
                )}

                {/* Note Input */}
                <div className="pt-2 border-t border-rose-100 dark:border-rose-900/40">
                  <input
                    type="text"
                    value={withdrawNote}
                    onChange={(e) => setWithdrawNote(e.target.value)}
                    placeholder="Catatan / Keperluan penarikan (opsional)..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Withdrawal Summary Box */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2 shadow-sm">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Total Kas Keluar (Diserahkan)
                  </span>
                  <span className="text-xl font-black font-mono text-rose-400">
                    Rp {withdrawAmount.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Sisa Saldo Rekening:</span>
                  <span className="font-mono font-bold text-slate-200">
                    Rp {Math.max(0, maxWithdrawBalance - withdrawAmount).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* ── DEPOSIT & BILL PAYMENT VIEW ───────────────────────────────── */
        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
            Pilihan Pembayaran Terpadu
          </label>

          {/* 3A. Simpanan Wajib Bulan Ini */}
          {wajibSaving && (
            <div className={`p-3 rounded-xl border transition-all ${
              isWajibPaidThisMonth
                ? 'border-emerald-200/80 dark:border-emerald-800/50 bg-emerald-50/20 dark:bg-emerald-950/10'
                : includeWajib 
                  ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs' 
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-70'
            }`}>
              <label className={`flex items-start gap-2.5 select-none ${
                isWajibPaidThisMonth ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
              }`}>
                <input
                  type="checkbox"
                  checked={includeWajib}
                  disabled={isWajibPaidThisMonth}
                  onChange={(e) => {
                    if (!isWajibPaidThisMonth) {
                      setIncludeWajib(e.target.checked);
                    }
                  }}
                  className={`mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 ${
                    isWajibPaidThisMonth ? 'cursor-not-allowed opacity-40 bg-slate-100 dark:bg-slate-800' : ''
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Simpanan Wajib</span>
                      {isWajibPaidThisMonth && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/40 px-1.5 py-0.2 rounded">
                          Lunas
                        </span>
                      )}
                    </span>
                    <span className={`font-mono font-black text-xs ${
                      isWajibPaidThisMonth 
                        ? 'text-slate-400 line-through' 
                        : 'text-indigo-600 dark:text-indigo-400'
                    }`}>
                      Rp {wajibAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px]">
                    <span className="text-slate-500">
                      Bulan {now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                    </span>
                    {isWajibPaidThisMonth ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        ✓ Sudah Lunas Bulan Ini (Terkunci)
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                        ⚠️ Belum Disetor
                      </span>
                    )}
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* 3B. Angsuran Pinjaman Berjalan */}
          <div className={`p-3 rounded-xl border transition-all ${
            nextUnpaidInstallment
              ? includeLoan
                ? 'border-purple-400 dark:border-purple-600 bg-purple-50/40 dark:bg-purple-950/20 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-70'
              : 'border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
          }`}>
            {loadingLoans ? (
              <div className="py-2 text-center text-xs text-slate-400">Memeriksa pinjaman aktif...</div>
            ) : nextUnpaidInstallment ? (
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeLoan}
                  onChange={(e) => setIncludeLoan(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                      <span>Cicilan Pinjaman #{installmentNumber}</span>
                    </span>
                    <span className="font-mono font-black text-xs text-purple-600 dark:text-purple-400">
                      Rp {Number(nextUnpaidInstallment.amount).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Jatuh Tempo: {formatIndonesianDate(nextUnpaidInstallment.dueDate)}</span>
                    </span>
                    <span className="font-semibold text-purple-700 dark:text-purple-300">
                      Tenor {activeLoan?.duration} Bln
                    </span>
                  </div>
                </div>
              </label>
            ) : (
              <div className="flex items-center gap-2 py-0.5 text-slate-500 text-xs">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-[11px] font-medium">Tidak ada pinjaman aktif / Seluruh cicilan lunas</span>
              </div>
            )}
          </div>

          {/* 3C. Simpanan Sukarela (Opsional) */}
          {sukarelaSaving && (
            <div className={`p-3 rounded-xl border transition-all ${
              includeSukarela 
                ? 'border-teal-400 dark:border-teal-600 bg-teal-50/40 dark:bg-teal-950/20' 
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
            }`}>
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSukarela}
                  onChange={(e) => {
                    setIncludeSukarela(e.target.checked);
                    if (e.target.checked && sukarelaAmount === 0) setSukarelaAmount(10000);
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-teal-600" />
                      <span>Tambah Tabungan Sukarela</span>
                    </span>
                    {includeSukarela && (
                      <span className="font-mono font-black text-xs text-teal-600 dark:text-teal-400">
                        +Rp {sukarelaAmount.toLocaleString('id-ID')}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Saldo saat ini: Rp {(parseFloat(sukarelaSaving.amount) || 0).toLocaleString('id-ID')}
                  </p>
                </div>
              </label>

              {includeSukarela && (
                <div className="mt-2.5 pt-2 border-t border-teal-200/50 dark:border-teal-800/40 space-y-1.5">
                  <div className="grid grid-cols-4 gap-1">
                    {[10000, 20000, 50000, 100000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setSukarelaAmount(amt)}
                        className={`py-1 text-[10px] font-bold rounded-lg border transition-all ${
                          sukarelaAmount === amt 
                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs' 
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        +{amt / 1000}k
                      </button>
                    ))}
                  </div>
                  <Input
                    type="number"
                    min={1000}
                    step={1000}
                    value={sukarelaAmount || ''}
                    onChange={(e) => setSukarelaAmount(Number(e.target.value) || 0)}
                    placeholder="Ketik nominal sukarela..."
                    className="w-full text-xs font-mono py-1.5"
                  />
                </div>
              )}
            </div>
          )}

          {/* 3D. Total & Kalkulator Kembalian (Deposit Only) */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2.5 shadow-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Harus Diterima
              </span>
              <span className="text-xl font-black font-mono text-emerald-400">
                Rp {totalAmountToPay.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Uang Tunai Diterima:</span>
                <div className="w-32">
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="Rp 0"
                    className="w-full px-2 py-1 text-xs font-mono font-bold rounded bg-slate-800 border border-slate-700 text-white text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Kembalian:</span>
                <span className={`font-mono font-black ${changeAmount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                  Rp {changeAmount.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Submit & Action Buttons ──────────────────────────────────── */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 py-2 text-xs font-semibold"
        >
          Batal
        </Button>
        {tellerMode === 'WITHDRAWAL' ? (
          <Button
            type="submit"
            variant="danger"
            disabled={
              isProcessing ||
              withdrawAmount <= 0 ||
              withdrawAmount > maxWithdrawBalance ||
              withdrawableSavings.length === 0
            }
            className="flex-2 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5 justify-center shadow-sm"
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span>{isProcessing ? 'Memproses Penarikan...' : `Tarik Tunai (Rp ${withdrawAmount.toLocaleString('id-ID')})`}</span>
          </Button>
        ) : (
          <Button
            type="submit"
            variant="primary"
            disabled={isProcessing || totalAmountToPay <= 0}
            className="flex-2 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 justify-center shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>{isProcessing ? 'Memproses...' : `Bayar Terpadu (Rp ${totalAmountToPay.toLocaleString('id-ID')})`}</span>
          </Button>
        )}
      </div>
    </form>
  );
});

UnifiedPaymentPanel.displayName = 'UnifiedPaymentPanel';
