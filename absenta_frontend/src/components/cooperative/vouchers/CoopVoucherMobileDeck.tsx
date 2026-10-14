import React from 'react';
import { Tag, Trash2, Calendar, Ticket } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatDate } from '@/utils/date.utils';
import type { Voucher } from '../../../pages/cooperative/Vouchers';

interface CoopVoucherMobileDeckProps {
  vouchers: Voucher[];
  loading: boolean;
  hasManageAccess: boolean;
  onDelete: (id: string) => void;
}

export const CoopVoucherMobileDeck: React.FC<CoopVoucherMobileDeckProps> = React.memo(({
  vouchers,
  loading,
  hasManageAccess,
  onDelete,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-2">
        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 dark:text-slate-400">Memuat data voucher...</p>
      </div>
    );
  }

  if (!vouchers || vouchers.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
        <Ticket size={36} className="mx-auto opacity-30 text-slate-400" />
        <p>Belum ada voucher promo aktif.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full max-w-full min-w-0">
      {vouchers.map((voucher) => (
        <div
          key={voucher.id}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs space-y-3 w-full max-w-full min-w-0 transition-all"
        >
          {/* Header Card: Code & Nominal Diskon */}
          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-xl border border-blue-200 dark:border-blue-800/60 truncate">
                {voucher.code}
              </span>
            </div>

            <div className="text-right shrink-0">
              <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 block">
                Rp {Number(voucher.discount).toLocaleString('id-ID')}
              </span>
              <span className="text-[10px] text-slate-400">Potongan Belanja</span>
            </div>
          </div>

          {/* Description */}
          {voucher.description && (
            <p className="text-xs text-slate-600 dark:text-slate-300 break-words line-clamp-2">
              {voucher.description}
            </p>
          )}

          {/* Footer Card: Valid Until & Delete Button (WCAG 44x44px Touch Target) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs min-w-0">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 min-w-0 flex-1">
              <Calendar size={13} className="shrink-0 text-slate-400" />
              <span className="text-[11px] truncate">
                {voucher.validUntil ? `Berlaku s/d ${formatDate(voucher.validUntil)}` : 'Berlaku Selamanya'}
              </span>
            </div>

            {hasManageAccess && (
              <div className="shrink-0 pl-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 active:scale-95 transition-transform"
                  onClick={() => onDelete(voucher.id)}
                  aria-label={`Hapus voucher ${voucher.code}`}
                  title="Hapus Voucher"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

CoopVoucherMobileDeck.displayName = 'CoopVoucherMobileDeck';
export default CoopVoucherMobileDeck;
