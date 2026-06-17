import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Download, RefreshCw, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { InvoiceFilters as IInvoiceFilters } from '../../types/invoice';
import { InvoiceStatus } from '../../types/invoice';
import { invoiceLayoutConfig } from './invoiceLayoutConfig';
import { getAllTenants, type Tenant } from '../../api/tenants.api';
import { useAuth } from '../../hooks/useAuth';
import { isSystemSuperAdmin, extractRoleAndTenant } from '../../utils/rbac';
import { SearchableSelect } from '../ui';

interface InvoiceFiltersProps {
  filters: IInvoiceFilters;
  onFiltersChange: (filters: IInvoiceFilters) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  loading?: boolean;
  totalCount?: number;
}

export const InvoiceFilters: React.FC<InvoiceFiltersProps> = ({
  filters,
  onFiltersChange,
  onRefresh,
  onExport,
  loading = false,
  totalCount = 0
}) => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);

  // Load tenants untuk dropdown filter (hanya untuk SUPERADMIN)
  useEffect(() => {
    const loadTenants = async () => {
      const { role, tenantId } = extractRoleAndTenant(user);
      if (isSystemSuperAdmin(role, tenantId)) {
        try {
          setLoadingTenants(true);
          const response = await getAllTenants({ limit: 1000 }, { skipTenantHeader: true }); // Ambil semua tenant, lintas-tenant
          if (response.success) {
            setTenants(response.data || []);
          }
        } catch (error) {
          console.error('Error loading tenants:', error);
        } finally {
          setLoadingTenants(false);
        }
      }
    };

    loadTenants();
  }, [user?.role?.name, user?.tenant_id]);

  const handleFilterChange = (key: keyof IInvoiceFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    onFiltersChange({
      ...filters,
      date_range: {
        ...filters.date_range,
        [type === 'start' ? 'start_date' : 'end_date']: value
      }
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: undefined,
      tenant_id: '',
      date_range: {
        start_date: '',
        end_date: ''
      },
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
  };

  const hasActiveFilters = () => {
    return !!(
      filters.search ||
      filters.status ||
      filters.tenant_id ||
      filters.date_range?.start_date ||
      filters.date_range?.end_date
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filter Invoice</h3>
          {totalCount > 0 && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
              {totalCount} invoice
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {hasActiveFilters() && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          )}
          
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
          
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari invoice number, tenant..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <div>
          <SearchableSelect
            value={filters.status || ''}
            onValueChange={(val: string) => handleFilterChange('status', val || undefined)}
            options={[
              { label: 'Semua Status', value: '' },
              ...Object.entries(invoiceLayoutConfig.statusConfig).map(([key, status]) => ({
                label: status.label,
                value: key
              }))
            ]}
            placeholder="Semua Status"
            searchPlaceholder="Cari status..."
            triggerClassName="w-full"
          />
        </div>

        {/* Tenant Filter - Hanya tampil untuk SUPERADMIN global (tenant system) */}
        {(() => {
          const { role, tenantId } = extractRoleAndTenant(user);
          return isSystemSuperAdmin(role, tenantId);
        })() && (
          <div className="relative">
            <SearchableSelect
              value={filters.tenant_id || ''}
              onValueChange={(val: string) => handleFilterChange('tenant_id', val || undefined)}
              options={[
                { label: 'Semua Tenant', value: '' },
                ...tenants.map((tenant) => ({
                  label: tenant.name,
                  value: tenant.id
                }))
              ]}
              placeholder="Semua Tenant"
              searchPlaceholder="Cari tenant..."
              disabled={loadingTenants}
              triggerClassName="w-full"
            />
          </div>
        )}

        {/* Date Range Start */}
        {(() => { const { role, tenantId } = extractRoleAndTenant(user); return isSystemSuperAdmin(role, tenantId); })() && (
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              placeholder="Tanggal Mulai"
              value={filters.date_range?.start_date || ''}
              onChange={(e) => handleDateRangeChange('start', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Date Range End */}
        {(() => { const { role, tenantId } = extractRoleAndTenant(user); return isSystemSuperAdmin(role, tenantId); })() && (
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              placeholder="Tanggal Akhir"
              value={filters.date_range?.end_date || ''}
              onChange={(e) => handleDateRangeChange('end', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Urutkan Berdasarkan
            </label>
            <SearchableSelect
              value={filters.sortBy || 'created_at'}
              onValueChange={(val: string) => handleFilterChange('sortBy', val)}
              options={[
                { label: 'Tanggal Dibuat', value: 'created_at' },
                { label: 'Tanggal Jatuh Tempo', value: 'due_date' },
                { label: 'Jumlah', value: 'amount' },
                { label: 'Nomor Invoice', value: 'invoice_number' },
                { label: 'Status', value: 'status' }
              ]}
              placeholder="Pilih urutan"
              triggerClassName="w-full"
            />
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Urutan
            </label>
            <SearchableSelect
              value={filters.sortOrder || 'desc'}
              onValueChange={(val: string) => handleFilterChange('sortOrder', val as 'asc' | 'desc')}
              options={[
                { label: 'Terbaru', value: 'desc' },
                { label: 'Terlama', value: 'asc' }
              ]}
              placeholder="Pilih urutan"
              triggerClassName="w-full"
            />
          </div>

          {/* Items Per Page */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Per Halaman
            </label>
            <SearchableSelect
              value={filters.limit?.toString() || '10'}
              onValueChange={(val: string) => handleFilterChange('limit', parseInt(val))}
              options={[
                { label: '10', value: '10' },
                { label: '25', value: '25' },
                { label: '50', value: '50' },
                { label: '100', value: '100' }
              ]}
              placeholder="Limit"
              triggerClassName="w-full"
            />
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters() && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Filter Aktif:</span>
            
            {filters.search && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                Search: {filters.search}
                <button
                  onClick={() => handleFilterChange('search', '')}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            )}
            
            {filters.status && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                Status: {filters.status && invoiceLayoutConfig.statusConfig[filters.status as keyof typeof invoiceLayoutConfig.statusConfig] ? (invoiceLayoutConfig.statusConfig[filters.status as keyof typeof invoiceLayoutConfig.statusConfig] as any).label : filters.status}
                <button
                  onClick={() => handleFilterChange('status', undefined)}
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            )}

            {filters.tenant_id && (() => { const { role, tenantId } = extractRoleAndTenant(user); return isSystemSuperAdmin(role, tenantId); })() && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                Tenant: {tenants.find(t => t.id === filters.tenant_id)?.name || filters.tenant_id}
                <button
                  onClick={() => handleFilterChange('tenant_id', undefined)}
                  className="ml-1 text-orange-600 hover:text-orange-800"
                >
                  ×
                </button>
              </span>
            )}
            
            {filters.date_range?.start_date && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                Dari: {filters.date_range.start_date}
                <button
                  onClick={() => handleDateRangeChange('start', '')}
                  className="ml-1 text-purple-600 hover:text-purple-800"
                >
                  ×
                </button>
              </span>
            )}
            
            {filters.date_range?.end_date && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                Sampai: {filters.date_range.end_date}
                <button
                  onClick={() => handleDateRangeChange('end', '')}
                  className="ml-1 text-purple-600 hover:text-purple-800"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default InvoiceFilters;
