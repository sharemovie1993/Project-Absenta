import React from 'react';
import { ShoppingCart, Award, X, Search, Minus, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import type { CartItem, HeldCart, CoopMember } from './usePOSState';

interface CartPanelProps {
  cart: CartItem[];
  heldCarts: HeldCart[];
  setShowHeldCartsModal: (show: boolean) => void;
  selectedMember: CoopMember | null;
  setSelectedMember: (m: CoopMember | null) => void;
  selectedMemberPoints: number | null;
  memberSearch: string;
  setMemberSearch: (val: string) => void;
  showMemberDropdown: boolean;
  setShowMemberDropdown: (show: boolean) => void;
  loadingMembers: boolean;
  members: CoopMember[];
  handleOpenQuickRegister: () => void;
  updateQty: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  totalAmount: number;
  handleHoldCart: () => void;
  handleCheckout: () => void;
  processing: boolean;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  cart,
  heldCarts,
  setShowHeldCartsModal,
  selectedMember,
  setSelectedMember,
  selectedMemberPoints,
  memberSearch,
  setMemberSearch,
  showMemberDropdown,
  setShowMemberDropdown,
  loadingMembers,
  members,
  handleOpenQuickRegister,
  updateQty,
  removeFromCart,
  totalAmount,
  handleHoldCart,
  handleCheckout,
  processing
}) => {
  return (
    <div className="w-1/3 flex flex-col bg-slate-50/50 dark:bg-slate-900/10 overflow-hidden relative">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 flex justify-between items-center">
        <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center">
          <ShoppingCart className="mr-2" size={20} /> Keranjang
        </h2>
        <div className="flex items-center gap-2">
          {heldCarts.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHeldCartsModal(true)}
              className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-205 dark:border-amber-900/30 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors shadow-sm"
            >
              <span>⏸️</span> {heldCarts.length} Ditahan
            </button>
          )}
          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            {cart.reduce((sum, item) => sum + item.qty, 0)} Items
          </span>
        </div>
      </div>

      {/* Member Selection Panel */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 relative z-30">
        {selectedMember ? (
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex-1 min-w-0 mr-2">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm truncate">{selectedMember.name}</h4>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                No: {selectedMember.memberNo} | Saldo: <span className="font-bold text-blue-650">Rp {selectedMember.sukarelaBalance.toLocaleString('id-ID')}</span>
              </p>
              {selectedMemberPoints !== null && (
                <p className="text-xs text-indigo-700 dark:text-indigo-400 flex items-center gap-1 mt-1 font-semibold">
                  <Award size={12} className="text-indigo-505 shrink-0" />
                  <span>Poin Loyalitas: {selectedMemberPoints} Poin</span>
                </p>
              )}
            </div>
            <button 
              type="button"
              onClick={() => {
                setSelectedMember(null);
                setMemberSearch('');
              }}
              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full text-blue-500 shrink-0"
              aria-label="Hapus Anggota"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                id="searchMember"
                name="searchMember"
                placeholder="Pilih Anggota Koperasi..." 
                className="w-full pl-9 pr-12 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900"
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setShowMemberDropdown(true);
                }}
                onFocus={() => setShowMemberDropdown(true)}
                aria-label="Cari Anggota Koperasi"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center pointer-events-none select-none">
                <kbd className="px-1.5 py-0.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded shadow-sm">F4</kbd>
              </div>
              {showMemberDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => setShowMemberDropdown(false)} 
                  />
                  <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                    {loadingMembers ? (
                      <div className="p-3 text-sm text-slate-500 text-center">Mencari...</div>
                    ) : members.length === 0 ? (
                      <div className="p-3 text-sm text-slate-500 text-center">
                        {memberSearch.trim().length >= 2 ? 'Anggota tidak ditemukan.' : 'Ketik min. 2 huruf...'}
                      </div>
                    ) : (
                      members.map(m => (
                        <div 
                          key={m.id}
                          onClick={() => {
                            setSelectedMember(m);
                            setShowMemberDropdown(false);
                            setMemberSearch('');
                          }}
                          className="p-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0"
                        >
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{m.name}</div>
                          <div className="text-xs text-slate-500">
                            No: {m.memberNo} | Saldo: Rp {m.sukarelaBalance.toLocaleString('id-ID')}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleOpenQuickRegister}
              className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-105 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-xs font-semibold rounded-lg whitespace-nowrap transition-all flex items-center gap-1 shrink-0 shadow-sm hover:shadow-blue-500/10"
            >
              <span>+</span> Daftar Cepat
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <ShoppingCart size={48} className="mb-2 opacity-20" />
            <p>Keranjang kosong</p>
          </div>
        ) : (
          cart?.map(item => (
            <div key={item.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex-1 min-w-0 mr-2">
                <h4 className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">{item.name}</h4>
                <p className="text-blue-600 font-bold text-sm">
                  Rp {(Number(item.price) * item.qty).toLocaleString('id-ID')}
                </p>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button 
                  type="button"
                  onClick={() => updateQty(item.id, -1)}
                  className="p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Kurangi Qty"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-medium">{item.qty}</span>
                <button 
                  type="button"
                  onClick={() => updateQty(item.id, 1)}
                  className="p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Tambah Qty"
                >
                  <Plus size={14} />
                </button>
                <button 
                  type="button"
                  onClick={() => removeFromCart(item.id)}
                  className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded ml-1"
                  aria-label="Hapus Item"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="flex justify-between items-center mb-4">
          <span className="text-slate-600 dark:text-slate-400">Total</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Rp {totalAmount.toLocaleString('id-ID')}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 py-3 text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700"
            onClick={handleHoldCart}
            disabled={cart.length === 0}
          >
            Tahan
          </Button>
          <Button 
            className="flex-[2] py-3 text-lg animate-pulse hover:animate-none flex items-center justify-center gap-2" 
            onClick={handleCheckout}
            disabled={cart.length === 0 || processing}
            isLoading={processing}
          >
            <span>Bayar Sekarang</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-blue-100 bg-blue-700 border border-blue-500 rounded shadow-sm pointer-events-none select-none">F9</kbd>
          </Button>
        </div>
      </div>
    </div>
  );
};
