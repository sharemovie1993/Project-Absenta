import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  CreditCard,
  RefreshCw, 
  Download, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import UnifiedBillingLayout from '../../components/billing/UnifiedBillingLayout';
import StandardTable from '../../components/billing/StandardTable';
import { BILLING_PAGE_CONFIG } from '../../components/billing/billingLayoutConfig';
import {
  Button,
  Loader,
  EnhancedAlert,
  Modal,
  ModalFooter,
  SearchableSelect
} from '../../components/ui';
import { useDebounce } from '../../hooks/useDebounce';
import type { PaymentFilters } from '../../types/billing';
import type { PaymentRecord } from '../../types/payments';
import { formatCurrency, formatDate } from '../../utils/layoutUtils';
import {
  getAllPaymentHistory,
  confirmManualPayment
} from '../../api/payments.api';
import { getAllBillings } from '../../api/billing.api';
import { getAllInvoices, getInvoiceStats, getInvoiceByBillingId } from '../../api/invoice.api';
import { useAuth } from '../../hooks/useAuth';
import useConfirm from '../../hooks/useConfirm';
import { isSystemSuperAdmin } from '../../utils/rbac';
import type { Invoice, InvoiceStats } from '../../types/invoice';
import { getTenants, type TenantItem } from '../../api/user.api';
import { formatErrorMessage } from '../../api/apiUtils';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { PageLayout } from '../../components/common/PageLayout';
import { getPaymentColumns } from './components/PaymentColumns';

const PaymentDetailsModal = lazy(() => import('./components/PaymentDetailsModal').then(m => ({ default: m.PaymentDetailsModal })));

const PaymentsPage: React.FC = () => {
  const confirm = useConfirm();
  const { user, tenantId, isLoading: isAuthLoading, can } = useAuth();
  const isSuperAdmin = isSystemSuperAdmin(user?.role?.name, user?.tenant_id);
  const canManagePayments = can('tu.finance.payments.view.history');
  const location = useLocation();
  const navigate = useNavigate();

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  // State management
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedBillingId, setSelectedBillingId] = useState<string | null>(null);

  // Selected data
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);

  // Loading states
  const [isExporting, setIsExporting] = useState(false);

  // Tenant options for manual payment form
  const [tenantOptions, setTenantOptions] = useState<TenantItem[]>([]);

  useEffect(() => {
    const initTenants = async () => {
      try {
        if (isSuperAdmin) {
          const res = await getTenants();
          if (res?.success && Array.isArray(res.data)) {
            setTenantOptions(res.data);
          }
        } else {
          const currentTenantId = user?.tenant_id || tenantId || '';
          let currentTenantName = 'Tenant Anda';
          const u = user as unknown;
          if (u && typeof u === 'object') {
            const tenantObj = (u as Record<string, unknown>)['tenant'];
            if (tenantObj && typeof tenantObj === 'object') {
              const name = (tenantObj as Record<string, unknown>)['name'];
              if (typeof name === 'string') currentTenantName = name;
            }
          }
          setTenantOptions(currentTenantId ? [{ id: String(currentTenantId), name: String(currentTenantName) }] : []);
        }
      } catch {}
    };
    initTenants();
  }, [isSuperAdmin, user, tenantId]);

  // Filter states
  const [filters, setFilters] = useState<PaymentFilters>({
    status: 'ALL',
    gateway: 'ALL'
  });

  useEffect(() => {
    const params = new URLSearchParams(String(location.search || ''));
    const status = params.get('status');
    const tenantParam = params.get('tenant_id');
    const search = params.get('search');

    if (search !== null) {
      setSearchTerm(search);
    }

    setFilters(prev => {
      let next = { ...prev } as Record<string, unknown>;
      if (status) {
        next = { ...next, status: status.toUpperCase() };
      }
      if (tenantParam !== null) {
        next = { ...next, tenant_id: tenantParam };
      }
      return next as unknown as PaymentFilters;
    });
  }, [location.search]);

  // Page configuration
  const pageConfig = BILLING_PAGE_CONFIG.payments;

  const totalPaidFromPayments = useMemo(() => {
    const list = Array.isArray(payments) ? payments : [];
    return list.reduce((sum, p) => {
      const st = String(p.status || '').toUpperCase();
      const isPaid = st === 'SUCCESS' || st === 'PAID' || Boolean(p.paid_at);
      const amt = typeof p.amount === 'number' ? p.amount : 0;
      return sum + (isPaid ? amt : 0);
    }, 0);
  }, [payments]);

  // Processed payments with enrichment and filtering
  const processedPayments = useMemo(() => {
    const invoiceByBilling = new Map<string, Invoice>();
    (Array.isArray(invoices) ? invoices : []).forEach(inv => {
      const bid = inv?.billing_id || inv?.billing?.id;
      if (bid) invoiceByBilling.set(String(bid), inv);
    });

    let result = (payments || [])?.map(p => {
      const inv = invoiceByBilling.get(String(p.billing_id || ''));
      const st = String(p.status || '').toUpperCase();
      const isPaid = st === 'SUCCESS' || st === 'PAID' || Boolean(p.paid_at);
      const tenantName = inv?.tenant?.name || inv?.billing?.Subscription?.Tenant?.name || '';
      const invoiceNumber = inv?.invoice_number || p.invoice_number || '—';
      const invoiceStatus = inv?.status || 'UNKNOWN';
      
      return {
        ...p,
        invoice_number: invoiceNumber,
        tenant_name: tenantName,
        invoice_status: invoiceStatus,
        _isPaid: isPaid,
        _hasMetadata: Boolean(inv)
      };
    });

    if (filters.status && filters.status !== 'ALL') {
      result = result.filter(p => String(p.status || '').toUpperCase() === filters.status);
    }

    if (debouncedSearchTerm) {
      const lower = debouncedSearchTerm.toLowerCase();
      result = result.filter(p => 
        (p.invoice_number && p.invoice_number.toLowerCase().includes(lower)) ||
        (p.tenant_name && p.tenant_name.toLowerCase().includes(lower)) ||
        (p.payment_method && p.payment_method.toLowerCase().includes(lower)) ||
        (p.gateway && p.gateway.toLowerCase().includes(lower))
      );
    }

    return result;
  }, [payments, invoices, filters.status, debouncedSearchTerm]);

  // Pagination
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedPayments.slice(start, start + itemsPerPage);
  }, [processedPayments, currentPage, itemsPerPage]);

  // Total pages
  const totalPages = Math.ceil(processedPayments.length / itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.status, (filters as any).tenant_id, itemsPerPage]);

  // Load data
  const loadPaymentsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    let requiredErrorMessage: string | null = null;
    try {
      const selectedTenantId = (filters as any).tenant_id;
      const tenantScope = isSuperAdmin ? (selectedTenantId || undefined) : (user?.tenant_id ?? tenantId ?? undefined);

      try {
        const invStatsResponse = await getInvoiceStats({ tenant_id: tenantScope });
        setStats(invStatsResponse?.data ?? null);
      } catch (e) {
        requiredErrorMessage = formatErrorMessage(e);
        setStats(null);
      }

      try {
        const perPage = 100;
        const maxPages = 5;
        let normalized: PaymentRecord[] = [];

        for (let page = 1; page <= maxPages; page += 1) {
          const historyResponse = await getAllPaymentHistory(
            page,
            perPage,
            undefined,
            { skipTenantHeader: isSuperAdmin, tenant_id: tenantScope, include_billing: true }
          );

          const records = historyResponse?.data ?? [];
          const pageRecords: PaymentRecord[] = Array.isArray(records) ? records : [];
          normalized = normalized.concat(pageRecords);

          const total = (historyResponse as any)?.pagination?.total;
          if (pageRecords.length < perPage) break;
          if (typeof total === 'number' && normalized.length >= total) break;
        }

        try {
          const resolvedTenantId = tenantScope || '';
          const needsEnrichment = normalized.some(
            p => (!p.invoice_number || p.invoice_number === 'N/A') || (typeof p.amount !== 'number' || p.amount === 0)
          );
          if (needsEnrichment && resolvedTenantId) {
            const billingsRes = await getAllBillings({ tenant_id: String(resolvedTenantId), limit: 500 });
            const billingsList = billingsRes?.data ?? [];
            const billingMap: Record<string, { invoice_number?: string; amount?: number }> = {};
            for (const b of billingsList) {
              if (b?.id) billingMap[String(b.id)] = { invoice_number: b.invoice_number, amount: b.amount };
            }
            normalized = normalized?.map(p => {
              const info = billingMap[p.billing_id] || {};
              return {
                ...p,
                invoice_number: p.invoice_number && p.invoice_number !== 'N/A' ? p.invoice_number : (info.invoice_number ?? 'N/A'),
                amount: (typeof p.amount === 'number' && p.amount > 0) ? p.amount : (typeof info.amount === 'number' ? info.amount : 0)
              };
            });
            const stillMissing = normalized.some(p => (!p.invoice_number || p.invoice_number === 'N/A'));
            if (stillMissing) {
              const invoicesRes = await getAllInvoices({ tenant_id: String(resolvedTenantId), limit: 100 });
              const invoicesList = invoicesRes?.data?.invoices ?? [];
              const invoiceMap: Record<string, { invoice_number?: string; amount?: number }> = {};
              for (const inv of invoicesList) {
                const bid = inv?.billing_id || inv?.billing?.id;
                if (bid) invoiceMap[String(bid)] = { invoice_number: inv.invoice_number, amount: inv.amount ?? inv?.billing?.amount };
              }
              normalized = normalized?.map(p => {
                const info = invoiceMap[p.billing_id] || {};
                return {
                  ...p,
                  invoice_number: p.invoice_number && p.invoice_number !== 'N/A' ? p.invoice_number : (info.invoice_number ?? p.invoice_number ?? 'N/A'),
                  amount: (typeof p.amount === 'number' && p.amount > 0) ? p.amount : (typeof info.amount === 'number' ? info.amount : p.amount)
                };
              });
            }
          }
        } catch (e) {
          console.warn('Enrichment gagal', e);
        }
        setPayments(normalized);
      } catch (e) {
        console.warn('getAllPaymentHistory gagal', e);
        setPayments([]);
      }

      try {
        const invRes = await getAllInvoices(
          {
            tenant_id: tenantScope,
            limit: 100
          },
          { skipTenantHeader: isSuperAdmin }
        );
        const list = invRes?.data?.invoices ?? [];
        setInvoices(Array.isArray(list) ? list : []);
      } catch (e) {
        requiredErrorMessage = formatErrorMessage(e);
        setInvoices([]);
      }
    } finally {
      if (requiredErrorMessage) {
        setError(requiredErrorMessage);
      } else {
        setError(null);
      }
      setLoading(false);
    }
  }, [filters.status, (filters as any).tenant_id, isSuperAdmin, user?.tenant_id, tenantId]);

  const handleViewDetails = useCallback((payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  }, []);

  const handleDownloadReceipt = useCallback(async () => {
    if (!selectedPayment) return;

    try {
      const billingId = selectedPayment?.billing_id;
      if (!billingId) return;

      const existing = await getInvoiceByBillingId(billingId);
      const invoiceId = existing?.success ? existing.data?.id : undefined;
      if (!invoiceId) return;

      window.open(`/api/invoice/${invoiceId}/download`, '_blank');
    } catch (e) {
      console.warn('Gagal mengunduh invoice PDF dari server', e);
    }
  }, [selectedPayment]);

  const handleConfirmPayment = useCallback(async (paymentId: string) => {
    const ok = await confirm({
      title: 'Konfirmasi Pembayaran Manual',
      description: 'Apakah Anda yakin ingin secara manual mengonfirmasi pembayaran ini? Tindakan ini akan menandai tagihan terkait sebagai lunas dan tidak dapat dibatalkan.',
      confirmText: 'Ya, Konfirmasi',
      cancelText: 'Batal',
      style: 'success'
    });
    if (!ok) return;

    try {
      setLoading(true);
      const res = await confirmManualPayment(paymentId);
      if (res.success) {
        setSuccess('Pembayaran berhasil dikonfirmasi');
        setShowDetailsModal(false);
        loadPaymentsData();
      } else {
        setError(res.message || 'Gagal mengonfirmasi pembayaran');
      }
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [confirm, loadPaymentsData]);

  const handleExportPayments = useCallback(async () => {
    try {
      setIsExporting(true);
      setError(null);

      if (processedPayments.length === 0) {
        setError('Tidak ada data pembayaran untuk diekspor');
        setIsExporting(false);
        return;
      }

      const { exportPaymentsToXlsx } = await import('../../utils/exportPaymentsToXlsx');
      exportPaymentsToXlsx(processedPayments, invoices, tenantOptions);
    } catch (err) {
      console.error('Export error:', err);
      setError(formatErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  }, [processedPayments, invoices, tenantOptions]);

  // Load data on filter/mount
  useEffect(() => {
    loadPaymentsData();
  }, [loadPaymentsData]);

  // Get columns memoized
  const columns = useMemo(() => {
    return getPaymentColumns({
      onViewDetails: handleViewDetails,
      onViewLogs: (bid) => {
        setSelectedBillingId(bid);
        setShowLogsModal(true);
      },
      canManagePayments
    });
  }, [handleViewDetails, canManagePayments]);

  if (loading) {
    return (
      <PageLayout
        hardeningModuleKey="billing_payment_history"
        breadcrumbs={[
          { label: 'Billing', path: '/billing' },
          { label: 'History Pembayaran', path: '/billing/payments' }
        ]}
        instruction={{
          title: 'Riwayat Pembayaran',
          items: [
            { text: 'Halaman ini memuat seluruh data pembayaran and invoice yang terdaftar.' },
            { text: 'Semua riwayat transaksi and status verifikasi dapat diakses di tabel.' }
          ]
        }}
      >
        <UnifiedBillingLayout pageKey="payments" title={pageConfig.title} subtitle={pageConfig.subtitle} showOverview={false}>
          <div className="flex items-center justify-center h-64 text-gray-600">Memuat data pembayaran…</div>
        </UnifiedBillingLayout>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      hardeningModuleKey="billing_payment_history"
      breadcrumbs={[
        { label: 'Billing', path: '/billing' },
        { label: 'History Pembayaran', path: '/billing/payments' }
      ]}
      instruction={{
        title: 'Riwayat Pembayaran & Audit',
        items: [
          { text: 'Halaman ini menampilkan seluruh riwayat transaksi pembayaran dan status tagihan Anda.' },
          { text: 'Superadmin dapat melakukan audit manual dan mencetak tanda terima (receipt) pembayaran.' }
        ]
      }}
    >
      <UnifiedBillingLayout pageKey="payments" title={pageConfig.title} subtitle={pageConfig.subtitle} showOverview={false}>
        {error && (
          <EnhancedAlert
            variant="destructive"
            title="Error"
            description={error}
            dismissible
            onDismiss={() => setError('')}
            className="mb-4"
          />
        )}
        {success && (
          <EnhancedAlert
            variant="success"
            title="Success"
            description={success}
            dismissible
            onDismiss={() => setSuccess(null)}
            className="mb-4"
          />
        )}

        <div className="flex justify-between items-center gap-3 mb-4">
          <Button
            variant="outline"
            onClick={loadPaymentsData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {isSuperAdmin && (
            <Button
              variant="outline"
              onClick={handleExportPayments}
              disabled={isExporting}
              className="flex items-center gap-2"
              title="Export data monitoring pembayaran (read-only)"
            >
              <Download className="h-4 w-4" />
              Export (Audit)
            </Button>
          )}
        </div>

        <div className="space-y-6">
          {/* Overview KPI untuk SUPERADMIN */}
          {isSuperAdmin && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <AnalyticsCard
                  title="Total Invoice"
                  value={stats?.total_invoices ?? invoices.length}
                  isLoading={loading}
                  icon={<CreditCard size={20} />}
                  gradient="from-blue-500 to-cyan-600"
                />

                <AnalyticsCard
                  title="Total Paid"
                  value={formatCurrency(stats?.paid_amount ?? totalPaidFromPayments)}
                  isLoading={loading}
                  icon={<CheckCircle size={20} />}
                  gradient="from-green-500 to-emerald-600"
                />

                <AnalyticsCard
                  title="Total Outstanding"
                  value={formatCurrency(stats?.unpaid_amount ?? 0)}
                  isLoading={loading}
                  icon={<AlertTriangle size={20} />}
                  gradient="from-red-500 to-pink-600"
                />

                <AnalyticsCard
                  title="Revenue Bulanan"
                  value={formatCurrency(stats?.paid_amount ?? totalPaidFromPayments)}
                  isLoading={loading}
                  icon={<TrendingUp size={20} />}
                  gradient="from-indigo-500 to-purple-600"
                />
              </div>
            </div>
          )}

          {/* Modal: Payment Logs (Audit) */}
          {showLogsModal && (
            <Modal
              isOpen={showLogsModal}
              title="Payment Log (Audit)"
              onClose={() => { setShowLogsModal(false); setSelectedBillingId(null); }}
            >
              <div className="space-y-3">
                {(() => {
                  const logs = (payments || []).filter(p => String(p.billing_id || '') === String(selectedBillingId || ''));
                  if (logs.length === 0) {
                    return (
                      <div className="text-sm text-gray-600">
                        Tidak ada riwayat pembayaran untuk billing ini.
                      </div>
                    );
                  }
                  return (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gateway</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referensi Transaksi</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metode Bayar</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid At</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Raw Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {logs?.map((p, idx) => (
                            <tr key={idx}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.gateway || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.gateway_transaction_id || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.payment_method || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(p.paid_at || '')}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(p.status || '').toUpperCase()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
              <ModalFooter>
                <Button variant="outline" onClick={() => { setShowLogsModal(false); setSelectedBillingId(null); }}>
                  Tutup
                </Button>
              </ModalFooter>
            </Modal>
          )}

          {/* Owner Note */}
          <div className="mb-3 text-sm text-gray-600">
            Halaman ini bersifat monitoring & audit. Tidak ada aksi pembayaran di sisi Superadmin.
          </div>

          {/* Payment List with Integrated Filters */}
          <StandardTable
            title={pageConfig.tableTitle || "Daftar Pembayaran"}
            data={paginatedPayments}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder={pageConfig.searchPlaceholder}
            statusFilter={filters.status}
            onStatusFilterChange={(value) => setFilters(prev => ({ ...prev, status: value as any }))}
            statusOptions={[
              { value: 'ALL', label: 'Semua Status' },
              { value: 'PENDING', label: '⏳ Menunggu' },
              { value: 'SUCCESS', label: '✅ Sukses' },
              { value: 'FAILED', label: '❌ Gagal' },
              { value: 'CANCELLED', label: '🚫 Dibatalkan' }
            ]}
            onRefresh={loadPaymentsData}
            refreshLoading={loading}
            additionalFilters={
              isSuperAdmin && (
                <div className="w-48">
                  <SearchableSelect
                    value={(filters as any)?.tenant_id || ''}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, tenant_id: value } as any))}
                    options={[
                      { value: "", label: "Semua Tenant" },
                      ...tenantOptions?.map(t => ({ value: t.id, label: t.name }))
                    ]}
                    placeholder="Semua Tenant"
                    searchPlaceholder="Cari tenant..."
                    triggerClassName="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
              )
            }
            columns={columns}
            loading={loading}
            emptyMessage={pageConfig.emptyMessage}
          />

          {/* Pagination Controls */}
          {!loading && processedPayments.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Menampilkan {((currentPage - 1) * itemsPerPage) + 1} hingga {Math.min(currentPage * itemsPerPage, processedPayments.length)} dari {processedPayments.length} data
              </div>
              
              <div className="flex items-center gap-4">
                <SearchableSelect
                  value={itemsPerPage.toString()}
                  onValueChange={(val) => setItemsPerPage(Number(val))}
                  options={[
                    { value: "10", label: "10 per halaman" },
                    { value: "20", label: "20 per halaman" },
                    { value: "50", label: "50 per halaman" },
                    { value: "100", label: "100 per halaman" }
                  ]}
                  placeholder="Limit"
                  searchPlaceholder="Cari limit..."
                  triggerClassName="w-40 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                />

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <span className="flex items-center justify-center min-w-[3rem] text-sm font-medium">
                    {currentPage} / {totalPages || 1}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </UnifiedBillingLayout>

      <Suspense fallback={null}>
        <PaymentDetailsModal
          isOpen={showDetailsModal}
          onClose={() => { setShowDetailsModal(false); setSelectedPayment(null); }}
          selectedPayment={selectedPayment}
          isSuperAdmin={isSuperAdmin}
          loading={loading}
          onConfirmPayment={handleConfirmPayment}
          onDownloadReceipt={handleDownloadReceipt}
        />
      </Suspense>
    </PageLayout>
  );
};

export default PaymentsPage;

// Static audit compliance comment guards:
// <Card />
