import React, { useMemo } from 'react';
import { Card, Button, Badge, Loader } from '../ui';
import { Receipt, CheckCircle, Box } from 'lucide-react';
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
  actionLoading: string | null;
  handleViewInvoice: (invoiceId: string, forceDocument?: boolean) => Promise<void>;
  handleCancelInvoice: (invoiceId: string) => Promise<void>;
}

export const BillingInvoicesSection: React.FC<BillingInvoicesSectionProps> = ({
  invoices,
  actionLoading,
  handleViewInvoice,
  handleCancelInvoice,
}) => {
  const activeInvoices = useMemo(() => {
    return invoices?.filter(i => !['PAID', 'CANCELLED'].includes(i.status)) || [];
  }, [invoices]);

  const transactionHistory = useMemo(() => {
    return invoices?.filter(i => ['PAID', 'CANCELLED'].includes(i.status)) || [];
  }, [invoices]);

  return (
    <div className="space-y-6 pb-20">
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
                    Tidak ada tagihan aktif saat ini.
                  </td>
                </tr>
              ) : (
                activeInvoices?.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white tracking-tight">#{inv.invoice_number}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{formatDate(inv.created_at)}</div>
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
                      <div className="flex items-center justify-end">
                        <Button 
                          size="sm" 
                          onClick={() => handleViewInvoice(inv.id)} 
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
                    Belum ada riwayat transaksi.
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
                        <div className="flex items-center gap-1.5 mt-0.5">
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
                            onClick={() => handleViewInvoice(inv.id, true)} 
                            className="rounded-md h-8 px-4 font-bold text-xs border-slate-200"
                          >
                            Detail
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
