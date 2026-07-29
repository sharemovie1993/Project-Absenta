import React, { useState } from 'react';
import { useCartStore } from '../../store/useCartStore';
import { 
  X, 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  Truck, 
  CreditCard, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  MapPin,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

interface CartDrawerProps {
  onCheckoutSuccess?: (invoiceData: any) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onCheckoutSuccess }) => {
  const {
    items,
    isCartOpen,
    setCartOpen,
    removeItem,
    updateQuantity,
    clearCart,
    shippingAddress,
    setShippingAddress,
    getCartSubtotal,
    getShippingCost,
    getTotalAmount,
    hasPhysicalItems
  } = useCartStore();

  const [paymentMethod, setPaymentMethod] = useState<'QRIS' | 'BCAVA' | 'BNIVA' | 'BRIVA' | 'MANDIRIVA'>('QRIS');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isCartOpen) return null;

  const physicalNeeded = hasPhysicalItems();

  const handleProcessCheckout = async () => {
    if (items.length === 0) {
      toast.error('Keranjang belanja Anda masih kosong.');
      return;
    }

    if (physicalNeeded) {
      if (!shippingAddress.recipient.trim() || !shippingAddress.phone.trim() || !shippingAddress.address.trim()) {
        toast.error('Harap lengkapi Alamat Pengiriman Sekolah untuk pengiriman hardware.');
        return;
      }
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Memproses pesanan multi-produk...');

    try {
      // Base API URL for CLS or local proxy backend
      const response = await axios.post('/api/public/checkout-multi', {
        school_name: shippingAddress.recipient || 'Sekolah Absenta Client',
        tenant_id: 'absenta-client',
        items: items.map(item => ({ plan_id: item.plan_id, qty: item.qty })),
        payment_method: paymentMethod,
        shipping_address: physicalNeeded ? shippingAddress : null,
        phone_number: shippingAddress.phone || '087779937341'
      });

      if (response.data && response.data.success) {
        toast.success('Invoice multi-produk berhasil dibuat!', { id: toastId });
        const invoiceData = response.data.data;
        clearCart();
        setCartOpen(false);
        if (onCheckoutSuccess) {
          onCheckoutSuccess(invoiceData);
        }
      } else {
        toast.error(response.data?.message || 'Gagal memproses checkout.', { id: toastId });
      }
    } catch (err: any) {
      console.error('[Cart Checkout Error]', err);
      // Fallback fallback handling if API is at relative or direct CLS server
      try {
        const fallbackRes = await axios.post('https://api.absenta.id/api/public/checkout-multi', {
          school_name: shippingAddress.recipient || 'Sekolah Absenta Client',
          tenant_id: 'absenta-client',
          items: items.map(item => ({ plan_id: item.plan_id, qty: item.qty })),
          payment_method: paymentMethod,
          shipping_address: physicalNeeded ? shippingAddress : null,
          phone_number: shippingAddress.phone || '087779937341'
        });
        if (fallbackRes.data && fallbackRes.data.success) {
          toast.success('Invoice multi-produk berhasil dibuat!', { id: toastId });
          const invoiceData = fallbackRes.data.data;
          clearCart();
          setCartOpen(false);
          if (onCheckoutSuccess) {
            onCheckoutSuccess(invoiceData);
          }
          return;
        }
      } catch (fErr: any) {
        toast.error(err.response?.data?.message || err.message || 'Terjadi kesalahan sistem checkout.', { id: toastId });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={() => setCartOpen(false)} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-slate-900 text-slate-100 shadow-2xl border-l border-slate-800 flex flex-col">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  Keranjang Belanja
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                    {items.reduce((sum, i) => sum + i.qty, 0)} Item
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Pembelian multi-produk & hardware sekolah</p>
              </div>
            </div>

            <button
              onClick={() => setCartOpen(false)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
            {items.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center mx-auto mb-4 text-slate-500">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="text-base font-semibold text-slate-200 mb-1">Keranjang Masih Kosong</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mb-6">
                  Pilih lisensi sekali beli, server node, access point Wi-Fi 6, atau hardware fingerprint & RFID dari katalog solusi.
                </p>
                <button
                  onClick={() => setCartOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-lg shadow-indigo-600/20"
                >
                  Jelajahi Katalog Produk
                </button>
              </div>
            ) : (
              <>
                {/* Item List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>DAFTAR ITEM DIPILIH</span>
                    <button
                      onClick={clearCart}
                      className="text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      Kosongkan
                    </button>
                  </div>

                  {items.map((item) => (
                    <div
                      key={item.plan_id}
                      className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-all flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <span className={`inline-block text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full mb-1.5 ${
                            item.type === 'HARDWARE_PERIPHERAL'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : item.type === 'PHYSICAL_SERVICE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                          }`}>
                            {item.type === 'HARDWARE_PERIPHERAL'
                              ? 'Hardware Fisik'
                              : item.type === 'PHYSICAL_SERVICE'
                              ? 'Jasa & Kartu'
                              : 'Lisensi Digital'}
                          </span>
                          <h4 className="font-semibold text-sm text-slate-100 leading-snug">{item.name}</h4>
                          <div className="text-xs text-indigo-400 font-bold mt-1">
                            Rp {(item.price ?? 0).toLocaleString('id-ID')}
                          </div>
                        </div>

                        <button
                          onClick={() => removeItem(item.plan_id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-700/50 transition-colors"
                          title="Hapus Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700/40 text-xs">
                        <div className="flex items-center gap-2 bg-slate-900/60 rounded-lg p-1 border border-slate-700/50">
                          <button
                            onClick={() => updateQuantity(item.plan_id, item.qty - 1)}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center font-bold text-white text-xs">{item.qty}</span>
                          <button
                            onClick={() => updateQuantity(item.plan_id, item.qty + 1)}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-slate-300 font-semibold">
                          Subtotal: <span className="text-white">Rp {((item.price ?? 0) * item.qty).toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Form Alamat Pengiriman Sekolah (Jika Keranjang Berisi Barang Fisik) */}
                {physicalNeeded && (
                  <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                      <Truck className="w-4 h-4" />
                      <span>ALAMAT PENGIRIMAN LOGISTIK HARDWARE</span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div>
                        <label className="block text-slate-400 mb-1">Nama Penerima / PJ Sarpras Sekolah *</label>
                        <input
                          type="text"
                          placeholder="e.g. Pak Budi (Waka Sarpras)"
                          value={shippingAddress.recipient}
                          onChange={(e) => setShippingAddress({ recipient: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1">No. WhatsApp Operasional Penerima *</label>
                        <input
                          type="text"
                          placeholder="e.g. 08123456789"
                          value={shippingAddress.phone}
                          onChange={(e) => setShippingAddress({ phone: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1">Alamat Lengkap Pengiriman Sekolah *</label>
                        <textarea
                          rows={2}
                          placeholder="Jl. Pendidikan No. 45, RT 02/RW 05, Kel. Pasirkaliki, Kec. Cicendo"
                          value={shippingAddress.address}
                          onChange={(e) => setShippingAddress({ address: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-400 mb-1">Kota / Kabupaten</label>
                          <input
                            type="text"
                            placeholder="Kota Bandung"
                            value={shippingAddress.city}
                            onChange={(e) => setShippingAddress({ city: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Kode Pos</label>
                          <input
                            type="text"
                            placeholder="40123"
                            value={shippingAddress.postal_code}
                            onChange={(e) => setShippingAddress({ postal_code: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Metode Pembayaran */}
                <div className="space-y-2">
                  <span className="text-xs text-slate-400 font-medium block">METODE PEMBAYARAN</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { code: 'QRIS', label: 'QRIS Auto (BCA/Shopee/OVO)' },
                      { code: 'BCAVA', label: 'BCA Virtual Account' },
                      { code: 'BNIVA', label: 'BNI Virtual Account' },
                      { code: 'BRIVA', label: 'BRI Virtual Account' },
                      { code: 'MANDIRIVA', label: 'Mandiri Virtual Account' }
                    ].map((m) => (
                      <button
                        key={m.code}
                        type="button"
                        onClick={() => setPaymentMethod(m.code as any)}
                        className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                          paymentMethod === m.code
                            ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Summary */}
          {items.length > 0 && (
            <div className="p-5 border-t border-slate-800 bg-slate-900/90 backdrop-blur space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal Produk ({items.length} item)</span>
                  <span className="text-slate-200 font-medium">Rp {getCartSubtotal().toLocaleString('id-ID')}</span>
                </div>

                {physicalNeeded && (
                  <div className="flex justify-between text-slate-400">
                    <span>Estimasi Ongkos Kirim Logistik</span>
                    <span className="text-emerald-400 font-medium">Rp {getShippingCost().toLocaleString('id-ID')}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                  <span>Total Tagihan Pembayaran</span>
                  <span className="text-indigo-400 text-base">Rp {getTotalAmount().toLocaleString('id-ID')}</span>
                </div>
              </div>

              <button
                onClick={handleProcessCheckout}
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <span>Proses Pembayaran Multi-Item</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Transaksi Terenkripsi & Otomatis Terhubung ke Server Lisensi Central</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
