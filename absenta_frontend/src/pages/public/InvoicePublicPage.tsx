import React, { useEffect, useMemo, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CreditCard, Download, ShieldCheck, Zap, ChevronDown, Check, Wallet, Search, FileText, Loader2, ExternalLink } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui';
import { InvoicePaperRenderer } from '@/components/invoice/InvoicePaperRenderer';
import type { Invoice } from '@/types/invoice';
import axiosInstance, { resolvePublicApiBaseUrl } from '@/lib/axiosInstance';
import { mapPublicInvoiceToRenderer } from '@/utils/invoice';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/ui/Toast';
import { createPortal } from 'react-dom';
import { 
  cancelPendingUpgrade, 
  cancelPendingUpgradePublic,
  formatSubscriptionStatus, 
  getStatusBadgeColor 
} from '../../api/subscription.api';
import { ConfirmModal } from '@/components/ui/Modal';

type InvoicePublicData = {
  success: boolean;
  message: string;
  data: any;
  gateways?: string[];
  tripay_channels?: Array<{ code: string; name?: string; group?: string; icon_url?: string }>;
  contact?: {
    email?: string;
    phone?: string;
    company_name?: string;
  };
  manual_payment?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    instruction?: string;
  };
};

export const InvoicePublicView: React.FC<{ token: string; invoiceId?: string }> = ({ token, invoiceId }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const isPrintMode = searchParams.get('print') === 'true';
  const isPdfMode = searchParams.get('pdf') === '1';
  const isVerifyMode = searchParams.get('verify') === '1';

  const { showToast, toasts, removeToast } = useToast();
  

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<InvoicePublicData | null>(null);
  
  const inv = useMemo(() => {
    const rawData = response?.data;
    if (!rawData) return null;
    
    const data = JSON.parse(JSON.stringify(rawData));
    const subtotal = Number(data.subtotal_amount || data.amount || 0);
    const total = Number(data.total_amount || data.amount || 0);

    if (data.items && data.items.length > 0) {
      data.items = data.items.map((it: any) => {
        const itemPrice = Number(it.unit_price || it.amount || 0);
        const itemTotal = Number(it.total || it.amount || 0);
        
        return {
          ...it,
          unit_price: itemPrice === 0 && data.items.length === 1 ? subtotal : itemPrice,
          total: itemTotal === 0 && data.items.length === 1 ? subtotal : itemTotal,
          quantity: it.quantity || 1
        };
      });
    } else {
      data.items = [{
        description: data.description || 'Layanan Absenta',
        quantity: 1,
        unit_price: subtotal,
        total: subtotal
      }];
    }
    
    data.subtotal_amount = subtotal;
    data.total_amount = total;

    return data;
  }, [response]);

  const [downloadingOfficialPdf, setDownloadingOfficialPdf] = useState(false);
  const [pdfProcessingStep, setPdfProcessingStep] = useState<number>(0); 
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [openChannelMenu, setOpenChannelMenu] = useState<boolean>(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  // PDF Preview State
  const [pdfIframeUrl, setPdfIframeUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(true);
  const [pdfIframeError, setPdfIframeError] = useState<string | null>(null);



  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {

        const invoiceToken = encodeURIComponent(String(token || ''));
        const res = await axiosInstance.get(`/invoice/public/${invoiceToken}`, {
          headers: { Accept: 'application/json' },
        });
        if (active) {
          console.log('[InvoicePublicPage] API Response:', res.data);
          setResponse(res.data as InvoicePublicData);
        }
      } catch (e: any) {
        if (active) setError(e?.message || 'Gagal memuat data invoice');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token]);

  const status = inv?.status || '';
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
    const canonicalUrl = inv?.public_url || window.location.href;
    QRCode.toDataURL(canonicalUrl, {
      margin: 4,
      width: 256,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR Generate Error:', err));
  }, [inv?.public_url]);

  // PDF Preview Polling Effect
  useEffect(() => {
    let active = true;
    let attempts = 0;
    const maxAttempts = 30; // 30 * 3s = 90s

    const checkPdf = async () => {
      try {
        if (!token) return;
        const res = await axiosInstance.get(`/invoice/public/${encodeURIComponent(String(token))}/download`, {
          headers: { Accept: 'application/json' },
        });

        if (res.status === 202 || (res.data && res.data.success === false && res.data.message?.includes('proses'))) {
          if (attempts < maxAttempts) {
            attempts++;
            if (active) setTimeout(checkPdf, 3000);
          } else {
            if (active) {
              setPdfIframeError('Waktu tunggu habis saat menyiapkan dokumen.');
              setIsGeneratingPdf(false);
            }
          }
          return;
        }

        const rawUrl = String(res?.data?.data?.pdf_url || '');
        if (!rawUrl) {
           throw new Error('URL PDF tidak ditemukan dari server.');
        }

        if (active) {
          const finalUrl = `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}view=1&t=${Date.now()}#navpanes=0&toolbar=1&view=FitH`;
          setPdfIframeUrl(finalUrl);
          setIsGeneratingPdf(false);
        }
      } catch (err: any) {
        if (active) {
          console.error("PDF Preview Error:", err);
          setPdfIframeError(err?.message || 'Gagal memuat pratinjau dokumen.');
          setIsGeneratingPdf(false);
        }
      }
    };

    if (token && !isPdfMode && !isVerifyMode && !isPrintMode) {
      setIsGeneratingPdf(true);
      checkPdf();
    } else {
      setIsGeneratingPdf(false);
    }

    return () => { active = false; };
  }, [token, isPdfMode, isVerifyMode, isPrintMode]);

  const groupedChannels = useMemo(() => {
    const groups: Record<string, any[]> = {};
    const filtered = tripayChannels.filter(c => 
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.group?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    filtered.forEach((c) => {
      const g = c.group || 'Lainnya';
      if (!groups[g]) groups[g] = [];
      groups[g].push(c);
    });
    return groups;
  }, [tripayChannels, searchTerm]);

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

  const invoiceData: Invoice | null = useMemo(() => {
    if (!inv) return null;
    try {
      const mapped = mapPublicInvoiceToRenderer(inv);
      if (!mapped.invoice_tenant_name || mapped.invoice_tenant_name.toLowerCase().includes('unknown')) {
        mapped.invoice_tenant_name = mapped.invoice_tenant_identifier ? `@${mapped.invoice_tenant_identifier}` : 'Klien Retail';
      }
      return mapped;
    } catch (e) {
      console.error("Mapping error:", e);
      return null;
    }
  }, [inv]);

  const companyInfo = useMemo(() => {
    if (!inv?.issuer) return undefined;
    const brandingLogo = String(inv?.branding?.logo_url || '');
    const logo = brandingLogo || String(inv.issuer.logo_url || '') || '/logo.png';
    return {
      name: inv.issuer.name || '',
      address: inv.issuer.address || '',
      phone: inv.issuer.phone || '',
      email: inv.issuer.email || '',
      logoDataUrl: logo,
      signature_name: inv.issuer.signature_name,
      signature_title: inv.issuer.signature_title,
      primary_color: inv?.branding?.primary_color,
    };
  }, [inv]);

  const [cancelling, setCancelling] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const isUpgrade = useMemo(() => {
    if (!inv) return false;
    const reason = String(inv.reason || '').toUpperCase();
    if (reason.includes('UPGRADE') || reason.includes('CHANGE') || reason.includes('PAKET')) return true;

    const billingList = inv.Billing || inv.billing || inv.billings;
    const billingArray = Array.isArray(billingList) ? billingList : (billingList ? [billingList] : []);
    const hasUpgradeBilling = billingArray.some((b: any) => {
      const type = String(b.charge_type || b.chargeType || b.type || '').toUpperCase();
      const bReason = String(b.reason || '').toUpperCase();
      return type === 'UPGRADE' || type.includes('CHANGE') || bReason.includes('UPGRADE') || bReason.includes('PAKET');
    });
    if (hasUpgradeBilling) return true;

    const hasUpgradeItems = inv.items?.some((it: any) => {
      const desc = String(it.description || '').toUpperCase();
      return desc.includes('UPGRADE') || desc.includes('GANTI PAKET') || desc.includes('SELISIH');
    });
    
    return !!hasUpgradeItems;
  }, [inv]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await cancelPendingUpgradePublic(token);
      if (res.success) {
        showToast('Transaksi berhasil dibatalkan', 'success');
        window.dispatchEvent(new CustomEvent('subscription-updated'));
        
        // Cek apakah user sedang login
        const hasUser = !!localStorage.getItem('user') || !!localStorage.getItem('token');
        const target = hasUser ? '/service-center?tab=catalog' : '/pricing';
        
        setTimeout(() => navigate(target), 1500);
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

  const handlePay = async () => {
    if (!selectedChannel) {
      showToast('Pilih metode pembayaran terlebih dahulu', 'warning');
      return;
    }
    setProcessingPayment(true);
    try {
      let methodCategory = 'QRIS';
      const channel = String(selectedChannel).toUpperCase();
      
      if (channel.includes('VA') || channel.includes('BRIVA') || channel.includes('BCAVA')) {
        methodCategory = 'BANK_TRANSFER';
      } else if (['OVO', 'DANA', 'SHOPEEPAY', 'LINKAJA'].includes(channel)) {
        methodCategory = 'E_WALLET';
      } else if (channel === 'QRIS' || channel === 'QRISC') {
        methodCategory = 'QRIS';
      }

      const isManual = selectedChannel === 'MANUAL_TRANSFER';
      const payload = {
        gateway: isManual ? 'MANUAL' : 'TRIPAY',
        method: isManual ? 'MANUAL_TRANSFER' : methodCategory,
        channel_code: selectedChannel,
        email: response?.contact?.email,
        phone: response?.contact?.phone,
        name: inv?.tenant?.name
      };
      const res = await axiosInstance.post(`/payment/public/${encodeURIComponent(String(token))}/pay`, payload, {
        headers: { Accept: 'application/json' },
      });
      const ref = res?.data?.data?.ref;
      if (ref) {
        if (res?.data?.data?.superseded) {
          showToast('Transaksi sebelumnya dibatalkan. Mengalihkan ke metode baru...', 'success');
        }
        navigate(`/payment/public/${token}/instruction?ref=${encodeURIComponent(ref)}`);
      }
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Gagal memproses pembayaran', 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as any } }
  };

  useEffect(() => {
    if (isPrintMode && !loading && !error && response) {
      const timer = setTimeout(() => {
        window.print();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isPrintMode, loading, error, response]);

  if (isPdfMode) {
    if (loading) return null;
    if (error || !inv) return <div id="invoice-pdf-root" data-ready="0">Error loading invoice for PDF</div>;
    return (
      <div id="invoice-pdf-root" data-ready="1" className="bg-white p-0 m-0">
        <style dangerouslySetInnerHTML={{ __html: `
          @page { 
            size: A4 portrait;
            margin: 0; 
          }
          @media print {
            body { 
              margin: 0; 
              padding: 0; 
              background-color: white !important;
            }
            #invoice-pdf-root { 
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
            }
          }
          #invoice-paper-container {
            border-radius: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        `}} />
        <InvoicePaperRenderer 
          invoice={invoiceData!} 
          companyInfo={companyInfo} 
          pdfCompact={false} 
          verification={{
            url: window.location.href,
            qrDataUrl: qrDataUrl,
            signedAt: inv?.pdf_generated_at
          }}
        />
      </div>
    );
  }

  if (isVerifyMode && !loading && !error && inv) {
    const formatAuditDate = (dateStr: any) => {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const day = String(d.getDate()).padStart(2, '0');
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      
      return `${day} ${month} ${year} - ${time}`;
    };

    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex flex-col font-sans selection:bg-blue-500/30 selection:text-blue-200 overflow-x-hidden selection-none">
        <Navbar />
        <main className="relative z-10 flex-grow pt-28 pb-16 px-4 flex items-center justify-center selection-none">
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
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Status Dokumen</span>
                         <div className={`text-base font-black px-1 ${status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {status === 'PAID' ? 'LUNAS' : 'MENUNGGU PEMBAYARAN'}
                         </div>
                      </div>
                   </div>

                   <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3 mb-4">
                         <Search className="w-4 h-4 text-slate-400" />
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rincian Layanan / Item</span>
                      </div>
                      <div className="space-y-2">
                         {(inv.items && inv.items.length > 0 ? inv.items : [{ description: inv.description || 'Layanan Berlangganan', total: inv.subtotal_amount || inv.amount, quantity: 1 }]).map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                               <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.description}</span>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Qty: {item.quantity || 1}</span>
                               </div>
                               <span className="text-sm font-black text-slate-900 dark:text-white">Rp{(item.total || 0).toLocaleString('id-ID')}</span>
                            </div>
                         ))}
                         <div className="flex justify-between items-center px-4 py-2 mt-2">
                            <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">TOTAL</span>
                            <span className="text-xl font-black text-blue-600">Rp{(inv.total_amount || 0).toLocaleString('id-ID')}</span>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                      <div className="space-y-4">
                         <div className="flex items-center gap-3">
                            <Zap className="w-4 h-4 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Trail</span>
                         </div>
                         <div className="space-y-3">
                            <div className="flex items-center gap-3">
                               <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                               <div className="flex flex-col">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">Dibuat Pada</span>
                                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{formatAuditDate(inv.created_at)}</span>
                                </div>
                            </div>
                            {inv.pdf_generated_at && (
                               <div className="flex items-center gap-3">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                  <div className="flex flex-col">
                                     <span className="text-[9px] font-bold text-blue-400 uppercase">PDF Di-generate</span>
                                     <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{formatAuditDate(inv.pdf_generated_at)}</span>
                                   </div>
                               </div>
                            )}
                            {status === 'PAID' && (inv.paid_at || inv.updated_at) && (
                               <div className="flex items-center gap-3">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  <div className="flex flex-col">
                                     <span className="text-[9px] font-bold text-emerald-400 uppercase">Pelunasan</span>
                                     <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{formatAuditDate(inv.paid_at || inv.updated_at)}</span>
                                   </div>
                               </div>
                            )}
                         </div>
                      </div>

                      <div className="space-y-4">
                         <div className="flex items-center gap-3">
                            <ShieldCheck className="w-4 h-4 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pejabat Pengesah</span>
                         </div>
                         <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/50">
                            <div className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">
                               {inv.issuer?.signature_name || 'System Official'}
                            </div>
                            <div className="text-[10px] font-bold text-blue-500 italic mt-0.5">
                               {inv.issuer?.signature_title || 'Legal Representative'}
                            </div>
                            <div className="mt-3 pt-3 border-t border-blue-100 dark:border-blue-800/50 flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-emerald-500" />
                               <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Tanda Tangan Digital Sah</span>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3 mb-4">
                         <FileText className="w-4 h-4 text-slate-400" />
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital Fingerprint (SHA256)</span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 font-mono text-[9px] text-slate-500 break-all leading-relaxed shadow-inner">
                         {inv.pdf_sha256 || 'SHA256:NOT_STAMPED_YET_REGENERATE_PDF_TO_FIX'}
                      </div>
                   </div>

                   <div className="flex flex-col gap-3 pt-4">
                      <button 
                        onClick={() => navigate(`/invoice/public/${token}`)}
                        className="w-full h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl flex items-center justify-center relative z-50 touch-manipulation cursor-pointer"
                      >
                         Lihat Dokumen Asli
                      </button>
                      <button 
                        onClick={() => navigate('/')}
                        className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-blue-500 transition-colors relative z-50 touch-manipulation cursor-pointer"
                      >
                         Kembali Ke Portal Utama
                      </button>
                   </div>
                </div>

                <div className="px-10 py-6 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-500" />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Absenta Trust Center</span>
                   </div>
                   <span className="text-[9px] font-medium text-slate-400 italic">Terbitan: {inv.issuer?.name || 'Absenta Official'}</span>
                </div>
             </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex flex-col font-sans selection:bg-blue-500/30 selection:text-blue-200 overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          nav, footer, .lg\\:col-span-4, .shrink-0, .toast-container, .confirm-modal {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            padding-top: 0 !important;
          }
          .max-w-6xl {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .lg\\:col-span-8 {
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .bg-white.dark\\:bg-slate-900 {
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .scale-\\[0\\.98\\], .lg\\:scale-\\[0\\.92\\] {
            transform: scale(1) !important;
            transform-origin: top left !important;
          }
          .p-0.md\\:p-4 {
            padding: 0 !important;
          }
          .min-w-\\[650px\\] {
            min-width: 100% !important;
          }
          body {
            background-color: white !important;
          }
        }
        .hide-btn {
          display: none !important;
        }
      `}} />
      
      <Navbar />
      
      <main className="relative z-10 flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8 selection-none">
        <div className="max-w-6xl mx-auto selection-none">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center min-h-[60vh]"
              >
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full" />
                  <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              </motion.div>
            ) : error || !inv ? (
              <motion.div 
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md mx-auto text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 shadow-xl"
              >
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">Akses Ditolak</h2>
                <p className="text-slate-500 mb-8 text-sm font-medium">
                  {error || "Link tidak valid atau sudah kedaluwarsa."}
                </p>
                <Button onClick={() => navigate('/')} className="rounded-xl px-8 h-12 bg-blue-600 text-white hover:bg-blue-500 font-black uppercase text-xs tracking-widest shadow-xl">
                  Ke Beranda
                </Button>
              </motion.div>
            ) : (
              <motion.div 
                key="content"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                <div className="flex items-center justify-between shrink-0 mb-2">
                   <button 
                     onClick={() => navigate('/service-center?tab=billing')} 
                     className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest transition-all"
                   >
                      <ArrowLeft size={14} /> Kembali ke Layanan
                   </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 group no-watch">
                  <div className="relative">
                    <div className="absolute -inset-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl blur opacity-25" />
                    <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl shadow-blue-500/5 border border-slate-100 dark:border-slate-800 overflow-hidden h-[800px] flex items-center justify-center">
                       {isGeneratingPdf ? (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center p-10 text-center"
                          >
                             <div className="relative w-16 h-16 mb-6">
                               <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full" />
                               <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                             </div>
                             <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2">
                               Menyiapkan Dokumen
                             </h4>
                             <p className="text-xs text-slate-500 max-w-[250px] mx-auto">
                               Sistem sedang melakukan rendering PDF secara real-time. Mohon tunggu sebentar...
                             </p>
                          </motion.div>
                       ) : pdfIframeError ? (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center p-10 text-center text-red-500"
                          >
                             <AlertCircle className="w-12 h-12 mb-4 opacity-50 mx-auto" />
                             <p className="text-xs font-bold uppercase tracking-widest">{pdfIframeError}</p>
                          </motion.div>
                       ) : pdfIframeUrl ? (
                         <motion.div 
                           initial={{ opacity: 0 }}
                           animate={{ opacity: 1 }}
                           transition={{ duration: 0.5 }}
                           className="w-full h-full relative"
                         >
                           <iframe 
                             src={pdfIframeUrl}
                             className="w-full h-full border-0 absolute inset-0 z-0"
                             title="Official Invoice Preview"
                           />
                           <div className="absolute inset-0 pointer-events-none border-[12px] border-white dark:border-slate-900 rounded-xl z-10" />
                         </motion.div>
                       ) : null}
                    </div>
                    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 px-2">
                       <div className="flex items-center gap-2">
                         <ShieldCheck size={12} />
                         <span className="text-[10px] font-black uppercase tracking-widest">Dokumen Dilindungi (Mode Preview PDF)</span>
                       </div>
                       {pdfIframeUrl && (
                         <a 
                           href={pdfIframeUrl} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600 transition-colors text-[9px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800"
                         >
                           <ExternalLink size={12} /> Buka Layar Penuh
                         </a>
                       )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-8" id="invoice-summary-card">
                   <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-blue-500/5 relative overflow-hidden group">
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Tagihan</span>
                           <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                {status === 'PAID' ? 'LUNAS' : status === 'CANCELLED' ? 'DIBATALKAN' : 'MENUNGGU PEMBAYARAN'}
                           </div>
                        </div>
                        
                        <div className="mb-1">
                           <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                             Rp{(inv?.total_amount || 0).toLocaleString('id-ID')}
                           </h3>
                        </div>
                        <p className="text-[11px] font-black text-slate-400 tracking-widest uppercase mb-8">{inv?.invoice_number}</p>

                        <div className="space-y-4">
                           {status === 'CANCELLED' && (
                             <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 rounded-xl text-center">
                               <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                               <h4 className="text-sm font-black text-red-600 uppercase tracking-tight">Tagihan Dibatalkan</h4>
                               <p className="text-[10px] font-medium text-red-500 mt-1">Tagihan ini tidak lagi valid dan tidak dapat dibayar.</p>
                             </div>
                           )}

                           {status !== 'PAID' && status !== 'CANCELLED' && (
                               <div className="space-y-4">
                                 <div className="relative">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Metode Pembayaran</label>
                                    
                                    {inv?.active_transaction && !selectedChannel && (
                                       <div className="mb-2 p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/50 flex items-center gap-2">
                                          <Zap size={12} className="text-emerald-600 animate-pulse" />
                                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                             Menunggu: {inv.active_transaction.method}
                                          </p>
                                       </div>
                                    )}

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
                                          <div className="flex flex-col items-start">
                                             <span className={`text-xs font-bold truncate max-w-[150px] ${selectedChannelObj ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                                                {selectedChannelObj?.name || (inv?.active_transaction ? 'Ganti Metode Bayar' : 'Pilih Cara Bayar')}
                                             </span>
                                             {inv?.active_transaction && selectedChannel === inv.active_transaction.method && (
                                                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Sedang Berjalan</span>
                                             )}
                                          </div>
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
                                         <div className="overflow-y-auto no-scrollbar flex-grow">
                                            {groupOrder.length > 0 ? groupOrder.map(group => (
                                              <div key={group}>
                                                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 text-[8px] font-black uppercase text-slate-400 tracking-widest">{group}</div>
                                                <div className="p-1 space-y-0.5">
                                                    {groupedChannels[group].map(c => (
                                                      <button
                                                        key={c.code}
                                                        onClick={() => { setSelectedChannel(c.code); setOpenChannelMenu(false); }}
                                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left group ${selectedChannel === c.code ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                                      >
                                                        <div className="flex items-center gap-3">
                                                            <img src={c.icon_url} alt="" className="h-4 w-auto max-w-[50px] object-contain" />
                                                            <div className="flex flex-col">
                                                               <span className={`text-[11px] font-bold ${selectedChannel === c.code ? 'text-blue-600' : 'text-slate-600 dark:text-slate-300'}`}>{c.name}</span>
                                                               {inv?.active_transaction && c.code === inv.active_transaction.method && (
                                                                  <span className="text-[7px] font-black text-emerald-600 uppercase tracking-tighter">Aktif</span>
                                                               )}
                                                            </div>
                                                        </div>
                                                        {selectedChannel === c.code && <Check className="w-3 h-3 text-blue-600" />}
                                                      </button>
                                                    ))}
                                                </div>
                                              </div>
                                            )) : (
                                              <div className="p-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tidak ditemukan</div>
                                            )}
                                         </div>
                                      </motion.div>,
                                      document.body
                                    )}
                                 </div>

                                 {inv?.active_transaction && (!selectedChannel || selectedChannel === inv.active_transaction.method) ? (
                                    <button 
                                      onClick={() => navigate(`/payment/public/${token}/instruction?ref=${encodeURIComponent(inv.active_transaction!.reference)}`)}
                                      className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                    >
                                       <Zap size={16} />
                                       Lihat Cara Bayar
                                    </button>
                                 ) : (
                                    <button 
                                      onClick={handlePay}
                                      disabled={!selectedChannel || processingPayment}
                                      className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                                    >
                                       {processingPayment ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CreditCard size={16} />}
                                       {selectedChannel ? (inv?.active_transaction ? 'Ganti Metode Bayar' : 'Bayar Sekarang') : 'Pilih Metode Pembayaran'}
                                    </button>
                                 )}
                               </div>
                            )}
                            
                            <div className="hide-btn">
                                <button
                                  onClick={async () => {
                                      let attempts = 0;
                                      const maxAttempts = 30;
                                      
                                      const attemptDownload = async () => {
                                        try {
                                          setPdfError(null);
                                          setDownloadingOfficialPdf(true);
                                          setPdfProcessingStep(1);
                                          
                                          const res = await axiosInstance.get(`/invoice/public/${encodeURIComponent(String(token))}/download`, {
                                            headers: { Accept: 'application/json' },
                                          });

                                          if (res.status === 202 || (res.data && res.data.success === false && res.data.message?.includes('proses'))) {
                                            setPdfProcessingStep(2);
                                            if (attempts < maxAttempts) {
                                              attempts++;
                                              setTimeout(attemptDownload, 3000);
                                              return;
                                            } else {
                                              throw new Error('Proses PDF terlalu lama.');
                                            }
                                          }
                                          
                                          setPdfProcessingStep(3);
                                          const rawUrl = String(res?.data?.data?.pdf_url || '');
                                          const pdfUrl = `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}download=1&t=${Date.now()}`;
                                          
                                          if (!rawUrl) throw new Error('PDF tidak tersedia');
                                          
                                          setTimeout(() => {
                                            window.location.href = pdfUrl;
                                            setDownloadingOfficialPdf(false);
                                            setPdfProcessingStep(0);
                                          }, 1000);
                                          
                                        } catch (e: any) {
                                          setPdfError(e?.message || 'Gagal download');
                                          showToast(e?.message || 'Gagal download', 'error');
                                          setDownloadingOfficialPdf(false);
                                          setPdfProcessingStep(0);
                                        }
                                      };
                                      await attemptDownload();
                                  }}
                                  disabled={downloadingOfficialPdf}
                                  className="w-full h-14 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-black uppercase tracking-widest rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                                >
                                  <Download size={16} /> Download PDF
                                </button>
                            </div>

                            {status !== 'PAID' && status !== 'CANCELLED' && (
                              <div className="pt-2">
                                <button 
                                  onClick={() => setCancelModalOpen(true)}
                                  disabled={cancelling}
                                  className="w-full h-12 bg-white hover:bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-red-100 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                                >
                                  {cancelling ? <div className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" /> : <AlertCircle size={14} />}
                                  Batalkan Pesanan
                                </button>
                              </div>
                            )}
                        </div>
                        
                        {pdfError && <p className="mt-4 text-[9px] text-red-500 text-center font-bold uppercase">{pdfError}</p>}
                      </div>
                   </div>

                   <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 flex items-center justify-center">
                              <ShieldCheck className="w-5 h-5 text-blue-500" />
                           </div>
                           <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">Security Center</h4>
                        </div>
                        <p className="text-slate-500 text-[11px] leading-relaxed mb-6 font-medium">
                          Dokumen ini sah dan terenkripsi. Hubungi tim dukungan untuk bantuan finansial.
                        </p>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Billing Support</span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight break-all">{response?.contact?.email || 'finance@absenta.id'}</span>
                        </div>
                      </div>
                   </div>

                   <div className="flex items-center justify-center gap-6 py-2">
                      <button className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-500 transition-colors">Help</button>
                      <div className="w-1 h-1 rounded-full bg-slate-200" />
                      <button className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-500 transition-colors">Compliance</button>
                   </div>
                 </div>
              </div>
            </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Footer />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <AnimatePresence>
        {downloadingOfficialPdf && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-10 border border-slate-200 dark:border-slate-800 shadow-2xl text-center"
            >
              <div className="relative w-24 h-24 mx-auto mb-8">
                 <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full" />
                 <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full" 
                 />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                       {pdfProcessingStep === 1 && (
                         <motion.div key="step1" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                            <Search className="w-10 h-10 text-blue-500" />
                         </motion.div>
                       )}
                       {pdfProcessingStep === 2 && (
                         <motion.div key="step2" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                            <FileText className="w-10 h-10 text-blue-500" />
                         </motion.div>
                       )}
                       {pdfProcessingStep === 3 && (
                         <motion.div key="step3" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                            <ShieldCheck className="w-10 h-10 text-emerald-500" />
                         </motion.div>
                       )}
                    </AnimatePresence>
                 </div>
              </div>

              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                {pdfProcessingStep === 1 && "Menyiapkan Data"}
                {pdfProcessingStep === 2 && "Merender Dokumen"}
                {pdfProcessingStep === 3 && "Hampir Selesai"}
              </h3>
              
              <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
                {pdfProcessingStep === 1 && "Mencari data invoice terbaru Anda..."}
                {pdfProcessingStep === 2 && "Menyusun tampilan PDF profesional dalam ukuran A4..."}
                {pdfProcessingStep === 3 && "Memverifikasi integritas dokumen. Siap mengunduh!"}
              </p>

              <div className="flex flex-col gap-2">
                 <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: "10%" }}
                      animate={{ 
                        width: pdfProcessingStep === 1 ? "30%" : pdfProcessingStep === 2 ? "70%" : "100%" 
                      }}
                      className="h-full bg-blue-500"
                    />
                 </div>
                 <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Official Invoice</span>
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">
                       {pdfProcessingStep === 1 && "30%"}
                       {pdfProcessingStep === 2 && "70%"}
                       {pdfProcessingStep === 3 && "100%"}
                    </span>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

const InvoicePublicPage: React.FC = () => {
  const { token } = useParams();
  if (!token) return <InvoicePublicView token="" />;
  return <InvoicePublicView token={token} />;
};

export default InvoicePublicPage;
