import React from 'react';
import { Receipt, Calendar, ShoppingCart, Award, Eye, Coins, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatDate } from '@/utils/date.utils';

export interface MobileSaleTransaction {
  id: string;
  date: string;
  total: number;
  paymentMethod: string;
  itemCount: number;
  customerName: string;
  customerIdentifier: string;
}

export interface MobileTopProduct {
  productId: string;
  code: string;
  name: string;
  category: string;
  unitPrice: number;
  qtySold: number;
  totalRevenue: number;
  estimatedGrossProfit: number;
  marginPct: number;
}

export interface MobileDailySales {
  date: string;
  transactionCount: number;
  cashTotal: number;
  savingTotal: number;
  grandTotal: number;
  totalItems: number;
}

interface CoopSalesReportMobileDeckProps {
  activeTab: 'transactions' | 'top-products' | 'daily';
  transactions: MobileSaleTransaction[];
  topProducts: MobileTopProduct[];
  dailySales: MobileDailySales[];
  loading: boolean;
  onOpenReceipt: (saleId: string) => void;
}

export const CoopSalesReportMobileDeck: React.FC<CoopSalesReportMobileDeckProps> = React.memo(({
  activeTab,
  transactions,
  topProducts,
  dailySales,
  loading,
  onOpenReceipt
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-2">
        <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 dark:text-slate-400">Memuat data laporan penjualan...</p>
      </div>
    );
  }

  // ── Tab 1: Daftar Transaksi / Struk Kasir ──
  if (activeTab === 'transactions') {
    if (!transactions || transactions.length === 0) {
      return (
        <div className="p-8 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
          <Receipt size={36} className="mx-auto opacity-30 text-slate-400" />
          <p>Belum ada transaksi penjualan pada rentang tanggal ini.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 w-full max-w-full min-w-0">
        {transactions.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs space-y-3 w-full max-w-full min-w-0"
          >
            {/* Header: ID Struk & Tanggal */}
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 block truncate">
                  #{item.id.substring(0, 8)}...
                </span>
                <span className="text-[11px] text-slate-400 block">
                  {formatDate(item.date)}
                </span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                item.paymentMethod === 'CASH'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200'
                  : item.paymentMethod === 'SAVING'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}>
                {item.paymentMethod === 'CASH' ? 'Tunai' : (item.paymentMethod === 'SAVING' ? 'Simpanan' : item.paymentMethod)}
              </span>
            </div>

            {/* Pelanggan & Unit Item */}
            <div className="text-xs space-y-0.5 min-w-0">
              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {item.customerName}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {item.itemCount} unit belanja
              </p>
            </div>

            {/* Footer: Total Belanja & Tombol Lihat Struk (WCAG 44x44px) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between min-w-0">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-400 block">Total Transaksi</span>
                <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate block">
                  Rp {Math.round(item.total).toLocaleString('id-ID')}
                </span>
              </div>

              <div className="shrink-0 pl-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenReceipt(item.id)}
                  className="min-w-[44px] min-h-[44px] px-3 flex items-center justify-center gap-1.5 rounded-xl text-indigo-600 dark:text-indigo-400 border-indigo-200 hover:bg-indigo-50 active:scale-95 transition-transform"
                  aria-label={`Lihat struk ${item.id}`}
                  title="Lihat Struk"
                >
                  <Eye size={15} />
                  <span className="text-xs font-semibold">Struk</span>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Tab 2: Produk Terlaris (Top Products) ──
  if (activeTab === 'top-products') {
    if (!topProducts || topProducts.length === 0) {
      return (
        <div className="p-8 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
          <Award size={36} className="mx-auto opacity-30 text-slate-400" />
          <p>Belum ada data produk terjual pada rentang tanggal ini.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 w-full max-w-full min-w-0">
        {topProducts.map((prod, idx) => (
          <div
            key={prod.productId}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs space-y-2.5 w-full max-w-full min-w-0"
          >
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black shrink-0 ${
                  idx === 0 ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                  idx === 1 ? 'bg-slate-200 text-slate-700' :
                  idx === 2 ? 'bg-amber-50 text-amber-800' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                    {prod.name}
                  </h4>
                  <span className="font-mono text-[10px] text-slate-400 truncate block">
                    {prod.code} • {prod.category}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400 block">
                  {prod.qtySold.toLocaleString('id-ID')} unit
                </span>
                <span className="text-[10px] text-slate-400">Terjual</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Kontribusi Omset</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Rp {Math.round(prod.totalRevenue).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Estimasi Laba</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Rp {Math.round(prod.estimatedGrossProfit).toLocaleString('id-ID')}
                </span>
                <span className="text-[9px] text-emerald-500 block">
                  ({prod.marginPct}% Margin)
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Tab 3: Rekap Harian (Daily Z-Report) ──
  if (!dailySales || dailySales.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
        <Calendar size={36} className="mx-auto opacity-30 text-slate-400" />
        <p>Belum ada data rekap penjualan harian pada rentang tanggal ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full max-w-full min-w-0">
      {dailySales.map((day) => (
        <div
          key={day.date}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs space-y-2.5 w-full max-w-full min-w-0"
        >
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Calendar size={14} className="text-indigo-500 shrink-0" />
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                {formatDate(day.date)}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 shrink-0">
              {day.transactionCount} transaksi
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-semibold">Tunai (Kasir)</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">
                Rp {Math.round(day.cashTotal).toLocaleString('id-ID')}
              </span>
            </div>

            <div className="bg-blue-50/60 dark:bg-blue-950/20 p-2 rounded-xl border border-blue-100 dark:border-blue-900/40">
              <span className="text-[10px] text-blue-700 dark:text-blue-400 block font-semibold">Potong Simpanan</span>
              <span className="font-bold text-blue-700 dark:text-blue-300">
                Rp {Math.round(day.savingTotal).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400">Total Omset Harian</span>
            <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              Rp {Math.round(day.grandTotal).toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
});

CoopSalesReportMobileDeck.displayName = 'CoopSalesReportMobileDeck';
export default CoopSalesReportMobileDeck;
