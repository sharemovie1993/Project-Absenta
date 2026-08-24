import React, { useState, useMemo, useCallback } from 'react';
import { 
  Search, 
  ShoppingCart, 
  User, 
  ArrowLeft, 
  Trash2, 
  Plus, 
  Minus, 
  PauseCircle, 
  CheckCircle2, 
  Printer, 
  Send, 
  X, 
  CreditCard, 
  Wallet, 
  QrCode, 
  Award,
  Delete,
  RotateCcw
} from 'lucide-react';
import { Button } from '../../ui/Button';
import type { 
  Product, 
  CartItem, 
  CoopMember, 
  HeldCart, 
  Voucher, 
  ProductCategory,
  SaleRecord
} from './usePOSState';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface MobilePOSViewProps {
  loading: boolean;
  cart: CartItem[];
  search: string;
  setSearch: (val: string) => void;
  categories: ProductCategory[];
  selectedCategory: string | null;
  setSelectedCategory: (val: string | null) => void;
  filteredProducts: Product[];
  addToCart: (p: Product) => void;
  updateQty: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  totalAmount: number;
  discountedTotal: number;
  selectedMember: CoopMember | null;
  setSelectedMember: (m: CoopMember | null) => void;
  selectedMemberPoints: number | null;
  members: CoopMember[];
  loadingMembers: boolean;
  memberSearch: string;
  setMemberSearch: (val: string) => void;
  showMemberDropdown: boolean;
  setShowMemberDropdown: (show: boolean) => void;
  handleOpenQuickRegister: () => void;
  heldCarts: HeldCart[];
  setShowHeldCartsModal: (show: boolean) => void;
  handleHoldCart: () => void;
  paymentMethod: 'CASH' | 'SAVING';
  setPaymentMethod: (pm: 'CASH' | 'SAVING') => void;
  cashReceived: string;
  setCashReceived: (val: string) => void;
  pin: string;
  setPin: (val: string) => void;
  voucherCode: string;
  setVoucherCode: (val: string) => void;
  appliedVoucher: Voucher | null;
  handleApplyVoucher: () => void;
  handleRemoveVoucher: () => void;
  checkingVoucher: boolean;
  submitCheckout: () => Promise<void>;
  processing: boolean;
  checkoutSuccess: boolean;
  setCheckoutSuccess: (val: boolean) => void;
  lastSaleRecord: SaleRecord | null;
  printReceipt: (sale: SaleRecord) => void;
}

export const MobilePOSView: React.FC<MobilePOSViewProps> = React.memo(({
  loading,
  cart,
  search,
  setSearch,
  categories,
  selectedCategory,
  setSelectedCategory,
  filteredProducts,
  addToCart,
  updateQty,
  removeFromCart,
  totalAmount,
  discountedTotal,
  selectedMember,
  setSelectedMember,
  selectedMemberPoints,
  members,
  loadingMembers,
  memberSearch,
  setMemberSearch,
  showMemberDropdown,
  setShowMemberDropdown,
  handleOpenQuickRegister,
  heldCarts,
  setShowHeldCartsModal,
  handleHoldCart,
  paymentMethod,
  setPaymentMethod,
  cashReceived,
  setCashReceived,
  pin,
  setPin,
  voucherCode,
  setVoucherCode,
  appliedVoucher,
  handleApplyVoucher,
  handleRemoveVoucher,
  checkingVoucher,
  submitCheckout,
  processing,
  checkoutSuccess,
  setCheckoutSuccess,
  lastSaleRecord,
  printReceipt
}) => {
  // Mobile Steps: 'catalog' | 'summary' | 'payment' | 'success'
  const [mobileStep, setMobileStep] = useState<'catalog' | 'summary' | 'payment' | 'success'>('catalog');
  const [showMemberModal, setShowMemberModal] = useState(false);

  // Sync success step when checkoutSuccess is true
  React.useEffect(() => {
    if (checkoutSuccess && lastSaleRecord) {
      setMobileStep('success');
    }
  }, [checkoutSuccess, lastSaleRecord]);

  const totalItemsCount = useMemo(() => {
    return (cart || []).reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  const finalPayAmount = discountedTotal > 0 ? discountedTotal : totalAmount;
  const cashNum = Number(cashReceived || 0);
  const changeAmount = cashNum > finalPayAmount ? cashNum - finalPayAmount : 0;

  // Cart quantity lookup map for fast badge rendering
  const cartQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cart || []) {
      map.set(item.id, item.qty);
    }
    return map;
  }, [cart]);

  // Numpad Touch Input Handlers
  const handleNumpadPress = useCallback((val: string) => {
    if (val === 'CLEAR') {
      setCashReceived('');
      return;
    }
    if (val === 'BACKSPACE') {
      setCashReceived(prev => prev.slice(0, -1));
      return;
    }
    if (val === 'EXACT') {
      setCashReceived(String(finalPayAmount));
      return;
    }
    setCashReceived(prev => {
      const next = prev + val;
      // Prevent leading zeros
      if (next.startsWith('0') && next.length > 1 && !next.startsWith('0.')) {
        return next.replace(/^0+/, '');
      }
      return next;
    });
  }, [finalPayAmount, setCashReceived]);

  const handleQuickAmount = useCallback((amount: number) => {
    setCashReceived(String(amount));
  }, [setCashReceived]);

  const handleFinishTransaction = useCallback(() => {
    setCheckoutSuccess(false);
    setMobileStep('catalog');
  }, [setCheckoutSuccess]);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: TRANSAKSI BERHASIL / STRUK (Kasir Pintar Struk Screen)
  // ─────────────────────────────────────────────────────────────────────────────
  if (mobileStep === 'success' && lastSaleRecord) {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-slate-50 dark:bg-slate-950 p-4 flex flex-col justify-between">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 size={36} />
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
              Transaksi Berhasil!
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Invoice #{lastSaleRecord.id.slice(0, 8).toUpperCase()}
            </p>
          </div>

          {/* Kembalian & Total Box */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
              <span>Total Tagihan</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Rp {lastSaleRecord.total.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
              <span>Metode Bayar</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {lastSaleRecord.paymentMethod === 'SAVING' ? 'Saldo Sukarela' : 'Tunai / Cash'}
              </span>
            </div>
            {lastSaleRecord.paymentMethod === 'CASH' && (
              <>
                <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                  <span>Uang Diterima</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Rp {Number(lastSaleRecord.cashReceived || lastSaleRecord.total).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <span className="font-black text-sm text-slate-800 dark:text-slate-100">Kembalian</span>
                  <span className="font-black text-lg text-emerald-600 dark:text-emerald-400">
                    Rp {(lastSaleRecord.change || 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Action List (Cetak Struk, WA, Email) */}
          <div className="space-y-2 text-left pt-2">
            <button
              type="button"
              onClick={() => printReceipt(lastSaleRecord)}
              className="w-full flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <Printer size={18} className="text-blue-600 dark:text-blue-400" />
                <span>Cetak Struk Thermal</span>
              </div>
              <span className="text-xs text-slate-400">➔</span>
            </button>

            {selectedMember && (
              <button
                type="button"
                onClick={() => toast.success('Struk berhasil diteruskan ke sistem notifikasi WhatsApp')}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <Send size={18} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Kirim Struk WhatsApp</span>
                </div>
                <span className="text-xs text-slate-400">➔</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Primary Done Button */}
        <div className="pt-4">
          <Button
            size="lg"
            onClick={handleFinishTransaction}
            className="w-full h-12 rounded-2xl text-sm font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          >
            Transaksi Baru (Selesai)
          </Button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: LAYAR PEMBAYARAN & NUMPAD INPUT UANG (Kasir Pintar Numpad Screen)
  // ─────────────────────────────────────────────────────────────────────────────
  if (mobileStep === 'payment') {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-3">
        <div className="space-y-3">
          {/* Header Navigation */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <button
              type="button"
              onClick={() => setMobileStep('summary')}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              aria-label="Kembali"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Total Tagihan</p>
              <p className="text-lg font-black text-blue-600 dark:text-blue-400">
                Rp {finalPayAmount.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* Payment Method Selector Pills */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              className={cn(
                "py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all",
                paymentMethod === 'CASH'
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              )}
            >
              <Wallet size={15} />
              <span>Tunai (Cash)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!selectedMember) {
                  toast.error('Pilih anggota terlebih dahulu untuk pembayaran saldo');
                  setShowMemberModal(true);
                  return;
                }
                setPaymentMethod('SAVING');
              }}
              className={cn(
                "py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all",
                paymentMethod === 'SAVING'
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              )}
            >
              <CreditCard size={15} />
              <span>Saldo Sukarela</span>
            </button>
          </div>

          {/* Numpad Input Display & Cash / Saving View */}
          {paymentMethod === 'CASH' ? (
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="text-center py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                  Uang Diterima
                </p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">
                  Rp {cashNum.toLocaleString('id-ID')}
                </p>
                {cashNum > 0 && (
                  <p className={cn(
                    "text-xs font-extrabold mt-1",
                    cashNum >= finalPayAmount ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                  )}>
                    {cashNum >= finalPayAmount
                      ? `Kembalian: Rp ${changeAmount.toLocaleString('id-ID')}`
                      : `Kurang: Rp ${(finalPayAmount - cashNum).toLocaleString('id-ID')}`
                    }
                  </p>
                )}
              </div>

              {/* Quick Cash Presets */}
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleNumpadPress('EXACT')}
                  className="py-1.5 px-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-extrabold text-[11px] rounded-lg border border-blue-200 dark:border-blue-800"
                >
                  Uang Pas
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAmount(20000)}
                  className="py-1.5 px-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-lg"
                >
                  20.000
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAmount(50000)}
                  className="py-1.5 px-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-lg"
                >
                  50.000
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAmount(100000)}
                  className="py-1.5 px-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-lg"
                >
                  100.000
                </button>
              </div>

              {/* Touch Numpad Grid */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {['7', '8', '9'].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleNumpadPress(n)}
                    className="h-11 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 text-slate-800 dark:text-slate-100 font-black text-lg rounded-xl shadow-2xs active:scale-95 transition-transform"
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleNumpadPress('CLEAR')}
                  className="h-11 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-black text-sm rounded-xl active:scale-95 transition-transform"
                >
                  C
                </button>

                {['4', '5', '6'].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleNumpadPress(n)}
                    className="h-11 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 text-slate-800 dark:text-slate-100 font-black text-lg rounded-xl shadow-2xs active:scale-95 transition-transform"
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleNumpadPress('BACKSPACE')}
                  className="h-11 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-sm rounded-xl flex items-center justify-center active:scale-95 transition-transform"
                  aria-label="Hapus"
                >
                  <Delete size={18} />
                </button>

                {['1', '2', '3'].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleNumpadPress(n)}
                    className="h-11 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 text-slate-800 dark:text-slate-100 font-black text-lg rounded-xl shadow-2xs active:scale-95 transition-transform"
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleNumpadPress('EXACT')}
                  className="row-span-2 h-auto bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-black text-xs rounded-xl flex flex-col items-center justify-center p-1 active:scale-95 transition-transform leading-tight"
                >
                  <span>Uang</span>
                  <span>Pas</span>
                </button>

                {['0', '000', '.'].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleNumpadPress(n)}
                    className="h-11 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 text-slate-800 dark:text-slate-100 font-black text-base rounded-xl shadow-2xs active:scale-95 transition-transform"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Potong Saldo Sukarela</p>
                <h4 className="text-base font-black text-slate-800 dark:text-slate-100 mt-1">
                  {selectedMember?.name}
                </h4>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-0.5">
                  Saldo Tersedia: Rp {(selectedMember?.sukarelaBalance || 0).toLocaleString('id-ID')}
                </p>
              </div>

              {(selectedMember?.sukarelaBalance || 0) < finalPayAmount ? (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold text-center border border-rose-200 dark:border-rose-800">
                  Saldo anggota tidak mencukupi untuk membayar Rp {finalPayAmount.toLocaleString('id-ID')}
                </div>
              ) : (
                <div className="space-y-2">
                  <label htmlFor="mobile-member-pin" className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                    PIN Transaksi Anggota (Opsional)
                  </label>
                  <input
                    id="mobile-member-pin"
                    type="password"
                    maxLength={6}
                    placeholder="Masukkan 6 Digit PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full text-center tracking-widest text-lg font-bold py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Selesaikan Transaksi Button */}
        <div className="pt-3">
          <Button
            size="lg"
            isLoading={processing}
            disabled={processing || (paymentMethod === 'CASH' && cashNum < finalPayAmount) || (paymentMethod === 'SAVING' && (selectedMember?.sukarelaBalance || 0) < finalPayAmount)}
            onClick={submitCheckout}
            className="w-full h-12 rounded-2xl text-sm font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-lg disabled:opacity-40"
          >
            Selesaikan Transaksi (Bayar)
          </Button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: LAYAR RINGKASAN PESANAN (Kasir Pintar Cart Summary Screen)
  // ─────────────────────────────────────────────────────────────────────────────
  if (mobileStep === 'summary') {
    return (
      <div className="min-h-[calc(100vh-140px)] bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-3">
        <div className="space-y-3">
          {/* Header Bar */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <button
              type="button"
              onClick={() => setMobileStep('catalog')}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              aria-label="Kembali ke Katalog"
            >
              <ArrowLeft size={18} />
            </button>
            <h3 className="font-black text-sm text-slate-800 dark:text-slate-100">
              Ringkasan Pesanan ({totalItemsCount})
            </h3>
            <span className="font-black text-sm text-blue-600 dark:text-blue-400">
              Rp {totalAmount.toLocaleString('id-ID')}
            </span>
          </div>

          {/* Member Card Selector */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
            {selectedMember ? (
              <div className="flex items-center justify-between w-full">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase bg-blue-50 dark:bg-blue-950/50 text-blue-600 px-1.5 py-0.5 rounded">
                      Anggota
                    </span>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                      {selectedMember.name}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Saldo Sukarela: <strong className="text-slate-700 dark:text-slate-300">Rp {selectedMember.sukarelaBalance.toLocaleString('id-ID')}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="p-1 text-slate-400 hover:text-rose-500 shrink-0"
                  aria-label="Hapus Anggota"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMemberModal(true)}
                className="w-full py-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-bold"
              >
                <div className="flex items-center gap-2">
                  <User size={16} className="text-blue-500" />
                  <span>Pilih Pelanggan / Anggota Koperasi</span>
                </div>
                <span className="text-blue-600 dark:text-blue-400">+ Tambah</span>
              </button>
            )}
          </div>

          {/* Order Items List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[48vh] overflow-y-auto">
            {cart.map((item, index) => {
              const itemSubtotal = item.qty * Number(item.price);
              return (
                <div key={item.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span className="text-xs font-black text-slate-400 w-4 pt-0.5 font-mono">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.qty} × Rp {Number(item.price).toLocaleString('id-ID')} = <span className="font-bold text-slate-800 dark:text-slate-200">Rp {itemSubtotal.toLocaleString('id-ID')}</span>
                      </p>
                    </div>
                  </div>

                  {/* Quantity Stepper & Delete */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, -1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold active:scale-95"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-6 text-center font-black text-xs font-mono">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, 1)}
                      className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold active:scale-95"
                    >
                      <Plus size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 flex items-center justify-center ml-1"
                      aria-label="Hapus Item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Voucher Bar */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-2">
            <input
              type="text"
              placeholder="Kode Voucher..."
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              className="flex-1 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700 outline-none"
            />
            {appliedVoucher ? (
              <button
                type="button"
                onClick={handleRemoveVoucher}
                className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold"
              >
                Hapus
              </button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleApplyVoucher}
                isLoading={checkingVoucher}
                className="text-xs"
              >
                Pakai
              </Button>
            )}
          </div>
        </div>

        {/* Bottom Actions: Hold & Bayar */}
        <div className="pt-3 flex gap-2">
          <button
            type="button"
            onClick={handleHoldCart}
            className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 active:scale-95 transition-transform"
            title="Tahan Keranjang"
          >
            <PauseCircle size={20} />
          </button>
          <Button
            size="lg"
            onClick={() => setMobileStep('payment')}
            className="flex-1 h-12 rounded-2xl text-sm font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex justify-between px-5 items-center"
          >
            <span>BAYAR</span>
            <span>Rp {finalPayAmount.toLocaleString('id-ID')}</span>
          </Button>
        </div>

        {/* Member Selector Modal */}
        {showMemberModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-4 space-y-3 max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-black text-sm">Pilih Anggota Koperasi</h3>
                <button type="button" onClick={() => setShowMemberModal(false)} className="p-1">
                  <X size={18} />
                </button>
              </div>

              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau nomor anggota..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {members.slice(0, 20).map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedMember(m);
                      setShowMemberModal(false);
                    }}
                    className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800 flex justify-between items-center transition-colors"
                  >
                    <div>
                      <h5 className="font-bold text-xs text-slate-800 dark:text-slate-100">{m.name}</h5>
                      <p className="text-[10px] text-slate-400">No: {m.memberNo} • Saldo: Rp {m.sukarelaBalance.toLocaleString('id-ID')}</p>
                    </div>
                    <span className="text-xs font-bold text-blue-600">Pilih</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: LAYAR UTAMA TRANSAKSI / KATALOG BARANG (Kasir Pintar Style)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col justify-between pb-16 relative">
      <div className="space-y-3">
        {/* Top Search Bar & Held Carts Badge */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Cari barang (nama / kode)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
            />
          </div>

          {(heldCarts || []).length > 0 && (
            <button
              type="button"
              onClick={() => setShowHeldCartsModal(true)}
              className="px-3 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-extrabold text-xs flex items-center gap-1 shadow-2xs"
            >
              <span>⏸️</span> {heldCarts.length}
            </button>
          )}
        </div>

        {/* Category Pills Slider */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 whitespace-nowrap">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0",
              !selectedCategory
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
            )}
          >
            Semua
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.name)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0",
                selectedCategory?.toLowerCase() === cat.name.toLowerCase()
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Items List (Kasir Pintar Style with Right Qty Badge) */}
        {loading ? (
          <div className="py-12 text-center text-xs font-bold text-slate-400 animate-pulse">
            Memuat produk kasir...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Tidak ada produk ditemukan.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map(product => {
              const qtyInCart = cartQtyMap.get(product.id) || 0;
              const isSelected = qtyInCart > 0;
              const isOutOfStock = product.stock <= 0;

              return (
                <div
                  key={product.id}
                  onClick={() => !isOutOfStock && addToCart(product)}
                  className={cn(
                    "p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 select-none cursor-pointer",
                    isSelected
                      ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 shadow-xs"
                      : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-slate-300",
                    isOutOfStock && "opacity-40 pointer-events-none bg-slate-100 dark:bg-slate-900"
                  )}
                >
                  {/* Left: Product Name, Code, Stock & Price */}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 leading-snug line-clamp-1">
                      {product.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-slate-400">{product.code}</span>
                      <span>•</span>
                      <span>Stok: {product.stock}</span>
                    </p>
                    <p className="text-xs font-black text-blue-600 dark:text-blue-400 mt-1">
                      Rp {Number(product.price).toLocaleString('id-ID')}
                    </p>
                  </div>

                  {/* Right: Quantity Badge & Decrement (Kasir Pintar Style) */}
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isSelected && (
                      <button
                        type="button"
                        onClick={() => updateQty(product.id, -1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center active:scale-95 transition-transform"
                        aria-label="Kurangi Jumlah"
                      >
                        <Minus size={13} />
                      </button>
                    )}

                    {/* Prominent Qty Badge Box */}
                    {isSelected && (
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs font-mono animate-in zoom-in-50 duration-150">
                        {qtyInCart}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          FLOATING BOTTOM STICKY BAR (Muncul jika ada minimal 1 barang di keranjang)
          ─────────────────────────────────────────────────────────────────────── */}
      {cart.length > 0 && (
        <div className="fixed bottom-3 inset-x-3 z-40 animate-in slide-in-from-bottom-3 duration-200">
          <div className="bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md text-white p-2 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700/60">
            {/* Left info pill */}
            <div className="pl-3 pr-2 py-1 flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-mono font-black text-xs shrink-0">
                {totalItemsCount}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Belanja</p>
                <p className="text-sm font-black text-white truncate">
                  Rp {totalAmount.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            {/* Right: Tombol LANJUT */}
            <button
              type="button"
              onClick={() => setMobileStep('summary')}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-transform shrink-0 cursor-pointer"
            >
              <span>LANJUT</span>
              <span>➔</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

MobilePOSView.displayName = 'MobilePOSView';

export default MobilePOSView;
