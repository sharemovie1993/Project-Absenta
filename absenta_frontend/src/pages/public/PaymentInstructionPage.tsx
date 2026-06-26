import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { 
  ArrowLeft, 
  Copy, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  QrCode,
  ShieldCheck,
  Check,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, SectionCard } from '@/components/ui';
import axiosInstance from '@/lib/axiosInstance';
import toast from 'react-hot-toast';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';

interface PaymentInstructionStep {
  title: string;
  steps: string[];
}

type PaymentStatusData = {
  id: string;
  status: string;
  billing_id: string;
  gateway: string;
  payment_method: string;
  amount: number;
  currency: string;
  created_at: string;
  paid_at?: string;
  expired_at?: string;
  payment_url?: string;
  qr_string?: string;
  gateway_response?: Record<string, any>;
  payCode?: string;
  instructions?: PaymentInstructionStep[];
  qrUrl?: string;
  totalFee?: number;
  proof_url?: string;
  manual_payment?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    instructions?: string[];
  };
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount || 0);

const PaymentInstructionContent: React.FC = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ref = searchParams.get('ref');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentStatusData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(0);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!ref || !token) {
      setError('Data pembayaran tidak lengkap.');
      setLoading(false);
      return;
    }
    try {
      const payRes = await axiosInstance.get(`/payment/public/status?ref=${encodeURIComponent(ref)}`);
      if (payRes.data?.success) setPayment(payRes.data.data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat halaman.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [ref, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const s = String(payment?.status || '').toUpperCase();
    const terminal = ['SUCCESS', 'PAID', 'SETTLEMENT', 'COMPLETED', 'EXPIRED', 'FAILED', 'CANCELLED'];
    if (!ref || !payment || terminal.includes(s)) return;
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, [ref, payment?.status, fetchData]);

  useEffect(() => {
    if (payment?.qr_string && !payment.qr_string.startsWith('http')) {
      QRCode.toDataURL(payment.qr_string, { width: 512, margin: 2, color: { dark: '#0f172a' } })
        .then(url => setQrDataUrl(url))
        .catch(console.error);
    }
  }, [payment?.qr_string]);

  const [timeLeft, setTimeLeft] = useState<{ h: number; m: number; s: number } | null>(null);
  useEffect(() => {
    if (!payment?.expired_at || ['SUCCESS', 'PAID', 'SETTLEMENT'].includes(String(payment.status).toUpperCase())) return;
    const tick = () => {
      const diff = new Date(payment.expired_at!).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft(null); return; }
      setTimeLeft({
        h: Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000)),
        m: Math.floor((diff % (3600 * 1000)) / (60 * 1000)),
        s: Math.floor((diff % (60 * 1000)) / 1000),
      });
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [payment?.expired_at, payment?.status]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Berhasil disalin ke clipboard');
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleUploadProof = useCallback(async () => {
    if (!proofFile || !payment) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', proofFile);
      
      const uploadRes = await axiosInstance.post('/upload/file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const fileUrl = uploadRes.data.data?.url || uploadRes.data.url || uploadRes.data.data || uploadRes.data;
      
      await axiosInstance.post(`/payment/public/proof/${payment.id}`, { proof_url: fileUrl });
      
      toast.success('Bukti transfer berhasil diunggah. Menunggu verifikasi.');
      fetchData();
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Gagal mengunggah bukti transfer';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  }, [proofFile, payment, fetchData]);

  const statusNorm = useMemo(() => String(payment?.status || '').toUpperCase(), [payment?.status]);
  const isPaid = useMemo(() => ['SUCCESS', 'PAID', 'SETTLEMENT', 'COMPLETED'].includes(statusNorm), [statusNorm]);
  const isFailed = useMemo(() => ['FAILED', 'EXPIRED', 'CANCELLED', 'CANCELED'].includes(statusNorm), [statusNorm]);

  const method = useMemo(() => String(payment?.payment_method || '').toUpperCase(), [payment?.payment_method]);
  const payCode = useMemo(() => payment?.payCode || payment?.gateway_response?.pay_code || payment?.gateway_response?.payment_code || payment?.gateway_response?.va_number, [payment]);
  const instructions = useMemo(() => (payment?.instructions && payment.instructions.length > 0) 
    ? payment.instructions 
    : (payment?.gateway_response?.instructions || (payment?.manual_payment?.instructions || [])), [payment]);
  const isQR = useMemo(() => method.includes('QRIS') || method.includes('QR'), [method]);

  const breadcrumbs = useMemo(() => [
    { label: 'Layanan' },
    { label: 'Invoice' },
    { label: 'Pembayaran' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Pembayaran',
    description: 'Selesaikan pembayaran Anda dengan mengikuti instruksi yang tersedia sesuai metode yang dipilih.',
    items: [
      { text: 'Salin kode pembayaran atau scan QRIS yang muncul di layar.' },
      { text: 'Lakukan transfer sesuai nominal hingga 3 digit terakhir (jika ada).' },
      { text: 'Jika menggunakan metode Manual, harap unggah bukti transfer setelah melakukan pembayaran.' },
      { text: 'Status pembayaran akan diperbarui secara otomatis setelah diverifikasi.' }
    ]
  }), []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Memuat Instruksi...</p>
      </div>
    );
  }

  if (isPaid) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
         <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <CheckCircle2 size={40} />
         </div>
         <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Pembayaran Lunas!</h1>
         <p className="text-sm text-slate-500 max-w-sm mb-8">Tagihan Anda telah berhasil dibayar. Anda dapat melanjutkan ke dashboard.</p>
         <Button onClick={() => navigate(`/invoice/public/${token}`)} className="rounded-xl px-10 h-14 bg-emerald-600 hover:bg-emerald-700 font-black uppercase text-xs tracking-widest">Lihat Invoice</Button>
      </div>
    );
  }

  if (isFailed || error) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
         <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6">
            <AlertCircle size={40} />
         </div>
         <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
           {isFailed ? 'Pembayaran Gagal/Expired' : 'Terjadi Kesalahan'}
         </h1>
         <p className="text-sm text-slate-500 max-w-sm mb-8">
           {isFailed ? 'Waktu pembayaran telah habis atau transaksi dibatalkan. Silakan lakukan checkout ulang.' : error}
         </p>
         <Button onClick={() => navigate(`/invoice/public/${token}`)} className="rounded-xl px-10 h-14 bg-slate-900 hover:bg-black font-black uppercase text-xs tracking-widest">Kembali ke Invoice</Button>
      </div>
    );
  }

  return (
    <AcademicPageLayout
      title="Instruksi Pembayaran"
      description={`Silakan selesaikan pembayaran untuk referensi #${ref} melalui metode ${payment?.payment_method?.replace(/_/g, ' ') || 'pilihan Anda'}.`}
      breadcrumbs={breadcrumbs}
      instruction={instruction}
      hardeningModuleKey="payment_instruction_page"
    >
      <div className="max-w-4xl mx-auto flex flex-col">
        
        {/* Compact Top Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
            <button onClick={() => navigate(`/invoice/public/${token}`)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest transition-all">
              <ArrowLeft size={14} /> Kembali ke Invoice
            </button>
            {timeLeft && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 border border-amber-100">
                <Clock size={12} />
                <span className="text-[10px] font-black font-mono">
                  Bayar Sebelum {String(timeLeft.h).padStart(2,'0')}:{String(timeLeft.m).padStart(2,'0')}:{String(timeLeft.s).padStart(2,'0')}
                </span>
              </div>
            )}
        </div>

        <SectionCard noPadding fullWidth className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-2xl shadow-blue-500/5 overflow-hidden">
            <div className="flex flex-col md:flex-row">
              
              {/* Left: Summary & QR/Code */}
              <div className="w-full md:w-[40%] border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 p-8 flex flex-col items-center justify-center text-center bg-slate-50/30 dark:bg-slate-800/30">
                  <div className="mb-6">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Pembayaran</span>
                    <h2 className="text-3xl font-black text-blue-600 tracking-tight leading-none mb-3">
                      {formatCurrency(payment?.amount || 0)}
                    </h2>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 shadow-sm">
                        <ShieldCheck size={12} className="text-emerald-500" /> #{ref}
                    </div>
                  </div>

                  {payment?.gateway === 'MANUAL' ? (
                    <div className="w-full space-y-4">
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 shadow-sm space-y-3">
                          <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400 font-bold uppercase">Bank</span>
                              <span className="font-black text-slate-900 dark:text-white">{payment.manual_payment?.bankName || 'BANK MANDIRI'}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400 font-bold uppercase">No. Rekening</span>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900 dark:text-white">{payment.manual_payment?.accountNumber || '1310018448883'}</span>
                                <button onClick={() => copyToClipboard(payment.manual_payment?.accountNumber || '1310018448883')} className="text-blue-600 hover:text-blue-700 transition-colors"><Copy size={10} /></button>
                              </div>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400 font-bold uppercase">Atas Nama</span>
                              <span className="font-black text-slate-900 dark:text-white uppercase">{payment.manual_payment?.accountHolder || 'PT BARAYA TEKNOLOGI INDONESIA'}</span>
                          </div>
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Transfer Manual</div>
                    </div>
                  ) : isQR ? (
                    <div className="flex flex-col items-center w-full">
                        <div className="bg-white p-2.5 rounded-xl border-4 border-slate-100 mb-3 shadow-sm">
                          {payment?.qrUrl || qrDataUrl || payment?.qr_string ? (
                            <img src={payment?.qrUrl || qrDataUrl || payment?.qr_string} alt="QRIS" className="w-44 h-44 object-contain" />
                          ) : <QrCode size={160} className="text-slate-200" />}
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Scan Kode QRIS</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center w-full py-4">
                        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-widest font-mono mb-6 break-all">
                          {payCode}
                        </div>
                        <button 
                          onClick={() => copyToClipboard(payCode || '')}
                          className="flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all active:scale-95 border border-blue-100 dark:border-blue-800"
                        >
                          {copied ? <Check size={12} /> : <Copy size={12} />}
                          {copied ? 'Disalin' : 'Salin Kode'}
                        </button>
                        <div className="mt-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {payment?.gateway_response?.bank_name || payment?.payment_method?.replace(/_/g, ' ')}
                        </div>
                    </div>
                  )}
              </div>

              <div className="w-full md:w-[60%] flex flex-col bg-white dark:bg-slate-900">
                  <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instruksi Pembayaran</h4>
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600/30" />
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600/30" />
                    </div>
                  </div>
                  
                  <div className="flex-grow p-6 space-y-3">
                      {payment?.gateway === 'MANUAL' && (
                        <div className="mb-6 p-6 bg-blue-600 rounded-2xl text-white space-y-4 shadow-lg shadow-blue-600/20">
                          <div className="text-center">
                              <h5 className="font-black text-sm uppercase tracking-tight">Upload Bukti Transfer</h5>
                              <p className="text-[9px] text-blue-100 mt-1 uppercase tracking-widest font-bold">Konfirmasi pembayaran manual</p>
                          </div>
                          
                          <div className="relative group flex flex-col items-center justify-center p-8 border-2 border-dashed border-blue-400/50 rounded-xl bg-blue-700/30 hover:bg-blue-700/40 transition-all">
                              <input 
                                id="proof-upload"
                                type="file" 
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                aria-label="Unggah bukti transfer"
                              />
                              {proofFile ? (
                                <div className="flex flex-col items-center gap-2">
                                  <div className="w-10 h-10 rounded-full bg-emerald-400/20 flex items-center justify-center">
                                    <Check className="text-emerald-400" size={20} />
                                  </div>
                                  <span className="text-[10px] font-bold truncate max-w-[200px]">{proofFile.name}</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2">
                                  <div className="w-10 h-10 rounded-full bg-blue-400/20 flex items-center justify-center">
                                    <QrCode className="text-blue-100" size={20} />
                                  </div>
                                  <span className="text-[10px] font-bold uppercase tracking-widest">Pilih Gambar</span>
                                </div>
                              )}
                          </div>

                          <Button 
                            onClick={handleUploadProof}
                            disabled={!proofFile || uploading}
                            className="w-full bg-white text-blue-600 hover:bg-blue-50 font-black uppercase text-[10px] tracking-widest h-12 rounded-xl border-none shadow-md"
                          >
                              {uploading ? 'Sedang Mengirim...' : 'Kirim Bukti'}
                          </Button>
                        </div>
                      )}

                    {instructions?.map((step: any, i: number) => (
                      <div key={i} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                          <button 
                            onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100 dark:border-slate-700">
                                  {i + 1}
                                </div>
                                <span className="font-black text-slate-800 dark:text-white text-[10px] uppercase tracking-tight">{step.title || `Langkah ${i + 1}`}</span>
                            </div>
                            {expandedStep === i ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
                          </button>
                          <AnimatePresence>
                            {expandedStep === i && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-5 pb-5 overflow-hidden"
                              >
                                  <div className="pl-9 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                    {step.steps ? (
                                      <ul className="list-decimal space-y-2">
                                        {step?.steps?.map((s: string, j: number) => <li key={j} dangerouslySetInnerHTML={{ __html: s }} />)}
                                      </ul>
                                    ) : <div dangerouslySetInnerHTML={{ __html: step }} />}
                                  </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                      </div>
                    ))}
                    
                    {/* Tips Bar */}
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900 text-white text-[10px] shadow-lg">
                        <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-slate-400 leading-normal font-bold uppercase tracking-tight">
                          Pastikan jumlah transfer <strong className="text-blue-400">sama persis</strong> hingga digit terakhir untuk verifikasi otomatis oleh sistem.
                        </p>
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/30">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status: Menunggu</span>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Proses Verifikasi</span>
                    </div>
                  </div>
              </div>
            </div>
        </SectionCard>
      </div>
    </AcademicPageLayout>
  );
};

const PaymentInstructionPage: React.FC = () => {
  return (
    <PaymentInstructionContent />
  );
};

export default PaymentInstructionPage;
