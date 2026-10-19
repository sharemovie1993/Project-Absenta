import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge, Loader } from '../ui';
import { Receipt, CheckCircle, Box, Printer, AlertTriangle, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { Invoice } from '../../types/invoice';
import { formatCurrency, getServiceStyle } from '@/lib/billingUtils';

const formatDate = (date?: string | Date | null) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
};

interface BillingInvoicesSectionProps {
  invoices: Invoice[];
  actionLoading?: string | null;
  handleViewInvoice?: (invoiceId: string, forceDocument?: boolean) => Promise<void> | void;
  handleCancelInvoice?: (invoiceId: string) => Promise<void> | void;
  isLoading?: boolean;
  onRefresh?: () => void;
  isLicenseServerOffline?: boolean;
}

export const BillingInvoicesSection: React.FC<BillingInvoicesSectionProps> = ({
  invoices,
  actionLoading,
  handleViewInvoice,
  handleCancelInvoice,
  isLoading,
  onRefresh,
  isLicenseServerOffline = false
}) => {
  const navigate = useNavigate();

  const onViewInvoice = (inv: Invoice, forceDocument = false) => {
    if (typeof handleViewInvoice === 'function') {
      try {
        handleViewInvoice(inv.invoice_number || inv.id, forceDocument);
        return;
      } catch (e) {
        console.error('handleViewInvoice error:', e);
      }
    }
    const invId = inv.invoice_number || inv.id;
    if (invId) {
      navigate(`/billing/checkout?invoice_id=${invId}`);
    }
  };

  const activeInvoices = useMemo(() => {
    return invoices?.filter(i => !['PAID', 'CANCELLED'].includes(i.status)) || [];
  }, [invoices]);

  const transactionHistory = useMemo(() => {
    return invoices?.filter(i => ['PAID', 'CANCELLED'].includes(i.status)) || [];
  }, [invoices]);

  // Dedicated Compact Offline State when license server is unreachable and no cached invoices exist
  if (isLicenseServerOffline && (!invoices || invoices.length === 0)) {
    return (
      <div className="w-full min-w-0 py-2 sm:py-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col items-center text-center max-w-lg mx-auto space-y-3.5">
          {/* Compact Icon */}
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/70 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <CloudOff size={24} />
          </div>

          {/* Heading & Short Description */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-amber-100/70 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Server Lisensi Offline</span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
              Riwayat Tagihan Sementara Tidak Tersedia
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal max-w-sm mx-auto">
              Data tagihan dan invoice ditarik langsung dari server cloud pusat. Catatan transaksi Anda tersimpan aman dan akan otomatis tampil kembali setelah server pusat pulih.
            </p>
          </div>

          {/* Reassurance Banner */}
          <div className="w-full bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 rounded-xl px-3 py-2 text-left flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-[11px] text-emerald-800 dark:text-emerald-200 font-medium leading-snug">
              <strong>Modul Aktif Berjalan Normal:</strong> Seluruh modul lokal sekolah tetap 100% aktif.
            </p>
          </div>

          {/* Mobile-Friendly Action Button */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 w-full">
            <Button
              type="button"
              variant="default"
              onClick={() => onRefresh ? onRefresh() : window.location.reload()}
              disabled={isLoading}
              className="w-full sm:flex-1 rounded-xl font-bold text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
              <span>{isLoading ? 'Menghubungkan...' : 'Muat Ulang Riwayat'}</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Offline Alert Banner (Only shown if there are cached invoices while offline) */}
      {isLicenseServerOffline && invoices?.length > 0 && (
        <div className="flex items-center gap-2.5 p-3.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-xl text-amber-900 dark:text-amber-200 shadow-xs">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <span className="text-xs font-medium">
            Server lisensi pusat sedang offline. Menampilkan data invoice terakhir yang tersimpan secara lokal.
          </span>
        </div>
      )}

      {/* 1. Active Invoices */}
      <Card className="p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-xl">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Receipt size={18} />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-tight">Tagihan Aktif</h3>
          </div>
          {activeInvoices?.length > 0 && (
            <Badge variant="warning" className="text-[10px] font-bold px-3 py-0.5">
              {activeInvoices.length} Tertunggak
            </Badge>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.8px] text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="px-6 py-3">Invoice</th>
                <th className="px-6 py-3">Layanan</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Total</th>
                <th className="px-6 py-3 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeInvoices?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 font-medium italic text-xs">
                    {isLicenseServerOffline
                      ? 'Tidak dapat memuat tagihan aktif saat ini (Server lisensi pusat offline).'
                      : 'Tidak ada tagihan aktif saat ini.'}
                  </td>
                </tr>
              ) : (
                activeInvoices?.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white tracking-tight">#{inv.invoice_number}</div>
                      {((inv as any).plan_name || (inv as any).plan_title) && (
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                          {(inv as any).plan_name || (inv as any).plan_title}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">{formatDate(inv.created_at)}</div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const sub = (inv as any).Subscription || (inv as any).Billing?.[0]?.Subscription;
                        const serviceName = sub?.Plan?.Module?.name || sub?.Plan?.name || sub?.service_code || 'Umum';
                        const style = getServiceStyle(serviceName);
                        const IconComponent = (LucideIcons as any)[style.icon] || Box;

                        return (
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-md ${style.dot} bg-opacity-10 dark:bg-opacity-20`}>
                              <IconComponent size={12} className={style.text} />
                            </div>
                            <span className={`text-[10px] font-black ${style.text} uppercase tracking-widest leading-none`}>
                              {serviceName}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const hasPendingPayment = (inv as any).payments?.some((p: any) => p.status === 'PENDING' || p.status === 'WAITING');
                        if (hasPendingPayment && inv.status !== 'CANCELLED' && inv.status !== 'PAID') {
                          return (
                            <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-800/30 w-fit">
                              <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse"></div>
                              <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">Menunggu Pembayaran</span>
                            </div>
                          );
                        }
                        const statusMap: Record<string, { label: string; variant: 'warning' | 'destructive' | 'success' | 'secondary' }> = {
                          'DRAFT': { label: 'MENUNGGU PEMBAYARAN', variant: 'warning' },
                          'SENT': { label: 'MENUNGGU PEMBAYARAN', variant: 'warning' },
                          'VIEWED': { label: 'MENUNGGU PEMBAYARAN', variant: 'warning' },
                          'PAID': { label: 'LUNAS', variant: 'success' },
                          'CANCELLED': { label: 'DIBATALKAN', variant: 'destructive' },
                          'OVERDUE': { label: 'TERLAMBAT', variant: 'destructive' }
                        };
                        const currentStatus = statusMap[inv.status] || { label: inv.status, variant: 'secondary' };
                        return (
                          <Badge variant={currentStatus.variant} className="uppercase text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md">
                            {currentStatus.label}
                          </Badge>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                      {formatCurrency(inv.total_amount, inv.currency)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {typeof handleCancelInvoice === 'function' && inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleCancelInvoice(inv.invoice_number || inv.id)} 
                            disabled={actionLoading === inv.id || actionLoading === inv.invoice_number}
                            className="rounded-md border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-bold h-8 px-3 text-xs hover:bg-red-50 dark:hover:bg-red-950/30 transition-all active:scale-[0.97]"
                          >
                            {actionLoading === inv.id || actionLoading === inv.invoice_number ? <Loader size="sm" /> : 'Batalkan'}
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          onClick={() => onViewInvoice(inv)} 
                          disabled={actionLoading === inv.id}
                          className="rounded-md bg-blue-600 text-white font-bold h-8 px-4 text-xs shadow-md shadow-blue-600/10 hover:bg-blue-700 transition-all active:scale-[0.97]"
                        >
                          {actionLoading === inv.id ? <Loader size="sm" /> : 'Bayar / Detail'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 2. Transaction History (Consolidated PAID & CANCELLED) */}
      <Card className="p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-xl">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <CheckCircle size={18} />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-tight">Riwayat Transaksi</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.8px] text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="px-6 py-3">Invoice & Layanan</th>
                <th className="px-6 py-3">Tanggal</th>
                <th className="px-6 py-3">Metode</th>
                <th className="px-6 py-3 text-right">Nominal</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactionHistory?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 font-medium italic text-xs">
                    {isLicenseServerOffline
                      ? 'Riwayat transaksi online sementara tidak tersedia (Server lisensi pusat offline).'
                      : 'Belum ada riwayat transaksi.'}
                  </td>
                </tr>
              ) : (
                transactionHistory?.map((inv) => {
                  const sub = (inv as any).Subscription || (inv as any).Billing?.[0]?.Subscription;
                  const serviceName = sub?.Plan?.Module?.name || sub?.Plan?.name || sub?.service_code || 'Umum';
                  const style = getServiceStyle(serviceName);
                  const IconComponent = (LucideIcons as any)[style.icon] || Box;
                  const payment = (inv as any).payments?.[0]; // Get most recent payment

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white tracking-tight">#{inv.invoice_number}</div>
                        {((inv as any).plan_name || (inv as any).plan_title) && (
                          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                            {(inv as any).plan_name || (inv as any).plan_title}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className={`p-1 rounded-sm ${style.dot} bg-opacity-10`}>
                            <IconComponent size={10} className={style.text} />
                          </div>
                          <span className={`text-[9px] font-black ${style.text} uppercase tracking-widest leading-none`}>
                            {serviceName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">{formatDate(inv.created_at)}</td>
                      <td className="px-6 py-4">
                        {payment?.payment_method ? (
                          <Badge variant="outline" className="text-[9px] uppercase font-bold py-0 h-5 border-slate-200 text-slate-500">
                            {payment.payment_method.replace(/_/g, ' ')}
                          </Badge>
                        ) : (
                          <span className="text-slate-300 italic text-[10px]">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                        {formatCurrency(inv.total_amount, inv.currency)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge 
                          variant={inv.status === 'PAID' ? 'success' : 'destructive'} 
                          className={`uppercase text-[9px] font-black px-2.5 py-0.5 ${inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : ''}`}
                        >
                          {inv.status === 'PAID' ? 'LUNAS' : 'BATAL'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => onViewInvoice(inv, true)} 
                            className="rounded-md h-8 px-3 font-bold text-xs border-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
                            title="Buka Dokumen / Cetak PDF Resmi"
                          >
                            <Printer size={13} className="text-slate-500" />
                            <span>Detail / Cetak</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
