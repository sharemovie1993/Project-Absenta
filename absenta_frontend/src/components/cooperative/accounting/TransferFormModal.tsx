import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
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
  fromAccountCode: z.enum(['1010', '1011']),
  toAccountCode: z.enum(['1010', '1011']),
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

        {/* Transfer Dari & Ke (Pill buttons) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Dari Rekening (Sumber)
            </label>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, fromAccountCode: '1010', toAccountCode: '1011' }))}
                className={`w-full py-1.5 px-3 text-xs font-bold rounded-xl text-left border transition-all ${
                  formData.fromAccountCode === '1010'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                1010 - Kas Koperasi (Tunai)
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, fromAccountCode: '1011', toAccountCode: '1010' }))}
                className={`w-full py-1.5 px-3 text-xs font-bold rounded-xl text-left border transition-all ${
                  formData.fromAccountCode === '1011'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                1011 - Kas Bank Koperasi
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Ke Rekening (Tujuan)
            </label>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">
                  {formData.toAccountCode === '1011' ? '1011 - Kas Bank Koperasi' : '1010 - Kas Koperasi (Tunai)'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {formData.toAccountCode === '1011' ? 'Setor tunai ke rekening bank' : 'Tarik tunai dari bank ke kas brankas'}
                </span>
              </div>
              <ArrowRightLeft size={16} className="text-blue-500" />
            </div>
            {errors.toAccountCode && <p className="text-[11px] text-rose-500 mt-1">{errors.toAccountCode}</p>}
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
              • <strong>Debit:</strong> Akun {formData.toAccountCode} ({formData.toAccountCode === '1011' ? 'Kas Bank Koperasi' : 'Kas Tunai'})
              <br />
              • <strong>Kredit:</strong> Akun {formData.fromAccountCode} ({formData.fromAccountCode === '1011' ? 'Kas Bank Koperasi' : 'Kas Tunai'})
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
