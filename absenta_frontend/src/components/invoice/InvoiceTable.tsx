import React from 'react';
import { motion } from 'framer-motion';
import { 
  Eye, 
  Send, 
  Download, 
  Mail,
  Calendar,
  DollarSign,
  AlertCircle,
  Clock,
  FileText
} from 'lucide-react';
import type { Invoice } from '../../types/invoice';
import { InvoiceStatus } from '../../types/invoice';
import { invoiceLayoutConfig } from './invoiceLayoutConfig';
import { formatCurrencyIntl, formatDateShort } from '../../utils/layoutUtils';
import { isOverdue, getDaysOverdue } from '../../utils/invoice';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import { useAuthStore } from '../../store/authStore';
import { isSystemSuperAdmin } from '../../utils/rbac';
import { SearchableSelect } from '../ui';

interface InvoiceTableProps {
  invoices?: Invoice[];
  loading?: boolean;
  onView?: (invoice: Invoice) => void;
  onSend?: (invoice: Invoice) => void;
  onDownload?: (invoice: Invoice) => void;
  onEmail?: (invoice: Invoice) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  userRole?: string;
  itemsPerPage?: number;
  onItemsPerPageChange?: (limit: number) => void;
} 

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  loading = false,
  onView,
  onSend,
  onDownload,
  onEmail,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  userRole = 'ADMIN',
  itemsPerPage = 10,
  onItemsPerPageChange
}) => {
  const { user } = useAuthStore();
  const roleName = user?.role?.name || userRole;
  const tenantId = user?.tenant_id;
  const isSuperAdmin = isSystemSuperAdmin(roleName, tenantId);
  const getStatusBadge = (status: InvoiceStatus) => {
    return (
      <InvoiceStatusBadge status={status} showIcon={true} />
    );
  };

  const getActionButtons = (invoice: Invoice) => {
    const actions = [];

    // View action
    if (onView) {
      actions.push(
        <button
          key="view"
          onClick={() => onView(invoice)}
          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
          title="Lihat Detail"
        >
          <Eye className="w-4 h-4" />
        </button>
      );
    }

    // Edit action (only for DRAFT status, SUPERADMIN only)

    // Send action (only for DRAFT status, SUPERADMIN only)
    if (onSend && invoice.status === 'DRAFT' && isSuperAdmin) {
      actions.push(
        <button
          key="send"
          onClick={() => onSend(invoice)}
          className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-colors"
          title="Kirim Invoice"
        >
          <Send className="w-4 h-4" />
        </button>
      );
    }

    // Mark as Paid action (only for SENT status, SUPERADMIN only)

    // Pay action (SENT/OVERDUE/VIEWED and has billing)

    // Download action
    if (onDownload) {
      actions.push(
        <button
          key="download"
          onClick={() => onDownload(invoice)}
          className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
          title="Download PDF"
        >
          <Download className="w-4 h-4" />
        </button>
      );
    }

    // Email action (for SENT and PAID status, SUPERADMIN only)
    if (onEmail && ['SENT', 'PAID'].includes(invoice.status) && isSuperAdmin) {
      actions.push(
        <button
          key="email"
          onClick={() => onEmail(invoice)}
          className="p-1 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded transition-colors"
          title="Kirim Email"
        >
          <Mail className="w-4 h-4" />
        </button>
      );
    }

    // Cancel action (only for SENT status, SUPERADMIN only)

    // Delete action (only for DRAFT and CANCELLED status)

    return actions;
  };

  // Use standardized date formatter
  const formatDate = (dateString: string) => {
    return formatDateShort(dateString);
  };

  const getOverdueInfo = (invoice: Invoice) => {
    if (invoice.status === 'SENT' && isOverdue(invoice)) {
      const days = getDaysOverdue(invoice);
      return (
        <div className="flex items-center text-red-600 text-xs mt-1">
          <AlertCircle className="w-3 h-3 mr-1" />
          <span>Terlambat {days} hari</span>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Memuat data invoice...</span>
        </div>
      </div>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada invoice</h3>
          <p className="mt-1 text-sm text-gray-500">
            Belum ada invoice yang dibuat atau sesuai dengan filter yang dipilih.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
    >
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice
              </th>
              {isSuperAdmin && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Jumlah
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tanggal
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Jatuh Tempo
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices?.map((invoice, index) => (
              <motion.tr
                key={invoice.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`hover:bg-gray-50 transition-colors ${invoice.status === 'OVERDUE' ? 'bg-red-50' : ''}`}
              >
                {/* Invoice Number */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.invoice_number}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {invoice.id.slice(0, 8)}...
                      </div>
                    </div>
                  </div>
                </td>

                {/* Tenant */}
                {isSuperAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {invoice.billing?.Subscription?.Tenant?.name || invoice.tenant?.name || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {invoice.billing?.Subscription?.Tenant?.domain || invoice.billing?.Subscription?.Tenant?.email || invoice.tenant?.email || 'N/A'}
                    </div>
                  </td>
                )}

                {/* Amount */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 text-green-600 mr-1" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrencyIntl(
                          (invoice.total_amount ?? invoice.amount ?? 0),
                          invoice.currency || 'IDR'
                        )}
                      </div>
                      {(() => {
                        const taxAmt = invoice.tax_amount ?? 0;
                        const taxType = invoice.tax_type ?? null;
                        return !!taxType && taxType !== 'NONE' && taxAmt > 0;
                      })() && (
                        <div className="text-xs text-gray-500">
                          Termasuk pajak {formatCurrencyIntl((invoice.tax_amount ?? 0), invoice.currency || 'IDR')}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    {getStatusBadge(invoice.status)}
                    {getOverdueInfo(invoice)}
                  </div>
                </td>

                {/* Created Date */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                    {formatDate((invoice as any).issue_date || invoice.created_at)}
                  </div>
                </td>

                {/* Due Date */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900">
                    <Clock className="w-4 h-4 text-gray-400 mr-1" />
                    {formatDate(invoice.due_date)}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-1">
                    {getActionButtons(invoice)}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-700">
                Page <span className="font-medium">{currentPage}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
              </p>
              {onItemsPerPageChange && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Rows:</span>
                  <div className="w-20">
                    <SearchableSelect
                      value={itemsPerPage.toString()}
                      onValueChange={(val: string) => onItemsPerPageChange(Number(val))}
                      options={[
                        { label: '10', value: '10' },
                        { label: '25', value: '25' },
                        { label: '50', value: '50' },
                        { label: '100', value: '100' }
                      ]}
                      placeholder="10"
                      searchPlaceholder=""
                      triggerClassName="w-full pl-3 pr-2 py-1 text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              )}
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNum === currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default InvoiceTable;
