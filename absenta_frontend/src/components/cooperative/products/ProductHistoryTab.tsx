import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axiosInstance';
import { Button } from '../ui/Button';
import { Search, Calendar, Info, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

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
  activeTab: 'catalog' | 'stock-in' | 'history' | 'categories' | 'opname';
}

export const ProductHistoryTab = React.memo<ProductHistoryTabProps>(({ activeTab }) => {
  const queryClient = useQueryClient();
  const [historySupplierFilter, setHistorySupplierFilter] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ['koperasi-stock-in-history', historySupplierFilter, historyStartDate, historyEndDate],
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

  const historyList = historyQuery.data || [];
  const historyLoading = historyQuery.isLoading;
  const fetchHistory = async () => {
    await historyQuery.refetch();
  };

  return (
    <div className="space-y-4">
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
      ) : historyList.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 text-gray-500 text-sm">
          Tidak ada riwayat penerimaan barang masuk ditemukan.
        </div>
      ) : (
        <div className="space-y-4">
          {(historyList || []).map((tx) => {
            const isExpanded = expandedTxId === tx.id;
            const totalCost = (tx.items || []).reduce((sum, item) => sum + (item.quantity * Number(item.costPrice)), 0) || 0;
            
            return (
              <div 
                key={tx.id}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-gray-200 dark:border-slate-800 overflow-hidden"
              >
                {/* Transaction Header bar (Responsive for Mobile & Desktop) */}
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
                    {/* Payment Method badge */}
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

                {/* Expanded items list details */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 bg-slate-50 border-t border-gray-100">
                    {tx.notes && (
                      <div className="mb-4 text-xs text-gray-600 bg-white p-3 rounded-lg border border-gray-100 flex items-start space-x-2">
                        <Info size={14} className="text-blue-500 mt-0.5" />
                        <p><strong>Catatan:</strong> {tx.notes}</p>
                      </div>
                    )}

                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Barang</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Jumlah</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Modal Beli</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {(tx.items || []).map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="px-4 py-2.5">
                                <p className="text-sm font-semibold text-gray-800">{item.Product?.name || 'Produk Dihapus'}</p>
                                <p className="text-xs text-gray-400">Kode: {item.Product?.code || '-'}</p>
                              </td>
                              <td className="px-4 py-2.5 text-center text-sm font-semibold text-gray-700">{item.quantity} pcs</td>
                              <td className="px-4 py-2.5 text-right text-sm text-gray-600">Rp {Number(item.costPrice).toLocaleString('id-ID')}</td>
                              <td className="px-4 py-2.5 text-right text-sm font-bold text-gray-800">
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
  );
});

ProductHistoryTab.displayName = 'ProductHistoryTab';

export default ProductHistoryTab;
