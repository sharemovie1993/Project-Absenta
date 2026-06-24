import React from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Award, Printer } from 'lucide-react';
import type { SaleRecord, MemberInfo } from '../../../pages/cooperative/Vouchers';
import type { CoopSettingsData } from '../../../utils/cooperative/coopDocUtils';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSale: SaleRecord | null;
  coopSettings: CoopSettingsData | null;
  memberInfo: MemberInfo | null;
  user: { full_name?: string } | null;
  printReceipt: (sale: SaleRecord) => void;
}

export const ReceiptModal = React.memo<ReceiptModalProps>(({
  isOpen,
  onClose,
  selectedSale,
  coopSettings,
  memberInfo,
  user,
  printReceipt
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detail Struk Belanja"
      size="md"
    >
      {selectedSale && (
        <div className="space-y-6">
          {/* Visual receipt layout */}
          <div className="bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg max-w-sm mx-auto font-mono text-sm text-slate-800 dark:text-slate-200">
            <div className="text-center space-y-1">
              <h4 className="font-extrabold text-base text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                {coopSettings?.cooperative_name || 'KOPERASI SEKOLAH'}
              </h4>
              <p className="text-xs text-slate-550 dark:text-slate-400">
                {coopSettings?.cooperative_address || 'Kantin & Minimarket'}
              </p>
              {coopSettings?.cooperative_phone && (
                <p className="text-xs text-slate-550 dark:text-slate-400">
                  Telp: {coopSettings.cooperative_phone}
                </p>
              )}
              <p className="text-[11px] text-slate-400 mt-2 font-semibold">
                {new Date(selectedSale.date).toLocaleString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            <div className="border-t border-dashed border-slate-300 dark:border-slate-800 my-4" />

            <div className="space-y-1 text-xs font-semibold">
              <div className="flex justify-between">
                <span className="text-slate-400">No Struk:</span>
                <span className="text-slate-950 dark:text-slate-50 font-bold">#{selectedSale.id.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pembeli:</span>
                <span className="text-slate-900 dark:text-slate-100">
                  {memberInfo?.User?.full_name || user?.full_name || 'Tamu'}{' '}
                  {memberInfo?.memberNo ? `(${memberInfo.memberNo})` : ''}
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 dark:border-slate-800 my-4" />

            {/* Items List */}
            <div className="space-y-3">
              {(selectedSale.items || []).map((item: { product?: { name?: string }; quantity: number; price: string | number }, idx: number) => (
                <div key={idx} className="flex justify-between text-xs">
                  <div className="flex-1 pr-4">
                    <p className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                      {item.product?.name || 'Produk'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      {item.quantity} x Rp {Number(item.price).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <span className="font-extrabold text-slate-955 dark:text-slate-50 shrink-0">
                    Rp {(Number(item.price) * item.quantity).toLocaleString('id-ID')}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-300 dark:border-slate-800 my-4" />

            {/* Summary */}
            <div className="space-y-1.5 text-xs font-semibold">
              {selectedSale.discount > 0 && (
                <div className="flex justify-between text-red-655 dark:text-red-400 font-bold">
                  <span>DISKON VOUCHER</span>
                  <span>-Rp {Number(selectedSale.discount).toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-slate-955 dark:text-slate-50 text-sm pt-1">
                <span>TOTAL</span>
                <span>Rp {Number(selectedSale.total).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-slate-400 pt-1">
                <span>Metode Bayar:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {selectedSale.paymentMethod === 'SAVING' ? 'Tabungan' : 'Tunai'}
                </span>
              </div>
              {selectedSale.paymentMethod === 'CASH' && (
                <>
                  <div className="flex justify-between text-slate-400">
                    <span>Tunai Diterima:</span>
                    <span className="text-slate-700 dark:text-slate-300">Rp {Number(selectedSale.cashAmount || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Kembalian:</span>
                    <span className="text-slate-700 dark:text-slate-300">Rp {Number(selectedSale.changeAmount || 0).toLocaleString('id-ID')}</span>
                  </div>
                </>
              )}
            </div>

            {/* Points Earned Banner */}
            {selectedSale.total >= 10000 && (
              <div className="mt-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-705 dark:text-emerald-400 text-xs px-3 py-2 rounded-xl flex items-center justify-between border border-emerald-100 dark:border-emerald-900/30">
                <span className="flex items-center gap-1 font-bold">
                  <Award size={14} className="animate-pulse text-emerald-505" /> Poin Diperoleh:
                </span>
                <span className="font-extrabold">+{Math.floor(selectedSale.total / 10000)} Poin</span>
              </div>
            )}

            <div className="border-t border-dashed border-slate-300 dark:border-slate-800 my-4" />

            <div className="text-center text-[10px] text-slate-450 font-bold space-y-0.5 tracking-wide uppercase">
              <p>Terima Kasih</p>
              <p>Selamat Belanja Kembali</p>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
            <Button
              variant="outline"
              className="hover:scale-105 active:scale-95 transition-all text-xs"
              onClick={onClose}
            >
              Tutup
            </Button>
            <Button
              variant="primary"
              className="bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95 transition-all text-xs shadow-sm"
              icon={<Printer size={16} />}
              onClick={() => printReceipt(selectedSale)}
            >
              Cetak Struk
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
});

ReceiptModal.displayName = 'ReceiptModal';
