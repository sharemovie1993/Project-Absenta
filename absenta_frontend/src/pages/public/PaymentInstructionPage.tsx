import React, { useEffect, useState, useMemo } from 'react';
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
import { Navbar } from '@/components/layout/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button } from '@/components/ui';
import axiosInstance, { resolvePublicApiBaseUrl } from '@/lib/axiosInstance';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ui/Toast';

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
  gateway_response?: any;
  payCode?: string;
  instructions?: any[];
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

const PaymentInstructionPage: React.FC = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast, toasts, removeToast } = useToast();
  const ref = searchParams.get('ref');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentStatusData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(0);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);



  const fetchData = async () => {
    if (!ref || !token) {
      setError('Data pembayaran tidak lengkap.');
      setLoading(false);
      return;
    }
    try {
      const payRes = await axiosInstance.get(`/payment/public/status?ref=${encodeURIComponent(ref)}`);
      if (payRes.data?.success) setPayment(payRes.data.data);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memuat halaman.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, ref]);

  useEffect(() => {
    const s = String(payment?.status || '').toUpperCase();
    const terminal = ['SUCCESS', 'PAID', 'SETTLEMENT', 'COMPLETED', 'EXPIRED', 'FAILED', 'CANCELLED'];
    if (!ref || !payment || terminal.includes(s)) return;
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, [ref, payment?.status]);

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Berhasil disalin ke clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUploadProof = async () => {
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
      
      showToast('Bukti transfer berhasil diunggah. Menunggu verifikasi.', 'success');
      fetchData();
    } catch (e: any) {
      showToast(e?.response?.data?.message || e.message || 'Gagal mengunggah bukti transfer', 'error');
    } finally {
      setUploading(false);
    }
  };

  const statusNorm = String(payment?.status || '').toUpperCase();
  const isPaid = ['SUCCESS', 'PAID', 'SETTLEMENT', 'COMPLETED'].includes(statusNorm);
  const isFailed = ['FAILED', 'EXPIRED', 'CANCELLED', 'CANCELED'].includes(statusNorm);

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

  const method = String(payment?.payment_method || '').toUpperCase();
  const payCode = payment?.payCode || payment?.gateway_response?.pay_code || payment?.gateway_response?.payment_code || payment?.gateway_response?.va_number;
  const instructions = (payment?.instructions && payment.instructions.length > 0) 
    ? payment.instructions 
    : (payment?.gateway_response?.instructions || (payment?.manual_payment?.instructions || []));
  const isQR = method.includes('QRIS') || method.includes('QR');

  return (
    <div className="h-screen bg-[#f8fafc] dark:bg-slate-950 flex flex-col font-sans overflow-hidden">
      <Navbar />
      
      <main className="flex-grow pt-16 px-4 pb-4 overflow-hidden flex flex-col items-center justify-center">
        <div className="max-w-4xl w-full flex flex-col h-full md:h-auto">
          
          {/* Compact Top Header */}
          <div className="flex items-center justify-between mb-3 shrink-0">
             <button onClick={() => navigate(`/invoice/public/${token}`)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest transition-all">
                <ArrowLeft size={14} /> Kembali ke Invoice
             </button>
             {timeLeft && (
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 border border-amber-100">
                  <Clock size={12} />
                  <span className="text-[10px] font-black mono">
                    Bayar Sebelum {String(timeLeft.h).padStart(2,'0')}:{String(timeLeft.m).padStart(2,'0')}:{String(timeLeft.s).padStart(2,'0')}
                  </span>
               </div>
             )}
          </div>

          <Card className="rounded-xl border-slate-100 dark:border-slate-800 shadow-2xl shadow-blue-500/5 bg-white flex flex-col overflow-hidden">
             <div className="flex flex-col md:flex-row h-full">
                
                {/* Left: Summary & QR/Code */}
                <div className="w-full md:w-[40%] border-b md:border-b-0 md:border-r border-slate-100 p-6 sm:p-8 flex flex-col items-center justify-center text-center bg-slate-50/30">
                   <div className="mb-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Pembayaran</span>
                      <h2 className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tight leading-none mb-3">
                        {formatCurrency(payment!.amount)}
                      </h2>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-slate-100 text-[10px] font-black text-slate-400 shadow-sm">
                         <ShieldCheck size={12} className="text-emerald-500" /> #{ref}
                      </div>
                   </div>

                    {payment!.gateway === 'MANUAL' ? (
                      <div className="w-full space-y-4">
                         <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm space-y-3">
                            <div className="flex justify-between items-center text-[10px]">
                               <span className="text-slate-400 font-bold uppercase">Bank</span>
                               <span className="font-black text-slate-900">{payment!.manual_payment?.bankName || 'BANK MANDIRI'}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                               <span className="text-slate-400 font-bold uppercase">No. Rekening</span>
                               <div className="flex items-center gap-2">
                                  <span className="font-black text-slate-900">{payment!.manual_payment?.accountNumber || '1310018448883'}</span>
                                  <button onClick={() => copyToClipboard(payment!.manual_payment?.accountNumber || '1310018448883')} className="text-blue-600"><Copy size={10} /></button>
                               </div>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                               <span className="text-slate-400 font-bold uppercase">Atas Nama</span>
                               <span className="font-black text-slate-900 uppercase">{payment!.manual_payment?.accountHolder || 'PT BARAYA TEKNOLOGI INDONESIA'}</span>
                            </div>
                         </div>
                         <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Transfer Manual</div>
                      </div>
                    ) : isQR ? (
                      <div className="flex flex-col items-center w-full">
                         <div className="bg-white p-2.5 rounded-xl border-4 border-slate-100 mb-3 shadow-sm">
                           {payment!.qrUrl || qrDataUrl || payment!.qr_string ? (
                             <img src={payment!.qrUrl || qrDataUrl || payment!.qr_string} alt="QRIS" className="w-40 h-40 sm:w-44 sm:h-44 object-contain" />
                           ) : <QrCode size={160} className="text-slate-200" />}
                         </div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Scan Kode QRIS</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center w-full py-4">
                         <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-widest font-mono mb-4 break-all">
                            {payCode}
                         </div>
                         <button 
                           onClick={() => copyToClipboard(payCode)}
                           className="flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-50 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all active:scale-95 border border-blue-100"
                         >
                           {copied ? <Check size={12} /> : <Copy size={12} />}
                           {copied ? 'Disalin' : 'Salin Kode'}
                         </button>
                         <div className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {payment!.gateway_response?.bank_name || payment!.payment_method?.replace(/_/g, ' ')}
                         </div>
                      </div>
                    )}
                </div>

                <div className="w-full md:w-[60%] flex flex-col">
                   <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instruksi Pembayaran</h4>
                      <div className="flex gap-1">
                         <div className="w-1.5 h-1.5 rounded-full bg-blue-600/30" />
                         <div className="w-1.5 h-1.5 rounded-full bg-blue-600/30" />
                      </div>
                   </div>
                   
                   <div className="flex-grow overflow-y-auto no-scrollbar p-5 space-y-2.5 max-h-[400px]">
                       {payment!.gateway === 'MANUAL' && (
                         <div className="mt-4 p-6 bg-blue-600 rounded-xl text-white space-y-4">
                            <div className="text-center">
                               <h5 className="font-black text-sm uppercase tracking-tight">Upload Bukti Transfer</h5>
                               <p className="text-[9px] text-blue-100 mt-1">Konfirmasi pembayaran Anda agar segera diproses.</p>
                            </div>
                            
                            <div className="relative group flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-400 rounded-xl bg-blue-700/30">
                               <input 
                                 type="file" 
                                 className="absolute inset-0 opacity-0 cursor-pointer" 
                                 onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                               />
                               {proofFile ? (
                                 <div className="flex flex-col items-center gap-1">
                                    <Check className="text-emerald-400" size={24} />
                                    <span className="text-[9px] font-bold truncate max-w-[150px]">{proofFile.name}</span>
                                 </div>
                               ) : (
                                 <div className="flex flex-col items-center gap-2">
                                    <QrCode className="text-blue-300" size={24} />
                                    <span className="text-[9px] font-bold">Pilih Gambar</span>
                                 </div>
                               )}
                            </div>

                            <Button 
                              onClick={handleUploadProof}
                              disabled={!proofFile || uploading}
                              className="w-full bg-white text-blue-600 hover:bg-blue-50 font-black uppercase text-[10px] tracking-widest h-11 rounded-xl"
                            >
                               {uploading ? 'Sedang Mengirim...' : 'Kirim Bukti'}
                            </Button>
                         </div>
                       )}

                      {instructions.map((step: any, i: number) => (
                        <div key={i} className="rounded-xl border border-slate-100 bg-white overflow-hidden shadow-sm">
                           <button 
                             onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                             className="w-full px-5 py-3.5 flex items-center justify-between text-left"
                           >
                              <div className="flex items-center gap-3">
                                 <div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100">
                                    {i + 1}
                                 </div>
                                 <span className="font-black text-slate-800 text-[10px] uppercase tracking-tight">{step.title || `Langkah ${i + 1}`}</span>
                              </div>
                              {expandedStep === i ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
                           </button>
                           <AnimatePresence>
                              {expandedStep === i && (
                                <motion.div 
                                  initial={{ height: 0 }}
                                  animate={{ height: "auto" }}
                                  exit={{ height: 0 }}
                                  className="px-5 pb-4 overflow-hidden"
                                >
                                   <div className="pl-8 text-[11px] text-slate-500 leading-relaxed font-medium">
                                      {step.steps ? (
                                        <ul className="list-decimal space-y-1.5">
                                          {step.steps.map((s: string, j: number) => <li key={j} dangerouslySetInnerHTML={{ __html: s }} />)}
                                        </ul>
                                      ) : <div dangerouslySetInnerHTML={{ __html: step }} />}
                                   </div>
                                </motion.div>
                              )}
                           </AnimatePresence>
                        </div>
                      ))}
                      
                      {/* Tips Bar */}
                      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900 text-white text-[9px]">
                         <Info size={12} className="text-blue-400 shrink-0 mt-0.5" />
                         <p className="text-slate-400 leading-normal font-bold uppercase tracking-tight">
                           Pastikan jumlah transfer <strong className="text-blue-400">sama persis</strong> hingga digit terakhir untuk verifikasi otomatis.
                         </p>
                      </div>
                   </div>

                   <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status: Menunggu</span>
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                         <span className="text-[9px] font-black text-amber-600 uppercase">Proses Verifikasi</span>
                      </div>
                   </div>
                </div>
             </div>
          </Card>
        </div>
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default PaymentInstructionPage;
