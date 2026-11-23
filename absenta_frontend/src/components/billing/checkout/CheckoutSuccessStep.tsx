import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  ShieldCheck, 
  FileText, 
  Printer, 
  Copy, 
  ArrowRight, 
  Calendar, 
  CreditCard, 
  Sparkles,
  ExternalLink,
  Store
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/billingUtils';
import { toast } from 'react-hot-toast';
import type { Plan } from '@/types/plans';

interface CheckoutSuccessStepProps {
  invoiceDetails?: any;
  plan?: Plan | null;
  cycle?: 'MONTH' | 'YEAR';
}

export const CheckoutSuccessStep: React.FC<CheckoutSuccessStepProps> = React.memo(({ 
  invoiceDetails,
  plan,
  cycle = 'MONTH'
}) => {
  const navigate = useNavigate();
  const inv = invoiceDetails?.data || invoiceDetails;

  const invoiceNumber = inv?.invoice_number || inv?.invoice_id || inv?.id || '-';
  const planName = inv?.notes || inv?.plan_title || plan?.name || 'Layanan Modul Absenta';
  const totalAmount = Number(inv?.total_amount ?? inv?.amount ?? 0);
  const paymentMethod = String(inv?.payment_method || 'GATEWAY').toUpperCase().replace(/_/g, ' ');

  // Deteksi cerdas apakah modul ini Koperasi
  const isKoperasi = useMemo(() => {
    const code = String(plan?.service_code || inv?.service_code || '').toUpperCase();
    const name = String(planName).toUpperCase();
    return code === 'KOPERASI' || name.includes('KOPERASI');
  }, [plan, inv, planName]);

  const handleCopyInvoice = () => {
    if (invoiceNumber && invoiceNumber !== '-') {
      navigator.clipboard.writeText(invoiceNumber);
      toast.success('Nomor invoice disalin!');
    }
  };

  const handlePrint = () => {
    const cleanId = encodeURIComponent(String(invoiceNumber).replace(/^#/, '').trim());
    if (cleanId && cleanId !== '-') {
      window.open(`/api/invoice/${cleanId}/print`, '_blank');
    } else {
      window.print();
    }
  };

  const handleGoToService = () => {
    if (isKoperasi) {
      navigate('/cooperative/dashboard?subtab=langganan');
    } else {
      navigate('/service-center?tab=services');
    }
  };

  const handleGoToInvoices = () => {
    if (isKoperasi) {
      navigate('/cooperative/dashboard?subtab=langganan&inner_tab=invoices');
    } else {
      navigate('/service-center?tab=invoices');
    }
  };

  const formattedDate = useMemo(() => {
    const d = inv?.paid_at ? new Date(inv.paid_at) : new Date();
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [inv]);

  return (
    <motion.div
      key="activate-step"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="max-w-2xl mx-auto w-full px-2 sm:px-0 py-4 sm:py-8"
    >
      <Card className="p-6 sm:p-10 border-none shadow-2xl shadow-emerald-500/10 ring-1 ring-slate-100 dark:ring-slate-800 bg-white dark:bg-slate-900 rounded-3xl relative overflow-hidden text-center">
        {/* Glow Accent Background */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-72 h-48 bg-gradient-to-b from-emerald-500/10 to-transparent blur-3xl -z-10 pointer-events-none" />

        {/* Success Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-5 ring-8 ring-emerald-500/5 shadow-inner">
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Check size={36} strokeWidth={3.5} />
          </motion.div>
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider mb-3">
          <Sparkles size={12} className="text-emerald-500" />
          <span>Aktivasi Instan Berhasil • Pembayaran Lunas</span>
        </div>

        {/* Package Title */}
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
          {planName}
        </h2>
        
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed max-w-lg mx-auto mb-8">
          Selamat! Pembayaran tagihan telah diverifikasi oleh gateway. Hak akses penuh modul ini telah resmi dibuka dan langsung aktif di lingkungan kerja sekolah Anda.
        </p>

        {/* Digital Receipt Card (Slip Bukti Pembayaran Resmi) */}
        <div className="w-full bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 text-left mb-8 shadow-xs relative">
          <div className="flex items-center justify-between pb-4 border-b border-dashed border-slate-200 dark:border-slate-700/60 mb-4">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              Bukti Transaksi Resmi
            </span>
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-mono text-xs font-bold bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <span>{invoiceNumber}</span>
              <button
                type="button"
                onClick={handleCopyInvoice}
                className="text-slate-400 hover:text-blue-600 transition-colors p-0.5"
                title="Salin Nomor Invoice"
              >
                <Copy size={13} />
              </button>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mb-5">
            <div className="space-y-1">
              <span className="text-slate-400 font-bold block text-[11px] uppercase tracking-wider">
                Waktu Transaksi
              </span>
              <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                <Calendar size={14} className="text-blue-500 shrink-0" />
                <span>{formattedDate}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-bold block text-[11px] uppercase tracking-wider">
                Metode Pembayaran
              </span>
              <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                <CreditCard size={14} className="text-indigo-500 shrink-0" />
                <span>{paymentMethod}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-bold block text-[11px] uppercase tracking-wider">
                Siklus Layanan
              </span>
              <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200">
                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md text-[11px]">
                  {cycle === 'YEAR' ? 'Tahunan (1 Tahun)' : 'Bulanan (1 Bulan)'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-bold block text-[11px] uppercase tracking-wider">
                Status Modul
              </span>
              <div className="flex items-center gap-1.5 font-black text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Aktif Instan (Ready)</span>
              </div>
            </div>
          </div>

          {/* Amount Box */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Pembayaran Lunas
              </span>
              <span className="text-[10px] text-slate-400 italic">Termasuk PPN & Biaya Transaksi Saluran Gateway</span>
            </div>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>

        {/* Action Buttons Section */}
        <div className="space-y-3 w-full">
          {/* Primary Action Button (Full Width, Prominent) */}
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleGoToService}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
          >
            {isKoperasi ? <Store size={18} /> : <ShieldCheck size={18} />}
            <span>{isKoperasi ? 'Buka Dashboard Koperasi & Mulai Layanan' : 'Buka Layanan di Service Center'}</span>
            <ArrowRight size={18} />
          </Button>

          {/* Secondary Actions (Dual Grid Responsif) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              className="w-full h-11 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <Printer size={16} className="text-slate-500" />
              <span>Cetak Bukti Pembayaran (PDF)</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoToInvoices}
              className="w-full h-11 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <FileText size={16} className="text-slate-500" />
              <span>Lihat Riwayat Tagihan</span>
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
});
