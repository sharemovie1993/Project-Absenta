import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { isSystemSuperAdmin } from '../../utils/rbac';
import { getPaymentsList } from '../../api/paymentGateway.api';
import { Loader, SearchableSelect, Input } from '../ui';
import { formatPaymentStatus, formatGatewayName, formatPaymentMethod } from '../../api/paymentGateway.api';
import { formatCurrency, formatDateTime } from '../../utils/layoutUtils';
import CancelPaymentButton from './CancelPaymentButton';
import DeletePaymentButton from './DeletePaymentButton';
import { getStatusBadgeClass, getStatusLabel } from '../../utils/layoutUtils';
import { useDebounce } from '../../hooks/useDebounce';
import { Calendar } from 'lucide-react';
import type { 
  PaymentListProps, 
  PaymentRecord, 
  PaymentListFilter,
  PaymentStatus,
  PaymentGateway
} from '../../types/paymentGateway.d';

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS: { value: PaymentStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'PENDING', label: 'Menunggu' },
  { value: 'PROCESSING', label: 'Diproses' },
  { value: 'SUCCESS', label: 'Berhasil' },
  { value: 'FAILED', label: 'Gagal' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
  { value: 'EXPIRED', label: 'Kadaluarsa' },
];

const GATEWAY_OPTIONS: { value: PaymentGateway | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Semua Gateway' },
  { value: 'MIDTRANS', label: 'Midtrans' },
  { value: 'STRIPE', label: 'Stripe' },
  { value: 'XENDIT', label: 'Xendit' },
  { value: 'TRIPAY', label: 'Tripay' },
  { value: 'MANUAL', label: 'Manual' },
];

export default function PaymentList({
  tenantId,
  userRole = 'USER',
  showFilters = true,
  showPagination = true,
  onPaymentClick,
  onPaymentCancelled
}: PaymentListProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const { user, isLoading: isAuthLoading } = useAuth();

  const [filters, setFilters] = useState<PaymentListFilter>({
    status: undefined,
    gateway: undefined,
    date_from: undefined,
    date_to: undefined,
  });

  const debouncedFilters = useDebounce(filters, 500);

  const fetchPayments = useCallback(async () => {
    setIsDataLoading(true);
    setError('');

    try {
      const params: any = {
        ...debouncedFilters,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      };

      // SUPERADMIN global: always skip tenant header
      const role = user?.role?.name || userRole;
      const tenantIdCtx = user?.tenant_id;
      const isSuperAdmin = isSystemSuperAdmin(role, tenantIdCtx);
      if (isSuperAdmin) {
        params.skipTenantHeader = true;
        // If no tenant selected, fetch across all tenants
        if (!tenantId) {
          params.allTenants = true;
        } else {
          // If a specific tenant is selected, query via tenant_id param (header still skipped)
          params.tenant_id = tenantId;
        }
      } else if (tenantId) {
        // Non-SUPERADMIN users use tenant header and may pass tenant_id for clarity
        params.tenant_id = tenantId;
      }

      const response = await getPaymentsList(params);

      if (response.success) {
        // Ensure payments is always an array
        const paymentsData = Array.isArray(response.data.payments) ? response.data.payments as PaymentRecord[] : [];
        setPayments(paymentsData);
        
        setTotalPages(response.data.pagination?.totalPages || Math.ceil((response.data.pagination?.total || 0) / ITEMS_PER_PAGE));
        setTotalItems(response.data.pagination?.total || 0);
      } else {
        setError(response.message || 'Gagal memuat data pembayaran');
      }
    } catch (err: any) {
      console.error('Error fetching payments:', err);
      setError(err.message || 'Terjadi kesalahan saat memuat data');
    } finally {
      setIsDataLoading(false);
    }
  }, [tenantId, userRole, debouncedFilters, currentPage, user?.role?.name, user?.tenant_id]);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchPayments();
    }
  }, [fetchPayments, isAuthLoading]);

  if (isAuthLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader size="lg" />
      </div>
    );
  }

  const handleFilterChange = (key: keyof PaymentListFilter, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'ALL' ? undefined : value
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePaymentCancelled = (paymentId: string) => {
    // Refresh the list after cancellation
    fetchPayments();
    onPaymentCancelled?.(paymentId);
  };

  const handlePaymentDeleted = (paymentId: string) => {
    // Refresh the list after deletion
    fetchPayments();
    // Reuse onPaymentCancelled callback semantics for now if provided
    onPaymentCancelled?.(paymentId);
  };

  const formatDate = (dateString: string) => {
    return formatDateTime(dateString);
  };

  const getStatusColor = (status: PaymentStatus) => {
    // Keep function name but delegate to layoutUtils for consistency
    return getStatusBadgeClass(status, 'payments');
  };

  if (isDataLoading && payments.length === 0) {
    return (
      <div className="flex justify-center p-8">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Riwayat Pembayaran</h3>
        {totalItems > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Menampilkan {payments.length} dari {totalItems} pembayaran
          </p>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <SearchableSelect
                value={filters.status || 'ALL'}
                onValueChange={(val) => handleFilterChange('status', val)}
                options={STATUS_OPTIONS}
                placeholder="Semua Status"
                searchPlaceholder="Cari status..."
              />
            </div>

            {/* Gateway Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Gateway
              </label>
              <SearchableSelect
                value={filters.gateway || 'ALL'}
                onValueChange={(val) => handleFilterChange('gateway', val)}
                options={GATEWAY_OPTIONS}
                placeholder="Semua Gateway"
                searchPlaceholder="Cari gateway..."
              />
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dari Tanggal
              </label>
              <Input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => handleFilterChange('date_from', e.target.value || undefined)}
                leftIcon={<Calendar className="h-4 w-4" />}
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sampai Tanggal
              </label>
              <Input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => handleFilterChange('date_to', e.target.value || undefined)}
                leftIcon={<Calendar className="h-4 w-4" />}
              />
            </div>
          </div>


        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="px-6 py-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-b border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Payment List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700 relative min-h-[200px]">
        {isDataLoading && payments.length > 0 && (
            <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
                <Loader />
            </div>
        )}
        {payments.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
            Tidak ada riwayat pembayaran yang ditemukan
          </div>
        ) : (
          payments.map((payment) => (
            <div 
              key={payment.id} 
              className={`px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${onPaymentClick ? 'cursor-pointer' : ''}`}
              onClick={() => onPaymentClick?.(payment)}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                      {getStatusLabel(payment.status)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(payment.created_at)}
                    </span>
                  </div>
                  
                  <div className="flex items-baseline gap-2 mb-1">
                    <h4 className="text-base font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(payment.amount)}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      via {payment.gateway ? formatGatewayName(payment.gateway) : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span>{payment.invoice_number || 'No Invoice'}</span>
                    {payment.payment_method && (
                      <>
                        <span>•</span>
                        <span>{formatPaymentMethod(payment.payment_method)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <CancelPaymentButton
                    paymentId={payment.id}
                    currentStatus={payment.status}
                    userRole={user?.role?.name || ''}
                    onCancelSuccess={() => handlePaymentCancelled(payment.id)}
                  />
                  <DeletePaymentButton
                    paymentId={payment.id}
                    currentStatus={payment.status}
                    userRole={user?.role?.name || ''}
                    onDeleteSuccess={() => handlePaymentDeleted(payment.id)}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sebelumnya
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Selanjutnya
          </button>
        </div>
      )}
    </div>
  );
}
