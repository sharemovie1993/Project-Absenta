import React, { useState, useEffect } from 'react';
import api from '../../lib/axiosInstance';
import { Button } from '../../components/cooperative/ui/Button';
import { Card } from '../../components/cooperative/ui/Card';
import { Input } from '../../components/cooperative/ui/Input';
import { Smartphone, Zap, Wifi, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

interface PPOBProduct {
  id: string;
  code: string;
  name: string;
  provider: string;
  type: string;
  price: number;
}

const PPOB: React.FC = () => {
  const { user, subscription } = useAuthStore();
  const [products, setProducts] = useState<PPOBProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('PULSA');
  const [customerNo, setCustomerNo] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<PPOBProduct | null>(null);
  const [processing, setProcessing] = useState(false);

  // Gating Logic - Gunakan pengecekan fitur 'KOPERASI' dari features_json
  const features = subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('KOPERASI');

  useEffect(() => {
    if (subscription === undefined) return;
    fetchProducts();
  }, [subscription, isLocked]);

  const fetchProducts = async () => {
    if (isLocked || subscription === undefined) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await api.get('/cooperative/ppob');
      setProducts(response.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat produk PPOB.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedProduct) return;
    if (isLocked) return;
    if (!confirm(`Beli ${selectedProduct.name} seharga Rp ${Number(selectedProduct.price).toLocaleString('id-ID')}?`)) return;

    try {
      setProcessing(true);
      await api.post('/cooperative/ppob/transaction', { productId: selectedProduct.id, customerNo, amount: selectedProduct.price });
      toast.success('Pembelian berhasil! Saldo anggota telah dipotong.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Pembelian gagal');
    } finally {
      setProcessing(false);
    }
  };

  const filteredProducts = selectedType === 'ALL' 
    ? products 
    : products.filter(p => p.type === selectedType);

  const CategoryButton = ({ type, icon: Icon, label, colorClass }: any) => (
    <button 
        onClick={() => { setSelectedType(type); setSelectedProduct(null); }}
        className={`p-4 rounded-xl flex flex-col items-center justify-center space-y-2 border transition-all w-full ${
            selectedType === type 
            ? `${colorClass} border-current ring-2 ring-offset-2 ring-current ring-opacity-50` 
            : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600'
        }`}
    >
      <Icon size={32} />
      <span className="font-medium">{label}</span>
    </button>
  );

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
      >
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">PPOB & Pembayaran</h2>

        {/* Categories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CategoryButton type="PULSA" icon={Smartphone} label="Pulsa & Data" colorClass="bg-blue-50 text-blue-700 border-blue-500" />
          <CategoryButton type="PLN" icon={Zap} label="Token Listrik" colorClass="bg-yellow-50 text-yellow-700 border-yellow-500" />
          <CategoryButton type="DATA" icon={Wifi} label="Internet" colorClass="bg-green-50 text-green-700 border-green-500" />
          <CategoryButton type="OTHER" icon={CreditCard} label="Lainnya" colorClass="bg-purple-50 text-purple-700 border-purple-500" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product Selection */}
          <Card title={`Pilih Produk (${selectedType})`} className="h-fit">
              {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading products...</div>
              ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">Tidak ada produk tersedia untuk kategori ini.</div>
              ) : (
                  <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                      {filteredProducts.map(p => (
                          <div 
                              key={p.id}
                              onClick={() => setSelectedProduct(p)}
                              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                  selectedProduct?.id === p.id 
                                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                                  : 'border-gray-200 hover:border-blue-300'
                              }`}
                          >
                              <p className="font-semibold text-gray-800 text-sm">{p.name}</p>
                              <p className="text-blue-600 font-bold mt-1">Rp {p.price.toLocaleString('id-ID')}</p>
                              <p className="text-xs text-gray-500 mt-1">{p.provider}</p>
                          </div>
                      ))}
                  </div>
              )}
          </Card>

          {/* Transaction Form */}
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
        </div>
      </div>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

export default PPOB;
