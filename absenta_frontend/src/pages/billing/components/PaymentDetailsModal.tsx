import React from 'react';
import { 
  CreditCard, 
  Download, 
  FileText,
  Clock,
  Image,
  ExternalLink,
  AlertCircle,
  MessageSquare,
  CheckCircle
} from 'lucide-react';
import { Button, Modal, ModalFooter } from '../../../components/ui';
import type { PaymentRecord } from '../../../types/payments';
import { formatCurrency, formatDate } from '../../../utils/layoutUtils';

interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPayment: PaymentRecord | null;
  isSuperAdmin: boolean;
  loading: boolean;
  onConfirmPayment: (paymentId: string) => void;
  onDownloadReceipt: () => void;
}

export const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = React.memo(({
  isOpen,
  onClose,
  selectedPayment,
  isSuperAdmin,
  loading,
  onConfirmPayment,
  onDownloadReceipt
}) => {
  if (!selectedPayment) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📋 Detail Pembayaran"
      size="lg"
    >
      <div className="space-y-8 py-2">
        {/* Premium Summary Header */}
        <div className="relative overflow-hidden rounded-xl border border-blue-100 dark:border-blue-900/30 bg-gradient-to-br from-blue-50 to-white dark:from-slate-800/80 dark:to-slate-900 p-6 shadow-sm">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CreditCard size={80} className="text-blue-600" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-blue-500 mb-1">Total Transaksi</p>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {formatCurrency(selectedPayment.amount)}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Status Pembayaran</p>
                <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                  {selectedPayment.status || 'PENDING'}
                </p>
              </div>
              <div className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-sm ${
                (selectedPayment.status === 'SUCCESS' || selectedPayment.status === 'PAID' || selectedPayment.status === 'COMPLETED' || selectedPayment.status === 'SETTLEMENT')
                  ? 'bg-emerald-500 text-white shadow-emerald-200' 
                  : (selectedPayment.status === 'FAILED' || selectedPayment.status === 'CANCELLED' || selectedPayment.status === 'EXPIRED')
                  ? 'bg-rose-500 text-white shadow-rose-200'
                  : 'bg-amber-500 text-white shadow-amber-200'
              }`}>
                {selectedPayment.status || 'PENDING'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Section: Transaksi */}
          <div className="space-y-6">
            <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-5 border border-slate-100 dark:border-slate-800">
              <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                <FileText size={14} className="text-blue-500" /> Informasi Transaksi
              </h4>
              <div className="space-y-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Payment ID</span>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200 font-mono truncate">{selectedPayment.id}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">No. Invoice</span>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400">{(selectedPayment as any)?.invoice_number || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Metode</span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">{(selectedPayment as any)?.payment_method || '-'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Gateway</span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">{selectedPayment.gateway || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Dibayar Oleh</span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 truncate">{selectedPayment?.paid_by_name || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-5 border border-slate-100 dark:border-slate-800">
              <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                <Clock size={14} className="text-blue-500" /> Timeline & Audit
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Waktu Pembuatan</span>
                     <span className="text-xs font-black text-slate-700 dark:text-slate-200">{formatDate(selectedPayment.created_at)}</span>
                   </div>
                   <div className="w-1 h-8 bg-slate-200 dark:bg-slate-700 rounded-full mx-4" />
                   <div className="flex flex-col text-right">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Waktu Pembayaran</span>
                     <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                       {selectedPayment.paid_at ? formatDate(selectedPayment.paid_at) : (
                         <span className="text-amber-500 uppercase">Menunggu</span>
                       )}
                     </span>
                   </div>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Terakhir Diperbarui</span>
                     <span className="text-xs font-medium text-slate-500">{formatDate(selectedPayment.updated_at)}</span>
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Bukti & Catatan */}
          <div className="space-y-6">
            {selectedPayment.proof_url ? (
              <div className="group relative bg-white dark:bg-slate-900 rounded-xl border-2 border-dashed border-blue-100 dark:border-slate-800 overflow-hidden transition-all hover:border-blue-300">
                <div className="absolute top-0 left-0 w-full p-3 z-10 bg-gradient-to-b from-black/50 to-transparent">
                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                     <Image size={14} /> Bukti Transfer Klien
                  </h4>
                </div>
                <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800">
                  <img 
                    src={selectedPayment.proof_url} 
                    alt="Proof of Payment" 
                    className="w-full h-full object-cover cursor-zoom-in transition-transform group-hover:scale-105"
                    onClick={() => window.open(selectedPayment.proof_url, '_blank')}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                     <span className="text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-blue-600 rounded-full">Buka Ukuran Penuh</span>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                   <Button 
                     size="sm" 
                     variant="outline" 
                     className="w-full h-9 text-[10px] font-black uppercase tracking-widest gap-2 border-slate-200" 
                     onClick={() => window.open(selectedPayment.proof_url, '_blank')}
                   >
                     <ExternalLink size={12} /> External Preview
                   </Button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/20 rounded-xl p-8 border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                 <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                    <AlertCircle size={24} className="text-slate-400" />
                 </div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum ada bukti yang diunggah</p>
              </div>
            )}

            {selectedPayment.note && (
              <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-xl p-5 border border-amber-100 dark:border-amber-900/30">
                <h4 className="flex items-center gap-2 text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-3">
                  <MessageSquare size={14} /> Catatan Tambahan
                </h4>
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200 leading-relaxed italic">
                  "{selectedPayment.note}"
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <ModalFooter className="bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" className="h-11 px-6 text-xs font-black uppercase tracking-widest rounded-xl border-slate-200" onClick={onClose}>
            Tutup
          </Button>
          
          <div className="flex items-center gap-3">
            {selectedPayment.gateway === 'MANUAL' && (selectedPayment.status === 'PENDING' || selectedPayment.status === 'PROCESSING') && isSuperAdmin && (
              <Button 
                className="h-11 px-8 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 text-white text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] border-none" 
                onClick={() => onConfirmPayment(selectedPayment.id)}
                isLoading={loading}
              >
                <CheckCircle className="w-4 h-4 text-white" />
                Konfirmasi Pembayaran
              </Button>
            )}
            <Button 
              className="h-11 px-6 rounded-xl gap-2 bg-slate-900 hover:bg-slate-800 text-xs font-black uppercase tracking-widest transition-all" 
              onClick={onDownloadReceipt}
            >
              <Download className="w-4 h-4" />
              Receipt
            </Button>
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
});
