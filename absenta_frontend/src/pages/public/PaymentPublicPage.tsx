import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreditCard, Wallet, ArrowLeft, ShieldCheck, Clock, BadgeCheck, AlertCircle, QrCode, Search, Check, ChevronDown, Copy } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, Button } from '@/components/ui';
import axiosInstance, { resolvePublicApiBaseUrl } from '@/lib/axiosInstance';
import { createPortal } from 'react-dom';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ui/Toast';
import { cancelPendingUpgrade } from '@/api/subscription.api';
import { ConfirmModal } from '@/components/ui/Modal';

type InvoicePublicData = {
  success: boolean;
  message: string;
  data: any;
  gateways?: string[];
  tripay_channels?: Array<{ code: string; name?: string; group?: string; icon_url?: string }>;
  contact?: { email?: string; phone?: string; company_name?: string; };
  manual_payment?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    instruction?: string;
  };
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount || 0);

const PaymentPublicPage: React.FC = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { showToast, toasts, removeToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<InvoicePublicData | null>(null);

  const [selectedGateway, setSelectedGateway] = useState<string>('TRIPAY');
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openChannelMenu, setOpenChannelMenu] = useState<boolean>(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  
  const [dd, setDd] = useState<number>(0);
  const [hh, setHh] = useState<number>(0);
  const [mm, setMm] = useState<number>(0);
  const [ss, setSs] = useState<number>(0);
  const [expiredLocal, setExpiredLocal] = useState<boolean>(false);
  const [isManual, setIsManual] = useState<boolean>(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [manualPaymentSuccess, setManualPaymentSuccess] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const apiRoot = resolvePublicApiBaseUrl();
        const invoiceToken = encodeURIComponent(String(token || ''));
        const res = await axiosInstance.get(`/invoice/public/${invoiceToken}`, {
          baseURL: apiRoot,
          headers: { Accept: 'application/json' },
        });
        if (active) {
          console.log('[PaymentPublicPage] API Response:', res.data);
          setResponse(res.data as InvoicePublicData);
        }
      } catch (e: any) {
        if (active) setError(e?.message || 'Gagal memuat data pembayaran');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token]);

  const inv = response?.data;
  const status = inv?.status || '';
  const gateways = useMemo(() => (response?.gateways?.length ? response.gateways : ['TRIPAY']), [response]);
  const tripayChannels = useMemo(() => {
    const totalAmount = inv?.total_amount || 0;
    const base = response?.tripay_channels || [];

    // Filter Tripay channels by amount limits
    const filteredBase = base.filter((c: any) => {
      const min = Number(c.minimum_amount || 0);
      const max = Number(c.maximum_amount || 9999999999);
      // Only filter if limits are explicitly provided and non-zero
      if (min > 0 && totalAmount < min) return false;
      if (max > 0 && totalAmount > max) return false;
      return true;
    });

    const channels = [...filteredBase];
    
    // Always add Manual Transfer if not present, use response data if available
    const hasManual = channels.some(c => c.code === 'MANUAL_TRANSFER');
    if (!hasManual) {
      channels.unshift({
        code: 'MANUAL_TRANSFER',
        name: `Transfer ${response?.manual_payment?.bankName || 'Bank'}`,
        group: 'Manual Transfer',
        icon_url: 'https://img.icons8.com/fluency/96/bank.png'
      });
    }
    return channels;
  }, [response, inv?.total_amount]);
  
  useEffect(() => {
    if (gateways.length && !selectedGateway) setSelectedGateway(gateways[0]);
  }, [gateways, selectedGateway]);

  const groupedChannels = useMemo(() => {
    const groups: Record<string, any[]> = {};
    const filtered = tripayChannels.filter(c => 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.group?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    filtered.forEach((c) => {
      const g = c.group || 'Lainnya';
      if (!groups[g]) groups[g] = [];
      groups[g].push(c);
    });
    return groups;
  }, [tripayChannels, searchQuery]);
  
  const groupOrder = useMemo(() => {
    const all = Object.keys(groupedChannels);
    const pref = ['Manual Transfer', 'QRIS', 'E-Wallet', 'Virtual Account', 'Convenience Store'];
    
    // Case-insensitive matching for preferred groups
    const sorted = [...pref.filter(p => 
      all.some(a => a.toLowerCase() === p.toLowerCase())
    )];
    
    // Add remaining groups
    const remaining = all.filter(a => 
      !pref.some(p => p.toLowerCase() === a.toLowerCase())
    );
    
    return [...sorted, ...remaining];
  }, [groupedChannels]);

  const selectedChannelObj = useMemo(() => {
    return tripayChannels.find(c => c.code.toUpperCase() === selectedChannel.toUpperCase());
  }, [selectedChannel, tripayChannels]);

  useEffect(() => {
    setIsManual(selectedChannel === 'MANUAL_TRANSFER');
  }, [selectedChannel]);

  // Timer Logic
  useEffect(() => {
    if (!inv?.due_date || status === 'PAID') return;
    const endMs = new Date(inv.due_date).getTime();
    const tick = () => {
      const diff = Math.max(0, endMs - Date.now());
      setDd(Math.floor(diff / (24 * 3600 * 1000)));
      setHh(Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000)));
      setMm(Math.floor((diff % (3600 * 1000)) / (60 * 1000)));
      setSs(Math.floor((diff % (60 * 1000)) / 1000));
      if (diff <= 0) setExpiredLocal(true);
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, [inv?.due_date, status]);

  const [cancelling, setCancelling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const isUpgrade = useMemo(() => {
    if (!inv) return false;
    
    // 1. Check direct reason
    const reason = String(inv.reason || '').toUpperCase();
    if (reason.includes('UPGRADE') || reason.includes('CHANGE') || reason.includes('PAKET')) return true;

    // 2. Check nested billing records (more robust)
    const billingList = inv.Billing || inv.billing || inv.billings;
    const billingArray = Array.isArray(billingList) ? billingList : (billingList ? [billingList] : []);
    const hasUpgradeBilling = billingArray.some((b: any) => {
      const type = String(b.charge_type || b.chargeType || b.type || '').toUpperCase();
      const bReason = String(b.reason || '').toUpperCase();
      return type === 'UPGRADE' || type.includes('CHANGE') || bReason.includes('UPGRADE') || bReason.includes('PAKET');
    });
    if (hasUpgradeBilling) return true;

    // 3. Check items (last resort)
    const hasUpgradeItems = inv.items?.some((it: any) => {
      const desc = String(it.description || '').toUpperCase();
      return desc.includes('UPGRADE') || desc.includes('GANTI PAKET') || desc.includes('SELISIH');
    });
    
    return !!hasUpgradeItems;
  }, [inv]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await cancelPendingUpgrade();
      if (res.success) {
        showToast('Transaksi berhasil dibatalkan', 'success');
        setTimeout(() => navigate('/service-center?tab=catalog'), 1500);
      } else {
        showToast(res.message || 'Gagal membatalkan transaksi', 'error');
      }
    } catch (e: any) {
      showToast(e?.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setCancelling(false);
      setCancelModalOpen(false);
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const apiRoot = resolvePublicApiBaseUrl();
      const payload = {
        gateway: isManual ? 'MANUAL' : selectedGateway,
        method: isManual ? 'MANUAL_TRANSFER' : (selectedGateway === 'TRIPAY' ? 'QRIS' : 'QRIS'),
        channel_code: selectedChannel,
        email: response?.contact?.email,
        phone: response?.contact?.phone,
        name: inv?.tenant?.name
      };
      const res = await axiosInstance.post(`/payment/public/${encodeURIComponent(String(token))}/pay`, payload, {
        baseURL: apiRoot,
        headers: { Accept: 'application/json' },
      });
      
      if (isManual) {
        setManualPaymentSuccess(true);
        showToast('Pesanan manual berhasil dibuat. Silakan unggah bukti transfer.', 'success');
        // Re-fetch data to show the manual instruction UI
        const invoiceToken = encodeURIComponent(String(token || ''));
        const updatedRes = await axiosInstance.get(`/invoice/public/${invoiceToken}`, {
          baseURL: apiRoot,
          headers: { Accept: 'application/json' },
        });
        setResponse(updatedRes.data as InvoicePublicData);
      } else {
        const ref = res?.data?.data?.ref;
        if (ref) navigate(`/payment/public/${token}/instruction?ref=${encodeURIComponent(ref)}`);
      }
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Gagal memproses pembayaran', 'error');
    }
  };

  const handleUploadProof = async () => {
    if (!proofFile || !inv) return;
    setUploading(true);
    try {
      const apiRoot = resolvePublicApiBaseUrl();
      const formData = new FormData();
      formData.append('file', proofFile);
      
      // 1. Upload File
      const uploadRes = await axiosInstance.post('/upload/file', formData, {
        baseURL: apiRoot,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const fileUrl = uploadRes.data.data || uploadRes.data;
      
      // 2. Submit Proof to Payment
      // We need to find the pending manual payment ID
      const activePayment = inv.payments?.find((p: any) => p.gateway === 'MANUAL' && p.status === 'PENDING');
      if (!activePayment) throw new Error('Tidak ditemukan transaksi manual yang aktif');
      
      await axiosInstance.post(`/payment/public/proof/${activePayment.id}`, { proof_url: fileUrl }, {
        baseURL: apiRoot
      });
      
      showToast('Bukti transfer berhasil diunggah. Menunggu verifikasi.', 'success');
      // Re-fetch data
      const invoiceToken = encodeURIComponent(String(token || ''));
      const updatedRes = await axiosInstance.get(`/invoice/public/${invoiceToken}`, {
        baseURL: apiRoot,
        headers: { Accept: 'application/json' },
      });
      setResponse(updatedRes.data as InvoicePublicData);
    } catch (e: any) {
      showToast(e?.response?.data?.message || e.message || 'Gagal mengunggah bukti transfer', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center min-h-[50vh]">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Menjangkau Gerbang Pembayaran...</p>
              </motion.div>
            ) : error || !inv ? (
              <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"><AlertCircle className="w-10 h-10 text-red-600" /></div>
                <h2 className="text-2xl font-bold mb-2">Terjadi Kesalahan</h2>
                <p className="text-slate-500 mb-8">{error || "Data tidak valid."}</p>
                <Button onClick={() => navigate(-1)}>Kembali</Button>
              </motion.div>
            ) : (
              <motion.div key="content" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* Back Link */}
                <button onClick={() => navigate(`/invoice/public/${token}`)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors group">
                   <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                   Kembali ke Detail Invoice
                </button>

                {/* Summary Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden">
                   <div className="relative z-10">
                      <h1 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Pembayaran Tagihan</h1>
                      <div className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                         {formatCurrency(inv.total_amount || 0)}
                      </div>
                      <p className="text-slate-500 font-medium">{inv.invoice_number}</p>
                      
                      <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-800 flex flex-col items-center gap-2 text-slate-400">
                         <div className="flex items-center gap-2 text-sm font-bold">
                            <Clock className="w-4 h-4 text-blue-500" />
                            Sisa Waktu: {dd > 0 ? `${dd}d ` : ''}{String(hh).padStart(2,'0')}:{String(mm).padStart(2,'0')}:{String(ss).padStart(2,'0')}
                         </div>
                         {expiredLocal && <span className="text-xs text-red-500 font-bold">Invoice ini telah kedaluwarsa.</span>}
                      </div>
                   </div>
                   {/* Decoration */}
                   <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-blue-900/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                </div>

                {/* Payment Methods Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-100 dark:border-slate-800">
                   <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Pilih Cara Bayar</h2>
                   </div>

                   {status === 'PAID' || status === 'CANCELLED' ? (
                     <div className="text-center py-10">
                        <div className={`w-20 h-20 ${status === 'PAID' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                           {status === 'PAID' ? <BadgeCheck className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" />}
                        </div>
                        <h3 className="text-2xl font-black mb-2">{status === 'PAID' ? 'Invoice Sudah Lunas' : 'Invoice Dibatalkan'}</h3>
                        <p className="text-slate-500">{status === 'PAID' ? 'Terima kasih atas kerja samanya.' : 'Tagihan ini tidak lagi valid.'}</p>
                     </div>
                   ) : (
                     <form onSubmit={handlePay} className="space-y-8">
                         <div className="space-y-6">
                           {/* Gateway buttons removed for unified dropdown approach */}

                           {/* Channel Selection */}
                           <div>
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-3">Metode Pembayaran</label>
                              <div className="relative">
                                 <button
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
                                       {selectedChannelObj ? (
                                         <img src={selectedChannelObj.icon_url} alt="" className="h-6 w-auto max-w-[80px] object-contain" />
                                       ) : <Wallet className="w-6 h-6 text-slate-300" />}
                                       <span className={`text-lg font-bold ${selectedChannelObj ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                                          {selectedChannelObj?.name || 'Pilih Metode Pembayaran'}
                                       </span>
                                    </div>
                                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openChannelMenu ? 'rotate-180' : ''}`} />
                                 </button>

                                 {/* Custom Portal Menu */}
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
                                                  onClick={() => { setSelectedChannel(c.code); setOpenChannelMenu(false); }}
                                                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors text-left"
                                                >
                                                   <div className="flex items-center gap-4">
                                                      <img src={c.icon_url} alt="" className="h-5 w-auto max-w-[60px] object-contain grayscale group-hover:grayscale-0" />
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
                           </div>
                         </div>

                         {isManual && (
                           <motion.div 
                             initial={{ opacity: 0, height: 0 }}
                             animate={{ opacity: 1, height: 'auto' }}
                             className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 border border-blue-100 dark:border-blue-800 space-y-4"
                           >
                             <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest">
                               <BadgeCheck className="w-4 h-4" /> Instruksi Transfer Manual
                             </div>
                             <div className="space-y-2">
                               <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                 <span className="text-xs text-slate-400 font-bold">Bank</span>
                                 <span className="text-sm font-black text-slate-900 dark:text-white">{response?.manual_payment?.bankName}</span>
                               </div>
                               <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                 <span className="text-xs text-slate-400 font-bold">No. Rekening</span>
                                 <div className="flex items-center gap-2">
                                   <span className="text-sm font-black text-slate-900 dark:text-white">{response?.manual_payment?.accountNumber}</span>
                                   <button 
                                     onClick={() => {
                                       navigator.clipboard.writeText(response?.manual_payment?.accountNumber || "");
                                       showToast("Nomor rekening disalin", "success");
                                     }}
                                     className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-blue-600"
                                   >
                                     <Copy className="w-3 h-3" />
                                   </button>
                                 </div>
                               </div>
                               <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                 <span className="text-xs text-slate-400 font-bold">Atas Nama</span>
                                 <span className="text-sm font-black text-slate-900 dark:text-white">{response?.manual_payment?.accountHolder}</span>
                               </div>
                             </div>
                             <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                               <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold leading-relaxed">
                                 * Pastikan nominal transfer sesuai sampai digit terakhir. Setelah transfer, silakan unggah bukti bayar di bawah ini.
                               </p>
                             </div>
                           </motion.div>
                         )}

                         {/* Pending Manual Upload UI */}
                         {(() => {
                            const pendingManual = inv.payments?.find((p: any) => p.gateway === 'MANUAL' && p.status === 'PENDING');
                            if (!pendingManual) return null;
                            
                            return (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mt-8 p-8 bg-blue-600 rounded-xl text-white shadow-xl shadow-blue-600/20 space-y-6"
                              >
                                <div className="text-center">
                                  <h3 className="text-xl font-black mb-2">Konfirmasi Pembayaran</h3>
                                  <p className="text-blue-100 text-xs font-medium">Pesanan manual telah dibuat. Silakan unggah bukti transfer Anda.</p>
                                </div>

                                <div className="space-y-4">
                                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-blue-400/50 rounded-xl bg-blue-700/30 hover:bg-blue-700/50 transition-colors relative group">
                                    <input 
                                      type="file" 
                                      accept="image/*"
                                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                    />
                                    {proofFile ? (
                                      <div className="flex flex-col items-center gap-2">
                                        <Check className="w-10 h-10 text-emerald-400" />
                                        <span className="text-sm font-bold truncate max-w-[200px]">{proofFile.name}</span>
                                        <button onClick={() => setProofFile(null)} className="text-[10px] font-black uppercase text-blue-200 hover:text-white transition-colors">Ganti File</button>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center gap-3">
                                        <QrCode className="w-10 h-10 text-blue-200" />
                                        <div className="text-center">
                                          <p className="text-sm font-bold">Pilih Bukti Transfer</p>
                                          <p className="text-[10px] text-blue-300 font-medium mt-1">JPG, PNG atau PDF (Max 5MB)</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <Button 
                                    onClick={handleUploadProof}
                                    disabled={!proofFile || uploading}
                                    className="w-full h-14 bg-white text-blue-600 hover:bg-blue-50 font-black text-lg rounded-xl shadow-lg shadow-black/10 active:scale-[0.98] transition-all"
                                  >
                                    {uploading ? <div className="w-6 h-6 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" /> : 'Kirim Bukti Bayar'}
                                  </Button>
                                </div>
                              </motion.div>
                            );
                         })()}

                         <div className="pt-4 space-y-4">
                           <button 
                             type="submit"
                             disabled={!selectedChannel || expiredLocal}
                             className={`w-full py-5 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${(!selectedChannel || expiredLocal) ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border-2 border-slate-200' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95'}`}
                           >
                              {selectedChannel === 'QRIS' ? <QrCode className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
                              Proses Pembayaran
                           </button>
                           
                           {isUpgrade && status !== 'PAID' && (
                             <div className="pt-2">
                               <Button 
                                 variant="outline"
                                 type="button"
                                 onClick={() => setCancelModalOpen(true)}
                                 disabled={cancelling}
                                 className="w-full h-12 bg-white hover:bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-red-100 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                               >
                                 {cancelling ? <div className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" /> : <AlertCircle size={14} />}
                                 Batalkan Pesanan & Ganti Paket
                               </Button>
                               <p className="mt-2 text-[8px] text-slate-400 text-center font-bold uppercase tracking-tighter">
                                 Klik untuk membatalkan pesanan ini dan memilih paket lain
                                </p>
                             </div>
                           )}
                           
                           <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-bold">
                               <ShieldCheck className="w-4 h-4 text-emerald-500" />
                               Transaksi dijamin aman & terenkripsi
                           </div>
                        </div>
                     </form>
                   )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Footer />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <ConfirmModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleCancel}
        title="Batalkan Pesanan?"
        message="Apakah Anda yakin ingin membatalkan pesanan upgrade ini? Anda akan diarahkan kembali ke katalog untuk memilih paket baru."
        confirmText="Ya, Batalkan"
        cancelText="Kembali"
        variant="danger"
      />
    </div>
  );
};

export default PaymentPublicPage;
