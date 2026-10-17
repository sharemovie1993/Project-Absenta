import React, { useState, useEffect, useMemo } from 'react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { coopAccountApi } from '@/api/coopAccount.api';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { Calendar, ShieldCheck, ArrowRightLeft } from 'lucide-react';
import type { CoopTransferFormData } from './types';

interface TransferFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CoopTransferFormData) => void;
  isLoading?: boolean;
}

const transferFormSchema = z.object({
  date: z.string().min(1, 'Tanggal transfer wajib diisi'),
  amount: z.number().min(1, 'Nominal transfer harus lebih besar dari Rp 0'),
  fromAccountCode: z.string().min(1, 'Rekening sumber wajib dipilih'),
  toAccountCode: z.string().min(1, 'Rekening tujuan wajib dipilih'),
  description: z.string().min(3, 'Keterangan transfer minimal 3 karakter'),
}).refine(data => data.fromAccountCode !== data.toAccountCode, {
  message: 'Rekening sumber dan rekening tujuan tidak boleh sama',
  path: ['toAccountCode'],
});

export const TransferFormModal: React.FC<TransferFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<CoopTransferFormData>({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    fromAccountCode: '1010',
    toAccountCode: '1011',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: accountsData } = useQuery({
    queryKey: ['coop-accounts-flat', 'CASH_BANK_TRANSFER'],
    queryFn: () => coopAccountApi.getAccounts({ tree: false, type: 'ASSET' }),
    staleTime: 60 * 1000,
  });

  const cashBankOptions = useMemo(() => {
    const list = Array.isArray(accountsData) ? accountsData : (accountsData?.flat || []);
    const valid = list.filter(a => !a.isHeader && (a.code.startsWith('101') || a.name.toLowerCase().includes('kas') || a.name.toLowerCase().includes('bank')));
    if (valid.length === 0) {
      return [
        { value: '1010', label: '1010 - Kas Koperasi (Tunai)' },
        { value: '1011', label: '1011 - Kas Bank Koperasi' },
      ];
    }
    return valid.map(a => ({
      value: a.code,
      label: `${a.code} - ${a.name}`,
    }));
  }, [accountsData]);

  const fromAccountLabel = useMemo(() => {
    const found = cashBankOptions.find(o => o.value === formData.fromAccountCode);
    return found?.label || formData.fromAccountCode;
  }, [cashBankOptions, formData.fromAccountCode]);

  const toAccountLabel = useMemo(() => {
    const found = cashBankOptions.find(o => o.value === formData.toAccountCode);
    return found?.label || formData.toAccountCode;
  }, [cashBankOptions, formData.toAccountCode]);

  const handleSwapAccounts = () => {
    setFormData(prev => ({
      ...prev,
      fromAccountCode: prev.toAccountCode,
      toAccountCode: prev.fromAccountCode,
    }));
  };

  useEffect(() => {
    if (isOpen) {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        fromAccountCode: '1010',
        toAccountCode: '1011',
        description: '',
      });
      setErrors({});
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = transferFormSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transfer Dana Kas & Bank Koperasi"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tanggal Transfer */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Tanggal Transfer <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>
          {errors.date && <p className="text-[11px] text-rose-500 mt-1">{errors.date}</p>}
        </div>

        {/* Transfer Dari & Ke (Dynamic Account Selectors) */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Pengaturan Rekening Sumber & Tujuan
            </span>
            <button
              type="button"
              onClick={handleSwapAccounts}
              title="Tukar Posisi Rekening"
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200 dark:border-indigo-800 cursor-pointer"
            >
              <ArrowRightLeft size={12} />
              <span>Tukar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Dari Rekening (Sumber/Kredit) <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                id="transfer-from-account"
                value={formData.fromAccountCode}
                onChange={(val) => setFormData(prev => ({ ...prev, fromAccountCode: String(val) }))}
                options={cashBankOptions}
                placeholder="Pilih Rekening Sumber..."
                aria-label="Pilih Rekening Sumber"
              />
              {errors.fromAccountCode && <p className="text-[11px] text-rose-500 mt-1">{errors.fromAccountCode}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Ke Rekening (Tujuan/Debit) <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                id="transfer-to-account"
                value={formData.toAccountCode}
                onChange={(val) => setFormData(prev => ({ ...prev, toAccountCode: String(val) }))}
                options={cashBankOptions}
                placeholder="Pilih Rekening Tujuan..."
                aria-label="Pilih Rekening Tujuan"
              />
              {errors.toAccountCode && <p className="text-[11px] text-rose-500 mt-1">{errors.toAccountCode}</p>}
            </div>
          </div>
        </div>

        {/* Nominal Transfer */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Nominal Transfer (Rp) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={formData.amount === 0 ? '' : formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value || 0) }))}
              placeholder="0"
              className="w-full pl-9 pr-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>
          {formData.amount > 0 && (
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
              Terbilang: Rp {formData.amount.toLocaleString('id-ID')}
            </p>
          )}
          {errors.amount && <p className="text-[11px] text-rose-500 mt-1">{errors.amount}</p>}
        </div>

        {/* Keterangan */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Keterangan / Alasan Transfer <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Contoh: Setoran uang tunai kasir toko ke rekening operasional Bank Koperasi..."
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-hidden resize-none"
          />
          {errors.description && <p className="text-[11px] text-rose-500 mt-1">{errors.description}</p>}
        </div>

        {/* Info Box Akuntansi Otomatis */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/60 flex items-start gap-2.5">
          <ShieldCheck size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-blue-900 dark:text-blue-200 space-y-0.5 leading-relaxed">
            <span className="font-bold block">Otomatisasi Jurnal Transfer Kas & Bank (TRF):</span>
            <p>
              • <strong>Debit:</strong> Akun {formData.toAccountCode} ({toAccountLabel})
              <br />
              • <strong>Kredit:</strong> Akun {formData.fromAccountCode} ({fromAccountLabel})
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto justify-center"
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isLoading}
            className="w-full sm:w-auto justify-center bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? 'Memproses...' : 'Proses Transfer Dana'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
