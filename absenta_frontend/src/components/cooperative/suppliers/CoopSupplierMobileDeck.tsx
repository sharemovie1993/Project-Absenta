import React from 'react';
import { Phone, Mail, MapPin, Eye, Edit2, Trash2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/utils/layoutUtils';
import { cn } from '@/lib/utils';

export interface CoopSupplier {
  id: string;
  name: string;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  totalPurchases: number;
  totalValue: number;
  createdAt?: string;
}

interface CoopSupplierMobileDeckProps {
  suppliers: CoopSupplier[];
  isLoading: boolean;
  onDetail: (supplier: CoopSupplier) => void;
  onEdit: (supplier: CoopSupplier, e?: React.MouseEvent) => void;
  onDelete: (supplier: CoopSupplier, e?: React.MouseEvent) => void;
}

const getInitials = (name: string): string => {
  if (!name) return 'SP';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

export const CoopSupplierMobileDeck: React.FC<CoopSupplierMobileDeckProps> = React.memo(({
  suppliers,
  isLoading,
  onDetail,
  onEdit,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-2">
        <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 dark:text-slate-400">Memuat data supplier...</p>
      </div>
    );
  }

  if (!suppliers || suppliers.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
        <Building2 size={36} className="mx-auto opacity-30 text-slate-400" />
        <p>Tidak ada data supplier yang ditemukan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full max-w-full min-w-0">
      {suppliers.map((supplier) => (
        <div
          key={supplier.id}
          onClick={() => onDetail(supplier)}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs hover:border-emerald-500/40 transition-all cursor-pointer space-y-3 w-full max-w-full min-w-0"
        >
          {/* Header Card: Avatar, Name, PIC & Status Badge */}
          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-100 dark:border-emerald-800">
                {getInitials(supplier.name)}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate" title={supplier.name}>
                  {supplier.name}
                </h4>
                <span className="text-[11px] text-slate-400 font-medium truncate block">
                  {supplier.contact ? `PIC: ${supplier.contact}` : 'Supplier Mitra'}
                </span>
              </div>
            </div>

            <span className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0",
              supplier.isActive !== false
                ? "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800"
                : "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700"
            )}>
              <span className={cn("w-1.5 h-1.5 rounded-full", supplier.isActive !== false ? "bg-emerald-500" : "bg-slate-400")} />
              {supplier.isActive !== false ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>

          {/* Contact Details */}
          <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80 min-w-0">
            {supplier.phone && (
              <div className="flex items-center gap-2 min-w-0">
                <Phone size={12} className="text-emerald-500 shrink-0" />
                <a
                  href={`tel:${supplier.phone.replace(/[^0-9+]/g, '')}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold truncate"
                  title="Hubungi Supplier"
                >
                  {supplier.phone}
                </a>
              </div>
            )}
            {supplier.email && (
              <div className="flex items-center gap-2 min-w-0">
                <Mail size={12} className="text-blue-500 shrink-0" />
                <a
                  href={`mailto:${supplier.email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-blue-600 dark:text-blue-400 hover:underline truncate"
                  title="Kirim Email"
                >
                  {supplier.email}
                </a>
              </div>
            )}
            {supplier.address && (
              <div className="flex items-center gap-2 min-w-0">
                <MapPin size={12} className="text-slate-400 shrink-0" />
                <span className="truncate">{supplier.address}</span>
              </div>
            )}
          </div>

          {/* Footer Card: Procurement Stats & WCAG 44x44px Touch Target Buttons */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 uppercase font-medium truncate">Total Pengadaan</p>
              <div className="flex items-baseline gap-1.5 truncate">
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {formatCurrency(supplier.totalValue || 0)}
                </span>
                <span className="text-[10px] text-slate-400">
                  ({supplier.totalPurchases || 0} faktur)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                className="min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-400 active:scale-95 transition-transform"
                onClick={() => onDetail(supplier)}
                aria-label={`Detail supplier ${supplier.name}`}
                title="Lihat Detail Supplier"
              >
                <Eye size={16} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 active:scale-95 transition-transform"
                onClick={(e) => onEdit(supplier, e)}
                aria-label={`Ubah supplier ${supplier.name}`}
                title="Edit Supplier"
              >
                <Edit2 size={16} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 active:scale-95 transition-transform"
                onClick={(e) => onDelete(supplier, e)}
                aria-label={`Nonaktifkan supplier ${supplier.name}`}
                title="Nonaktifkan Supplier"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

CoopSupplierMobileDeck.displayName = 'CoopSupplierMobileDeck';
export default CoopSupplierMobileDeck;
