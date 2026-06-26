import React, { useEffect, useMemo, useRef, useState, useCallback, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreditCard, ArrowLeft, ShieldCheck, Clock, BadgeCheck, AlertCircle, QrCode, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, SectionCard } from '@/components/ui';
import axiosInstance, { resolvePublicApiBaseUrl } from '@/lib/axiosInstance';
import toast from 'react-hot-toast';
import { cancelPendingUpgrade } from '@/api/subscription.api';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { type InvoicePublicData, type TripayChannel } from '@/types/invoice';
import { PaymentChannelSelector } from '@/components/public/payment/PaymentChannelSelector';
import { ManualPaymentInstructions } from '@/components/public/payment/ManualPaymentInstructions';

const ConfirmModal = lazy(() => import('@/components/ui/Modal').then(m => ({ default: m.ConfirmModal })));

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount || 0);

const PaymentPublicPageContent: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<InvoicePublicData | null>(null);

  const [selectedGateway, setSelectedGateway] = useState<string>('TRIPAY');
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openChannelMenu, setOpenChannelMenu] = useState<boolean>(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  
  const [timer, setTimer] = useState({ dd: 0, hh: 0, mm: 0, ss: 0 });
  const [expiredLocal, setExpiredLocal] = useState<boolean>(false);
  const [isManual, setIsManual] = useState<boolean>(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiRoot = resolvePublicApiBaseUrl();
      const invoiceToken = encodeURIComponent(String(token || ''));
      const res = await axiosInstance.get(`/invoice/public/${invoiceToken}`, {
        baseURL: apiRoot,
        headers: { Accept: 'application/json' },
      });
      setResponse(res.data as InvoicePublicData);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal memuat data pembayaran';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const inv = response?.data;
  const status = inv?.status || '';
  const gateways = useMemo(() => (response?.gateways?.length ? response.gateways : ['TRIPAY']), [response]);
  
  const tripayChannels = useMemo(() => {
    const totalAmount = inv?.total_amount || 0;
    const base = response?.tripay_channels || [];

    const filteredBase = base.filter((c) => {
      const min = Number(c.minimum_amount || 0);
      const max = Number(c.maximum_amount || 9999999999);
      if (min > 0 && totalAmount < min) return false;
      if (max > 0 && totalAmount > max) return false;
      return true;
    });

    const channels = [...filteredBase];
    
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
    const groups: Record<string, TripayChannel[]> = {};
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
    const sorted = [...pref.filter(p => all.some(a => a.toLowerCase() === p.toLowerCase()))];
    const remaining = all.filter(a => !pref.some(p => p.toLowerCase() === a.toLowerCase()));
    return [...sorted, ...remaining];
  }, [groupedChannels]);

  const selectedChannelObj = useMemo(() => {
    return tripayChannels.find(c => c.code.toUpperCase() === selectedChannel.toUpperCase());
  }, [selectedChannel, tripayChannels]);

  useEffect(() => {
    setIsManual(selectedChannel === 'MANUAL_TRANSFER');
  }, [selectedChannel]);

  useEffect(() => {
    if (!inv?.due_date || status === 'PAID') return;
    const endMs = new Date(inv.due_date).getTime();
    const tick = () => {
      const diff = Math.max(0, endMs - Date.now());
      setTimer({
        dd: Math.floor(diff / (24 * 3600 * 1000)),
        hh: Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000)),
        mm: Math.floor((diff % (3600 * 1000)) / (60 * 1000)),
        ss: Math.floor((diff % (60 * 1000)) / 1000)
      });
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
    const reason = String(inv.reason || '').toUpperCase();
    if (reason.includes('UPGRADE') || reason.includes('CHANGE') || reason.includes('PAKET')) return true;
    
    const billingList = (inv as any).Billing || (inv as any).billing || (inv as any).billings;
    const billingArray = Array.isArray(billingList) ? billingList : (billingList ? [billingList] : []);
    const hasUpgradeBilling = billingArray.some((b: any) => {
      const type = String(b.charge_type || b.chargeType || b.type || '').toUpperCase();
      const bReason = String(b.reason || '').toUpperCase();
      return type === 'UPGRADE' || type.includes('CHANGE') || bReason.includes('UPGRADE') || bReason.includes('PAKET');
    });
    if (hasUpgradeBilling) return true;
    
    const hasUpgradeItems = inv.items?.some((it) => {
      const desc = String(it.description || '').toUpperCase();
      return desc.includes('UPGRADE') || desc.includes('GANTI PAKET') || desc.includes('SELISIH');
    });
    return !!hasUpgradeItems;
  }, [inv]);

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    try {
      const res = await cancelPendingUpgrade();
      if (res.success) {
        toast.success('Transaksi berhasil dibatalkan');
        setTimeout(() => navigate('/service-center?tab=catalog'), 1500);
      } else {
        toast.error(res.message || 'Gagal membatalkan transaksi');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Terjadi kesalahan sistem';
      toast.error(msg);
    } finally {
      setCancelling(false);
      setCancelModalOpen(false);
    }
  }, [navigate]);

  const handlePay = useCallback(async (e: React.FormEvent) => {
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
        toast.success('Pesanan manual berhasil dibuat. Silakan unggah bukti transfer.');
        fetchData();
      } else {
        const ref = res?.data?.data?.ref;
        if (ref) navigate(`/payment/public/${token}/instruction?ref=${encodeURIComponent(ref)}`);
      }
    } catch (e: unknown) {
      const err = e as any;
      toast.error(err?.response?.data?.message || 'Gagal memproses pembayaran');
    }
  }, [isManual, selectedGateway, selectedChannel, response, inv, token, navigate, fetchData]);

  const handleUploadProof = useCallback(async () => {
    if (!proofFile || !inv) return;
    setUploading(true);
    try {
      const apiRoot = resolvePublicApiBaseUrl();
      const formData = new FormData();
      formData.append('file', proofFile);
      const uploadRes = await axiosInstance.post('/upload/file', formData, {
        baseURL: apiRoot,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const fileUrl = uploadRes.data.data || uploadRes.data;
      const activePayment = inv.payments?.find((p) => p.gateway === 'MANUAL' && p.status === 'PENDING');
      if (!activePayment) throw new Error('Tidak ditemukan transaksi manual yang aktif');
      await axiosInstance.post(`/payment/public/proof/${activePayment.id}`, { proof_url: fileUrl }, {
        baseURL: apiRoot
      });
      toast.success('Bukti transfer berhasil diunggah. Menunggu verifikasi.');
      fetchData();
    } catch (e: unknown) {
      const err = e as any;
      toast.error(err?.response?.data?.message || err.message || 'Gagal mengunggah bukti transfer');
    } finally {
      setUploading(false);
    }
  }, [proofFile, inv, fetchData]);

  const breadcrumbs = useMemo(() => [
    { label: 'Invoice', path: `/invoice/public/${token}` },
    { label: 'Gerbang Pembayaran' }
  ], [token]);

  const stats = useMemo(() => [
    {
      title: "Total Tagihan",
      value: formatCurrency(inv?.total_amount || 0),
      icon: <CreditCard size={14} className="text-white" />,
      gradient: "from-blue-600 to-indigo-700",
      subtitle: "Nominal yang harus dibayar"
    },
    {
      title: "Sisa Waktu",
      value: `${timer.dd > 0 ? `${timer.dd}d ` : ''}${String(timer.hh).padStart(2,'0')}:${String(timer.mm).padStart(2,'0')}:${String(timer.ss).padStart(2,'0')}`,
      icon: <Clock size={14} className="text-white" />,
      gradient: expiredLocal ? "from-red-600 to-rose-700" : "from-emerald-500 to-teal-600",
      subtitle: expiredLocal ? "Masa berlaku habis" : "Batas waktu pembayaran"
    }
  ], [inv?.total_amount, timer, expiredLocal]);

  if (loading && !inv) {
    return (
      <AcademicPageLayout title="Gerbang Pembayaran" description="Menyiapkan data tagihan..." hardeningModuleKey="payment_public">
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Menjangkau Gerbang Pembayaran...</p>
        </div>
      </AcademicPageLayout>
    );
  }

  if (error || !inv) {
    return (
      <AcademicPageLayout title="Gerbang Pembayaran" description="Terjadi kesalahan" hardeningModuleKey="payment_public">
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"><AlertCircle className="w-10 h-10 text-red-600" /></div>
          <h2 className="text-2xl font-bold mb-2">Terjadi Kesalahan</h2>
          <p className="text-slate-500 mb-8">{error || "Data tidak valid."}</p>
          <Button onClick={() => navigate(-1)}>Kembali</Button>
        </div>
      </AcademicPageLayout>
    );
  }

  return (
    <AcademicPageLayout
      title="Gerbang Pembayaran"
      description={`Penyelesaian pembayaran untuk invoice ${inv.invoice_number}`}
      hardeningModuleKey="payment_public"
      instruction={{
        title: "Instruksi Pembayaran",
        description: "Pilih metode pembayaran yang paling nyaman bagi Anda. Pastikan nominal transfer sesuai jika menggunakan metode manual.",
        items: [
          { text: "Pilih channel pembayaran dari daftar dropdown." },
          { text: "Lakukan pembayaran sebelum batas waktu berakhir." },
          { text: "Untuk transfer manual, unggah bukti bayar setelah melakukan transfer." }
        ]
      }}
      breadcrumbs={breadcrumbs}
      stats={stats}
    >
      <div className="max-w-2xl mx-auto pb-20">
        <AnimatePresence mode="wait">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <SectionCard title="Pilih Metode Pembayaran" icon={CreditCard} fullWidth>
               {status === 'PAID' || status === 'CANCELLED' ? (
                 <div className="text-center py-10">
                    <div className={`w-20 h-20 ${status === 'PAID' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                       {status === 'PAID' ? <BadgeCheck className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" />}
                    </div>
                    <h3 className="text-2xl font-black mb-2">{status === 'PAID' ? 'Invoice Sudah Lunas' : 'Invoice Dibatalkan'}</h3>
                    <p className="text-slate-500">{status === 'PAID' ? 'Terima kasih atas kerja samanya.' : 'Tagihan ini tidak lagi valid.'}</p>
                 </div>
               ) : (
                 <form onSubmit={handlePay} className="space-y-8 p-4">
                     <div className="space-y-6">
                       <div>
                          <label htmlFor="paymentMethodTrigger" className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 ml-1">Metode Pembayaran</label>
                          <PaymentChannelSelector 
                            selectedChannel={selectedChannel}
                            selectedChannelObj={selectedChannelObj}
                            openChannelMenu={openChannelMenu}
                            setOpenChannelMenu={setOpenChannelMenu}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            groupOrder={groupOrder}
                            groupedChannels={groupedChannels}
                            onSelect={setSelectedChannel}
                            triggerRef={triggerRef}
                            menuPos={menuPos}
                            setMenuPos={setMenuPos}
                          />
                       </div>
                     </div>

                     {isManual && (
                       <ManualPaymentInstructions 
                        bankName={response?.manual_payment?.bankName}
                        accountNumber={response?.manual_payment?.accountNumber}
                        accountHolder={response?.manual_payment?.accountHolder}
                       />
                     )}

                     {(() => {
                        const pendingManual = inv.payments?.find((p) => p.gateway === 'MANUAL' && p.status === 'PENDING');
                        if (!pendingManual) return null;
                        
                        return (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mt-8 p-8 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-600/20 space-y-6"
                          >
                            <div className="text-center">
                              <h3 className="text-xl font-black mb-2">Konfirmasi Pembayaran</h3>
                              <p className="text-blue-100 text-xs font-medium">Pesanan manual telah dibuat. Silakan unggah bukti transfer Anda.</p>
                            </div>

                            <div className="space-y-4">
                              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-blue-400/50 rounded-2xl bg-blue-700/30 hover:bg-blue-700/50 transition-colors relative group">
                                <input 
                                  type="file" 
                                  accept="image/*"
                                  aria-label="Upload bukti transfer"
                                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                />
                                {proofFile ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <Check className="w-10 h-10 text-emerald-400" />
                                    <span className="text-sm font-bold truncate max-w-[200px]">{proofFile.name}</span>
                                    <button type="button" onClick={() => setProofFile(null)} className="text-[10px] font-black uppercase text-blue-200 hover:text-white transition-colors">Ganti File</button>
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
                                type="button"
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
                         className={`w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${(!selectedChannel || expiredLocal) ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border-2 border-slate-200' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95'}`}
                       >
                          {selectedChannel === 'QRIS' ? <QrCode className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
                          Proses Pembayaran
                       </button>
                       
                       {isUpgrade && (status as string) !== 'PAID' && (
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
            </SectionCard>
          </motion.div>
        </AnimatePresence>

        <Suspense fallback={null}>
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
        </Suspense>
      </div>
    </AcademicPageLayout>
  );
};

const PaymentPublicPage: React.FC = () => (
  <PaymentPublicPageContent />
);

export default PaymentPublicPage;
