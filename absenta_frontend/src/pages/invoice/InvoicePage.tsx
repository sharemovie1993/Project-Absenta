// Invoice Page - Main Invoice Management Page
// SUPERADMIN AUDIT-ONLY VERSION
// Zero mutation surface: No create, edit, delete, send, or pay actions.

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  Eye,
  FileText,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';

import UnifiedInvoiceLayout from '../../components/invoice/UnifiedInvoiceLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Loader } from '../../components/ui';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import StandardInvoiceLayout from '../../components/invoice/StandardInvoiceLayout';
import InvoiceTable from '../../components/invoice/InvoiceTable';
import { 
  invoiceFilterOptions,
  animationConfig 
} from '../../components/invoice/invoiceLayoutConfig';

import type {
  Invoice,
  InvoiceQueryParams,
  PaginationInfo
} from '../../types/invoice';
import { InvoiceStatus } from '../../types/invoice';

import { 
  getAllInvoices
} from '../../api/invoice.api';
import axiosInstance from '../../lib/axiosInstance';
import { LogService } from '../../utils/LogService';
import InvoiceLogsPanel from '../../components/invoice/InvoiceLogsPanel';
import { useAuth } from '../../hooks/useAuth';
import { getPublicInvoiceLink } from '../../api/mySubscription.api';
import { openInvoicePublic } from '../../utils/invoiceLink';
import { isSystemSuperAdmin } from '../../utils/rbac';

const InvoicePage: React.FC = () => {
  // RBAC context
  const { user, isLoading: isAuthLoading } = useAuth();
  const roleName = (user as any)?.role?.name || (user as any)?.role;
  const userTenantId = (user as any)?.tenant_id || null;
  const isSuperAdmin = isSystemSuperAdmin(roleName, userTenantId || undefined);

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }

  // State management
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filter and pagination state
  const [showLogsPanel, setShowLogsPanel] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [tenantFilter, setTenantFilter] = useState<string>('');
  const [invalidPeriodOnly, setInvalidPeriodOnly] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [tenants, setTenants] = useState<Array<{ id: string; name: string; email: string; }>>([]);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(String(location.search || ''));
    const status = params.get('status');
    const tenantIdParam = params.get('tenant_id');
    const invalid = params.get('invalid_period');

    if (status) setStatusFilter(status.toUpperCase());
    if (tenantIdParam !== null) setTenantFilter(tenantIdParam);
    if (invalid !== null) setInvalidPeriodOnly(invalid === '1' || invalid.toLowerCase() === 'true');
  }, [location.search]);

  // Load invoices on component mount and when filters change
  useEffect(() => {
    loadInvoices();
  }, [currentPage, statusFilter, tenantFilter, itemsPerPage, invalidPeriodOnly]);

  useEffect(() => {
    loadFormData();
  }, []);

  // Load invoices function
  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const perPage = itemsPerPage;
      const tenantScope = (tenantFilter || undefined) ?? (isSuperAdmin ? undefined : userTenantId || undefined);
      const normalizedStatus = statusFilter === 'ALL' ? undefined : (statusFilter as InvoiceStatus);
      
      const queryParams: InvoiceQueryParams = {
        offset: (currentPage - 1) * perPage,
        limit: perPage,
        status: normalizedStatus,
        tenant_id: tenantScope
      };
      
      const response = await getAllInvoices(queryParams, { skipTenantHeader: isSuperAdmin });
      
      if (response.success) {
        const rawInvoices = response.data?.invoices ?? [];
        // Normalisasi casing properti dari backend
        const baseInvoices = rawInvoices.map((inv: any) => {
          const billingNorm = inv.billing ?? inv.Billing ?? undefined;
          const subscription = billingNorm?.Subscription ?? inv.Billing?.Subscription ?? undefined;
          const tenantRel = subscription?.Tenant ?? undefined;
          const tenantIdFromRel = subscription?.tenant_id ?? undefined;
          return {
            ...inv,
            billing: billingNorm,
            tenant_id: inv.tenant_id ?? tenantIdFromRel,
            tenant: inv.tenant ?? (tenantRel
              ? {
                  id: tenantRel.id,
                  name: tenantRel.name,
                  email: tenantRel.email || '',
                  address: tenantRel.address,
                  tax_id: tenantRel.tax_id,
                }
              : undefined),
          };
        });

        // Enrich tenant data if needed
        const tenantIds = Array.from(new Set(baseInvoices.map((inv: any) => inv.tenant_id).filter(Boolean)));
        const tenantsMap: Record<string, { id: string; name: string; email: string }> = {};
        
        await Promise.all(tenantIds.map(async (tid: string) => {
          if (!tid) return;
          try {
            const tRespModule = await import('../../api/tenants.api');
            const tResp = await tRespModule.getTenantById(tid as string, { skipTenantHeader: isSuperAdmin });
            const tData = tResp?.data;
            if (tData?.id) {
              tenantsMap[tid as string] = { id: tData.id, name: tData.name, email: tData.email || '' };
              return;
            }
          } catch (_) {
            // fallback below
          }
          try {
            const tdModule = await import('../../api/tenant-detail.api');
            const tdResp = await tdModule.getTenantDetail(tid as string);
            const td = tdResp?.data;
            if (td?.id) {
              tenantsMap[tid as string] = { id: td.id, name: td.name, email: td.contact_email || '' };
            }
          } catch {
            // keep N/A when not available
          }
        }));

        const enriched = baseInvoices.map((inv: any) => ({
          ...inv,
          tenant: inv.tenant || (inv.tenant_id && tenantsMap[inv.tenant_id] ? tenantsMap[inv.tenant_id] : undefined)
        }));

        const filtered = invalidPeriodOnly
          ? enriched.filter((inv: any) => !inv?.period_start || !inv?.period_end)
          : enriched;
        setInvoices(filtered);
        setTotalPages(response.data?.pagination?.total_pages ?? 1);
        setTotalCount(response.data?.pagination?.total_count ?? 0);
      } else {
        setError(response.message || 'Failed to load invoices');
        setInvoices([]);
        setTotalPages(1);
        setTotalCount(0);
      }
    } catch (err) {
      setError('An error occurred while loading invoices');
      console.error('Error loading invoices:', err);
      setInvoices([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, tenantFilter, itemsPerPage, invalidPeriodOnly]);

  // Load additional data for form (used for filters here)
  const loadFormData = async () => {
    if (!isSuperAdmin) return;
    try {
      try {
        const { getAllTenants } = await import('../../api/tenants.api');
        const tResp = await getAllTenants({ limit: 50 }, { skipTenantHeader: true });
        const tenantList = (tResp.data || []).map(t => ({ id: t.id, name: t.name, email: t.email || '' }));
        setTenants(tenantList);
      } catch (e) {
        setTenants([]);
      }
    } catch (err) {
      console.error('Error loading form data:', err);
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle download invoice
  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      setLoading(true);
      LogService.info('User requested invoice PDF download', { invoice_number: invoice.invoice_number }, 'InvoicePage', {
        activity: 'download',
        userAction: 'download_pdf',
        invoiceId: invoice.id
      });
      const res = await axiosInstance.get(`/invoice/${encodeURIComponent(String(invoice.id))}/download`, {
        headers: { Accept: 'application/json' },
      });
      const pdfUrl = res?.data?.data?.pdf_url;
      if (!pdfUrl) throw new Error('PDF URL tidak tersedia');
      const link = document.createElement('a');
      link.href = String(pdfUrl);
      link.download = `invoice-${String(invoice.invoice_number || 'invoice')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSuccess('Invoice PDF berhasil diunduh');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      setError(err.message || 'Gagal mengunduh invoice PDF');
      LogService.error('Error downloading invoice:', err, 'InvoicePage', {
        activity: 'download',
        userAction: 'download_pdf',
        invoiceId: invoice.id
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle view invoice
  const handleViewInvoice = (invoice: Invoice) => {
    (async () => {
      try {
        const res = await getPublicInvoiceLink(invoice.id);
        const token = res?.data?.token;
        const url = res?.data?.url;
        if (token) {
          navigate(`/invoice/public/${token}`);
        } else if (url) {
          window.open(url, '_blank');
        } else {
          navigate(`/invoice/public/${invoice.id}`);
        }
      } catch {
        navigate(`/invoice/public/${invoice.id}`);
      }
      LogService.info('User viewed invoice details', { invoice_number: invoice.invoice_number }, 'InvoicePage', {
        activity: 'view',
        userAction: 'navigate_detail_page',
        invoiceId: invoice.id
      });
    })();
  };

  return (
    <UnifiedInvoiceLayout pageKey="invoices" title="Invoice Management" showOverview={isSuperAdmin}>
      <StandardInvoiceLayout
        error={error}
        success={success}
        loading={loading}
      >
        <div className="mb-4 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <ShieldAlert className="h-5 w-5 text-blue-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <span className="font-bold">Mode Audit:</span> Halaman ini hanya untuk monitoring. Aksi pembuatan, pengeditan, dan penghapusan invoice dinonaktifkan untuk akun Superadmin di halaman ini.
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-end">
              <div className="flex items-center gap-2">
                {isSuperAdmin && (
                  <button
                    onClick={() => setShowLogsPanel(prev => !prev)}
                    className="inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
                    aria-pressed={showLogsPanel}
                  >
                    {showLogsPanel ? 'Tutup Log' : 'Lihat Log'}
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Simplified Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-48">
                  <SearchableSelect
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                    options={[
                      { value: 'ALL', label: 'Semua Status' },
                      { value: 'DRAFT', label: 'Draft' },
                      { value: 'SENT', label: 'Terkirim' },
                      { value: 'PAID', label: 'Lunas' },
                      { value: 'OVERDUE', label: 'Terlambat' },
                      { value: 'CANCELLED', label: 'Dibatalkan' }
                    ]}
                    placeholder="Semua Status"
                    searchPlaceholder="Cari status..."
                    triggerClassName="w-full"
                  />
                </div>
                <div className="w-full sm:w-64">
                   <SearchableSelect
                    value={tenantFilter}
                    onValueChange={setTenantFilter}
                    options={[
                      { value: '', label: 'Semua Tenant' },
                      ...tenants.map((t) => ({ value: t.id, label: t.name }))
                    ]}
                    placeholder="Semua Tenant"
                    searchPlaceholder="Cari tenant..."
                    triggerClassName="w-full"
                  />
                </div>
              </div>

              {isSuperAdmin && showLogsPanel && (
                <InvoiceLogsPanel
                  defaultLevel="error"
                  defaultInvoiceId={''}
                  defaultActivity="fetch_invoice_by_id"
                  dateRange={{
                    from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                    to: new Date().toISOString()
                  }}
                />
              )}

              <InvoiceTable
                invoices={invoices}
                loading={loading}
                onView={handleViewInvoice}
                onDownload={handleDownloadInvoice}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={setItemsPerPage}
                onSend={undefined}
                onEmail={undefined}
              />
            </div>
          </CardContent>
        </Card>
      </StandardInvoiceLayout>
    </UnifiedInvoiceLayout>
  );
};

export default InvoicePage;
