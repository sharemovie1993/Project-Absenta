import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui';
import { InvoicePaperRenderer } from '@/components/invoice/InvoicePaperRenderer';
import { type Invoice, type InvoicePublicData, type TripayChannel } from '@/types/invoice';
import axiosInstance from '@/lib/axiosInstance';
import { mapPublicInvoiceToRenderer } from '@/utils/invoice';
import toast from 'react-hot-toast';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InvoiceVerificationView } from '@/components/invoice/InvoiceVerificationView';
import { InvoicePdfPreview } from '@/components/public/invoice/InvoicePdfPreview';
import { InvoiceSummaryCard } from '@/components/public/invoice/InvoiceSummaryCard';

export const InvoicePublicView: React.FC<{ token?: string }> = ({ token: propToken }) => {
  const { token: urlToken } = useParams<{ token: string }>();
  const token = propToken || urlToken;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const isPrintMode = searchParams.get('print') === 'true';
  const isPdfMode = searchParams.get('pdf') === '1';
  const isVerifyMode = searchParams.get('verify') === '1';



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

    return data as Invoice;
  }, [response]);

  const [downloadingOfficialPdf, setDownloadingOfficialPdf] = useState(false);
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

  const breadcrumbs = useMemo(() => [
    { label: 'Layanan' },
    { label: 'Invoice' }
  ], []);

  const instruction = useMemo(() => ({
    title: 'Panduan Invoice Publik',
    description: 'Halaman ini memungkinkan Anda melihat, mengunduh, dan melakukan pembayaran invoice secara aman.',
    items: [
      { text: 'Pilih metode pembayaran yang tersedia di panel sebelah kanan.' },
      { text: 'Klik "Unduh PDF" untuk mendapatkan salinan resmi invoice.' },
      { text: 'Pastikan status invoice berubah menjadi "PAID" setelah pembayaran diverifikasi.' }
    ]
  }), []);

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
          setResponse(res.data as InvoicePublicData);
        }
      } catch (e: unknown) {
        if (active) setError(e instanceof Error ? e.message : 'Gagal memuat data invoice');
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
    const canonicalUrl = (inv as any)?.public_url || window.location.href;
    QRCode.toDataURL(canonicalUrl, {
      margin: 4,
      width: 256,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR Generate Error:', err));
  }, [(inv as any)?.public_url]);

  useEffect(() => {
    let active = true;
    let attempts = 0;
    const maxAttempts = 30;

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
        if (!rawUrl) throw new Error('URL PDF tidak ditemukan dari server.');

        if (active) {
          const finalUrl = `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}view=1&t=${Date.now()}#navpanes=0&toolbar=1&view=FitH`;
          setPdfIframeUrl(finalUrl);
          setIsGeneratingPdf(false);
        }
      } catch (err: unknown) {
        if (active) {
          setPdfIframeError(err instanceof Error ? err.message : 'Gagal memuat pratinjau dokumen.');
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
    const groups: Record<string, TripayChannel[]> = {};
    const filtered = (tripayChannels || []).filter(c => 
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
    const sorted = [...pref.filter(p => all.some(a => a.toLowerCase() === p.toLowerCase()))];
    const remaining = all.filter(a => !pref.some(p => p.toLowerCase() === a.toLowerCase()));
    return [...sorted, ...remaining];
  }, [groupedChannels]);

  const selectedChannelObj = useMemo(() => {
    return tripayChannels.find(c => c.code.toUpperCase() === selectedChannel.toUpperCase());
  }, [selectedChannel, tripayChannels]);

  const invoiceData: Invoice | null = useMemo(() => {
    if (!inv) return null;
    try {
      const mapped = mapPublicInvoiceToRenderer(inv as any);
      if (!mapped.invoice_tenant_name || mapped.invoice_tenant_name.toLowerCase().includes('unknown')) {
        mapped.invoice_tenant_name = mapped.invoice_tenant_identifier ? `@${mapped.invoice_tenant_identifier}` : 'Klien Retail';
      }
      return mapped;
    } catch (e) {
      return null;
    }
  }, [inv]);

  const companyInfo = useMemo(() => {
    if (!(inv as any)?.issuer) return undefined;
    const brandingLogo = String((inv as any)?.branding?.logo_url || '');
    const logo = brandingLogo || String((inv as any).issuer.logo_url || '') || '/logo.png';
    return {
      name: (inv as any).issuer.name || '',
      address: (inv as any).issuer.address || '',
      phone: (inv as any).issuer.phone || '',
      email: (inv as any).issuer.email || '',
      logoDataUrl: logo,
      signature_name: (inv as any).issuer.signature_name,
      signature_title: (inv as any).issuer.signature_title,
      primary_color: (inv as any)?.branding?.primary_color,
    };
  }, [inv]);

  const handlePay = async () => {
    if (!selectedChannel) {
      toast('Pilih metode pembayaran terlebih dahulu', { icon: '⚠️' });
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
          toast.success('Transaksi sebelumnya dibatalkan. Mengalihkan ke metode baru...');
        }
        navigate(`/payment/public/${token}/instruction?ref=${encodeURIComponent(ref)}`);
      }
    } catch (e: unknown) {
      const err = e as any;
      toast.error(err?.response?.data?.message || 'Gagal memproses pembayaran');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleDownload = useCallback(async () => {
    try {
      setDownloadingOfficialPdf(true);
      const res = await axiosInstance.get(`/invoice/public/${encodeURIComponent(String(token))}/download`, { headers: { Accept: 'application/json' } });
      const rawUrl = String(res?.data?.data?.pdf_url || '');
      if (rawUrl) window.location.href = `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}download=1`;
      else throw new Error('PDF tidak tersedia');
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message || 'Gagal download');
    } finally {
      setDownloadingOfficialPdf(false);
    }
  }, [token]);

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
          @page { size: A4 portrait; margin: 0; }
          @media print {
            body { margin: 0; padding: 0; background-color: white !important; }
            #invoice-pdf-root { padding: 0 !important; margin: 0 !important; width: 100% !important; }
          }
          #invoice-paper-container { border-radius: 0 !important; box-shadow: none !important; border: none !important; }
        `}} />
        <InvoicePaperRenderer 
          invoice={invoiceData!} 
          companyInfo={companyInfo} 
          pdfCompact={false} 
          verification={{ url: window.location.href, qrDataUrl: qrDataUrl, signedAt: (inv as any)?.pdf_generated_at }}
        />
      </div>
    );
  }

  if (isVerifyMode && !loading && !error && inv) {
    const formatAuditDate = (dateStr: string | undefined) => {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()} - ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
    };

    return (
      <AcademicPageLayout
        title="Verifikasi Dokumen"
        description="Detail keaslian dokumen invoice yang diterbitkan oleh sistem."
        breadcrumbs={breadcrumbs}
        instruction={instruction}
        hardeningModuleKey="invoice_verification"
      >
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
          <Navbar />
          <main className="relative z-10 flex-grow pt-28 pb-16 px-4 flex items-center justify-center">
            <InvoiceVerificationView 
              inv={inv} 
              formatAuditDate={formatAuditDate} 
              onBack={() => navigate(-1)}
              publicUrl={(inv as any).public_url || window.location.href}
            />
          </main>
          <Footer />
        </div>
      </AcademicPageLayout>
    );
  }

  return (
    <AcademicPageLayout
      title="Invoice Publik"
      description={`Nomor Tagihan: ${inv?.invoice_number || '-'}`}
      breadcrumbs={breadcrumbs}
      instruction={instruction}
      hardeningModuleKey="invoice_public_page"
      isLoading={loading}
    >
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans selection:bg-blue-500/30 selection:text-blue-200">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            nav, footer, .lg\\:col-span-4, .shrink-0, .toast-container, .confirm-modal { display: none !important; }
            main { padding: 0 !important; margin: 0 !important; padding-top: 0 !important; }
            .max-w-6xl { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
            .lg\\:col-span-8 { width: 100% !important; padding: 0 !important; margin: 0 !important; }
            .bg-white.dark\\:bg-slate-900 { border: none !important; box-shadow: none !important; border-radius: 0 !important; }
            .scale-\\[0\\.98\\], .lg\\:scale-\\[0\\.92\\] { transform: scale(1) !important; transform-origin: top left !important; }
            .p-0.md\\:p-4 { padding: 0 !important; }
            .min-w-\\[650px\\] { min-width: 100% !important; }
            body { background-color: white !important; }
          }
          .hide-btn { display: none !important; }
        `}} />
        
        <Navbar />
        
        <main className="relative z-10 flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <AnimatePresence mode="wait">
              {error || !inv ? (
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
                  <p className="text-slate-500 mb-8 text-sm font-medium">{error || "Link tidak valid atau sudah kedaluwarsa."}</p>
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
                     <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest transition-all">
                        <ArrowLeft size={14} /> Kembali
                     </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-8 group no-watch">
                       <InvoicePdfPreview 
                         isGeneratingPdf={isGeneratingPdf}
                         pdfIframeError={pdfIframeError}
                         pdfIframeUrl={pdfIframeUrl}
                       />
                    </div>

                    <div className="lg:col-span-4 space-y-8" id="invoice-summary-card">
                       <InvoiceSummaryCard 
                         status={status}
                         totalAmount={inv.total_amount || 0}
                         invoiceNumber={inv.invoice_number || '-'}
                         selectedChannel={selectedChannel}
                         selectedChannelObj={selectedChannelObj}
                         openChannelMenu={openChannelMenu}
                         setOpenChannelMenu={setOpenChannelMenu}
                         searchTerm={searchTerm}
                         setSearchTerm={setSearchTerm}
                         groupOrder={groupOrder}
                         groupedChannels={groupedChannels}
                         onSelectChannel={setSelectedChannel}
                         onPay={handlePay}
                         onDownload={handleDownload}
                         processingPayment={processingPayment}
                         downloadingPdf={downloadingOfficialPdf}
                         triggerRef={triggerRef}
                         menuPos={menuPos}
                         setMenuPos={setMenuPos}
                       />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
        <Footer />
      </div>
    </AcademicPageLayout>
  );
};

export default InvoicePublicView;
