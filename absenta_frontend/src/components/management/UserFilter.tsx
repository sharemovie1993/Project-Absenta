import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Button, Input, SearchableSelect } from '../ui';
import { getRoles, getTenants, type RoleItem, type TenantItem } from '../../api/user.api';
import { useAuthStore } from '../../store/authStore';
import { isSystemSuperAdmin } from '../../utils/rbac';

export interface UserFilterState {
  search: string;
  role: string;
  status: string;
  tenant: string;
}

interface UserFilterProps {
  filters: UserFilterState;
  onFiltersChange: (filters: UserFilterState) => void;
  onReset: () => void;
}

const UserFilter: React.FC<UserFilterProps> = ({
  filters,
  onFiltersChange,
  onReset
}) => {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = isSystemSuperAdmin(currentUser?.role?.name, (currentUser as any)?.tenant_id);

  // Load filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        setLoading(true);
        const promises: Promise<any>[] = [getRoles()];
        
        // Only fetch tenants if user is super admin
        if (isSuperAdmin) {
          promises.push(getTenants());
        }

        const [rolesResponse, tenantsResponse] = await Promise.all(promises);
        
        setRoles(rolesResponse.data);
        if (tenantsResponse) {
          setTenants(tenantsResponse.data);
        }
      } catch (error) {
        console.error('Failed to load filter options:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFilterOptions();
  }, [isSuperAdmin]);

  const handleFilterChange = (key: keyof UserFilterState, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleReset = () => {
    onReset();
    setShowAdvanced(false);
  };

  const hasActiveFilters = filters.role || filters.status || filters.tenant;

  return (
    <div className="bg-transparent p-2 space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="w-full">
          <Input
            type="text"
            placeholder="Cari nama, email, atau NIP..."
            aria-label="Cari Nama atau Email Pengguna"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            leftIcon={<Search className="h-3.5 w-3.5 text-gray-400" />}
            className="h-9 text-[11px]"
          />
        </div>

        <div>
          <div className="relative">
            <SearchableSelect
              value={filters.role}
              onValueChange={(value) => handleFilterChange('role', value)}
              options={[{ label: 'SEMUA ROLE', value: '' }, ...roles.map((role) => ({ label: role.name.toUpperCase(), value: role.name }))]}
              placeholder="FILTER ROLE"
              searchPlaceholder="Cari Role..."
              disabled={loading}
              triggerClassName="h-9 w-full text-[11px] font-bold"
            />
          </div>
        </div>

        <div>
          <div className="relative">
            <SearchableSelect
              value={filters.status}
              onValueChange={(value) => handleFilterChange('status', value)}
              options={[
                { label: 'SEMUA STATUS', value: '' },
                { label: 'AKTIF', value: 'active' },
                { label: 'NON-AKTIF', value: 'inactive' }
              ]}
              placeholder="FILTER STATUS"
              searchPlaceholder="Cari Status..."
              triggerClassName="h-9 w-full text-[11px] font-bold"
            />
          </div>
        </div>

        {isSuperAdmin && (
          <div>
            <div className="relative">
              <SearchableSelect
                value={filters.tenant}
                onValueChange={(value) => handleFilterChange('tenant', value)}
                options={[{ label: 'SEMUA TENANT', value: '' }, ...tenants.map((tenant) => ({ label: tenant.name.toUpperCase(), value: tenant.id }))]}
                placeholder="FILTER TENANT"
                searchPlaceholder="Cari Tenant..."
                disabled={loading}
                triggerClassName="h-9 w-full text-[11px] font-bold"
              />
            </div>
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter self-center">Filter Aktif:</span>
          
          {filters.role && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded-md border border-blue-100 dark:border-blue-800">
              ROLE: {filters.role.toUpperCase()}
              <button
                onClick={() => handleFilterChange('role', '')}
                aria-label="Hapus filter role"
                className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}

          {filters.status && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
              Status: {filters.status === 'active' ? 'Active' : 'Inactive'}
              <button
                onClick={() => handleFilterChange('status', '')}
                aria-label="Hapus filter status"
                className="hover:bg-green-200 dark:hover:bg-green-800 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.tenant && isSuperAdmin && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded-full">
              Tenant: {tenants.find(t => t.id === filters.tenant)?.name || filters.tenant}
              <button
                onClick={() => handleFilterChange('tenant', '')}
                aria-label="Hapus filter tenant"
                className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
        )}
      </div>
    )}
  </div>
);
};

export default UserFilter;
