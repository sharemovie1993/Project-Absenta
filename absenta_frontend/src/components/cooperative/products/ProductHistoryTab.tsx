import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axiosInstance';
import { Button } from '../ui/Button';
import { 
  Search, 
  Calendar, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Truck, 
  Clock, 
  CreditCard, 
  Package,
  RotateCcw
} from 'lucide-react';
import { COOP_QUERY_KEYS } from '../../../lib/coopQueryKeys';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, subDays, isAfter } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface Product {
  id: string;
  code: string;
  name: string;
  price: string;
  costPrice: string;
  stock: number;
  category: string;
}

interface StockInItem {
  id: string;
  stockInId: string;
  productId: string;
  quantity: number;
  costPrice: string;
  Product?: Product;
}

interface StockIn {
  id: string;
  tenantId: string;
  date: string;
  supplier: string | null;
  notes: string | null;
  paymentMethod: string;
  shippingFee?: string | number;
  operatorId: string | null;
  items?: StockInItem[];
}

interface ProductHistoryTabProps {
  activeTab: 'catalog' | 'inventory' | 'stock-in' | 'history' | 'categories' | 'opname';
}

export const ProductHistoryTab = React.memo<ProductHistoryTabProps>(({ activeTab }) => {
  const queryClient = useQueryClient();
  const [historySupplierFilter, setHistorySupplierFilter] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // Mobile date filter: 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'ALL'
  const [dateFilter, setDateFilter] = useState<'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'ALL'>('ALL');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');

  const historyQuery = useQuery({
    queryKey: COOP_QUERY_KEYS.stockInHistory(historySupplierFilter, historyStartDate, historyEndDate),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (historySupplierFilter) params.supplier = historySupplierFilter;
      if (historyStartDate) params.startDate = historyStartDate;
      if (historyEndDate) params.endDate = historyEndDate;

      const response = await api.get('/cooperative/toko/stock-in', { params });
      return (Array.isArray(response.data) ? response.data : []) as StockIn[];
    },
    enabled: activeTab === 'history',
    staleTime: 5 * 60 * 1000,
  });

  const rawHistoryList = useMemo(() => historyQuery.data || [], [historyQuery.data]);
  const historyLoading = historyQuery.isLoading;

  const fetchHistory = async () => {
    await historyQuery.refetch();
  };

  // Mobile filtered history list
  const filteredHistoryList = useMemo(() => {
    return rawHistoryList.filter(tx => {
      // 1. Date Filter
      if (dateFilter !== 'ALL') {
        const txDate = new Date(tx.date);
        if (dateFilter === 'TODAY' && !isToday(txDate)) return false;
        if (dateFilter === 'YESTERDAY' && !isYesterday(txDate)) return false;
        if (dateFilter === 'LAST_7_DAYS' && !isAfter(txDate, subDays(new Date(), 7))) return false;
        if (dateFilter === 'THIS_MONTH') {
          const now = new Date();
          if (txDate.getMonth() !== now.getMonth() || txDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      // 2. Search Query (Supplier or Item names)
      if (mobileSearchQuery.trim()) {
        const q = mobileSearchQuery.toLowerCase().trim();
        const supplierMatch = (tx.supplier || '').toLowerCase().includes(q);
        const notesMatch = (tx.notes || '').toLowerCase().includes(q);
        const itemMatch = (tx.items || []).some(
          it => (it.Product?.name || '').toLowerCase().includes(q) || (it.Product?.code || '').toLowerCase().includes(q)
        );
        if (!supplierMatch && !notesMatch && !itemMatch) return false;
      }

      return true;
    });
  }, [rawHistoryList, dateFilter, mobileSearchQuery]);

  const dateFilterLabel = useMemo(() => {
    const todayStr = format(new Date(), 'dd MMM yyyy', { locale: localeId });
    switch (dateFilter) {
      case 'TODAY':
        return `Today (${todayStr})`;
      case 'YESTERDAY':
        return `Kemarin (${format(subDays(new Date(), 1), 'dd MMM yyyy', { locale: localeId })})`;
      case 'LAST_7_DAYS':
        return '7 Hari Terakhir';
      case 'THIS_MONTH':
        return `Bulan Ini (${format(new Date(), 'MMMM yyyy', { locale: localeId })})`;
      case 'ALL':
      default:
        return 'Semua Riwayat Pembelian';
    }
  }, [dateFilter]);

  // Helper 2-letter Initials
  const getInitials = (name: string) => {
    if (!name) return 'SP';
    const words = name.trim().split(' ').filter(Boolean);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* ──────────────────────────────────────────────────────────────────────
          MOBILE VIEW (Kasir Pintar Persona: Date Dropdown + Search + Cards)
          ────────────────────────────────────────────────────────────────────── */}
      <div className="lg:hidden space-y-3">
        {/* 1. Date Picker Selector Dropdown */}
        <div className="relative pt-1">
          <button
            type="button"
            onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-xs font-semibold text-slate-800 dark:text-slate-100 active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
              <Calendar size={18} />
              <span className="text-slate-800 dark:text-slate-200 font-bold">{dateFilterLabel}</span>
            </div>
            <ChevronDown size={18} className={cn("text-slate-400 transition-transform", isDatePickerOpen && "rotate-180")} />
          </button>

          {isDatePickerOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-2 space-y-1">
              {[
                { key: 'ALL', label: 'Semua Riwayat' },
                { key: 'TODAY', label: 'Hari Ini (Today)' },
                { key: 'YESTERDAY', label: 'Kemarin' },
                { key: 'LAST_7_DAYS', label: '7 Hari Terakhir' },
                { key: 'THIS_MONTH', label: 'Bulan Ini' }
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setDateFilter(opt.key as any);
                    setIsDatePickerOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors",
                    dateFilter === opt.key 
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold" 
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. Mobile Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Cari supplier atau nama barang..."
            value={mobileSearchQuery}
            onChange={(e) => setMobileSearchQuery(e.target.value)}
            className="w-full h-11 pl-4 pr-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
        </div>

        {/* 3. Mobile Card List */}
        {historyLoading ? (
          <div className="text-center py-20 text-slate-400 text-xs animate-pulse">
            Memuat riwayat barang masuk...
          </div>
        ) : filteredHistoryList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-slate-400 dark:text-slate-500 font-medium text-sm">
              Belum ada Riwayat Pembelian Tercatat
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistoryList.map(tx => {
              const isExpanded = expandedTxId === tx.id;
              const totalItemsCount = (tx.items || []).reduce((sum, it) => sum + it.quantity, 0);
              const totalCost = (tx.items || []).reduce((sum, item) => sum + (item.quantity * Number(item.costPrice)), 0) || 0;
              const grandTotal = totalCost + Number(tx.shippingFee || 0);

              return (
                <div
                  key={tx.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-all"
                >
                  <div
                    onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                    className="p-4 space-y-3 cursor-pointer active:bg-slate-50/70 dark:active:bg-slate-800/40"
                  >
                    {/* Top Bar: Supplier & Payment */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0 border border-emerald-100 dark:border-emerald-900">
                          {getInitials(tx.supplier || 'Vendor')}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                            {tx.supplier || 'Supplier Langsung'}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Clock size={12} />
                            <span>{format(new Date(tx.date), 'dd MMM yyyy, HH:mm', { locale: localeId })}</span>
                          </div>
                        </div>
                      </div>

                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold",
                        tx.paymentMethod === 'CREDIT' 
                          ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      )}>
                        {tx.paymentMethod === 'CREDIT' ? 'TEMPO' : tx.paymentMethod}
                      </span>
                    </div>

                    {/* Middle Info: Summary & Total */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Package size={14} className="text-slate-400" />
                        <span>{tx.items?.length || 0} SKU ({totalItemsCount} pcs)</span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">Total Pasokan</span>
                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                          Rp {grandTotal.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Items Breakdown */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                      {tx.notes && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-1.5">
                          <Info size={13} className="text-blue-500 mt-0.5 shrink-0" />
                          <span><strong>Catatan:</strong> {tx.notes}</span>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        {(tx.items || []).map(item => (
                          <div
                            key={item.id}
                            className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-bold text-slate-800 dark:text-slate-200 truncate text-[11px]">
                                {item.Product?.name || 'Produk'}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {item.quantity} pcs × Rp {Number(item.costPrice).toLocaleString('id-ID')}
                              </p>
                            </div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 shrink-0 text-xs">
                              Rp {(item.quantity * Number(item.costPrice)).toLocaleString('id-ID')}
                            </span>
                          </div>
                        ))}
                      </div>

                      {Number(tx.shippingFee || 0) > 0 && (
                        <div className="flex justify-between items-center text-xs text-orange-600 px-1 pt-1 font-semibold">
                          <span>Ongkos Kirim:</span>
                          <span>Rp {Number(tx.shippingFee).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────────────────
          DESKTOP VIEW (Full Table & Filters)
          ────────────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:block space-y-4">
        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-gray-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label htmlFor="history-supplier-filter" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Supplier</label>
            <input
              id="history-supplier-filter"
              type="text"
              placeholder="Nama vendor..."
              value={historySupplierFilter}
              onChange={(e) => setHistorySupplierFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="history-start-date" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Mulai</label>
            <input
              id="history-start-date"
              type="date"
              value={historyStartDate}
              onChange={(e) => setHistoryStartDate(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="history-end-date" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Selesai</label>
            <input
              id="history-end-date"
              type="date"
              value={historyEndDate}
              onChange={(e) => setHistoryEndDate(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={fetchHistory}
              className="flex-1"
              icon={<Search size={16} />}
              isLoading={historyLoading}
            >
              Filter
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setHistorySupplierFilter('');
                setHistoryStartDate('');
                setHistoryEndDate('');
                queryClient.invalidateQueries({ queryKey: ['koperasi-stock-in-history'] });
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        {/* History list */}
        {historyLoading ? (
          <div className="text-center py-12 text-gray-500">Loading riwayat...</div>
        ) : rawHistoryList.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 text-gray-500 text-sm">
            Tidak ada riwayat penerimaan barang masuk ditemukan.
          </div>
        ) : (
          <div className="space-y-4">
            {(rawHistoryList || []).map((tx) => {
              const isExpanded = expandedTxId === tx.id;
              const totalCost = (tx.items || []).reduce((sum, item) => sum + (item.quantity * Number(item.costPrice)), 0) || 0;
              
              return (
                <div 
                  key={tx.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-gray-200 dark:border-slate-800 overflow-hidden"
                >
                  <div 
                    onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                    className="p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex items-center space-x-3 w-full sm:w-auto">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <Calendar size={18} className="text-slate-500 dark:text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-800 dark:text-slate-100 text-xs sm:text-sm">
                          {new Date(tx.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Supplier: <span className="font-semibold text-gray-700 dark:text-slate-300">{tx.supplier || 'Tidak Ada'}</span></p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <span className={`px-2.5 py-1 text-[11px] font-black rounded-full shrink-0 ${
                        tx.paymentMethod === 'CREDIT' 
                          ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800' 
                          : 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                      }`}>
                        {tx.paymentMethod}
                      </span>
                      
                      <div className="text-right">
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Total</p>
                        <p className="font-black text-green-600 dark:text-green-400 text-sm sm:text-base">
                          Rp {(totalCost + Number(tx.shippingFee || 0)).toLocaleString('id-ID')}
                        </p>
                        {Number(tx.shippingFee || 0) > 0 && (
                          <p className="text-[9px] text-orange-500 font-semibold">+ Ongkir Rp {Number(tx.shippingFee).toLocaleString('id-ID')}</p>
                        )}
                      </div>

                      <div className="shrink-0 p-1">
                        {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 bg-slate-50 dark:bg-slate-950/40 border-t border-gray-100 dark:border-slate-800">
                      {tx.notes && (
                        <div className="mb-4 text-xs text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-lg border border-gray-100 dark:border-slate-800 flex items-start space-x-2">
                          <Info size={14} className="text-blue-500 mt-0.5" />
                          <p><strong>Catatan:</strong> {tx.notes}</p>
                        </div>
                      )}

                      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                          <thead className="bg-slate-100 dark:bg-slate-950">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase">Barang</th>
                              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase">Jumlah</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase">Modal Beli</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-100 dark:divide-slate-800">
                            {(tx.items || []).map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="px-4 py-2.5">
                                  <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{item.Product?.name || 'Produk Dihapus'}</p>
                                  <p className="text-xs text-gray-400 font-mono">Kode: {item.Product?.code || '-'}</p>
                                </td>
                                <td className="px-4 py-2.5 text-center text-sm font-semibold text-gray-700 dark:text-slate-300">{item.quantity} pcs</td>
                                <td className="px-4 py-2.5 text-right text-sm text-gray-600 dark:text-slate-400">Rp {Number(item.costPrice).toLocaleString('id-ID')}</td>
                                <td className="px-4 py-2.5 text-right text-sm font-bold text-gray-800 dark:text-slate-100">
                                  Rp {(item.quantity * Number(item.costPrice)).toLocaleString('id-ID')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

ProductHistoryTab.displayName = 'ProductHistoryTab';

export default ProductHistoryTab;
