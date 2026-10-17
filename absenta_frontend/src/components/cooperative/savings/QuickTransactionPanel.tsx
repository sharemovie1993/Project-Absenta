import React from 'react';
import Card from '../../ui/Card';
import { SmartStudentPicker } from '../../common/SmartStudentPicker';
import type { Student } from '../../common/SmartStudentPicker';
import type { Saving } from './types';
import { Scan } from 'lucide-react';
import { UnifiedPaymentPanel, MemberLoanItem } from './UnifiedPaymentPanel';

export interface QuickTransactionPanelProps {
  scannedStudent: Student | null;
  scannedMemberSavings: Saving[];
  onSelectStudent: (student: Student, memberNo?: string) => void;
  onCancel: () => void;
  isStudent?: boolean;
  memberLoans?: MemberLoanItem[];
  loadingLoans?: boolean;
  onProcessUnifiedPayment?: (payload: {
    memberId: string;
    savingsTransactions: Array<{ savingId: string; type: 'DEPOSIT' | 'WITHDRAWAL'; amount: number; description?: string }>;
    loanInstallments: Array<{ installmentId: string; installmentNo?: number }>;
    notes?: string;
  }) => Promise<any>;
  isProcessingUnifiedPayment?: boolean;

  // Optional legacy props maintained for backward compatibility
  quickTxType?: 'DEPOSIT' | 'WITHDRAWAL';
  onQuickTxTypeChange?: (type: 'DEPOSIT' | 'WITHDRAWAL') => void;
  selectedScannedSavingId?: string;
  onSelectedScannedSavingIdChange?: (id: string) => void;
  quickAmount?: string;
  onQuickAmountChange?: (amount: string) => void;
  quickDescription?: string;
  onQuickDescriptionChange?: (desc: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
  processingQuickTx?: boolean;
  getVisibleSavingsForTx?: (savingsList: Saving[], txType: 'DEPOSIT' | 'WITHDRAWAL') => Saving[];
  getAutoMemo?: (saving: Saving | undefined, txType: 'DEPOSIT' | 'WITHDRAWAL') => string;
}

export const QuickTransactionPanel = React.memo(React.forwardRef<HTMLInputElement, QuickTransactionPanelProps>((
  {
    scannedStudent,
    scannedMemberSavings,
    onSelectStudent,
    onCancel,
    isStudent = false,
    memberLoans = [],
    loadingLoans = false,
    onProcessUnifiedPayment,
    isProcessingUnifiedPayment = false
  },
  ref
) => {
  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Scan className="text-indigo-600 dark:text-indigo-400" size={18} />
          <span className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
            {scannedStudent ? 'Loket Kasir Terpadu' : 'Transaksi Cepat / Pindai Kartu'}
          </span>
        </div>
      }
    >
      {!scannedStudent ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Cari Anggota / Tempelkan Kartu
            </label>
            <SmartStudentPicker
              ref={ref}
              scope="global"
              mode="universal"
              placeholder="Pindai RFID / QR, atau cari Nama..."
              onSelect={onSelectStudent}
              autoFocus={!isStudent}
            />
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed italic">
            * Tempelkan kartu RFID anggota pada scanner, sorot QR Code kartu ke kamera, atau ketik nama/nomor anggota secara langsung untuk membuka loket kasir satu pintu.
          </p>
        </div>
      ) : onProcessUnifiedPayment ? (
        <UnifiedPaymentPanel
          student={scannedStudent}
          savings={scannedMemberSavings}
          memberLoans={memberLoans}
          loadingLoans={loadingLoans}
          onCancel={onCancel}
          onResetMember={onCancel}
          onProcessUnifiedPayment={onProcessUnifiedPayment}
          isProcessing={isProcessingUnifiedPayment}
        />
      ) : (
        <div className="py-8 text-center text-xs text-slate-400">
          Modul kasir tidak tersedia.
        </div>
      )}
    </Card>
  );
}));

QuickTransactionPanel.displayName = 'QuickTransactionPanel';
