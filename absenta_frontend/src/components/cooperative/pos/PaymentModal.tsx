import React from 'react';
import { X, Award, CreditCard } from 'lucide-react';
import { Button } from '../ui/Button';

import type { CoopMember, Voucher, SaleRecord } from '../../../pages/cooperative/POS';

interface PaymentModalProps {
  showPaymentModal: boolean;
  setShowPaymentModal: (show: boolean) => void;
  processing: boolean;
  checkoutSuccess: boolean;
  setCheckoutSuccess: (success: boolean) => void;
  appliedVoucher: Voucher | null;
  totalAmount: number;
  discountedTotal: number;
  voucherCode: string;
  setVoucherCode: (code: string) => void;
  checkingVoucher: boolean;
  handleRemoveVoucher: () => void;
  handleApplyVoucher: () => void;
  paymentMethod: 'CASH' | 'SAVING';
  setPaymentMethod: (method: 'CASH' | 'SAVING') => void;
  selectedMember: CoopMember | null;
  setSelectedMember: (member: CoopMember | null) => void;
  setMemberSearch: (search: string) => void;
  cashReceived: string;
  setCashReceived: (cash: string) => void;
  selectedMemberPoints: number | null;
  pin: string;
  setPin: (pin: string) => void;
  submitCheckout: () => void;
  printReceipt: (sale: SaleRecord) => void;
  lastSaleRecord: SaleRecord | null;
  setLastSaleRecord: (record: SaleRecord | null) => void;
}

export const PaymentModal = React.memo<PaymentModalProps>(({
  showPaymentModal,
  setShowPaymentModal,
  processing,
  checkoutSuccess,
  setCheckoutSuccess,
  appliedVoucher,
  totalAmount,
  discountedTotal,
  voucherCode,
  setVoucherCode,
  checkingVoucher,
  handleRemoveVoucher,
  handleApplyVoucher,
  paymentMethod,
  setPaymentMethod,
  selectedMember,
  setSelectedMember,
  setMemberSearch,
  cashReceived,
  setCashReceived,
  selectedMemberPoints,
  pin,
  setPin,
  submitCheckout,
  printReceipt,
  lastSaleRecord,
  setLastSaleRecord,
}) => {
  if (!showPaymentModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Pembayaran Kasir</h3>
          <button
            onClick={() => {
              if (!processing) {
                setShowPaymentModal(false);
                setCheckoutSuccess(false);
                setLastSaleRecord(null);
                if (checkoutSuccess) {
                  setSelectedMember(null);
                  setMemberSearch('');
                }
              }
            }}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        {!checkoutSuccess ? (
          <div>
            <div className="bg-blue-50/50 dark:bg-slate-950 p-4 rounded-xl mb-5 border border-blue-100 dark:border-slate-800">
              <span className="text-xs text-slate-550 uppercase tracking-wider font-semibold">Total Tagihan</span>
              {appliedVoucher ? (
                <div className="space-y-1">
                  <div className="text-sm text-slate-500 line-through">Rp {totalAmount.toLocaleString('id-ID')}</div>
                  <div className="text-3xl font-black text-blue-600 dark:text-blue-400">Rp {discountedTotal.toLocaleString('id-ID')}</div>
                  <div className="text-xs text-green-600 dark:text-green-400 font-semibold">
                    Hemat Rp {Number(appliedVoucher.discount).toLocaleString('id-ID')} dengan Voucher
                  </div>
                </div>
              ) : (
                <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">Rp {totalAmount.toLocaleString('id-ID')}</div>
              )}
            </div>

            {/* Voucher Input */}
            <div className="mb-5">
              <label htmlFor="pos-voucher-input" className="block text-sm font-semibold text-slate-700 dark:text-slate-355 mb-2">Voucher Belanja</label>
              {appliedVoucher ? (
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-green-800 dark:text-green-300">Voucher Diterapkan</p>
                    <p className="text-sm font-bold text-green-900 dark:text-green-200 truncate">{appliedVoucher.code}</p>
                    <p className="text-xs text-green-755 dark:text-green-400">Potongan: Rp {Number(appliedVoucher.discount).toLocaleString('id-ID')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveVoucher}
                    className="p-1.5 hover:bg-green-150 dark:hover:bg-green-900/50 rounded-full text-green-605 transition-colors"
                    aria-label="Batalkan Voucher"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="pos-voucher-input"
                    placeholder="Masukkan kode voucher..."
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-950 text-sm font-mono uppercase text-slate-800 dark:text-slate-105"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    disabled={checkingVoucher}
                  />
                  <button
                    type="button"
                    onClick={handleApplyVoucher}
                    disabled={!voucherCode.trim() || checkingVoucher}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 font-semibold text-sm rounded-xl transition-colors shrink-0"
                  >
                    {checkingVoucher ? 'Memeriksa...' : 'Terapkan'}
                  </button>
                </div>
              )}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-350 mb-2">Metode Pembayaran</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-4 border rounded-xl flex flex-col items-center justify-center transition-all ${
                    paymentMethod === 'CASH'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-605 hover:border-slate-300'
                  }`}
                >
                  <span className="text-sm">Tunai (Cash)</span>
                </button>
                <button
                  type="button"
                  disabled={!selectedMember}
                  onClick={() => setPaymentMethod('SAVING')}
                  className={`p-4 border rounded-xl flex flex-col items-center justify-center transition-all ${
                    !selectedMember
                      ? 'opacity-40 cursor-not-allowed border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 text-slate-400'
                      : paymentMethod === 'SAVING'
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-605 hover:border-slate-300'
                  }`}
                >
                  <span className="text-sm">Saldo Simpanan</span>
                  {selectedMember && (
                    <span className="text-xs mt-1 font-normal opacity-85">Rp {selectedMember.sukarelaBalance.toLocaleString('id-ID')}</span>
                  )}
                </button>
              </div>
              {!selectedMember && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1 font-medium bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-100 dark:border-amber-900/30">
                  <span>💡</span> Pilih anggota koperasi untuk mengaktifkan pembayaran saldo simpanan.
                </p>
              )}
            </div>

            {paymentMethod === 'CASH' ? (
              <div className="space-y-4 mb-5">
                <div>
                  <label htmlFor="pos-cash-received-input" className="block text-sm font-semibold text-slate-700 dark:text-slate-355 mb-2">Uang Tunai Diterima</label>
                  <input
                    type="number"
                    id="pos-cash-received-input"
                    min="0"
                    placeholder="Masukkan nominal uang..."
                    className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-950 text-lg font-bold text-slate-805 dark:text-slate-105"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2">
                  {[discountedTotal, 5000, 10000, 20000, 50000, 100000].map((val) => {
                    const label = val === discountedTotal ? 'Uang Pas' : `Rp ${val.toLocaleString('id-ID')}`;
                    const actualVal = val === discountedTotal ? discountedTotal : val;
                    if (actualVal < discountedTotal && val !== discountedTotal) return null;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setCashReceived(String(actualVal))}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-xs font-semibold rounded-lg shrink-0 transition-colors text-slate-700 dark:text-slate-300"
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500">Kembalian</span>
                  <span
                    className={`text-xl font-bold ${
                      Number(cashReceived) - discountedTotal >= 0 ? 'text-green-650 dark:text-green-400' : 'text-red-500'
                    }`}
                  >
                    {Number(cashReceived) - discountedTotal >= 0
                      ? `Rp ${(Number(cashReceived) - discountedTotal).toLocaleString('id-ID')}`
                      : 'Uang Kurang'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 mb-5">
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2.5 text-slate-800 dark:text-slate-205">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Anggota</span>
                    <span className="font-semibold">{selectedMember?.name}</span>
                  </div>
                  {selectedMemberPoints !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-550">Poin Loyalitas</span>
                      <span className="font-semibold text-indigo-650 dark:text-indigo-400 flex items-center gap-1">
                        <Award size={14} className="text-indigo-500 shrink-0" />
                        {selectedMemberPoints} Poin
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-505">Saldo Saat Ini</span>
                    <span className="font-semibold">Rp {selectedMember?.sukarelaBalance.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-505">Total Belanja</span>
                    <span className="font-semibold">Rp {totalAmount.toLocaleString('id-ID')}</span>
                  </div>
                  {appliedVoucher && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-505">Diskon Voucher</span>
                      <span className="font-semibold text-green-600">- Rp {Number(appliedVoucher.discount).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-550">Potongan Saldo</span>
                    <span className="font-semibold text-red-500">- Rp {discountedTotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-800 my-2 pt-2.5 flex justify-between text-sm font-bold">
                    <span>Sisa Saldo</span>
                    <span className={selectedMember && (selectedMember.sukarelaBalance - discountedTotal >= 0) ? 'text-green-655 dark:text-green-400' : 'text-red-500'}>
                      Rp {selectedMember ? (selectedMember.sukarelaBalance - discountedTotal).toLocaleString('id-ID') : 0}
                    </span>
                  </div>
                </div>
                {selectedMember && (selectedMember.sukarelaBalance - discountedTotal < 0) ? (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs rounded-lg border border-red-100 dark:border-red-900/30 font-medium">
                    ⚠️ Saldo Simpanan Sukarela anggota tidak mencukupi untuk melakukan transaksi ini. Silakan setor simpanan atau gunakan pembayaran tunai.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="pos-pin-input" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">PIN Transaksi Koperasi (6 Digit)</label>
                      <input
                        type="password"
                        id="pos-pin-input"
                        maxLength={6}
                        placeholder="••••••"
                        className="w-full p-3 text-center tracking-[1.2em] font-black text-2xl border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-955 text-slate-800 dark:text-slate-200"
                        value={pin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val.length <= 6) setPin(val);
                        }}
                      />
                    </div>

                    {/* Visual PIN Pad */}
                    <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto pt-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            if (pin.length < 6) setPin(pin + num);
                          }}
                          className="py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-lg font-bold rounded-lg transition-colors text-slate-700 dark:text-slate-200"
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setPin('')}
                        className="py-2.5 bg-red-50 dark:bg-red-950/20 text-red-650 text-xs font-bold rounded-lg"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (pin.length < 6) setPin(pin + '0');
                        }}
                        className="py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-lg font-bold rounded-lg transition-colors text-slate-700 dark:text-slate-200"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        onClick={() => setPin(pin.slice(0, -1))}
                        className="py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 font-bold rounded-lg flex items-center justify-center text-sm text-slate-700 dark:text-slate-200"
                      >
                        ⌫
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <Button className="w-1/2" variant="secondary" onClick={() => setShowPaymentModal(false)} disabled={processing}>
                Batal
              </Button>
              <Button
                className="w-1/2"
                onClick={submitCheckout}
                isLoading={processing}
                disabled={
                  processing ||
                  (paymentMethod === 'CASH' && Number(cashReceived) < discountedTotal) ||
                  (paymentMethod === 'SAVING' && (!selectedMember || selectedMember.sukarelaBalance < discountedTotal || pin.length !== 6))
                }
              >
                Bayar Sekarang
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 text-green-600 dark:bg-green-950/30 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Transaksi Berhasil!</h4>
            <p className="text-sm text-slate-505 mb-6">Pembayaran telah berhasil diproses.</p>

            <div className="flex flex-col gap-2">
              <Button className="w-full flex items-center justify-center gap-2 py-3" onClick={() => lastSaleRecord && printReceipt(lastSaleRecord)}>
                <CreditCard size={18} /> Cetak Struk Belanja
              </Button>
              <Button
                variant="secondary"
                className="w-full py-3"
                onClick={() => {
                  setShowPaymentModal(false);
                  setCheckoutSuccess(false);
                  setLastSaleRecord(null);
                }}
              >
                Tutup & Transaksi Baru
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

PaymentModal.displayName = 'PaymentModal';
