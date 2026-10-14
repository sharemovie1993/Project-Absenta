import React from 'react';
import { DollarSign, ShoppingCart, TrendingUp, Coins } from 'lucide-react';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';

export interface SalesSummaryData {
  totalSales: number;
  totalTransactions: number;
  avgBasketSize: number;
  totalItemsSold: number;
  totalEstimatedGrossProfit: number;
  grossProfitMarginPct: number;
  paymentBreakdown: {
    CASH: { total: number; count: number };
    SAVING: { total: number; count: number };
    OTHER: { total: number; count: number };
  };
}

interface SalesReportKpiCardsProps {
  summary: SalesSummaryData;
}

export const SalesReportKpiCards: React.FC<SalesReportKpiCardsProps> = React.memo(({ summary }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <AnalyticsCard
        title="Total Omset Penjualan"
        value={`Rp ${Math.round(summary.totalSales).toLocaleString('id-ID')}`}
        icon={<DollarSign size={24} />}
        gradient="from-indigo-600 to-indigo-800 text-white border-indigo-500/30"
        subtitle={`${summary.totalItemsSold.toLocaleString('id-ID')} unit barang terjual`}
      />
      <AnalyticsCard
        title="Total Transaksi Kasir"
        value={`${summary.totalTransactions.toLocaleString('id-ID')} Struk`}
        icon={<ShoppingCart size={24} />}
        gradient="from-blue-600 to-blue-800 text-white border-blue-500/30"
        subtitle={`Rata-rata: Rp ${Math.round(summary.avgBasketSize).toLocaleString('id-ID')} / struk`}
      />
      <AnalyticsCard
        title="Estimasi Laba Kotor"
        value={`Rp ${Math.round(summary.totalEstimatedGrossProfit).toLocaleString('id-ID')}`}
        icon={<TrendingUp size={24} />}
        gradient="from-emerald-600 to-emerald-800 text-white border-emerald-500/30"
        subtitle={`Margin Laba: ${summary.grossProfitMarginPct}% dari omset`}
      />
      <AnalyticsCard
        title="Kas Fisik Tunai (Kasir)"
        value={`Rp ${Math.round(summary.paymentBreakdown?.CASH?.total || 0).toLocaleString('id-ID')}`}
        icon={<Coins size={24} />}
        gradient="from-amber-600 to-amber-800 text-white border-amber-500/30"
        subtitle={`Cashless: Rp ${Math.round(summary.paymentBreakdown?.SAVING?.total || 0).toLocaleString('id-ID')}`}
      />
    </div>
  );
});

SalesReportKpiCards.displayName = 'SalesReportKpiCards';
export default SalesReportKpiCards;
