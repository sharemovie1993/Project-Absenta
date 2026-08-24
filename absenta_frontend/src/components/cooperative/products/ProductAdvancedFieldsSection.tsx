import React from 'react';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { cn } from '@/lib/utils';

interface ProductAdvancedFieldsSectionProps {
  formData: {
    minStock: string;
    weight: string;
    unit: string;
    discount: string;
    discountType: string;
    rackLocation: string;
    description: string;
    barcode: string;
    useStock: boolean;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

const UNIT_OPTIONS = [
  { value: 'pcs', label: 'pcs' },
  { value: 'box', label: 'box' },
  { value: 'pack', label: 'pack' },
  { value: 'lusin', label: 'lusin' },
  { value: 'kg', label: 'kg' },
  { value: 'gram', label: 'gram' },
  { value: 'liter', label: 'liter' },
  { value: 'botol', label: 'botol' },
  { value: 'lembar', label: 'lembar' }
];

export const ProductAdvancedFieldsSection: React.FC<ProductAdvancedFieldsSectionProps> = React.memo(({
  formData,
  handleInputChange,
  setFormData
}) => {
  return (
    <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
      {/* Stok Minimum */}
      {formData.useStock && (
        <div className="space-y-1">
          <label htmlFor="prod-minstock-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Stok Minimum (Peringatan Habis)
          </label>
          <input
            id="prod-minstock-input"
            type="number"
            min="0"
            name="minStock"
            value={formData.minStock}
            onChange={handleInputChange}
            placeholder="0"
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      )}

      {/* Berat & Satuan */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="prod-weight-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Berat (gram)
          </label>
          <input
            id="prod-weight-input"
            type="number"
            min="0"
            name="weight"
            value={formData.weight}
            onChange={handleInputChange}
            placeholder="0"
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="prod-unit-select" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Satuan
          </label>
          <SearchableSelect
            id="prod-unit-select"
            aria-label="Pilih Satuan Barang"
            value={formData.unit || 'pcs'}
            onValueChange={(val) => setFormData((prev: any) => ({ ...prev, unit: val }))}
            options={UNIT_OPTIONS}
            placeholder="Pilih Satuan..."
            triggerClassName="w-full h-11"
          />
        </div>
      </div>

      {/* Diskon */}
      <div className="space-y-1">
        <label htmlFor="prod-discount-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          Diskon Promo
        </label>
        <div className="flex gap-2">
          <input
            id="prod-discount-input"
            type="number"
            min="0"
            name="discount"
            value={formData.discount}
            onChange={handleInputChange}
            placeholder="0"
            className="flex-1 h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 p-1 bg-slate-100 dark:bg-slate-900">
            <button
              type="button"
              aria-label="Diskon Persen"
              onClick={() => setFormData((prev: any) => ({ ...prev, discountType: 'PERCENT' }))}
              className={cn(
                "px-3 text-xs font-bold rounded-lg transition-colors",
                formData.discountType === 'PERCENT' ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-2xs" : "text-slate-500"
              )}
            >
              %
            </button>
            <button
              type="button"
              aria-label="Diskon Nominal Rp"
              onClick={() => setFormData((prev: any) => ({ ...prev, discountType: 'NOMINAL' }))}
              className={cn(
                "px-3 text-xs font-bold rounded-lg transition-colors",
                formData.discountType === 'NOMINAL' ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-2xs" : "text-slate-500"
              )}
            >
              Rp
            </button>
          </div>
        </div>
      </div>

      {/* Lokasi Rak */}
      <div className="space-y-1">
        <label htmlFor="prod-rack-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          Lokasi Rak / Etalase
        </label>
        <input
          id="prod-rack-input"
          type="text"
          name="rackLocation"
          value={formData.rackLocation}
          onChange={handleInputChange}
          placeholder="Contoh: Rak A-03"
          className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
      </div>

      {/* Barcode Fisik */}
      <div className="space-y-1">
        <label htmlFor="prod-barcode-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          Barcode / EAN-13
        </label>
        <input
          id="prod-barcode-input"
          type="text"
          name="barcode"
          value={formData.barcode}
          onChange={handleInputChange}
          placeholder="899275321..."
          className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-mono font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
      </div>

      {/* Deskripsi */}
      <div className="space-y-1">
        <label htmlFor="prod-desc-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          Keterangan / Catatan
        </label>
        <textarea
          id="prod-desc-input"
          name="description"
          rows={3}
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Catatan tambahan spesifikasi barang..."
          className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium outline-none resize-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
      </div>
    </div>
  );
});
