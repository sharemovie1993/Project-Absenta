import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';
import type { CoopMember, Voucher, CartItem } from '../../../pages/cooperative/POS';

export interface HeldCart {
  id: string;
  cart: CartItem[];
  selectedMember: CoopMember | null;
  appliedVoucher: Voucher | null;
  voucherCode: string;
  holdTime: string;
}

interface HeldCartsModalProps {
  showHeldCartsModal: boolean;
  setShowHeldCartsModal: (show: boolean) => void;
  heldCarts: HeldCart[];
  setHeldCarts: React.Dispatch<React.SetStateAction<HeldCart[]>>;
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
  setSelectedMember: (member: CoopMember | null) => void;
  setAppliedVoucher: (voucher: Voucher | null) => void;
  setVoucherCode: (code: string) => void;
}

export const HeldCartsModal = React.memo<HeldCartsModalProps>(({
  showHeldCartsModal,
  setShowHeldCartsModal,
  heldCarts,
  setHeldCarts,
  cart,
  setCart,
  setSelectedMember,
  setAppliedVoucher,
  setVoucherCode,
}) => {
  if (!showHeldCartsModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center mb-5 shrink-0">
          <h3 className="text-xl font-bold text-slate-905 dark:text-slate-100 flex items-center gap-2">
            <span>⏸️</span> Antrean Ditahan
          </h3>
          <button
            onClick={() => setShowHeldCartsModal(false)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {!heldCarts || heldCarts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Tidak ada antrean yang sedang ditahan.</div>
          ) : (
            heldCarts?.map((hc) => (
              <div
                key={hc.id}
                className="p-4 bg-slate-50/50 dark:bg-slate-955/20 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 font-mono">#{hc.id}</span>
                    <p className="text-xs text-slate-505">Ditahan pada: {new Date(hc.holdTime).toLocaleTimeString('id-ID')}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500 border-red-200 hover:bg-red-50 py-1 px-2.5 text-xs rounded-lg"
                      onClick={() => {
                        setHeldCarts((prev) => prev.filter((item) => item.id !== hc.id));
                        toast.success('Antrean dihapus');
                      }}
                    >
                      Hapus
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      className="bg-blue-600 hover:bg-blue-700 py-1 px-2.5 text-xs rounded-lg text-white"
                      onClick={() => {
                        if (cart?.length > 0) {
                          const confirmResume = window.confirm(
                            'Keranjang aktif Anda tidak kosong. Apakah Anda ingin menimpa keranjang aktif dengan antrean ini?'
                          );
                          if (!confirmResume) return;
                        }
                        setCart(hc.cart);
                        setSelectedMember(hc.selectedMember);
                        setAppliedVoucher(hc.appliedVoucher);
                        setVoucherCode(hc.voucherCode || '');
                        setHeldCarts((prev) => prev.filter((item) => item.id !== hc.id));
                        setShowHeldCartsModal(false);
                        toast.success('Antrean dilanjutkan!');
                      }}
                    >
                      Lanjutkan
                    </Button>
                  </div>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 my-2" />
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pembeli:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{hc.selectedMember?.name || 'Tamu'}</span>
                  </div>
                  <div className="flex justify-between flex-wrap gap-x-2">
                    <span className="text-slate-400">Item:</span>
                    <span className="text-slate-700 dark:text-slate-330 font-medium truncate max-w-[250px]">
                      {hc.cart?.map((item) => `${item.name} (x${item.qty})`).join(', ')}
                    </span>
                  </div>
                  {hc.appliedVoucher && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Voucher:</span>
                      <span className="text-green-600 font-bold">{hc.appliedVoucher.code}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200 text-sm pt-1">
                    <span>Total:</span>
                    <span>
                      Rp {hc.cart?.reduce((sum, item) => sum + Number(item.price) * item.qty, 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
});

HeldCartsModal.displayName = 'HeldCartsModal';
