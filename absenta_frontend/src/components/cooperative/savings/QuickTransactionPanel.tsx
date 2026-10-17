import React from 'react';
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
    <div className="space-y-4">
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
              placeholder="Pindai RFID / QR, atau ketik Nama / No. Anggota..."
              onSelect={onSelectStudent}
              autoFocus={!isStudent}
            />
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5">
            <p className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Scan size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span>Petunjuk Mesin Kasir Terpadu:</span>
            </p>
            <p>• Tempelkan kartu RFID anggota pada scanner untuk membuka rekening secara instan.</p>
            <p>• Arahkan QR Code kartu anggota ke kamera scanner.</p>
            <p>• Atau ketik nama / nomor anggota pada kolom pencarian di atas.</p>
          </div>
        </div>
      ) : onProcessUnifiedPayment ? (
        <UnifiedPaymentPanel
          student={scannedStudent}
          savings={scannedMemberSavings}
          memberLoans={memberLoans}
          loadingLoans={loadingLoans}
          onCancel={onCancel}
          onResetMember={() => onSelectStudent({ id: '' })}
          onProcessUnifiedPayment={onProcessUnifiedPayment}
          isProcessing={isProcessingUnifiedPayment}
        />
      ) : (
        <div className="py-8 text-center text-xs text-slate-400">
          Modul kasir tidak tersedia.
        </div>
      )}
    </div>
  );
}));

QuickTransactionPanel.displayName = 'QuickTransactionPanel';
