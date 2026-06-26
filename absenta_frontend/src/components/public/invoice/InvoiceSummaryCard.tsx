import React from 'react';
import { CreditCard, Download, Zap, Wallet, ChevronDown, Check, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui';
import { type TripayChannel } from '@/types/invoice';

interface InvoiceSummaryCardProps {
  status: string;
  totalAmount: number;
  invoiceNumber: string;
  selectedChannel: string;
  selectedChannelObj?: TripayChannel;
  openChannelMenu: boolean;
  setOpenChannelMenu: (open: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  groupOrder: string[];
  groupedChannels: Record<string, TripayChannel[]>;
  onSelectChannel: (code: string) => void;
  onPay: () => void;
  onDownload: () => void;
  processingPayment: boolean;
  downloadingPdf: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  menuPos: { top: number; left: number; width: number };
  setMenuPos: (pos: { top: number; left: number; width: number }) => void;
}

export const InvoiceSummaryCard: React.FC<InvoiceSummaryCardProps> = ({
  status,
  totalAmount,
  invoiceNumber,
  selectedChannel,
  selectedChannelObj,
  openChannelMenu,
  setOpenChannelMenu,
  searchTerm,
  setSearchTerm,
  groupOrder,
  groupedChannels,
  onSelectChannel,
  onPay,
  onDownload,
  processingPayment,
  downloadingPdf,
  triggerRef,
  menuPos,
  setMenuPos
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-blue-500/5 relative overflow-hidden group">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Tagihan</span>
          <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
            status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
            status === 'CANCELLED' ? 'bg-red-50 text-red-600 border border-red-100' :
            'bg-amber-50 text-amber-600 border border-amber-100'
          }`}>
            {status === 'PAID' ? 'LUNAS' : status === 'CANCELLED' ? 'DIBATALKAN' : 'MENUNGGU PEMBAYARAN'}
          </div>
        </div>
        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
          Rp{totalAmount.toLocaleString('id-ID')}
        </h3>
        <p className="text-[11px] font-black text-slate-400 tracking-widest uppercase mb-8">{invoiceNumber}</p>

        <div className="space-y-4">
          {status !== 'PAID' && status !== 'CANCELLED' && (
            <div className="space-y-4">
              <div className="relative">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Metode Pembayaran</label>
                <button
                  ref={triggerRef}
                  onClick={() => {
                    const r = triggerRef.current?.getBoundingClientRect();
                    if (r) setMenuPos({ top: r.bottom + window.scrollY, left: r.left + window.scrollX, width: r.width });
                    setOpenChannelMenu(!openChannelMenu);
                  }}
                  className={`w-full h-14 px-4 rounded-xl border-2 transition-all flex items-center justify-between outline-none ${openChannelMenu ? 'border-blue-500 bg-blue-50/10' : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-200'}`}
                >
                  <div className="flex items-center gap-3">
                    {selectedChannelObj ? (
                      <img src={selectedChannelObj.icon_url} alt="" className="h-5 w-auto max-w-[60px] object-contain" />
                    ) : <Wallet className="w-5 h-5 text-slate-300" />}
                    <span className={`text-xs font-bold truncate max-w-[150px] ${selectedChannelObj ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                      {selectedChannelObj?.name || 'Pilih Cara Bayar'}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openChannelMenu ? 'rotate-180' : ''}`} />
                </button>

                {openChannelMenu && createPortal(
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="fixed z-[9999] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden mt-1 max-h-[300px] flex flex-col" 
                    style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
                  >
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <Search className="w-3 h-3 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Cari..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="bg-transparent border-0 outline-none w-full text-xs font-bold text-slate-700 dark:text-slate-200" 
                      />
                    </div>
                    <div className="overflow-y-auto flex-grow">
                      {groupOrder.map(group => (
                        <div key={group}>
                          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 text-[8px] font-black uppercase text-slate-400 tracking-widest">{group}</div>
                          <div className="p-1 space-y-0.5">
                            {groupedChannels[group]?.map(c => (
                              <button 
                                key={c.code} 
                                onClick={() => { onSelectChannel(c.code); setOpenChannelMenu(false); }} 
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left ${selectedChannel === c.code ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <img src={c.icon_url} alt="" className="h-4 w-auto max-w-[50px] object-contain" />
                                  <span className={`text-[11px] font-bold ${selectedChannel === c.code ? 'text-blue-600' : 'text-slate-600 dark:text-slate-300'}`}>{c.name}</span>
                                </div>
                                {selectedChannel === c.code && <Check className="w-3 h-3 text-blue-600" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>,
                  document.body
                )}
              </div>

              <Button 
                onClick={onPay} 
                disabled={!selectedChannel || processingPayment} 
                className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {processingPayment ? <Zap className="w-4 h-4 animate-spin" /> : <CreditCard size={16} />}
                Bayar Sekarang
              </Button>
            </div>
          )}
          
          <Button 
            onClick={onDownload} 
            disabled={downloadingPdf} 
            className="w-full h-14 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-black uppercase rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2"
          >
            {downloadingPdf ? <Zap className="w-4 h-4 animate-spin" /> : <Download size={16} />}
            Download PDF
          </Button>
        </div>
      </div>
    </div>
  );
};
