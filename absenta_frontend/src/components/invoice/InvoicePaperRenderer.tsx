import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { DEFAULT_SUPPORT_EMAIL, MAIN_DOMAIN } from '@/config/env-config';
import type { Invoice } from '../../types/invoice';
import { formatDateShort, formatDateTime } from '../../utils/layoutUtils';
import { fetchActiveSystemConfig } from '../../services/systemConfig';

interface InvoicePaperRendererProps {
  invoice: Invoice;
  companyInfo?: {
    // Basic
    name: string;
    address: string;
    phone?: string;
    email?: string;
    website?: string;
    logoDataUrl?: string;
    // Legal & Branding
    trade_name?: string;
    npwp?: string;
    signature_name?: string;
    signature_title?: string;
    footer_text?: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    // Tax
    is_pkp?: boolean;
    ppn_rate?: number;
  };
  verification?: {
    url?: string;
    qrDataUrl?: string;
    signedAt?: string;
  };
  pdfCompact?: boolean;
  /**
   * Jika true, bagian header (From/To/Dates) akan disembunyikan.
   * Berguna jika parent component sudah memiliki header sendiri.
   */
  hideHeader?: boolean;
}

/**
 * Komponen reusable untuk merender tampilan "kertas" invoice.
 */
export const InvoicePaperRenderer: React.FC<InvoicePaperRendererProps> = ({ 
  invoice, 
  companyInfo,
  verification,
  pdfCompact = false,
  hideHeader = false
}) => {
  const { data: systemConfig } = useQuery({
    queryKey: ['system-config', 'active'],
    queryFn: fetchActiveSystemConfig,
    staleTime: 1000 * 60 * 5,
  });

  const isPdfMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('pdf') === '1';
  const isPrintMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('print') === 'true';

  // Fallback values
  const currency = invoice.currency || 'Rp';
  
  const fmtMoney = (amount: number) => {
    return `Rp${(amount || 0).toLocaleString('id-ID')}`;
  };

  const status = invoice.status?.toUpperCase() || 'DRAFT';
  const isPaid = status === 'PAID';

  // Helper for enriched description
  const getEnrichedDescription = (desc: string) => {
    const appName = (systemConfig?.app_name || '').trim();
    let next = desc;
    if (invoice.billing?.billing_date) {
      const date = new Date(invoice.billing.billing_date);
      const period = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      if (!next.toLowerCase().includes(period.toLowerCase())) {
        next = `${next} - ${period}`;
      }
    }
    if (!appName) return next;
    const normalized = String(next || '').trim();
    if (!normalized) return normalized;
    if (normalized.toLowerCase().startsWith(appName.toLowerCase())) return normalized;
    return `${appName} - ${normalized}`;
  };

  const logoSrc = companyInfo?.logoDataUrl || invoice.invoice_company_logo_url || systemConfig?.logo_url || undefined;
  const logoCrossOrigin = (() => {
    if (!logoSrc || logoSrc.startsWith('data:')) return undefined;
    if (typeof window === 'undefined') return undefined;
    try {
      const u = new URL(logoSrc, window.location.href);
      if (u.origin !== window.location.origin) return 'anonymous';
      return undefined;
    } catch {
      return undefined;
    }
  })();

  return (
    <div
      id="invoice-paper-container"
      data-ready={systemConfig ? "1" : "0"}
      className={[
        'bg-white overflow-hidden relative flex flex-col font-sans text-slate-900',
        pdfCompact ? 'text-[11px] leading-snug' : 'min-h-[500px] text-xs',
        (!pdfCompact && !isPdfMode && !isPrintMode) ? 'shadow-sm' : ''
      ].join(' ')}
    >
      {/* 2. DIGITAL STATUS STAMP */}
      <div className={`absolute ${pdfCompact ? 'top-4 right-4 scale-75' : 'top-8 right-8 scale-90'} z-20`}>
         <div className={`relative flex items-center justify-center ${pdfCompact ? 'w-20 h-20' : 'w-24 h-24'} border-4 ${isPaid ? 'border-emerald-500/30' : 'border-slate-300/30'} rounded-full`}>
            <div className={`absolute inset-2 border-2 border-dashed ${isPaid ? 'border-emerald-500/20' : 'border-slate-300/20'} rounded-full animate-spin-slow`} />
            <div className={`flex flex-col items-center justify-center transform -rotate-12`}>
               <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${isPaid ? 'text-emerald-500' : 'text-slate-400'}`}>Official</span>
               <span className={`text-lg font-black uppercase tracking-tight -mt-1 ${isPaid ? 'text-emerald-600' : 'text-slate-500'}`}>{status}</span>
               <div className={`w-full h-px ${isPaid ? 'bg-emerald-500/30' : 'bg-slate-300/30'} my-0.5`} />
               <span className={`text-[7px] font-bold ${isPaid ? 'text-emerald-400' : 'text-slate-400'}`}>
                 {isPaid && invoice.paid_at ? formatDateShort(invoice.paid_at) : formatDateShort(new Date())}
               </span>
            </div>
         </div>
      </div>

      {/* 1. ISSUER HEADER */}
       {!hideHeader && (
        <div className={pdfCompact ? 'px-8 py-4 pb-0' : 'px-10 py-6 pb-0'}>
          <div className="flex flex-row items-center gap-4 mb-3">
             {logoSrc && (
               <div className="shrink-0">
                 <img
                    src={logoSrc}
                    alt="Company Logo"
                    className={pdfCompact ? 'h-8 object-contain' : 'h-10 object-contain filter grayscale hover:grayscale-0 transition-all duration-300'}
                    crossOrigin={logoCrossOrigin}
                    referrerPolicy="no-referrer"
                 />
               </div>
             )}
             
             <div className="flex-grow">
                <h1 className={pdfCompact ? 'text-base font-black tracking-tight text-slate-900 leading-none' : 'text-lg font-black tracking-tighter text-slate-900 leading-none'}>
                  {invoice.invoice_company_legal_name || companyInfo?.name || systemConfig?.company_legal_name || 'PT Baraya Teknologi Indonesia'}
                </h1>
                <div className={pdfCompact ? 'mt-1 text-[10px] text-slate-500 max-w-2xl leading-tight' : 'mt-1.5 text-[12px] text-slate-500 max-w-2xl leading-tight'}>
                  <p className="whitespace-pre-line font-medium opacity-80">
                    {invoice.invoice_company_address || companyInfo?.address || systemConfig?.company_address || 'Jl. Prof. Surya No. 123, Bandung, Jawa Barat, Indonesia'}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px] text-slate-400 font-semibold">
                     <span className="flex items-center gap-1">
                        NPWP: <span className="text-slate-600">{invoice.invoice_company_npwp || companyInfo?.npwp || '1234567890'}</span>
                     </span>
                     <div className="w-1 h-1 rounded-full bg-slate-200 mt-1.5" />
                     <span className="flex items-center gap-1">
                        Email: <span className="text-slate-600 lowercase font-medium">{invoice.invoice_company_email_billing || companyInfo?.email || systemConfig?.company_email_billing || DEFAULT_SUPPORT_EMAIL}</span>
                     </span>
                  </div>
                </div>
             </div>
          </div>
          <div className="w-full h-px bg-slate-100" />
        </div>
      )}

       {/* 3 & 4. META & CUSTOMER BLOCK */}
      <div className={pdfCompact ? 'px-8 py-4 flex flex-col md:flex-row gap-4 items-start mt-4' : 'px-10 py-5 flex flex-col md:flex-row gap-6 items-start mt-8'}>
        
        {/* 4. DITAGIHKAN KEPADA (Customer Block) */}
        <div className="flex-1 space-y-3">
           <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ditagihkan Kepada:</h3>
              <div className={pdfCompact ? 'text-lg font-bold text-slate-900 tracking-tight' : 'text-xl font-bold text-slate-900 tracking-tight'}>
                {(() => {
                   const name = invoice.invoice_tenant_name || invoice.tenant?.name;
                   const identifier = invoice.invoice_tenant_identifier || invoice.tenant?.domain;
                   
                   const isNameInvalid = !name || name.toLowerCase().includes('unknown') || name === 'N/A';
                   const isIdInvalid = !identifier || identifier.toLowerCase().includes('unknown') || identifier === 'N/A';

                   if (isNameInvalid) {
                      return !isIdInvalid ? `@${identifier.toUpperCase()}` : 'Klien Retail';
                   }
                   return name;
                })()}
              </div>
              
              {(() => {
                  const name = invoice.invoice_tenant_name || invoice.tenant?.name;
                  const identifier = (invoice.invoice_tenant_identifier || invoice.tenant?.domain || '').toUpperCase();
                  const isNameInvalid = !name || name.toLowerCase().includes('unknown') || name === 'N/A';
                  const isIdValid = identifier && identifier !== 'N/A';

                  if (!isNameInvalid && isIdValid && name.toUpperCase() !== identifier) {
                     return (
                       <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                         ID: {identifier}
                       </span>
                     );
                  }
                  return null;
               })()}
           </div>
           
           <div className="space-y-1">
              {(invoice.invoice_tenant_address || invoice.tenant?.address) ? (
                 <div className={pdfCompact ? 'text-[11px] text-slate-500 max-w-xs leading-relaxed font-medium' : 'text-[12px] text-slate-500 max-w-xs leading-relaxed font-medium'}>
                   {invoice.invoice_tenant_address || invoice.tenant?.address}
                 </div>
              ) : (
                 <div className="text-[10px] text-slate-400 italic font-medium">Alamat belum terdaftar di sistem</div>
              )}
           </div>
        </div>

         {/* 3. INVOICE META BLOCK */}
        <div className={pdfCompact ? 'w-full md:w-auto min-w-[200px] bg-slate-50/50 rounded-xl p-4 border border-slate-100' : 'w-full md:w-auto min-w-[240px] bg-slate-50/50 rounded-xl p-5 border border-slate-100'}>
           <div className="space-y-4">
               <div className="flex justify-between items-center pb-3 border-b border-slate-200/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No. Invoice</span>
                  <span className="text-[12px] font-bold text-slate-900">#{invoice.invoice_number}</span>
               </div>
               <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">Tgl. Terbit</span>
                  <span className="font-semibold text-slate-700">
                     {invoice.issue_date ? formatDateShort(invoice.issue_date) : (invoice.created_at ? formatDateShort(invoice.created_at) : '-')}
                  </span>
               </div>
               <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">Tgl. Tempo</span>
                  <span className="font-bold text-red-600">
                     {invoice.due_date ? formatDateShort(invoice.due_date) : '-'}
                  </span>
               </div>
               {isPaid && (invoice.paid_at || invoice.updated_at) && (
                 <div className="flex justify-between items-center text-[10px] mt-2 pt-2 border-t border-slate-100">
                    <span className="font-bold text-slate-400 uppercase tracking-wider">Tgl. Bayar</span>
                    <span className="font-bold text-emerald-600">
                       {formatDateShort(invoice.paid_at || invoice.updated_at)}
                    </span>
                 </div>
               )}
           </div>
        </div>
      </div>

       {/* 5. ITEM TABLE */}
      <div className={pdfCompact ? 'px-8 mb-4' : 'px-10 mb-6'}>
        <div className="rounded-xl border border-slate-100 overflow-hidden shadow-sm">
           <table className="min-w-full divide-y divide-slate-100">
             <thead className="bg-slate-50/50">
               <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deskripsi</th>
                  <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16">Jumlah</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider w-36">Harga Satuan</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider w-36">Total</th>
               </tr>
             </thead>
             <tbody className="bg-white divide-y divide-slate-50">
               {invoice.items && invoice.items.length > 0 ? (
                 invoice.items.map((item, index) => (
                    <tr key={index} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5">
                         <div className="text-[12px] font-bold text-slate-900 tracking-tight">{getEnrichedDescription(item.description)}</div>
                         <div className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5 tracking-tight">Biaya Layanan / Berlangganan</div>
                       </td>
                      <td className="px-6 py-5 text-[11px] font-semibold text-slate-900 text-center">{item.quantity}</td>
                      <td className="px-6 py-5 text-[11px] font-semibold text-slate-600 text-right">{fmtMoney(item.unit_price)}</td>
                      <td className="px-6 py-5 text-[12px] font-bold text-slate-900 text-right">{fmtMoney(item.total)}</td>
                    </tr>
                 ))
               ) : (
                 <tr className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5">
                       <div className="text-[12px] font-bold text-slate-900 tracking-tight">{getEnrichedDescription(invoice.description || 'Layanan Berlangganan')}</div>
                    </td>
                    <td className="px-6 py-5 text-[11px] font-semibold text-slate-900 text-center">1</td>
                    <td className="px-6 py-5 text-[11px] font-semibold text-slate-600 text-right">{fmtMoney(invoice.subtotal_amount || invoice.amount)}</td>
                    <td className="px-6 py-5 text-[12px] font-bold text-slate-900 text-right">{fmtMoney(invoice.subtotal_amount || invoice.amount)}</td>
                 </tr>
               )}
             </tbody>
           </table>
        </div>
      </div>

       {/* 6. FINANCIAL RECAP & SIGNATURE */}
      <div className={pdfCompact ? 'px-8 flex flex-row items-end justify-between mb-6' : 'px-10 flex flex-row items-end justify-between mb-8'}>
        {/* LEFT SIDE: SIGNATURE */}
        {!pdfCompact && (invoice.invoice_company_signature_name || companyInfo?.signature_name || systemConfig?.company_signature_name) && (
           <div className="flex-1 max-w-[200px] pb-4">
              <div className="text-center">
                 <p className="text-[10px] font-bold text-slate-400 mb-10">Pihak Berwenang,</p>
                 <div className="relative inline-block">
                    {/* Placeholder for actual signature image if needed in future */}
                    <p className="text-[13px] font-bold text-slate-900 underline underline-offset-4 decoration-slate-200">
                      {invoice.invoice_company_signature_name || companyInfo?.signature_name || systemConfig?.company_signature_name}
                    </p>
                 </div>
                 <div className="mt-1 flex flex-col items-center">
                    <span className="text-[10px] font-medium text-slate-400 italic">
                      {invoice.invoice_company_signature_title || companyInfo?.signature_title || systemConfig?.company_signature_title || 'Legal Representative'}
                    </span>
                 </div>
              </div>
           </div>
        )}

        {/* RIGHT SIDE: TOTALS */}
        <div className="w-full md:w-[45%] lg:w-[40%] p-6 bg-slate-50/30 rounded-xl border border-slate-100 space-y-3 shadow-sm">
           <div className="flex justify-between items-center gap-4">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Subtotal</span>
             <span className="text-[12px] font-bold text-slate-700 whitespace-nowrap">{fmtMoney(invoice.subtotal_amount || 0)}</span>
           </div>
           <div className="flex justify-between items-center gap-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Pajak ({(invoice.tax_rate !== null && invoice.tax_rate !== undefined) ? ((invoice.tax_rate > 1) ? invoice.tax_rate : invoice.tax_rate * 100) : 0}%)</span>
              {(invoice.tax_amount && invoice.tax_amount > 0) ? (
                 <span className="text-[12px] font-bold text-slate-700 whitespace-nowrap">{fmtMoney(invoice.tax_amount)}</span>
              ) : (
                 <span className="text-[10px] font-bold text-slate-400 italic whitespace-nowrap">Tanpa PPN</span>
              )}
           </div>
           {(invoice.discount_amount || 0) > 0 && (
             <div className="flex justify-between items-center gap-4">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Potongan/Kredit</span>
               <span className="text-[12px] font-bold text-emerald-600 whitespace-nowrap">-{fmtMoney(invoice.discount_amount || 0)}</span>
             </div>
           )}
           <div className="pt-4 mt-2 border-t border-slate-200">
             <div className="flex justify-between items-end gap-6">
               <span className="text-[11px] font-bold text-slate-900 tracking-widest uppercase pb-1">TOTAL</span>
               <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600 tracking-tighter leading-none">{fmtMoney(invoice.total_amount ?? 0)}</div>
                  <div className="text-[8px] font-bold text-blue-500 uppercase tracking-widest mt-1 opacity-50">Sudah Termasuk Biaya Layanan</div>
               </div>
             </div>
           </div>
        </div>
      </div>

       <div className="flex-grow"></div>
 
       {/* 7, 8 & 9. MERGED FOOTER (LEGAL + VERIFICATION + SIGNATURE) */}
       <div className={pdfCompact ? 'px-8 mb-8 pt-4 border-t border-slate-100' : 'px-10 mb-10 pt-8 border-t-2 border-slate-100'}>
         <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
            {/* LEGAL (SYARAT & KETENTUAN) */}
            <div className="md:col-span-6 lg:col-span-7">
               <h4 className="text-[10px] font-bold text-slate-500 mb-2">Syarat & Ketentuan:</h4>
               <div className="text-[10px] text-slate-400 space-y-1.5 leading-relaxed font-medium text-justify max-w-md">
                 <p>Dokumen ini adalah bukti tagihan resmi yang diterbitkan oleh <span className="font-bold text-slate-600">{invoice.invoice_company_legal_name || companyInfo?.name || systemConfig?.company_legal_name || 'PT Baraya Teknologi Indonesia'}</span>. Verifikasi digital dilakukan via QR Code.</p>
                 <p>Pembayaran harus diselesaikan sebelum tanggal jatuh tempo. Keterlambatan dapat mengakibatkan penangguhan layanan sementara sesuai perjanjian.</p>
               </div>
            </div>

             {/* VERIFICATION (QR) */}
             {verification?.url && (
                <div className="md:col-span-6 lg:col-span-5 flex justify-end">
                   <div className="p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <div className="w-28 h-28 flex items-center justify-center shrink-0">
                        {verification.qrDataUrl ? (
                          <img 
                            src={verification.qrDataUrl} 
                            alt="QR" 
                            className="w-full h-full object-contain" 
                            style={{ imageRendering: 'pixelated' }}
                          />
                        ) : (
                          <div className="text-[8px] text-slate-300">VOID</div>
                        )}
                      </div>
                   </div>
                </div>
             )}
          </div>
       </div>

       <div className="pb-8 text-center opacity-30 flex flex-col items-center gap-1">
          <p className="text-[9px] font-bold tracking-[0.4em] uppercase text-slate-400">{companyInfo?.footer_text || systemConfig?.footer_text || `Certified by ${systemConfig?.app_name || MAIN_DOMAIN}`}</p>
          {invoice.pdf_sha256 && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Digital Fingerprint:</span>
              <span className="text-[7px] font-mono text-slate-300 break-all max-w-md">{invoice.pdf_sha256}</span>
            </div>
          )}
       </div>
    </div>
  );
};
