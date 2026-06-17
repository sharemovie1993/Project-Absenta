import React from 'react';
import { XCircle, RefreshCw } from 'lucide-react';
import { Button, Input } from '../../ui';
import { SearchableSelect } from '../../ui/SearchableSelect';

import type { Member } from './types';

interface CreateLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isStudent: boolean;
  members: Member[];
  formData: {
    memberId: string;
    amount: string;
    interestRate: string;
    duration: string;
    notes: string;
  };
  onFormDataChange: React.Dispatch<React.SetStateAction<{
    memberId: string;
    amount: string;
    interestRate: string;
    duration: string;
    notes: string;
  }>>;
  simulation: {
    interest: number;
    total: number;
    monthly: number;
  };
  submitLoading: boolean;
}

export const CreateLoanModal: React.FC<CreateLoanModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isStudent,
  members,
  formData,
  onFormDataChange,
  simulation,
  submitLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300"
      aria-labelledby="create-loan-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 flex justify-between items-center">
          <div>
            <h3 id="create-loan-title" className="text-sm font-black uppercase tracking-wider text-slate-850 dark:text-slate-100">
              Formulir Pengajuan Pinjaman
            </h3>
            <p className="text-[10px] text-slate-400">Ajukan fasilitas kredit dengan simulasi bunga transparan</p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 p-1"
          >
            <XCircle size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="p-6 space-y-4">
            {/* Select Member (Operator mode only) */}
            {!isStudent && (
              <div className="space-y-1.5">
                <label htmlFor="select-member-id" className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Pilih Anggota Koperasi
                </label>
                <SearchableSelect
                  id="select-member-id"
                  value={formData.memberId}
                  onValueChange={(val) => onFormDataChange(prev => ({ ...prev, memberId: val }))}
                  options={(members || [])?.map(m => ({ label: `${m.name} (${m.memberNo})`, value: m.id }))}
                  placeholder="-- Pilih Anggota --"
                  emptyMessage="Anggota tidak ditemukan."
                />
              </div>
            )}

            {/* Loan Amount Input */}
            <div className="space-y-1">
              <label htmlFor="loan-amount" className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                Nominal Pinjaman (Rp)
              </label>
              <Input
                id="loan-amount"
                type="number"
                value={formData.amount}
                onChange={(e) => onFormDataChange(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Masukkan nominal (min: Rp 100.000)"
                className="h-10 text-sm font-extrabold focus:border-indigo-500"
                required
                min="100000"
                aria-label="Nominal Pinjaman"
              />
            </div>

            {/* Interest rate & Tenor */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="loan-interest-rate" className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Suku Bunga (% / Bulan)
                </label>
                <Input
                  id="loan-interest-rate"
                  type="number"
                  step="0.1"
                  value={formData.interestRate}
                  onChange={(e) => onFormDataChange(prev => ({ ...prev, interestRate: e.target.value }))}
                  className="h-10 text-xs font-bold focus:border-indigo-500"
                  required
                  aria-label="Suku Bunga"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="loan-duration" className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Jangka Waktu (Bulan)
                </label>
                <select
                  id="loan-duration"
                  value={formData.duration}
                  onChange={(e) => onFormDataChange(prev => ({ ...prev, duration: e.target.value }))}
                  aria-label="Jangka Waktu"
                  className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none font-bold"
                  required
                >
                  <option value="3">3 Bulan</option>
                  <option value="6">6 Bulan</option>
                  <option value="12">12 Bulan</option>
                  <option value="24">24 Bulan</option>
                </select>
              </div>
            </div>

            {/* Live Simulation Card */}
            {formData.amount && (
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl space-y-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                <h4 className="font-black text-[10px] uppercase tracking-wider text-indigo-650 flex items-center gap-1.5">
                  <RefreshCw size={10} className="animate-spin-slow" />
                  Simulasi Estimasi Angsuran
                </h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estimasi Total Bunga:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-350">
                      Rp {simulation.interest.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-indigo-500/10 pb-1.5">
                    <span className="text-slate-500">Total Pengembalian:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-350">
                      Rp {simulation.total.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="font-bold text-slate-600 dark:text-slate-400">Angsuran per Bulan:</span>
                    <span className="font-black text-indigo-650 text-sm">
                      Rp {simulation.monthly.toLocaleString('id-ID')} / Bulan
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="p-5 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs font-bold text-slate-500"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={submitLoading}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs"
            >
              {submitLoading ? 'Memproses...' : 'Kirim Pengajuan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
