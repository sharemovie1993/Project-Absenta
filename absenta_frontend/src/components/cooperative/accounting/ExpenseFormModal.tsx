import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { FileText, DollarSign, Calendar, Tag, ShieldCheck, AlertCircle, Building2 } from 'lucide-react';
import type { CoopExpenseFormData } from './types';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CoopExpenseFormData) => void;
  isLoading?: boolean;
}

const expenseFormSchema = z.object({
  date: z.string().min(1, 'Tanggal pengeluaran wajib diisi'),
  amount: z.number().min(1, 'Nominal pengeluaran harus lebih besar dari Rp 0'),
  categoryCode: z.string().min(1, 'Kategori beban operasional wajib dipilih'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER']),
  payee: z.string().optional(),
  description: z.string().min(3, 'Keterangan pengeluaran minimal 3 karakter'),
});

const EXPENSE_CATEGORY_OPTIONS = [
  { value: '5021', label: '5021 - Beban Listrik, Air & Utilitas' },
  { value: '5022', label: '5022 - Beban Komunikasi & Internet' },
  { value: '5023', label: '5023 - Beban Aplikasi, Perangkat Lunak & TI' },
  { value: '5024', label: '5024 - Beban ATK & Perlengkapan Kantor' },
  { value: '5025', label: '5025 - Beban Pemeliharaan & Servis Sarana' },
  { value: '5026', label: '5026 - Beban Rapat & Operasional Pengurus' },
  { value: '5090', label: '5090 - Beban Operasional Lain-lain' },
];

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<CoopExpenseFormData>({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    categoryCode: '5021',
    categoryName: 'Beban Listrik, Air & Utilitas',
    paymentMethod: 'CASH',
    payee: '',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        categoryCode: '5021',
        categoryName: 'Beban Listrik, Air & Utilitas',
        paymentMethod: 'CASH',
        payee: '',
        description: '',
      });
      setErrors({});
    }
  }, [isOpen]);

  const handleCategoryChange = (val: string | number) => {
    const code = String(val);
    const found = EXPENSE_CATEGORY_OPTIONS.find(c => c.value === code);
    const label = found ? found.label.split(' - ')[1] : '';
    setFormData(prev => ({
      ...prev,
      categoryCode: code,
      categoryName: label,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = expenseFormSchema.safeParse(formData);
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
      title="Catat Pengeluaran Operasional (Bukti Kas Keluar)"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tanggal & Cara Bayar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tanggal Transaksi <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>
            {errors.date && <p className="text-[11px] text-rose-500 mt-1">{errors.date}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Sumber Kas Pembayaran
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'CASH' }))}
                className={`py-1 text-xs font-bold rounded-lg transition-all ${
                  formData.paymentMethod === 'CASH'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Kas Tunai (1010)
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'BANK_TRANSFER' }))}
                className={`py-1 text-xs font-bold rounded-lg transition-all ${
                  formData.paymentMethod === 'BANK_TRANSFER'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Bank Koperasi (1011)
              </button>
            </div>
          </div>
        </div>

        {/* Kategori Beban Operasional */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Kategori Akun Beban (Chart of Accounts) <span className="text-rose-500">*</span>
          </label>
          <SearchableSelect
            id="expense-category-select"
            value={formData.categoryCode}
            onChange={handleCategoryChange}
            options={EXPENSE_CATEGORY_OPTIONS}
            placeholder="Pilih Kategori Beban..."
            aria-label="Pilih Kategori Beban Operasional"
          />
          {errors.categoryCode && <p className="text-[11px] text-rose-500 mt-1">{errors.categoryCode}</p>}
        </div>

        {/* Nominal Pengeluaran */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Nominal Pengeluaran (Rp) <span className="text-rose-500">*</span>
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
              className="w-full pl-9 pr-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>
          {formData.amount > 0 && (
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
              Terbilang: Rp {formData.amount.toLocaleString('id-ID')}
            </p>
          )}
          {errors.amount && <p className="text-[11px] text-rose-500 mt-1">{errors.amount}</p>}
        </div>

        {/* Penerima / Pihak Ketiga (Payee) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Pihak Penerima / Vendor (Opsional)
          </label>
          <input
            type="text"
            value={formData.payee || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, payee: e.target.value }))}
            placeholder="Contoh: PLN Rayon Pusat, IndiHome, Toko ATK Berkah..."
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-hidden"
          />
        </div>

        {/* Keterangan Pengeluaran */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Keterangan & Rincian Pengeluaran <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Contoh: Pembelian token listrik toko koperasi & kantor operasional bulan Oktober 2026..."
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 outline-hidden resize-none"
          />
          {errors.description && <p className="text-[11px] text-rose-500 mt-1">{errors.description}</p>}
        </div>

        {/* Info Box Akuntansi Otomatis */}
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-2.5">
          <ShieldCheck size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-indigo-900 dark:text-indigo-200 space-y-0.5 leading-relaxed">
            <span className="font-bold block">Otomatisasi Jurnal Ganda (Double-Entry):</span>
            <p>
              Sistem akan otomatis menerbitkan <strong>Bukti Kas Keluar (BKK)</strong> dan membukukan:
              <br />
              • <strong>Debit:</strong> Akun {formData.categoryCode} ({formData.categoryName || 'Beban'})
              <br />
              • <strong>Kredit:</strong> Akun {formData.paymentMethod === 'BANK_TRANSFER' ? '1011 (Kas Bank)' : '1010 (Kas Koperasi)'}
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
            className="w-full sm:w-auto justify-center bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isLoading ? 'Menyimpan...' : 'Simpan & Bukukan Kas Keluar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
