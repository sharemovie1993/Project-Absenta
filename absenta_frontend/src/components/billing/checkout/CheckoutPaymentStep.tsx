import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  Copy,
  BookOpen,
  ChevronDown,
  Check,
  ShieldCheck,
  Download
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { formatCurrency } from '@/api/plans.api';
import { resolveProfilePhotoUrl } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface CheckoutPaymentStepProps {
  invoiceDetails: any;
  error: string | null;
  countdown: { dd: number; hh: number; mm: number; ss: number };
  expiredLocal: boolean;
  processing: boolean;
  paymentChannels: any[];
  loadInvoiceDetails: (token: string) => void;
  invoiceToken: string;
  setStep: (step: 'detail' | 'payment' | 'activate') => void;
  setError: (val: string | null) => void;
  handleCheckPaymentStatus: (silent?: boolean) => void;
}

export const CheckoutPaymentStep: React.FC<CheckoutPaymentStepProps> = React.memo(({
  invoiceDetails,
  error,
  countdown,
  expiredLocal,
  processing,
  paymentChannels,
  loadInvoiceDetails,
  invoiceToken,
  setStep,
  setError,
  handleCheckPaymentStatus,
}) => {
  const inv = invoiceDetails?.data || (invoiceDetails?.invoice_number ? invoiceDetails : null);
  const activeTx = inv?.active_transaction;
  const [openInstructionIdx, setOpenInstructionIdx] = useState<number | null>(0);

  const amountVal = Number(inv?.total_amount ?? inv?.amount ?? 0);

  const handleCopyAmount = () => {
    if (amountVal > 0) {
      navigator.clipboard.writeText(String(amountVal));
      toast.success(`Nominal ${formatCurrency(amountVal)} disalin!`);
    }
  };

  const handleCopyPayCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Nomor Virtual Account disalin!');
  };

  const instructions: Array<{ title: string; steps: string[] }> = useMemo(() => {
    const raw = activeTx?.instructions || 
      activeTx?.payment_instructions || 
      inv?.payment_instructions || 
      inv?.instructions;
    
    let parsedRaw = raw;
    if (typeof raw === 'string') {
      try {
        parsedRaw = JSON.parse(raw);
      } catch {
        parsedRaw = [];
      }
    }
    if (parsedRaw && typeof parsedRaw === 'object' && !Array.isArray(parsedRaw)) {
      if (Array.isArray(parsedRaw.instructions)) {
        parsedRaw = parsedRaw.instructions;
      }
    }

    if (Array.isArray(parsedRaw) && parsedRaw.length > 0) {
      return parsedRaw.map((item: any) => {
        if (typeof item === 'string') {
          return { title: 'Langkah Pembayaran', steps: [item] };
        }
        const title = item.title || item.name || 'Petunjuk Pembayaran';
        let steps = item.steps || item.description || [];
        if (typeof steps === 'string') {
          steps = [steps];
        } else if (!Array.isArray(steps)) {
          steps = [];
        }
        return { title, steps };
      });
    }

    // Smart Fallback jika payment gateway belum mengembalikan instructions array
    const payCode = activeTx?.pay_code || inv?.pay_code;

    if (activeTx?.qr_url) {
      return [
        {
          title: 'Cara Pembayaran via QRIS (Semua Bank & E-Wallet)',
          steps: [
            'Buka aplikasi e-wallet (GoPay, OVO, Dana, LinkAja, ShopeePay) atau Mobile Banking berlogo QRIS (BCA, Mandiri, BRI, BNI, Permata, dll).',
            'Pilih menu "Bayar" atau "Scan QR".',
            'Arahkan kamera ke kode QRIS yang tampil di layar.',
            'Periksa nama merchant dan pastikan jumlah pembayaran sudah sesuai.',
            'Masukkan PIN transaksi Anda untuk menyelesaikan pembayaran.'
          ]
        }
      ];
    }

    if (payCode) {
      return [
        {
          title: 'Transfer via Mobile Banking (M-Banking)',
          steps: [
            'Buka aplikasi Mobile Banking pada smartphone Anda dan lakukan login.',
            'Pilih menu Transfer atau Pembayaran > Virtual Account / Tagihan.',
            `Masukkan Nomor Virtual Account: <strong>${payCode}</strong>.`,
            'Pastikan nama penerima dan nominal transfer persis sesuai tagihan.',
            'Konfirmasi transaksi dan masukkan PIN Mobile Banking Anda untuk menyelesaikan.'
          ]
        },
        {
          title: 'Transfer via ATM',
          steps: [
            'Masukkan kartu ATM dan PIN Anda pada mesin ATM.',
            'Pilih menu Transaksi Lainnya > Pembayaran > Virtual Account.',
            `Masukkan Nomor Virtual Account: <strong>${payCode}</strong>.`,
            'Periksa rincian pembayaran di layar ATM.',
            'Tekan Ya / Benar untuk memproses transaksi dan simpan struk bukti transfer.'
          ]
        },
        {
          title: 'Transfer Antar-Bank (ATM Bersama / Prima / ALTO)',
          steps: [
            'Buka aplikasi perbankan atau ATM bank lain.',
            'Pilih menu Transfer Antar-Bank.',
            'Pilih bank tujuan sesuai nama Virtual Account di atas.',
            `Masukkan nomor rekening tujuan dengan nomor Virtual Account: <strong>${payCode}</strong>.`,
            'Masukkan nominal transfer persis sesuai jumlah tagihan hingga digit terakhir.',
            'Selesaikan transaksi hingga bukti transfer berhasil diterbitkan.'
          ]
        }
      ];
    }

    return [];
  }, [activeTx, inv]);

  if (!inv) {
    return (
      <Card className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl shadow-xl border-none">
        {error ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Gagal Memuat Rincian Pembayaran</h3>
            <p className="text-slate-500 text-sm max-w-md leading-relaxed">{error}</p>
            <div className="flex justify-center gap-3 mt-2">
              <Button onClick={() => loadInvoiceDetails(invoiceToken)}>Coba Lagi</Button>
              <Button variant="outline" onClick={() => {
                setStep('detail');
                setError(null);
              }}>Kembali</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-16">
            <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">Menyiapkan rincian pembayaran Anda...</p>
          </div>
        )}
      </Card>
    );
  }

  return (
    <motion.div
      key="payment-step"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-2xl mx-auto w-full px-2 sm:px-0 pb-24 lg:pb-0"
    >
      <Card className="p-5 sm:p-8 border-none shadow-2xl shadow-blue-500/5 ring-1 ring-slate-100 dark:ring-slate-800 bg-white dark:bg-slate-900 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Top Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 mb-6 gap-3">
          <div>
            <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 rounded-full">
              Menunggu Pembayaran
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5 leading-none">
              Selesaikan Pembayaran
            </h3>
            <p className="text-[11px] font-bold text-slate-400 mt-1">
              Invoice Ref: <span className="font-mono text-slate-700 dark:text-slate-300">{inv.invoice_number || invoiceToken}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-xl text-xs font-mono font-bold shrink-0 self-start sm:self-auto">
            <Clock size={14} className="animate-pulse text-amber-600 shrink-0" />
            <span>
              {expiredLocal 
                ? 'Kedaluwarsa' 
                : `${countdown.hh.toString().padStart(2, '0')}:${countdown.mm.toString().padStart(2, '0')}:${countdown.ss.toString().padStart(2, '0')}`
              }
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Amount Card with 1-click Copy */}
          <div className="p-5 sm:p-6 bg-gradient-to-b from-blue-50/50 to-slate-50 dark:from-slate-800/40 dark:to-slate-800/20 border border-blue-100 dark:border-slate-800 rounded-3xl text-center relative group">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
              Jumlah Transfer Pas (Wajib Sesuai)
            </span>
            <div className="flex items-center justify-center gap-2.5 my-1">
              <strong className="text-2xl sm:text-4xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                {formatCurrency(amountVal)}
              </strong>
              <button
                type="button"
                onClick={handleCopyAmount}
                className="p-1.5 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
                title="Salin Nominal Pas"
              >
                <Copy size={15} />
              </button>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
              Harus persis sama hingga 3 digit terakhir agar terverifikasi otomatis
            </span>
          </div>

          {/* QRIS Code Image */}
          {activeTx?.qr_url && (
            <div className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/40 dark:bg-slate-900/30">
              <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xl inline-block border border-slate-100">
                <img
                  src={resolveProfilePhotoUrl(activeTx.qr_url)}
                  alt="QRIS Code"
                  className="w-48 h-48 sm:w-56 sm:h-56 block object-contain"
                />
              </div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-4 text-center max-w-sm leading-relaxed">
                Pindai kode QRIS di atas dengan aplikasi e-wallet Anda (GoPay, OVO, Dana, LinkAja, ShopeePay, BCA Mobile, dll.)
              </span>
            </div>
          )}

          {/* Virtual Account / Pay Code */}
          {activeTx?.pay_code && !activeTx?.qr_url && (
            <div className="p-5 sm:p-6 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-3xl text-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Nomor Virtual Account / Kode Bayar
              </span>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <strong className="text-2xl sm:text-3xl font-mono font-black text-slate-900 dark:text-white tracking-widest select-all">
                  {activeTx.pay_code}
                </strong>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyPayCode(activeTx.pay_code)}
                  className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold gap-1.5"
                >
                  <Copy size={13} />
                  <span>Salin VA</span>
                </Button>
              </div>
              <span className="text-[11px] text-slate-400 block mt-2.5 font-medium">
                Gunakan nomor VA di atas sebagai rekening tujuan transfer di ATM / M-Banking.
              </span>
            </div>
          )}

          {/* Payment Instructions Accordion */}
          {instructions.length > 0 && (
            <div className="space-y-3 pt-5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <BookOpen size={14} className="text-blue-600 dark:text-blue-400" />
                  <span>Petunjuk Pembayaran</span>
                </h4>
                <span className="text-[10px] text-slate-400 font-medium">
                  {instructions.length} Saluran Panduan
                </span>
              </div>

              <div className="space-y-2">
                {instructions.map((inst, idx) => {
                  const isOpen = openInstructionIdx === idx;
                  return (
                    <div 
                      key={idx}
                      className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-2xs transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenInstructionIdx(isOpen ? null : idx)}
                        className="w-full p-3.5 px-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isOpen ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                            {idx + 1}
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {inst.title}
                          </span>
                        </div>
                        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''}`} />
                      </button>

                      {isOpen && (
                        <div className="p-4 pt-2 pb-4 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/60 animate-in fade-in duration-150">
                          <ol className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                            {inst.steps.map((step, sIdx) => (
                              <li key={sIdx} className="flex items-start gap-2.5 leading-relaxed">
                                <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                  {sIdx + 1}
                                </span>
                                <span className="flex-1 text-[11.5px]" dangerouslySetInnerHTML={{ __html: step }} />
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Desktop Actions */}
          <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 py-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Mengecek status pembayaran otomatis...</span>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={() => handleCheckPaymentStatus(false)}
              disabled={processing}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl font-black py-3.5 shadow-lg shadow-blue-500/25 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw size={16} className={`${processing ? 'animate-spin' : ''}`} />
              <span>Verifikasi Pembayaran Sekarang</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Sticky Mobile Verification Bar (Muncul di Mobile < lg) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3.5 px-4 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        <div className="max-w-md mx-auto">
          <Button
            variant="primary"
            size="md"
            onClick={() => handleCheckPaymentStatus(false)}
            disabled={processing}
            className="w-full h-12 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw size={16} className={`${processing ? 'animate-spin' : ''}`} />
            <span>{processing ? 'Memeriksa...' : 'Verifikasi Pembayaran Sekarang'}</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
});
