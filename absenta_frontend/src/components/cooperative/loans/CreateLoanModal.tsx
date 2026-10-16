import React, { useMemo } from 'react';
import { XCircle, RefreshCw } from 'lucide-react';
import { Button, Input } from '../../ui';
import { SearchableSelect } from '../../ui/SearchableSelect';

import type { Member } from './types';

interface CreateLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isStudent?: boolean;
  isOperatorMode?: boolean;
  members?: Member[];
  loadingMembers?: boolean;
  isLoadingMembers?: boolean;
  formData: {
    memberId: string;
    amount: string;
    interestRate: string;
    duration: string;
    notes?: string;
  };
  onFormDataChange?: React.Dispatch<React.SetStateAction<{
    memberId: string;
    amount: string;
    interestRate: string;
    duration: string;
    notes: string;
  }>>;
  setFormData?: React.Dispatch<React.SetStateAction<any>>;
  simulation?: {
    interest: number;
    total: number;
    monthly: number;
  };
  submitLoading?: boolean;
  loading?: boolean;
  studentMetrics?: any;
}

export const CreateLoanModal = React.memo<CreateLoanModalProps>(({
  isOpen,
  onClose,
  onSubmit,
  isStudent = false,
  members = [],
  loadingMembers = false,
  isLoadingMembers = false,
  formData,
  onFormDataChange,
  setFormData,
  simulation,
  submitLoading = false,
  loading = false,
}) => {
  if (!isOpen) return null;

  const updateForm = onFormDataChange || setFormData;
  const isSubmitting = submitLoading || loading;
  const isListLoading = loadingMembers || isLoadingMembers;

  // Safe simulation calculation if not provided externally
  const calculatedSimulation = useMemo(() => {
    if (simulation) return simulation;
    const principal = parseFloat(formData.amount) || 0;
    const rate = parseFloat(formData.interestRate) || 0;
    const months = parseInt(formData.duration) || 12;
    const interest = Math.round(principal * (rate / 100) * months);
    const total = principal + interest;
    const monthly = months > 0 ? Math.round(total / months) : 0;
    return { interest, total, monthly };
  }, [simulation, formData.amount, formData.interestRate, formData.duration]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-955/80 backdrop-blur-sm animate-in fade-in duration-300"
      aria-labelledby="create-loan-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-955/20 flex justify-between items-center shrink-0">
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

        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Select Member (Operator mode only) */}
            {!isStudent && (
              <div className="space-y-1.5">
                <label htmlFor="select-member-id" className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Pilih Anggota Koperasi
                </label>
                <SearchableSelect
                  id="select-member-id"
                  value={formData.memberId}
                  onValueChange={(val) => {
                    if (updateForm) {
                      updateForm((prev: any) => ({ ...prev, memberId: val }));
                    }
                  }}
                  options={(members || [])?.map((m: any) => {
                    const idInfo = m.identityNo && m.identityNo !== '-' ? ` • ${m.identityNo}` : (m.nis ? ` • NIS: ${m.nis}` : (m.nip ? ` • NIP: ${m.nip}` : ''));
                    return {
                      label: `${m.name || 'Anggota'} (${m.memberNo}${idInfo})`,
                      value: m.id
                    };
                  })}
                  placeholder="-- Pilih Anggota --"
                  emptyMessage={isListLoading ? "Memuat data anggota koperasi..." : "Anggota tidak ditemukan."}
                  isLoading={isListLoading}
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
                onChange={(e) => {
                  if (updateForm) {
                    updateForm((prev: any) => ({ ...prev, amount: e.target.value }));
                  }
                }}
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
                  onChange={(e) => {
                    if (updateForm) {
                      updateForm((prev: any) => ({ ...prev, interestRate: e.target.value }));
                    }
                  }}
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
                  onChange={(e) => {
                    if (updateForm) {
                      updateForm((prev: any) => ({ ...prev, duration: e.target.value }));
                    }
                  }}
                  aria-label="Jangka Waktu"
                  className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none font-bold"
                  required
                >
                  <option value="3">3 Bulan</option>
                  <option value="6">6 Bulan</option>
                  <option value="12">12 Bulan</option>
                  <option value="24">24 Bulan</option>
                </select>
              </div>
            </div>

            {/* Notes / Keperluan Pinjaman */}
            <div className="space-y-1">
              <label htmlFor="loan-notes" className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                Keperluan / Keterangan Pinjaman (Opsional)
              </label>
              <Input
                id="loan-notes"
                type="text"
                value={formData.notes || ''}
                onChange={(e) => {
                  if (updateForm) {
                    updateForm((prev: any) => ({ ...prev, notes: e.target.value }));
                  }
                }}
                placeholder="Contoh: Modal usaha, biaya pendidikan, keperluan mendesak"
                className="h-10 text-xs focus:border-indigo-500"
                aria-label="Keperluan Pinjaman"
              />
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
                      Rp {calculatedSimulation.interest.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-indigo-500/10 pb-1.5">
                    <span className="text-slate-500">Total Pengembalian:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-350">
                      Rp {calculatedSimulation.total.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="font-bold text-slate-600 dark:text-slate-400">Angsuran per Bulan:</span>
                    <span className="font-black text-indigo-650 text-sm">
                      Rp {calculatedSimulation.monthly.toLocaleString('id-ID')} / Bulan
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-955/20 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="w-full sm:w-auto rounded-xl text-xs font-bold text-slate-500 py-2.5 sm:py-2"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              size="sm"
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs py-2.5 sm:py-2 shadow-md shadow-indigo-600/10"
            >
              {isSubmitting ? 'Memproses...' : 'Kirim Pengajuan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
});

CreateLoanModal.displayName = 'CreateLoanModal';
