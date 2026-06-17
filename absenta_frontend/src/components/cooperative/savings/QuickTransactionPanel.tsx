import React from 'react';
import Card from '../../ui/Card';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import { SmartStudentPicker } from '../../common/SmartStudentPicker';
import type { Student } from '../../common/SmartStudentPicker';
import type { Saving } from './types';
import { Scan, ArrowUpCircle, ArrowDownCircle, CreditCard } from 'lucide-react';

interface QuickTransactionPanelProps {
  scannedStudent: Student | null;
  scannedMemberSavings: Saving[];
  onSelectStudent: (student: Student, memberNo?: string) => void;
  quickTxType: 'DEPOSIT' | 'WITHDRAWAL';
  onQuickTxTypeChange: (type: 'DEPOSIT' | 'WITHDRAWAL') => void;
  selectedScannedSavingId: string;
  onSelectedScannedSavingIdChange: (id: string) => void;
  quickAmount: string;
  onQuickAmountChange: (amount: string) => void;
  quickDescription: string;
  onQuickDescriptionChange: (desc: string) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  processingQuickTx: boolean;
  getVisibleSavingsForTx: (savingsList: Saving[], txType: 'DEPOSIT' | 'WITHDRAWAL') => Saving[];
  getAutoMemo: (saving: Saving | undefined, txType: 'DEPOSIT' | 'WITHDRAWAL') => string;
  isStudent: boolean;
}

export const QuickTransactionPanel = React.forwardRef<HTMLInputElement, QuickTransactionPanelProps>((
  {
    scannedStudent,
    scannedMemberSavings,
    onSelectStudent,
    quickTxType,
    onQuickTxTypeChange,
    selectedScannedSavingId,
    onSelectedScannedSavingIdChange,
    quickAmount,
    onQuickAmountChange,
    quickDescription,
    onQuickDescriptionChange,
    onCancel,
    onSubmit,
    processingQuickTx,
    getVisibleSavingsForTx,
    getAutoMemo,
    isStudent
  },
  ref
) => {
  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Scan className="text-indigo-600 dark:text-indigo-400" size={18} />
          <span className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
            Transaksi Cepat / Pindai Kartu
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
            * Tempelkan kartu RFID anggota pada scanner, sorot QR Code kartu ke kamera, atau ketik nama/nomor anggota secara langsung untuk memulai transaksi cepat.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Scanned Student Profile */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl" />
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center font-black text-sm text-indigo-600 dark:text-indigo-400 border border-indigo-100/30 shrink-0">
              {scannedStudent.nama_siswa?.charAt(0) || scannedStudent.nama_guru?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate uppercase tracking-tight">
                {scannedStudent.nama_siswa || scannedStudent.nama_guru}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  NIS/NIP: {scannedStudent.nis || scannedStudent.nip || '-'}
                </span>
                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.2 rounded">
                  No. {scannedMemberSavings[0]?.member.memberNo || ''}
                </span>
              </div>
            </div>
          </div>

          {/* Transaction Type Selection */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Tipe Transaksi
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onQuickTxTypeChange('DEPOSIT')}
                className={`py-2 px-3 rounded-xl font-extrabold text-xs transition-all duration-300 border flex items-center justify-center gap-1.5 ${
                  quickTxType === 'DEPOSIT'
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <ArrowUpCircle size={14} /> Setor Tunai
              </button>
              <button
                type="button"
                onClick={() => onQuickTxTypeChange('WITHDRAWAL')}
                className={`py-2 px-3 rounded-xl font-extrabold text-xs transition-all duration-300 border flex items-center justify-center gap-1.5 ${
                  quickTxType === 'WITHDRAWAL'
                    ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/10'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <ArrowDownCircle size={14} /> Tarik Tunai
              </button>
            </div>
          </div>

          {/* Savings Type Selector */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Pilih Jenis Simpanan
            </label>
            <div className="space-y-1.5">
              {(() => {
                const visible = getVisibleSavingsForTx(scannedMemberSavings, quickTxType);
                if (visible.length === 0) {
                  return (
                    <div className="p-3 text-center border border-dashed border-amber-200 dark:border-amber-900/50 bg-amber-500/5 rounded-xl text-xs font-semibold text-amber-600 dark:text-amber-400">
                      Tidak ada jenis simpanan yang tersedia untuk transaksi {quickTxType === 'DEPOSIT' ? 'setoran' : 'penarikan'} ini.
                    </div>
                  );
                }
                return visible.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onSelectedScannedSavingIdChange(s.id);
                      if (s.category?.defaultAmount) {
                        onQuickAmountChange(String(s.category.defaultAmount));
                      } else {
                        onQuickAmountChange('');
                      }
                      onQuickDescriptionChange(getAutoMemo(s, quickTxType));
                    }}
                    className={`w-full p-2.5 rounded-xl border transition-all duration-300 text-left flex justify-between items-center ${
                      selectedScannedSavingId === s.id
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard
                        size={14}
                        className={selectedScannedSavingId === s.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}
                      />
                      <span
                        className={`text-xs font-black tracking-wider ${
                          selectedScannedSavingId === s.id ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {s.category?.name || s.type}
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
                      Rp {parseFloat(s.amount).toLocaleString('id-ID')}
                    </span>
                  </button>
                ));
              })()}
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label htmlFor="quick-amount-input" className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Nominal Transaksi (Rp) <span className="text-rose-500">*</span>
            </label>
            <Input
              id="quick-amount-input"
              name="quickAmount"
              type="number"
              value={quickAmount}
              onChange={(e) => onQuickAmountChange(e.target.value)}
              placeholder="Masukkan nominal..."
              className="h-10 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-indigo-500"
              required
            />
            {/* Quick Nominal Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['5000', '10000', '20000', '50000', '100000'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onQuickAmountChange(preset)}
                  className="px-2.5 py-1 text-[10px] font-black rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-400 transition-colors"
                >
                  +{parseInt(preset).toLocaleString('id-ID')}
                </button>
              ))}
            </div>
          </div>

          {/* Description Input */}
          <div className="space-y-1.5">
            <label htmlFor="quick-description-input" className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Keterangan / Memo
            </label>
            <Input
              id="quick-description-input"
              name="quickDescription"
              type="text"
              value={quickDescription}
              onChange={(e) => onQuickDescriptionChange(e.target.value)}
              placeholder="Keterangan..."
              className="h-10 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-indigo-500"
            />
          </div>

          {/* Submit / Cancel buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
            >
              Batal
            </button>
            <Button
              type="submit"
              isLoading={processingQuickTx}
              disabled={getVisibleSavingsForTx(scannedMemberSavings, quickTxType).length === 0}
              variant={quickTxType === 'DEPOSIT' ? 'success' : 'danger'}
              className="flex-[2] py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 font-bold"
            >
              Proses Transaksi
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
});

QuickTransactionPanel.displayName = 'QuickTransactionPanel';
