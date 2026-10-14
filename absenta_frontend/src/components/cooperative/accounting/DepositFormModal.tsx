import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { Calendar, ShieldCheck, ArrowDownLeft } from 'lucide-react';
import type { CoopDepositFormData } from './types';

interface DepositFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CoopDepositFormData) => void;
  isLoading?: boolean;
}

const depositFormSchema = z.object({
  date: z.string().min(1, 'Tanggal penerimaan wajib diisi'),
  amount: z.number().min(1, 'Nominal penerimaan harus lebih besar dari Rp 0'),
  accountCode: z.string().min(1, 'Kategori sumber penerimaan wajib dipilih'),
  receivedVia: z.enum(['CASH', 'BANK_TRANSFER']),
  payer: z.string().optional(),
  description: z.string().min(3, 'Keterangan penerimaan minimal 3 karakter'),
});

const DEPOSIT_CATEGORY_OPTIONS = [
  { value: '4030', label: '4030 - Pendapatan Sewa & Kerjasama' },
  { value: '4040', label: '4040 - Pendapatan Jasa Giro & Bunga Bank' },
  { value: '4090', label: '4090 - Pendapatan Operasional Lain-lain' },
  { value: '3020', label: '3020 - Dana Hibah & Sumbangan Modal' },
];

export const DepositFormModal: React.FC<DepositFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<CoopDepositFormData>({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    accountCode: '4030',
    accountName: 'Pendapatan Sewa & Kerjasama',
    receivedVia: 'CASH',
    payer: '',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        accountCode: '4030',
        accountName: 'Pendapatan Sewa & Kerjasama',
        receivedVia: 'CASH',
        payer: '',
        description: '',
      });
      setErrors({});
    }
  }, [isOpen]);

  const handleCategoryChange = (val: string | number) => {
    const code = String(val);
    const found = DEPOSIT_CATEGORY_OPTIONS.find(c => c.value === code);
    const label = found ? found.label.split(' - ')[1] : '';
    setFormData(prev => ({
      ...prev,
      accountCode: code,
      accountName: label,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = depositFormSchema.safeParse(formData);
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
      title="Catat Penerimaan Kas Lainnya (Bukti Kas Masuk)"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tanggal & Rekening Tujuan Kas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tanggal Penerimaan <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>
            {errors.date && <p className="text-[11px] text-rose-500 mt-1">{errors.date}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Diterima Masuk Ke
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, receivedVia: 'CASH' }))}
                className={`py-1 text-xs font-bold rounded-lg transition-all ${
                  formData.receivedVia === 'CASH'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Kas Tunai (1010)
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, receivedVia: 'BANK_TRANSFER' }))}
                className={`py-1 text-xs font-bold rounded-lg transition-all ${
                  formData.receivedVia === 'BANK_TRANSFER'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Bank Koperasi (1011)
              </button>
            </div>
          </div>
        </div>

        {/* Sumber Pendapatan / Akun */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Akun Sumber Pendapatan (Kredit) <span className="text-rose-500">*</span>
          </label>
          <SearchableSelect
            id="deposit-category-select"
            value={formData.accountCode}
            onChange={handleCategoryChange}
            options={DEPOSIT_CATEGORY_OPTIONS}
            placeholder="Pilih Sumber Pendapatan..."
            aria-label="Pilih Sumber Pendapatan"
          />
          {errors.accountCode && <p className="text-[11px] text-rose-500 mt-1">{errors.accountCode}</p>}
        </div>

        {/* Nominal Penerimaan */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Nominal Kas Masuk (Rp) <span className="text-rose-500">*</span>
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
              className="w-full pl-9 pr-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>
          {formData.amount > 0 && (
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
              Terbilang: Rp {formData.amount.toLocaleString('id-ID')}
            </p>
          )}
          {errors.amount && <p className="text-[11px] text-rose-500 mt-1">{errors.amount}</p>}
        </div>

        {/* Penyetor / Mitra (Payer) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Penyetor / Mitra / Pihak Ketiga (Opsional)
          </label>
          <input
            type="text"
            value={formData.payer || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, payer: e.target.value }))}
            placeholder="Contoh: Mitra Kantin Bu Ani, Bank BRI, Donatur Sekolah..."
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500 outline-hidden"
          />
        </div>

        {/* Keterangan */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Keterangan Penerimaan <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Contoh: Penerimaan pembayaran sewa etalase snack bulan Oktober 2026..."
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500 outline-hidden resize-none"
          />
          {errors.description && <p className="text-[11px] text-rose-500 mt-1">{errors.description}</p>}
        </div>

        {/* Info Box Akuntansi Otomatis */}
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-100 dark:border-emerald-900/60 flex items-start gap-2.5">
          <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-emerald-900 dark:text-emerald-200 space-y-0.5 leading-relaxed">
            <span className="font-bold block">Otomatisasi Jurnal Penerimaan Kas (BKM):</span>
            <p>
              • <strong>Debit:</strong> Akun {formData.receivedVia === 'BANK_TRANSFER' ? '1011 (Kas Bank Koperasi)' : '1010 (Kas Koperasi)'}
              <br />
              • <strong>Kredit:</strong> Akun {formData.accountCode} ({formData.accountName})
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
            className="w-full sm:w-auto justify-center bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isLoading ? 'Menyimpan...' : 'Simpan & Bukukan Kas Masuk'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
