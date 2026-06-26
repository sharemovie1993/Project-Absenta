import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui';

interface InvoiceVerificationViewProps {
  inv: any;
  formatAuditDate: (dateStr: any) => string;
  onBack: () => void;
  publicUrl: string;
}

export const InvoiceVerificationView: React.FC<InvoiceVerificationViewProps> = ({
  inv,
  formatAuditDate,
  onBack,
  publicUrl
}) => {
  return (
    <div className="max-w-2xl w-full mx-auto selection-none" id="invoice-summary-card">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-blue-500/10 overflow-hidden relative"
      >
        <div className="bg-slate-50 dark:bg-slate-800/50 p-10 flex flex-col items-center border-b border-slate-100 dark:border-slate-800">
           <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
              <ShieldCheck className="w-12 h-12 text-emerald-500" />
           </div>
           <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">DOKUMEN TERVERIFIKASI</h2>
           <div className="mt-2 flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Valid & Aman</span>
           </div>
        </div>

        <div className="p-10 space-y-8">
           <div className="grid grid-cols-2 gap-8">
              <div>
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Nomor Tagihan</span>
                 <div className="text-base font-bold text-slate-900 dark:text-white px-1">#{inv.invoice_number}</div>
              </div>
              <div className="text-right">
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Tanggal Terbit</span>
                 <div className="text-base font-bold text-slate-900 dark:text-white px-1">
                   {formatAuditDate(inv.issue_date).split(' - ')[0]}
                 </div>
              </div>
              <div>
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Penerima Tagihan</span>
                 <div className="text-base font-bold text-slate-900 dark:text-white px-1">{inv.tenant?.name || 'Klien Retail'}</div>
              </div>
              <div className="text-right">
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Total Pembayaran</span>
                 <div className="text-base font-black text-blue-600 px-1">
                   Rp {(inv.total_amount || 0).toLocaleString('id-ID')}
                 </div>
              </div>
           </div>

           <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                 <span>Status Audit</span>
                 <span className="text-emerald-500">Passed</span>
              </div>
              <div className="h-px bg-slate-200 dark:bg-slate-700" />
              <div className="space-y-3">
                 <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Tanda Tangan Digital</span>
                    <span className="font-mono text-slate-900 dark:text-slate-300">Verified by Absenta-CA</span>
                 </div>
                 <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Waktu Verifikasi</span>
                    <span className="font-medium text-slate-900 dark:text-slate-300">{formatAuditDate(new Date())}</span>
                 </div>
              </div>
           </div>

           <div className="flex flex-col gap-3">
              <Button 
                onClick={() => window.open(publicUrl, '_blank')}
                className="w-full h-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest text-[10px] shadow-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
              >
                <ExternalLink size={16} />
                Lihat Invoice Asli
              </Button>
              <Button 
                variant="ghost"
                onClick={onBack}
                className="w-full h-12 rounded-2xl text-slate-500 font-bold uppercase tracking-widest text-[9px] hover:bg-slate-100"
              >
                <ArrowLeft size={14} className="mr-2" />
                Kembali
              </Button>
           </div>
        </div>
      </motion.div>
    </div>
  );
};
