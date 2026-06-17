import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  CreditCard, 
  RefreshCw, 
  Download, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Eye,
  FileText,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Activity,
  Clock,
  Image,
  ExternalLink,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import UnifiedBillingLayout from '../../components/billing/UnifiedBillingLayout';
import StandardFilters from '../../components/billing/StandardFilters';
import StandardTable from '../../components/billing/StandardTable';
import { BILLING_PAGE_CONFIG } from '../../components/billing/billingLayoutConfig';
import {
  Button,
  Loader,
  EnhancedAlert,
  Input,
  Table,
  StatusBadge,
  Modal,
  SectionHeader,
  ModalFooter,
  SearchableSelect
} from '../../components/ui';
import { useDebounce } from '../../hooks/useDebounce';
import type {
  Billing as Payment,
  BillingStats as PaymentStats,
  PaymentFilters,
  PaymentGatewayPerformance
} from '../../types/billing';
import type { PaymentRecord } from '../../types/payments';

// Interface untuk form data pembayaran
// Legacy CreatePaymentRequest interface removed

import { formatCurrency, formatDate } from '../../utils/layoutUtils';
import {
  getAllPaymentHistory,
  confirmManualPayment
} from '../../api/payments.api';
import { getAllBillings } from '../../api/billing.api';
import { getAllInvoices, getInvoiceByBillingId, getInvoiceStats } from '../../api/invoice.api';
import { getPublicInvoiceLink } from '../../api/mySubscription.api';
import { openInvoicePublic } from '../../utils/invoiceLink';
import { useNavigate } from 'react-router-dom';
import { BillingStatus } from '../../types/billing';
import { useAuth } from '../../hooks/useAuth';
import useConfirm from '../../hooks/useConfirm';
import { isSystemSuperAdmin } from '../../utils/rbac';
import type { PaymentMethod } from '../../types/payments';
import type { Invoice, InvoiceStats } from '../../types/invoice';
import { getTenants, type TenantItem } from '../../api/user.api';
import { formatErrorMessage } from '../../api/apiUtils';
import { exportPaymentsToXlsx } from '../../utils/exportPaymentsToXlsx';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';

const PaymentsPage: React.FC = () => {
  const confirm = useConfirm();
  // Auth & role
  const { user, tenantId, isLoading: isAuthLoading, can } = useAuth();
  const isSuperAdmin = isSystemSuperAdmin(user?.role?.name, user?.tenant_id);
  const isAdmin = user?.role?.name === 'ADMIN';
  const canManagePayments = can('billing.payments.view.history');
  const location = useLocation();

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

  // Legacy manual payment modal logic removed

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
      let next: any = prev;
      if (status) {
        next = { ...next, status: status.toUpperCase() };
      }
      if (tenantParam !== null) {
        next = { ...next, tenant_id: tenantParam };
      }
      return next as PaymentFilters;
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

  // Gateway tab dihapus untuk SUPERADMIN (monitoring-only), tidak perlu memuat daftar gateways/metode

  // Processed payments with enrichment and filtering
  const processedPayments = useMemo(() => {
    // 1. Create maps for enrichment
    const invoiceById = new Map<string, Invoice>();
    const invoiceByBilling = new Map<string, Invoice>();
    (Array.isArray(invoices) ? invoices : []).forEach(inv => {
      if (inv?.id) invoiceById.set(String(inv.id), inv);
      const bid = inv?.billing_id || inv?.billing?.id;
      if (bid) invoiceByBilling.set(String(bid), inv);
    });

    // 2. Map/Enrich FIRST
    let result = payments.map(p => {
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

    // 3. Filter by Status
    if (filters.status && filters.status !== 'ALL') {
      result = result.filter(p => String(p.status || '').toUpperCase() === filters.status);
    }

    // 4. Filter by Search (Debounced)
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
      // Determine tenant scope
      // If Superadmin and tenant_id filter is set, use it.
      // Otherwise if Superadmin, undefined (fetch all).
      // If not Superadmin, use user's tenant_id.
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
            normalized = normalized.map(p => {
              const info = billingMap[p.billing_id] || {};
              return {
                ...p,
                invoice_number: p.invoice_number && p.invoice_number !== 'N/A' ? p.invoice_number : (info.invoice_number ?? 'N/A'),
                amount: (typeof p.amount === 'number' && p.amount > 0) ? p.amount : (typeof info.amount === 'number' ? info.amount! : 0)
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
              normalized = normalized.map(p => {
                const info = invoiceMap[p.billing_id] || {};
                return {
                  ...p,
                  invoice_number: p.invoice_number && p.invoice_number !== 'N/A' ? p.invoice_number : (info.invoice_number ?? p.invoice_number ?? 'N/A'),
                  amount: (typeof p.amount === 'number' && p.amount > 0) ? p.amount : (typeof info.amount === 'number' ? info.amount! : p.amount)
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
        // Map payment status to valid invoice status for enrichment if needed, 
        // but it's better to fetch without status filter to find any related invoice.
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

      // Gateway performance is loaded via tab-specific effect
    } finally {
      if (requiredErrorMessage) {
        setError(requiredErrorMessage);
      } else {
        setError(null);
      }
      setLoading(false);
    }
  }, [filters.status, (filters as any).tenant_id, isSuperAdmin, user?.tenant_id, tenantId]);

  // Legacy manual create handler removed to avoid duplication

  // Legacy retry handler removed; modal uses handleRetryPayment

  // Panel monitoring/gateway dihapus dari halaman ini (monitoring-only overview + tabel)

  const handleRetryPayment = () => {};
  const handleCreateManualPayment = () => {};

  const handleViewDetails = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  };

  const navigate = useNavigate();
  const handleViewInvoice = async (payment: PaymentRecord) => {
    try {
      const billingId = payment?.billing_id;
      if (!billingId) {
        console.warn('Billing ID tidak tersedia untuk pembayaran ini');
        return;
      }
      const existing = await getInvoiceByBillingId(billingId);
      if (existing && existing.success && existing.data?.id) {
        try {
          const link = await getPublicInvoiceLink(existing.data.id);
          const token = link?.data?.token;
          const url = link?.data?.url;
          if (token) {
            navigate(`/invoice/public/${token}`);
            return;
          }
          if (url) return void window.open(url, '_blank');
          console.warn('Token invoice publik tidak tersedia');
        } catch {
          console.warn('Gagal mengambil link invoice publik dari server');
        }
      } else {
        console.warn('Invoice tidak ditemukan untuk billing ini');
      }
    } catch (e: unknown) {
      console.warn('Gagal memuat invoice untuk billing ini', e);
    }
  };

  const handleGenerateInvoiceFromPayment = () => {};

  const handleDownloadReceipt = async () => {
    if (!selectedPayment) return;

    try {
      const billingId = selectedPayment?.billing_id;
      if (!billingId) return;

      const existing = await getInvoiceByBillingId(billingId);
      const invoiceId = existing?.success ? existing.data?.id : undefined;
      if (!invoiceId) return;

      window.open(`/api/invoice/${invoiceId}/download`, '_blank');
    } catch (e: unknown) {
      console.warn('Gagal mengunduh invoice PDF dari server', e);
    }
  };



  const handleConfirmPayment = async (paymentId: string) => {
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
    } catch (err: any) {
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleExportPayments = async () => {
    try {
      setIsExporting(true);
      setError(null);

      // Allow UI to update (show spinner) before processing
      

      if (processedPayments.length === 0) {
        setError('Tidak ada data pembayaran untuk diekspor');
        setIsExporting(false);
        return;
      }

      // Export using helper
      const { exportPaymentsToXlsx } = await import('../../utils/exportPaymentsToXlsx');
      exportPaymentsToXlsx(processedPayments, invoices, tenantOptions);
      
      // Silent success
    } catch (err: unknown) {
      console.error('Export error:', err);
      setError(formatErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  };

  // Load failed payments for retry
  const loadFailedPayments = () => {};
  const handleRetryPaymentRow = (_payment: PaymentRecord) => {};

  // Load data: refresh when gateway filter or simple mode changes
  useEffect(() => {
    loadPaymentsData();
  }, [loadPaymentsData]);

  // Monitoring tab dihapus; tidak ada efek tab-based

  if (loading) {
    return (
      <UnifiedBillingLayout pageKey="payments" title={pageConfig.title} subtitle={pageConfig.subtitle} showOverview={false}>
        <div className="flex items-center justify-center h-64 text-gray-600">Memuat data pembayaran…</div>
      </UnifiedBillingLayout>
    );
  }

  return (
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

      {/* Panel Metode & Gateway dipindahkan ke tab Payment Gateway */}

      <div className="flex justify-between items-center gap-3 mb-4">
       
        {isSuperAdmin && (
          <></>
        )}
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
      <div>
      <div className="space-y-6">


        {/* Tab Navigation dihapus untuk fokus audit */}

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
                const logs = (Array.isArray(payments) ? payments : []).filter(p => String(p.billing_id || '') === String(selectedBillingId || ''));
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
                        {logs.map((p, idx) => (
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
                    ...tenantOptions.map(t => ({ value: t.id, label: t.name }))
                  ]}
                  placeholder="Semua Tenant"
                  searchPlaceholder="Cari tenant..."
                  triggerClassName="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>
            )
          }
          columns={[
            {
              key: 'invoice_number',
              label: 'Invoice Number',
              render: (_value: unknown, payment: PaymentRecord) => (
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {(payment as any)?.invoice_number || 'N/A'}
                </span>
              )
            },
            {
              key: 'tenant_name',
              label: 'Tenant (Sekolah)',
              render: (_value: unknown, payment: PaymentRecord) => (
                <span className="text-gray-900 dark:text-gray-100">
                  {(payment as any)?.tenant_name || 'N/A'}
                </span>
              )
            },
            {
              key: 'status',
              label: 'Status',
              render: (_value: unknown, row: any) => {
                const s = String(row?.status || '').toUpperCase();
                let badge: 'completed' | 'pending' | 'cancelled' = 'pending';
                let label = 'Menunggu';
                
                if (s === 'PAID' || s === 'SUCCESS' || s === 'COMPLETED' || s === 'SETTLEMENT') {
                  badge = 'completed';
                  label = 'Sukses';
                } else if (s === 'FAILED' || s === 'CANCELLED' || s === 'EXPIRED') {
                  badge = 'cancelled';
                  label = s === 'FAILED' ? 'Gagal' : s === 'EXPIRED' ? 'Kedaluwarsa' : 'Batal';
                }
                
                return (
                  <div className="flex flex-col gap-1">
                    <StatusBadge status={badge}>{label}</StatusBadge>
                    {s === 'PROCESSING' && <span className="text-[10px] text-blue-500 animate-pulse font-bold uppercase ml-1">Diproses</span>}
                  </div>
                );
              }
            },
            {
              key: 'invoice_status',
              label: 'Status Invoice',
              render: (_value: unknown, row: any) => {
                const s = String(row?.invoice_status || '').toUpperCase();
                const badge = s === 'PAID' ? 'completed' : s === 'OVERDUE' ? 'cancelled' : s === 'SENT' || s === 'VIEWED' ? 'pending' : 'pending';
                const label =
                  s === 'PAID' ? 'Lunas' :
                  s === 'OVERDUE' ? 'Terlambat' :
                  s === 'CANCELLED' ? 'Dibatalkan' :
                  s === 'SENT' ? 'Terkirim' :
                  s === 'VIEWED' ? 'Dilihat' : 'Draft';
                return <span className={`text-xs px-2 py-1 rounded-full ${
                  s === 'PAID' ? 'bg-green-100 text-green-800' : 
                  s === 'OVERDUE' ? 'bg-red-100 text-red-800' : 
                  'bg-gray-100 text-gray-800'
                }`}>{label}</span>;
              }
            },
            {
              key: 'payment_method',
              label: 'Metode Bayar',
              render: (_value: unknown, row: any) => (
                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                  {row?.payment_method || '-'}
                </span>
              )
            },
            {
              key: 'amount',
              label: 'Total Tagihan',
              render: (_value: unknown, payment: PaymentRecord) => (
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency((payment as any)?.amount || 0)}
                </span>
              )
            },
            {
              key: 'paid_at',
              label: 'Tanggal Dibayar',
              render: (_value: unknown, payment: PaymentRecord) => (
                <span className="text-gray-900 dark:text-gray-100">
                  {formatDate((payment as any)?.paid_at || '')}
                </span>
              )
            },
            {
              key: 'gateway',
              label: 'Gateway',
              render: (_value: unknown, row: any) => (
                <span className="text-gray-900 dark:text-gray-100">
                  {row?.gateway || '-'}
                </span>
              )
            },
            {
              key: 'actions',
              label: 'Aksi',
              render: (_value: unknown, payment: PaymentRecord) => (
                <div className="flex gap-2">
                  {!(payment as any)?._hasMetadata && (
                    <span className="text-yellow-600" title="Metadata invoice tidak tersedia">
                      <AlertTriangle className="w-3 h-3" />
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(payment)}
                    title="Lihat Detail"
                    className="gap-1"
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                  {canManagePayments && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const bid = (payment as any)?.billing_id || '';
                        setSelectedBillingId(bid || null);
                        setShowLogsModal(true);
                      }}
                      title="Audit Log"
                      className="gap-1"
                    >
                      <Activity className="w-3 h-3" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const invNum = (payment as any)?.invoice_number;
                      window.location.href = `/invoice/list?search=${encodeURIComponent(invNum || '')}`;
                    }}
                    title="Cari Invoice"
                    className="gap-1"
                  >
                    <FileText className="w-3 h-3" />
                  </Button>
                </div>
              )
            }
          ]}
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
        
      </div>

       {/* Payment Details Modal */}
       <Modal
         isOpen={showDetailsModal}
         onClose={() => { setShowDetailsModal(false); setSelectedPayment(null); }}
         title="📋 Detail Pembayaran"
         size="lg"
       >
          {selectedPayment && (
            <div className="space-y-8 py-2">
              {/* Premium Summary Header */}
              <div className="relative overflow-hidden rounded-xl border border-blue-100 dark:border-blue-900/30 bg-gradient-to-br from-blue-50 to-white dark:from-slate-800/80 dark:to-slate-900 p-6 shadow-sm">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <CreditCard size={80} className="text-blue-600" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-blue-500 mb-1">Total Transaksi</p>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {formatCurrency(selectedPayment.amount)}
                    </h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Status Pembayaran</p>
                      <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                        {selectedPayment.status || 'PENDING'}
                      </p>
                    </div>
                    <div className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-sm ${
                      (selectedPayment.status === 'SUCCESS' || selectedPayment.status === 'PAID' || selectedPayment.status === 'COMPLETED' || selectedPayment.status === 'SETTLEMENT')
                        ? 'bg-emerald-500 text-white shadow-emerald-200' 
                        : (selectedPayment.status === 'FAILED' || selectedPayment.status === 'CANCELLED' || selectedPayment.status === 'EXPIRED')
                        ? 'bg-rose-500 text-white shadow-rose-200'
                        : 'bg-amber-500 text-white shadow-amber-200'
                    }`}>
                      {selectedPayment.status || 'PENDING'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Section: Transaksi */}
                <div className="space-y-6">
                  <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-5 border border-slate-100 dark:border-slate-800">
                    <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                      <FileText size={14} className="text-blue-500" /> Informasi Transaksi
                    </h4>
                    <div className="space-y-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Payment ID</span>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200 font-mono truncate">{selectedPayment.id}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">No. Invoice</span>
                          <span className="text-xs font-black text-blue-600 dark:text-blue-400">{(selectedPayment as any)?.invoice_number || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Metode</span>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">{(selectedPayment as any)?.payment_method || '-'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Gateway</span>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">{selectedPayment.gateway || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Dibayar Oleh</span>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-200 truncate">{selectedPayment?.paid_by_name || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-5 border border-slate-100 dark:border-slate-800">
                    <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                      <Clock size={14} className="text-blue-500" /> Timeline & Audit
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                         <div className="flex flex-col">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Waktu Pembuatan</span>
                           <span className="text-xs font-black text-slate-700 dark:text-slate-200">{formatDate(selectedPayment.created_at)}</span>
                         </div>
                         <div className="w-1 h-8 bg-slate-200 dark:bg-slate-700 rounded-full mx-4" />
                         <div className="flex flex-col text-right">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Waktu Pembayaran</span>
                           <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                             {selectedPayment.paid_at ? formatDate(selectedPayment.paid_at) : (
                               <span className="text-amber-500 uppercase">Menunggu</span>
                             )}
                           </span>
                         </div>
                      </div>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Terakhir Diperbarui</span>
                           <span className="text-xs font-medium text-slate-500">{formatDate(selectedPayment.updated_at)}</span>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Bukti & Catatan */}
                <div className="space-y-6">
                  {selectedPayment.proof_url ? (
                    <div className="group relative bg-white dark:bg-slate-900 rounded-xl border-2 border-dashed border-blue-100 dark:border-slate-800 overflow-hidden transition-all hover:border-blue-300">
                      <div className="absolute top-0 left-0 w-full p-3 z-10 bg-gradient-to-b from-black/50 to-transparent">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                           <Image size={14} /> Bukti Transfer Klien
                        </h4>
                      </div>
                      <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800">
                        <img 
                          src={selectedPayment.proof_url} 
                          alt="Proof of Payment" 
                          className="w-full h-full object-cover cursor-zoom-in transition-transform group-hover:scale-105"
                          onClick={() => window.open(selectedPayment.proof_url, '_blank')}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                           <span className="text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-blue-600 rounded-full">Buka Ukuran Penuh</span>
                        </div>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                         <Button 
                           size="sm" 
                           variant="outline" 
                           className="w-full h-9 text-[10px] font-black uppercase tracking-widest gap-2 border-slate-200" 
                           onClick={() => window.open(selectedPayment.proof_url, '_blank')}
                         >
                           <ExternalLink size={12} /> External Preview
                         </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-800/20 rounded-xl p-8 border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                       <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                          <AlertCircle size={24} className="text-slate-400" />
                       </div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum ada bukti yang diunggah</p>
                    </div>
                  )}

                  {selectedPayment.note && (
                    <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-xl p-5 border border-amber-100 dark:border-amber-900/30">
                      <h4 className="flex items-center gap-2 text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-3">
                        <MessageSquare size={14} /> Catatan Tambahan
                      </h4>
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-200 leading-relaxed italic">
                        "{selectedPayment.note}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <ModalFooter className="bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between w-full">
              <Button variant="outline" className="h-11 px-6 text-xs font-black uppercase tracking-widest rounded-xl border-slate-200" onClick={() => { setShowDetailsModal(false); setSelectedPayment(null); }}>
                Tutup
              </Button>
              
              <div className="flex items-center gap-3">
                {selectedPayment && selectedPayment.gateway === 'MANUAL' && (selectedPayment.status === 'PENDING' || selectedPayment.status === 'PROCESSING') && isSuperAdmin && (
                  <Button 
                    className="h-11 px-8 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 text-white text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] border-none" 
                    onClick={() => handleConfirmPayment(selectedPayment.id)}
                    isLoading={loading}
                  >
                    <CheckCircle className="w-4 h-4 text-white" />
                    Konfirmasi Pembayaran
                  </Button>
                )}
                {selectedPayment && (
                  <Button 
                    className="h-11 px-6 rounded-xl gap-2 bg-slate-900 hover:bg-slate-800 text-xs font-black uppercase tracking-widest transition-all" 
                    onClick={() => handleDownloadReceipt()}
                  >
                    <Download className="w-4 h-4" />
                    Receipt
                  </Button>
                )}
              </div>
            </div>
          </ModalFooter>
       </Modal>
    </UnifiedBillingLayout>
  );
};
 
export default PaymentsPage;
