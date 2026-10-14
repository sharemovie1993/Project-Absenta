import React from 'react';
import { Button } from '../ui/Button';
import { Edit, Trash } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CatalogProductItem {
  id: string;
  code: string;
  name: string;
  price: string;
  costPrice?: string | number;
  stock: number;
  category?: string;
  imageUrl?: string | null;
  unit?: string | null;
}

interface ProductCatalogGridProps {
  products: CatalogProductItem[];
  loading: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canViewCostPrice?: boolean;
  onEdit: (product: any) => void;
  onDelete: (id: string) => void;
  emptyState: React.ReactNode;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  getInitials: (name: string) => string;
}

export const ProductCatalogGrid: React.FC<ProductCatalogGridProps> = React.memo(({
  products,
  loading,
  canUpdate,
  canDelete,
  canViewCostPrice = false,
  onEdit,
  onDelete,
  emptyState,
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  getInitials,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-xs text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent mb-2" />
        Memuat etalase produk...
      </div>
    );
  }

  if (products.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {products.map(product => {
          const isLowStock = product.stock <= 5 && product.stock > 0;
          const isOutOfStock = product.stock <= 0;
          const costNum = Number(product.costPrice || 0);
          const priceNum = Number(product.price || 0);
          const marginPct = costNum > 0 ? ((priceNum - costNum) / costNum) * 100 : 0;

          return (
            <div
              key={product.id}
              onClick={() => canUpdate && onEdit(product)}
              className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer flex flex-col justify-between"
            >
              {/* Image Container */}
              <div className="relative w-full h-40 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xl border border-emerald-100 dark:border-emerald-900">
                    {getInitials(product.name)}
                  </div>
                )}

                {/* Category Badge */}
                {product.category && (
                  <span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/70 text-white backdrop-blur-xs">
                    {product.category}
                  </span>
                )}

                {/* Stock Badge */}
                <span className={cn(
                  "absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs",
                  isOutOfStock
                    ? "bg-rose-500/90 text-white"
                    : isLowStock
                      ? "bg-amber-500/90 text-white"
                      : "bg-emerald-500/90 text-white"
                )}>
                  {isOutOfStock ? 'Habis' : `${product.stock} ${product.unit || 'pcs'}`}
                </span>
              </div>

              {/* Body */}
              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block truncate">
                    {product.code || 'NO-CODE'}
                  </span>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {product.name}
                  </h4>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Harga Jual</span>
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    Rp {priceNum.toLocaleString('id-ID')}
                  </p>
                  {canViewCostPrice && (
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span>Modal: Rp {costNum.toLocaleString('id-ID')}</span>
                      <span className={marginPct >= 0 ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>
                        {marginPct > 0 ? `+${marginPct.toFixed(0)}%` : `${marginPct.toFixed(0)}%`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick Action Footer */}
                {canUpdate && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <Button
                      size="xs"
                      variant="outline"
                      className="w-full text-[11px] font-bold py-1 h-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(product);
                      }}
                    >
                      <Edit size={12} className="mr-1" />
                      Ubah
                    </Button>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(product.id);
                        }}
                        className="w-7 h-7 shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-800 flex items-center justify-center transition-colors"
                        title="Hapus Produk"
                      >
                        <Trash size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
        <div>
          Menampilkan <span className="font-bold text-slate-800 dark:text-slate-200">{products.length}</span> dari <span className="font-bold text-slate-800 dark:text-slate-200">{totalItems}</span> produk
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="outline"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            Sebelumnya
          </Button>
          <span className="font-bold px-2">
            Halaman {currentPage} dari {totalPages}
          </span>
          <Button
            size="xs"
            variant="outline"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            Selanjutnya
          </Button>
        </div>
      </div>
    </div>
  );
});

ProductCatalogGrid.displayName = 'ProductCatalogGrid';
