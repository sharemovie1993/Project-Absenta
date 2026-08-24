import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axiosInstance';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Search, Plus, Trash2, Check } from 'lucide-react';
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

interface TempStockInItem {
  product: Product;
  quantity: number;
  costPrice: number;
}

interface AxiosErrorLike {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
}

interface ProductStockInTabProps {
  products: Product[];
  fetchProducts: () => Promise<void>;
  setActiveTab: (tab: 'catalog' | 'stock-in' | 'history' | 'categories' | 'opname') => void;
}

export const ProductStockInTab = React.memo<ProductStockInTabProps>(({
  products,
  fetchProducts,
  setActiveTab
}) => {
  const queryClient = useQueryClient();
  // Stock-In states
  const [stockInSupplier, setStockInSupplier] = useState('');
  const [stockInNotes, setStockInNotes] = useState('');
  const [stockInPaymentMethod, setStockInPaymentMethod] = useState<'CASH' | 'CREDIT'>('CASH');
  const [selectedStockInItems, setSelectedStockInItems] = useState<TempStockInItem[]>([]);
  const [productSearchInput, setProductSearchInput] = useState('');
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [stockInShippingFee, setStockInShippingFee] = useState<number>(0);

  // Autocomplete products suggestion for Stock-In Tab
  const productSuggestions = useMemo(() => {
    if (!productSearchInput.trim()) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearchInput.toLowerCase()) || 
      p.code.toLowerCase().includes(productSearchInput.toLowerCase())
    ).slice(0, 5);
  }, [products, productSearchInput]);

  // Sync suggestion click outside close
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.suggestions-container') && !target.closest('.suggestions-input')) {
        setShowProductSuggestions(false);
      }
    };
    if (showProductSuggestions) {
      document.addEventListener('click', handleGlobalClick);
    }
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [showProductSuggestions]);

  const handleAddStockInItem = useCallback((product: Product) => {
    const alreadyExists = selectedStockInItems.find(item => item.product.id === product.id);
    if (alreadyExists) {
      setSelectedStockInItems(prev => 
        prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        )
      );
      toast.success(`${product.name} ditambah (+1)`);
    } else {
      setSelectedStockInItems(prev => [
        ...prev,
        {
          product,
          quantity: 1,
          costPrice: Number(product.costPrice || 0)
        }
      ]);
    }
    setProductSearchInput('');
    setShowProductSuggestions(false);
  }, [selectedStockInItems]);

  const handleStockInSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (productSuggestions.length > 0) {
        handleAddStockInItem(productSuggestions[0]);
      }
    }
  }, [productSuggestions, handleAddStockInItem]);

  const handleUpdateStockInItemQty = useCallback((productId: string, val: number) => {
    setSelectedStockInItems(prev => 
      prev.map(item => item.product.id === productId ? { ...item, quantity: val } : item)
    );
  }, []);

  const handleUpdateStockInItemPrice = useCallback((productId: string, val: number) => {
    setSelectedStockInItems(prev => 
      prev.map(item => item.product.id === productId ? { ...item, costPrice: val } : item)
    );
  }, []);

  const handleRemoveStockInItem = useCallback((productId: string) => {
    setSelectedStockInItems(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const totalStockInCost = useMemo(() => {
    return selectedStockInItems.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
  }, [selectedStockInItems]);

  const stockInGrandTotal = useMemo(() => {
    return totalStockInCost + (stockInShippingFee || 0);
  }, [totalStockInCost, stockInShippingFee]);

  const submitStockInMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/cooperative/toko/stock-in', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Penerimaan barang masuk berhasil disimpan');
      setStockInSupplier('');
      setStockInNotes('');
      setStockInPaymentMethod('CASH');
      setSelectedStockInItems([]);
      setStockInShippingFee(0);
      queryClient.invalidateQueries({ queryKey: ['koperasi-products-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['koperasi-stock-in-history'] });
      fetchProducts();
      setActiveTab('history');
    },
    onError: (error) => {
      const err = error as AxiosErrorLike;
      console.error(err);
      toast.error(err.response?.data?.message || 'Gagal menyimpan transaksi barang masuk');
    }
  });

  const stockInSubmitLoading = submitStockInMutation.isPending;

  const handleStockInSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStockInItems.length === 0) {
      toast.error('Pilih setidaknya 1 produk untuk diproses barang masuk');
      return;
    }

    const invalidItem = selectedStockInItems.find(item => item.quantity <= 0 || item.costPrice < 0);
    if (invalidItem) {
      toast.error(`Periksa kembali kuantitas dan harga beli produk "${invalidItem.product.name}"`);
      return;
    }

    const payload = {
      supplier: stockInSupplier.trim() || undefined,
      notes: stockInNotes.trim() || undefined,
      paymentMethod: stockInPaymentMethod,
      shippingFee: stockInShippingFee > 0 ? stockInShippingFee : undefined,
      items: selectedStockInItems.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        costPrice: item.costPrice
      }))
    };

    submitStockInMutation.mutate(payload);
  }, [selectedStockInItems, stockInSupplier, stockInNotes, stockInPaymentMethod, stockInShippingFee, submitStockInMutation]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Left Column: Form Autocomplete & Item List */}
      <div className="lg:col-span-2 space-y-6">
        <Card title="Pilih Produk Koperasi">
          <div className="space-y-4">
            <div className="relative suggestions-input">
              <label htmlFor="stock-in-search" className="block text-sm font-medium text-gray-700 mb-1">
                Cari Produk (Nama / Kode / Scan Barcode)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="stock-in-search"
                  type="text"
                  placeholder="Ketik nama produk atau scan barcode..."
                  value={productSearchInput}
                  onChange={(e) => {
                    setProductSearchInput(e.target.value);
                    setShowProductSuggestions(true);
                  }}
                  onKeyDown={handleStockInSearchKeyDown}
                  onFocus={() => setShowProductSuggestions(true)}
                  className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-white"
                  aria-label="Cari produk masuk"
                />
              </div>

              {/* Suggestions Panel */}
              {showProductSuggestions && productSuggestions.length > 0 && (
                <div className="absolute z-30 w-full mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto suggestions-container">
                  {(productSuggestions || []).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddStockInItem(p)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-gray-800 dark:text-slate-100 truncate">{p.name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Kode: {p.code} | Stok: {p.stock}</p>
                      </div>
                      <Plus size={16} className="text-blue-500 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card title="Daftar Barang yang Diterima">
          {selectedStockInItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              Belum ada produk yang ditambahkan. Gunakan kolom pencarian di atas.
            </div>
          ) : (
            <div className="overflow-x-auto w-full min-w-0 max-w-full">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-800/60">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Barang</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase w-28">Kuantitas</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase w-40">Modal Beli</th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase w-36">Subtotal</th>
                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 dark:text-slate-400 uppercase w-12"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {(selectedStockInItems || []).map((item) => (
                    <tr key={item.product.id}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-800">{item.product.name}</p>
                        <p className="text-xs text-gray-400">Kode: {item.product.code}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          id={`qty-${item.product.id}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateStockInItemQty(item.product.id, Math.max(1, parseInt(e.target.value) || 0))}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-sm bg-white"
                          aria-label={`Jumlah ${item.product.name}`}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                            <span className="text-gray-400 text-xs">Rp</span>
                          </div>
                          <input
                            id={`cost-${item.product.id}`}
                            type="number"
                            min="0"
                            value={item.costPrice}
                            onChange={(e) => handleUpdateStockInItemPrice(item.product.id, Math.max(0, parseFloat(e.target.value) || 0))}
                            className="pl-7 pr-2 py-1 w-36 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-sm bg-white"
                            aria-label={`Harga modal ${item.product.name}`}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-700">
                        Rp {(item.quantity * item.costPrice).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => handleRemoveStockInItem(item.product.id)}
                          className="text-red-600 hover:text-red-900 transition-colors p-1"
                          aria-label={`Hapus ${item.product.name} dari transaksi`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Right Column: Metadata vendor & payment */}
      <div className="space-y-6">
        <Card title="Ringkasan Transaksi">
          <form onSubmit={handleStockInSubmit} className="space-y-4">
            <Input
              id="stock-in-supplier"
              label="Supplier / Vendor"
              placeholder="Masukkan nama supplier (opsional)..."
              value={stockInSupplier}
              onChange={(e) => setStockInSupplier(e.target.value)}
              aria-label="Nama Supplier"
            />
            
            <div>
              <label htmlFor="stock-in-notes" className="block text-sm font-medium text-gray-700 mb-1">
                Catatan Transaksi
              </label>
              <textarea
                id="stock-in-notes"
                rows={3}
                placeholder="Info tambahan e.g. nomor faktur..."
                value={stockInNotes}
                onChange={(e) => setStockInNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-white"
                aria-label="Catatan Transaksi"
              />
            </div>

            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">
                Metode Pembayaran
              </span>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input
                    id="pm-cash"
                    type="radio"
                    name="paymentMethod"
                    value="CASH"
                    checked={stockInPaymentMethod === 'CASH'}
                    onChange={() => setStockInPaymentMethod('CASH')}
                    className="text-blue-600 focus:ring-blue-500 h-4 w-4 bg-white"
                  />
                  <span>Tunai (CASH)</span>
                </label>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input
                    id="pm-credit"
                    type="radio"
                    name="paymentMethod"
                    value="CREDIT"
                    checked={stockInPaymentMethod === 'CREDIT'}
                    onChange={() => setStockInPaymentMethod('CREDIT')}
                    className="text-blue-600 focus:ring-blue-500 h-4 w-4 bg-white"
                  />
                  <span>Kredit (CREDIT)</span>
                </label>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 mt-4">
              {/* Ongkos Kirim Input */}
              <div className="mb-4">
                <label htmlFor="stock-in-shipping-fee" className="block text-sm font-medium text-gray-700 mb-1">
                  Ongkos Kirim / Biaya Tambahan
                  <span className="ml-1 text-xs text-gray-400 font-normal">(opsional)</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-xs font-semibold">Rp</span>
                  </div>
                  <input
                    id="stock-in-shipping-fee"
                    type="number"
                    min="0"
                    step="1000"
                    value={stockInShippingFee || ''}
                    onChange={(e) => setStockInShippingFee(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                    aria-label="Ongkos Kirim"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Dicatat sebagai Beban Operasional (akun 5020). Tidak menambah harga modal produk.</p>
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-1.5 mb-4 bg-slate-50 rounded-lg p-3 border border-gray-100">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Total Produk:</span>
                  <span className="font-semibold text-gray-700">Rp {totalStockInCost.toLocaleString('id-ID')}</span>
                </div>
                {stockInShippingFee > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Ongkos Kirim:</span>
                    <span className="font-semibold text-orange-600">Rp {stockInShippingFee.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1.5 border-t border-gray-200">
                  <span className="text-sm font-bold text-gray-600">Total Pembayaran:</span>
                  <span className="text-xl font-black text-green-600">
                    Rp {stockInGrandTotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
              
              <Button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-all flex items-center justify-center space-x-2"
                isLoading={stockInSubmitLoading}
              >
                <Check size={18} />
                <span>Simpan Transaksi</span>
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
});

ProductStockInTab.displayName = 'ProductStockInTab';

export default ProductStockInTab;
