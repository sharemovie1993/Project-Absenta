import React from 'react';
import { XCircle } from 'lucide-react';
import { Button } from '../../ui';

interface PaymentInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentInstructionsModal = React.memo<PaymentInstructionsModalProps>(({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-955/80 backdrop-blur-sm animate-in fade-in duration-300"
      aria-labelledby="payment-instructions-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-955/20 flex justify-between items-center">
          <div>
            <h3 id="payment-instructions-title" className="text-sm font-black uppercase tracking-wider text-slate-850 dark:text-slate-100">
              Panduan Pembayaran Angsuran
            </h3>
            <p className="text-[10px] text-slate-400">Instruksi penyetoran angsuran kredit bulanan anggota</p>
          </div>
          <button 
            onClick={onClose}
            aria-label="Tutup dialog"
            className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 p-1"
          >
            <XCircle size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0 border border-indigo-100/20">
                1
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">Ketahui Jumlah Tagihan & Jatuh Tempo</p>
                <p className="mt-0.5">Periksa kolom <strong>Angsuran Bulan Ini</strong> atau klik tombol <strong>Detail</strong> pada baris pinjaman Anda untuk melihat daftar cicilan dan tanggal jatuh temponya.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0 border border-indigo-100/20">
                2
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">Metode Penyetoran Angsuran</p>
                <p className="mt-0.5">Koperasi Sekolah melayani dua metode pembayaran resmi:</p>
                <ul className="list-disc pl-4 mt-1.5 space-y-1 font-medium">
                  <li><strong>Tunai/Cash:</strong> Serahkan uang tunai langsung ke Bendahara Koperasi di ruang kantor koperasi sekolah.</li>
                  <li><strong>Transfer Bank:</strong> Transfer ke rekening Bank Mandiri Koperasi: <span className="font-black text-indigo-600 bg-indigo-50/10 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded border border-indigo-500/10">123-4567-890</span> a.n <strong>Koperasi SMK Negeri 1 Plered</strong>.</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0 border border-indigo-100/20">
                3
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">Konfirmasi Pembayaran</p>
                <p className="mt-0.5">Setelah melakukan transfer, silakan serahkan bukti transfer kepada Bendahara Koperasi untuk dicatat ke sistem agar status cicilan berubah menjadi <strong>"Lunas"</strong>.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-955/20 flex justify-end">
          <Button
            onClick={onClose}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs px-5"
          >
            Saya Mengerti
          </Button>
        </div>
      </div>
    </div>
  );
});

PaymentInstructionsModal.displayName = 'PaymentInstructionsModal';
