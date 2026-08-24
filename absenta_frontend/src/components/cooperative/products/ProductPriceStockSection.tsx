import React from 'react';

interface ProductPriceStockSectionProps {
  formData: {
    price: string;
    costPrice: string;
    stock: string;
    useStock: boolean;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ProductPriceStockSection: React.FC<ProductPriceStockSectionProps> = React.memo(({
  formData,
  handleInputChange
}) => {
  return (
    <>
      {/* Stok */}
      {formData.useStock && (
        <div className="space-y-1">
          <label htmlFor="prod-stock-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Stok Awal*
          </label>
          <input
            id="prod-stock-input"
            type="number"
            min="0"
            name="stock"
            value={formData.stock}
            onChange={handleInputChange}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            required
          />
        </div>
      )}

      {/* Harga Dasar & Harga Jual */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="prod-cost-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Harga Modal (Rp)*
          </label>
          <input
            id="prod-cost-input"
            type="number"
            min="0"
            name="costPrice"
            value={formData.costPrice}
            onChange={handleInputChange}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            required
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="prod-price-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Harga Jual (Rp)*
          </label>
          <input
            id="prod-price-input"
            type="number"
            min="0"
            name="price"
            value={formData.price}
            onChange={handleInputChange}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            required
          />
        </div>
      </div>
    </>
  );
});
