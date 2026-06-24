import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Button, EnhancedAlert, Loader, PaymentStatusBadge 
} from '../../../components/ui';
import { FileText } from 'lucide-react';
import SuperAdminPageLayout from '../../../components/layout/SuperAdminPageLayout';
import { 
  getAllBillings, 
  formatCurrency, 
  formatDate 
} from '../../../api/billing.api';
import { getActiveSubscription } from '../../../api/subscription.api';
import type { Billing, Subscription } from '../../../types/billing';
import { LogService } from '../../../utils/LogService';

interface AdminBillingsViewProps {
  subscription: Subscription | null | undefined;
}

export const AdminBillingsView: React.FC<AdminBillingsViewProps> = React.memo(({ subscription }) => {
  const [billings, setBillings] = useState<Billing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeSubId, setActiveSubId] = useState<string | null>(null);

  // Load active subscription and billings
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        let subId = subscription?.id || null;
        if (!subId) {
          const res = await getActiveSubscription();
          const sub = res?.data as Subscription | null;
          subId = sub?.id || null;
        }
        if (mounted) setActiveSubId(subId);

        const resBillings = await getAllBillings({ limit: 100 });
        if (mounted) {
          const allBillings = resBillings.data || [];
          setBillings(allBillings);
        }
      } catch (err: any) {
        if (mounted) setError(err?.response?.data?.message || 'Gagal memuat data tagihan.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [subscription]);

  const filteredBillings = useMemo(() => {
    const scoped = activeSubId ? billings.filter(b => b.subscription_id === activeSubId) : billings;
    return scoped.filter(b => {
      const s = String(b.status || '').toUpperCase();
      return s === 'UNPAID' || s === 'OVERDUE';
    });
  }, [billings, activeSubId]);

  const handleViewInvoice = useCallback((billing: Billing) => {
    const token = (billing.Subscription as any)?.invoice_token || billing.invoice_number;
    if (token) {
      window.open(`/invoice/public/${token}`, '_blank');
    } else {
      setSuccess('Invoice sedang diproses, silakan coba lagi beberapa saat.');
    }
  }, []);

  return (
    <SuperAdminPageLayout
      title="Tagihan Berlangganan"
      description="Kelola tagihan pembayaran bulanan aktif untuk sistem tenant Anda secara real-time."
      breadcrumbs={[
        { label: 'Billing Platform' },
        { label: 'Tagihan Tenant' }
      ]}
      isLoading={loading}
      hardeningModuleKey="billing_admin_view"
    >
      {error && <EnhancedAlert variant="destructive" title="Terjadi kesalahan" description={error} dismissible onDismiss={() => setError(null)} />}
      {success && <EnhancedAlert variant="success" title="Berhasil" description={success} dismissible onDismiss={() => setSuccess(null)} />}

      <div className="p-6 border rounded-md bg-white dark:bg-slate-900 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold dark:text-white">Tagihan Berlangganan</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Menampilkan tagihan untuk langganan aktif tenant Anda.</p>
          </div>
        </div>

        {filteredBillings.length === 0 && (
          <div className="text-center py-10">
            <div className="text-gray-400 mb-2">
              <FileText className="w-10 h-10 mx-auto" />
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">Tidak ada tagihan aktif saat ini.</div>
            <div className="mt-3 flex justify-center gap-2">
              <Button variant="secondary" onClick={() => window.location.href = '/billing?tab=invoice'}>
                Lihat Invoice
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/billing?tab=riwayat'}>
                Riwayat Pembayaran
              </Button>
            </div>
          </div>
        )}

        {filteredBillings.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
              <thead className="bg-gray-50 dark:bg-slate-950">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jatuh Tempo</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                {filteredBillings?.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-2 text-sm dark:text-gray-300">{b.invoice_number || '-'}</td>
                    <td className="px-4 py-2 text-sm font-medium dark:text-gray-100">{formatCurrency(b.amount)}</td>
                    <td className="px-4 py-2 text-sm">
                      {(() => {
                        const lower = String(b.status || 'unpaid').toLowerCase();
                        const statusUi: 'paid' | 'unpaid' | 'overdue' | 'cancelled' = 
                          lower === 'paid' ? 'paid' : 
                          lower === 'overdue' ? 'overdue' : 
                          lower === 'cancelled' ? 'cancelled' : 
                          'unpaid';
                        return <PaymentStatusBadge status={statusUi} />;
                      })()}
                    </td>
                    <td className="px-4 py-2 text-sm dark:text-gray-300">{formatDate(b.billing_date)}</td>
                    <td className="px-4 py-2 text-sm dark:text-gray-300">{b.due_date ? formatDate(b.due_date) : '-'}</td>
                    <td className="px-4 py-2 text-sm">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewInvoice(b)}>
                          Lihat Invoice
                        </Button>
                        {(() => {
                          const s = String(b.status || '').toUpperCase();
                          const canPay = s === 'UNPAID' || s === 'OVERDUE';
                          const isCancelled = s === 'CANCELLED';
                          
                          if (isCancelled) return (
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">Tagihan Dibatalkan</span>
                          );

                          return canPay ? (
                            <Button size="sm" onClick={() => { 
                              const token = (b.Subscription as any)?.invoice_token || b.invoice_number;
                              if (token) window.open(`/invoice/public/${token}`, '_blank');
                              else window.location.href = '/billing?tab=billings';
                            }}>
                              Bayar Tagihan
                            </Button>
                          ) : null;
                        })()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SuperAdminPageLayout>
  );
});

AdminBillingsView.displayName = 'AdminBillingsView';
export default AdminBillingsView;
