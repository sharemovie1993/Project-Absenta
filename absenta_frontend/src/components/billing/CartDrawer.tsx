import React, { useState, useEffect } from 'react';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/authStore';
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
  AlertCircle,
  Copy,
  ExternalLink,
  QrCode
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

interface CartDrawerProps {
  onCheckoutSuccess?: (invoiceData: any) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onCheckoutSuccess }) => {
  const { user } = useAuthStore();
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

  const [paymentChannels, setPaymentChannels] = useState<any[]>([]);
  const [selectedChannelCode, setSelectedChannelCode] = useState<string>('QRIS2');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<any | null>(null);

  // Fetch live payment channels from License Server / Tripay
  useEffect(() => {
    let isMounted = true;
    const fetchChannels = async () => {
      try {
        const res = await axios.get('/api/billing/payment-channels?productId=cakola');
        if (isMounted && res.data?.data && Array.isArray(res.data.data)) {
          setPaymentChannels(res.data.data.filter((c: any) => c.active !== false));
          return;
        }
      } catch (e) {
        // Fallback direct to license server
        try {
          const fallbackRes = await axios.get('https://api.absenta.id/api/license/payment-channels?productId=cakola');
          if (isMounted && fallbackRes.data?.data && Array.isArray(fallbackRes.data.data)) {
            setPaymentChannels(fallbackRes.data.data.filter((c: any) => c.active !== false));
            return;
          }
        } catch (fErr) {
          console.warn('[Fetch Payment Channels Fallback Warning]', fErr);
        }
      }
      // Default standard fallback if network error
      if (isMounted) {
        setPaymentChannels([
          { code: 'QRIS2', name: 'QRIS (ShopeePay/BCA/OVO/Dana)', group: 'E-Wallet', active: true, icon_url: 'https://assets.tripay.co.id/upload/payment-icon/8ewGzP6SWe1649667701.png' },
          { code: 'BCAVA', name: 'BCA Virtual Account', group: 'Virtual Account', active: true, icon_url: 'https://assets.tripay.co.id/upload/payment-icon/ytBKvaleGy1605201833.png' },
          { code: 'BNIVA', name: 'BNI Virtual Account', group: 'Virtual Account', active: true, icon_url: 'https://assets.tripay.co.id/upload/payment-icon/n22Qsh8jMa1583433577.png' },
          { code: 'BRIVA', name: 'BRI Virtual Account', group: 'Virtual Account', active: true, icon_url: 'https://assets.tripay.co.id/upload/payment-icon/8WQ3APST5s1579461828.png' },
          { code: 'MANDIRIVA', name: 'Mandiri Virtual Account', group: 'Virtual Account', active: true, icon_url: 'https://assets.tripay.co.id/upload/payment-icon/T9Z012UE331583531536.png' },
          { code: 'PERMATAVA', name: 'Permata Virtual Account', group: 'Virtual Account', active: true, icon_url: 'https://assets.tripay.co.id/upload/payment-icon/szezRhAALB1583408731.png' },
          { code: 'ALFAMART', name: 'Alfamart', group: 'Convenience Store', active: true, icon_url: 'https://assets.tripay.co.id/upload/payment-icon/jiGZMKp2RD1583433506.png' },
          { code: 'INDOMARET', name: 'Indomaret', group: 'Convenience Store', active: true, icon_url: 'https://assets.tripay.co.id/upload/payment-icon/zNzuO5AuLw1583513974.png' }
        ]);
      }
    };

    fetchChannels();
    return () => {
      isMounted = false;
    };
  }, []);

  // Pre-fill shipping address recipient from user/tenant if empty
  useEffect(() => {
    if (user && !shippingAddress.recipient) {
      setShippingAddress({
        recipient: user.tenant?.name || user.full_name || '',
      });
    }
  }, [user]);

  if (!isCartOpen) return null;

  const physicalNeeded = hasPhysicalItems();

  const handleClose = () => {
    setCartOpen(false);
    setCreatedInvoice(null);
  };

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
    const toastId = toast.loading('Memproses pesanan ke Payment Gateway...');

    const schoolName = user?.tenant?.name || shippingAddress.recipient || user?.full_name || 'Sekolah Client';
    const tenantId = user?.tenant_id || user?.tenant?.id || 'absenta-client';
    const customerPhone = shippingAddress.phone || '087779937341';
    const customerEmail = user?.email || 'admin@sekolah.id';

    const payload = {
      school_name: schoolName,
      tenant_id: tenantId,
      customer_email: customerEmail,
      customer_name: schoolName,
      items: items.map(item => ({ 
        plan_id: item.plan_id, 
        qty: item.qty,
        name: item.name,
        price: item.price
      })),
      payment_method: selectedChannelCode,
      shipping_address: physicalNeeded ? shippingAddress : null,
      phone_number: customerPhone
    };

    try {
      // Primary API Request to Backend / CLS
      const response = await axios.post('/api/public/checkout-multi', payload);

      if (response.data && response.data.success) {
        toast.success('Invoice pembayaran berhasil dibuat!', { id: toastId });
        const invoiceData = response.data.data;
        setCreatedInvoice(invoiceData);
        clearCart();
        if (onCheckoutSuccess) {
          onCheckoutSuccess(invoiceData);
        }
      } else {
        toast.error(response.data?.message || 'Gagal memproses checkout.', { id: toastId });
      }
    } catch (err: any) {
      console.warn('[Cart Checkout Initial Attempt Failed, Trying Fallback Direct CLS Endpoint]', err);
      try {
        const fallbackRes = await axios.post('https://api.absenta.id/api/public/checkout-multi', payload);
        if (fallbackRes.data && fallbackRes.data.success) {
          toast.success('Invoice pembayaran berhasil dibuat!', { id: toastId });
          const invoiceData = fallbackRes.data.data;
          setCreatedInvoice(invoiceData);
          clearCart();
          if (onCheckoutSuccess) {
            onCheckoutSuccess(invoiceData);
          }
          return;
        } else {
          toast.error(fallbackRes.data?.message || 'Gagal memproses transaksi.', { id: toastId });
        }
      } catch (fErr: any) {
        toast.error(err.response?.data?.message || err.message || 'Terjadi kesalahan sistem payment gateway.', { id: toastId });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} berhasil disalin!`);
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
                {createdInvoice ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <ShoppingBag className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  {createdInvoice ? 'Instruksi Pembayaran' : 'Keranjang Belanja'}
                  {!createdInvoice && items.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                      {items.reduce((sum, i) => sum + i.qty, 0)} Item
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  {createdInvoice ? 'Selesaikan pembayaran untuk aktivasi otomatis lisensi & pesanan' : 'Pembelian multi-produk & hardware sekolah'}
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Content / Invoice View */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
            {createdInvoice ? (
              /* Tampilan Invoice / Payment Gateway Gateway Result */
              <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="text-center py-2 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-1">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-base text-white">Invoice Berhasil Diterbitkan</h4>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
                    <span>No: {createdInvoice.invoice_number || createdInvoice.invoice_id || 'INV-ABSENTA'}</span>
                    <button
                      onClick={() => copyToClipboard(createdInvoice.invoice_number || createdInvoice.invoice_id, 'Nomor Invoice')}
                      className="text-slate-400 hover:text-white"
                      title="Salin Nomor Invoice"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Total Bayar Card */}
                <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-center space-y-1">
                  <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider block">Total Tagihan Pembayaran</span>
                  <div className="text-2xl font-bold text-white font-mono">
                    Rp {Number(createdInvoice.amount || createdInvoice.total_amount || 0).toLocaleString('id-ID')}
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    Metode: <strong className="text-slate-200">{createdInvoice.payment_method || paymentMethod}</strong>
                  </span>
                </div>

                {/* QRIS / VA Code Display */}
                {createdInvoice.qr_url ? (
                  <div className="p-4 rounded-2xl bg-white text-center space-y-2 shadow-xl max-w-xs mx-auto">
                    <img src={createdInvoice.qr_url} alt="QRIS Code Pembayaran" className="w-48 h-48 mx-auto object-contain block" />
                    <p className="text-[11px] font-semibold text-slate-800">
                      Pindai QRIS di atas dengan BCA Mobile, GoPay, OVO, ShopeePay, atau m-Banking
                    </p>
                  </div>
                ) : (createdInvoice.pay_code || createdInvoice.payment_code) ? (
                  <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2 text-center">
                    <span className="text-xs text-slate-400 font-medium block">Nomor Virtual Account / Kode Bayar:</span>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xl font-mono font-bold text-white tracking-widest">
                        {createdInvoice.pay_code || createdInvoice.payment_code}
                      </span>
                      <button
                        onClick={() => copyToClipboard(createdInvoice.pay_code || createdInvoice.payment_code, 'Kode Bayar')}
                        className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                        title="Salin Kode Bayar"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Link Pembayaran Tripay / Checkout URL */}
                {createdInvoice.pay_url && (
                  <div className="text-center pt-1">
                    <a
                      href={createdInvoice.pay_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all"
                    >
                      <span>Buka Halaman Pembayaran Tripay</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}

                {/* Instruksi Pengiriman / Aktivasi */}
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Aktivasi Otomatis & Logistik:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                    <li>Setelah pembayaran terverifikasi oleh Tripay, lisensi digital langsung aktif otomatis.</li>
                    <li>Jika pesanan Anda menyertakan hardware atau Easy Tunnel domain, tim teknis kami akan menghubungi nomor WA Anda untuk proses konfigurasi & pengiriman fisik.</li>
                  </ul>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center mx-auto mb-4 text-slate-500">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="text-base font-semibold text-slate-200 mb-1">Keranjang Masih Kosong</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mb-6">
                  Pilih lisensi sekali beli, server node, access point Wi-Fi 6, atau hardware fingerprint & RFID dari katalog solusi.
                </p>
                <button
                  onClick={handleClose}
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

                {/* Metode Pembayaran Dinamis dari Server Lisensi / Tripay */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-medium block">PILIH METODE PEMBAYARAN (TRIPAY GATEWAY)</span>
                    <span className="text-[10px] text-indigo-400 font-semibold">{paymentChannels.length} Channel Aktif</span>
                  </div>

                  {paymentChannels.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-center text-xs text-slate-400">
                      Memuat daftar saluran pembayaran...
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                      {/* E-Wallet & QRIS Group */}
                      {paymentChannels.filter(c => c.group === 'E-Wallet').length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            QRIS & E-Wallet
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {paymentChannels.filter(c => c.group === 'E-Wallet').map((ch) => (
                              <button
                                key={ch.code}
                                type="button"
                                onClick={() => setSelectedChannelCode(ch.code)}
                                className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center gap-2.5 ${
                                  selectedChannelCode === ch.code
                                    ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold ring-1 ring-indigo-500/50'
                                    : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800/80'
                                }`}
                              >
                                {ch.icon_url ? (
                                  <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 shadow-xs">
                                    <img src={ch.icon_url} alt={ch.name} className="max-h-full max-w-full object-contain" />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                                    <QrCode className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-medium">{ch.name}</div>
                                  <div className="text-[10px] text-slate-400">Instant Verification</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Virtual Account Group */}
                      {paymentChannels.filter(c => c.group === 'Virtual Account').length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Virtual Account Bank (BCA / BNI / BRI / Mandiri / Permata)
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {paymentChannels.filter(c => c.group === 'Virtual Account').map((ch) => (
                              <button
                                key={ch.code}
                                type="button"
                                onClick={() => setSelectedChannelCode(ch.code)}
                                className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center gap-2.5 ${
                                  selectedChannelCode === ch.code
                                    ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold ring-1 ring-indigo-500/50'
                                    : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800/80'
                                }`}
                              >
                                {ch.icon_url ? (
                                  <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 shadow-xs">
                                    <img src={ch.icon_url} alt={ch.name} className="max-h-full max-w-full object-contain" />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                                    <CreditCard className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-medium">{ch.name}</div>
                                  <div className="text-[10px] text-slate-400">Transfer Otomatis 24 Jam</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Convenience Store / Retail Group */}
                      {paymentChannels.filter(c => c.group === 'Convenience Store').length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Gerai Retail (Alfamart / Indomaret)
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {paymentChannels.filter(c => c.group === 'Convenience Store').map((ch) => (
                              <button
                                key={ch.code}
                                type="button"
                                onClick={() => setSelectedChannelCode(ch.code)}
                                className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center gap-2.5 ${
                                  selectedChannelCode === ch.code
                                    ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold ring-1 ring-indigo-500/50'
                                    : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800/80'
                                }`}
                              >
                                {ch.icon_url ? (
                                  <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 shadow-xs">
                                    <img src={ch.icon_url} alt={ch.name} className="max-h-full max-w-full object-contain" />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                                    <CreditCard className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-medium">{ch.name}</div>
                                  <div className="text-[10px] text-slate-400">Kasir Toko Terdekat</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer Summary / Footer Action */}
          {createdInvoice ? (
            <div className="p-5 border-t border-slate-800 bg-slate-900/90 backdrop-blur space-y-3">
              <button
                onClick={handleClose}
                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-all text-center border border-slate-700"
              >
                Tutup & Selesaikan Pembayaran Nanti
              </button>
            </div>
          ) : items.length > 0 ? (
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
          ) : null}

        </div>
      </div>
    </div>
  );
};
