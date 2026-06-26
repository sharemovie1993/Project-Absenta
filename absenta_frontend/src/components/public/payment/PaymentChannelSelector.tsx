import React from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Wallet, Check } from 'lucide-react';
import { type TripayChannel } from '@/types/invoice';

interface PaymentChannelSelectorProps {
  selectedChannel: string;
  selectedChannelObj?: TripayChannel;
  openChannelMenu: boolean;
  setOpenChannelMenu: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  groupOrder: string[];
  groupedChannels: Record<string, TripayChannel[]>;
  onSelect: (code: string) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  menuPos: { top: number; left: number; width: number };
  setMenuPos: (pos: { top: number; left: number; width: number }) => void;
}

export const PaymentChannelSelector: React.FC<PaymentChannelSelectorProps> = ({
  selectedChannel,
  selectedChannelObj,
  openChannelMenu,
  setOpenChannelMenu,
  searchQuery,
  setSearchQuery,
  groupOrder,
  groupedChannels,
  onSelect,
  triggerRef,
  menuPos,
  setMenuPos
}) => {
  return (
    <div className="relative">
      <button
        id="paymentMethodTrigger"
        type="button"
        ref={triggerRef}
        onClick={() => {
          const r = triggerRef.current?.getBoundingClientRect();
          if (r) setMenuPos({ top: r.bottom + window.scrollY, left: r.left + window.scrollX, width: r.width });
          setOpenChannelMenu(!openChannelMenu);
        }}
        className="w-full h-16 px-6 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-left flex items-center justify-between hover:border-blue-200 transition-all outline-none"
      >
        <div className="flex items-center gap-4">
          {selectedChannelObj?.icon_url ? (
            <img src={selectedChannelObj.icon_url} alt="" className="h-6 w-auto max-w-[80px] object-contain" />
          ) : <Wallet className="w-6 h-6 text-slate-300" />}
          <span className={`text-lg font-bold ${selectedChannelObj ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
            {selectedChannelObj?.name || 'Pilih Metode Pembayaran'}
          </span>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openChannelMenu ? 'rotate-180' : ''}`} />
      </button>

      {openChannelMenu && createPortal(
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-[9999] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden mt-2 max-h-[400px] overflow-y-auto"
          style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
        >
          <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              aria-label="Cari metode pembayaran"
              placeholder="Cari metode..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-0 outline-none w-full text-sm font-medium" 
            />
          </div>
          {groupOrder.map(group => (
            <div key={group}>
              <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">{group}</div>
              <div className="p-2 space-y-1">
                {groupedChannels[group].map(c => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => { onSelect(c.code); setOpenChannelMenu(false); }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      {c.icon_url ? (
                        <img src={c.icon_url} alt="" className="h-5 w-auto max-w-[60px] object-contain grayscale group-hover:grayscale-0" />
                      ) : <Wallet className="w-5 h-5 text-slate-300" />}
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{c.name}</span>
                    </div>
                    {selectedChannel === c.code && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </motion.div>,
        document.body
      )}
    </div>
  );
};
