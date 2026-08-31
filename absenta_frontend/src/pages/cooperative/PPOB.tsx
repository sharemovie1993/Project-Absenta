import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/axiosInstance';
import { Button } from '../../components/cooperative/ui/Button';
import { Input } from '../../components/cooperative/ui/Input';
import { Smartphone, Zap, Wifi, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import useConfirm from '../../hooks/useConfirm';
import { useModuleAccess } from '../../hooks/useModuleAccess';

// Lazy load komponen berat
const Card = lazy(() => import('../../components/cooperative/ui/Card').then(m => ({ default: m.Card })));

const ppobPurchaseSchema = z.object({
  productId: z.string().min(1, 'Produk wajib dipilih'),
  customerNo: z.string().min(4, 'Nomor tujuan / ID pelanggan minimal 4 karakter').max(50),
  amount: z.number().positive('Nominal pembayaran tidak valid'),
});

interface PPOBProduct {
  id: string;
  code: string;
  name: string;
  provider: string;
  type: string;
  price: number;
}

interface CategoryButtonProps {
  type: string;
  icon: React.ComponentType<{ size: number }>;
  label: string;
  colorClass: string;
  selectedType: string;
  onSelect: (type: string) => void;
}

const CategoryButton: React.FC<CategoryButtonProps> = ({ type, icon: Icon, label, colorClass, selectedType, onSelect }) => (
  <button
    onClick={() => onSelect(type)}
    className={`p-4 rounded-xl flex flex-col items-center justify-center space-y-2 border transition-all w-full min-w-0 ${
      selectedType === type
      ? `${colorClass} border-current ring-2 ring-offset-2 ring-current ring-opacity-50`
      : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600'
    }`}
    aria-label={`Pilih kategori ${label}`}
  >
    <Icon size={32} />
    <span className="font-medium truncate max-w-full">{label}</span>
  </button>
);

const PPOB: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const { subscription } = useAuthStore();
  const confirm = useConfirm();
  const [selectedType, setSelectedType] = useState<string>('PULSA');
  const [customerNo, setCustomerNo] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<PPOBProduct | null>(null);

  // Gating Logic menggunakan useModuleAccess (Pilar Lisensi Hardening)
  const { isLocked } = useModuleAccess('KOPERASI');

  const ppobQuery = useQuery({
    queryKey: ['koperasi-ppob-services'],
    queryFn: async () => {
      const response = await api.get('/cooperative/ppob');
      return (response.data.data ?? []) as PPOBProduct[];
    },
    enabled: subscription !== undefined,
    staleTime: 5 * 60 * 1000,
  });

  const products = ppobQuery.data || [];
  const loading = ppobQuery.isLoading;

  const fetchProducts = useCallback(async () => {
    await ppobQuery.refetch();
  }, [ppobQuery]);

  const handleTypeSelect = useCallback((type: string) => {
    setSelectedType(type);
    setSelectedProduct(null);
  }, []);

  const purchaseMutation = useMutation({
    mutationFn: async (payload: { productId: string; customerNo: string; amount: number }) => {
      const res = await api.post('/cooperative/ppob/transaction', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Pembelian berhasil! Saldo anggota telah dipotong.');
      setCustomerNo('');
      setSelectedProduct(null);
      queryClient.invalidateQueries({ queryKey: ['koperasi-savings-list'] });
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(errorMsg ?? 'Pembelian gagal');
    }
  });

  const processing = purchaseMutation.isPending;

  const handlePurchase = useCallback(async () => {
    if (!selectedProduct || isLocked) return;
    const parsed = ppobPurchaseSchema.safeParse({
      productId: selectedProduct.id,
      customerNo,
      amount: selectedProduct.price
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Data transaksi tidak valid');
      return;
    }

    const ok = await confirm({
      title: 'Konfirmasi Pembelian',
      description: `Beli ${selectedProduct.name} seharga Rp ${Number(selectedProduct.price).toLocaleString('id-ID')}?`,
      confirmText: 'Bayar',
      style: 'primary'
    });
    if (!ok) return;

    await purchaseMutation.mutateAsync({
      productId: parsed.data.productId,
      customerNo: parsed.data.customerNo,
      amount: parsed.data.amount
    });
  }, [selectedProduct, isLocked, confirm, customerNo, purchaseMutation]);

  const filteredProducts = useMemo(() => selectedType === 'ALL'
    ? (products ?? [])
    : (products ?? []).filter(p => p.type === selectedType), [products, selectedType]);

  const breadcrumbs = useMemo(() => [
    { label: 'Koperasi', href: '/cooperative' },
    { label: 'Layanan PPOB' }
  ], []);

  return (
    <PremiumFeatureGate
      isLocked={isLocked}
      moduleName="KOPERASI"
      featureName="Layanan PPOB"
    >
      <AcademicPageLayout
        title="Layanan PPOB"
        description="Pembelian pulsa, token listrik, dan tagihan lainnya"
        hardeningModuleKey="coop_ppob"
        breadcrumbs={breadcrumbs}
        instruction={{
          title: 'Panduan Layanan PPOB',
          description: 'PPOB (Payment Point Online Bank) memungkinkan pembelian pulsa, token listrik, paket data, dan layanan lainnya langsung dari saldo koperasi.',
          items: [
            { text: 'Pilih kategori produk: Pulsa & Data, Token Listrik, Internet, atau Lainnya.' },
            { text: 'Klik produk yang diinginkan dari daftar tersedia, lalu masukkan nomor tujuan/ID pelanggan.' },
            { text: 'Klik "Bayar Sekarang" untuk memproses transaksi — saldo anggota akan dipotong otomatis.' }
          ]
        }}
      >
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">PPOB & Pembayaran</h2>

          {/* Categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <CategoryButton type="PULSA" icon={Smartphone} label="Pulsa & Data" colorClass="bg-blue-50 text-blue-700 border-blue-500" selectedType={selectedType} onSelect={handleTypeSelect} />
            <CategoryButton type="PLN" icon={Zap} label="Token Listrik" colorClass="bg-yellow-50 text-yellow-700 border-yellow-500" selectedType={selectedType} onSelect={handleTypeSelect} />
            <CategoryButton type="DATA" icon={Wifi} label="Internet" colorClass="bg-green-50 text-green-700 border-green-500" selectedType={selectedType} onSelect={handleTypeSelect} />
            <CategoryButton type="OTHER" icon={CreditCard} label="Lainnya" colorClass="bg-purple-50 text-purple-700 border-purple-500" selectedType={selectedType} onSelect={handleTypeSelect} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Product Selection */}
            <Suspense fallback={<div className="h-48 bg-gray-100 rounded-lg animate-pulse" />}>
            <Card title={`Pilih Produk (${selectedType})`} className="h-fit">
                {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading products...</div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">Tidak ada produk tersedia untuk kategori ini.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                        {(filteredProducts ?? []).map(p => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedProduct(p)}
                                className={`p-3 border rounded-lg cursor-pointer transition-all text-left ${
                                    selectedProduct?.id === p.id
                                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                    : 'border-gray-200 hover:border-blue-300'
                                }`}
                                aria-label={`Pilih produk ${p.name} seharga Rp ${p.price.toLocaleString('id-ID')}`}
                            >
                                <p className="font-semibold text-gray-800 text-sm">{p.name}</p>
                                <p className="text-blue-600 font-bold mt-1">Rp {p.price.toLocaleString('id-ID')}</p>
                                <p className="text-xs text-gray-500 mt-1">{p.provider}</p>
                            </button>
                        ))}
                    </div>
                )}
            </Card>
            </Suspense>

            {/* Transaction Form */}
            <Suspense fallback={<div className="h-48 bg-gray-100 rounded-lg animate-pulse" />}>
            <Card title="Detail Transaksi" className="h-fit">
                {!selectedProduct ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <CreditCard size={48} className="mb-4 opacity-20" />
                        <p>Silakan pilih produk terlebih dahulu</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <p className="text-sm text-gray-500">Produk Dipilih</p>
                            <p className="font-bold text-lg text-gray-800">{selectedProduct.name}</p>
                            <p className="text-sm text-gray-600">{selectedProduct.provider}</p>
                            <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                                <span className="text-gray-600">Harga</span>
                                <span className="font-bold text-xl text-blue-600">Rp {selectedProduct.price.toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Input
                                label="Nomor Tujuan / ID Pelanggan"
                                id="ppob-customer-no"
                                value={customerNo}
                                onChange={(e) => setCustomerNo(e.target.value)}
                                placeholder={selectedType === 'PLN' ? 'Contoh: 140233...' : 'Contoh: 081234...'}
                                required
                                className="text-lg tracking-wide"
                            />

                            <Button
                                className="w-full py-3 text-lg"
                                onClick={handlePurchase}
                                disabled={!customerNo || processing}
                                isLoading={processing}
                            >
                                Bayar Sekarang
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
            </Suspense>
          </div>
        </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

export default PPOB;
