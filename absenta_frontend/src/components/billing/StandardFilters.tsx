import React from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { Input, SearchableSelect } from '../ui';
import { STANDARD_CLASSES } from './billingStyles';

interface FilterOption {
  value: string;
  label: string;
}

interface StandardFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  statusFilter?: string;
  onStatusFilterChange?: (value: string) => void;
  statusOptions?: FilterOption[];
  additionalFilters?: React.ReactNode;
  onRefresh?: () => void;
  refreshLoading?: boolean;
  rightAligned?: boolean;
  showRefreshButton?: boolean;
}

/**
 * Komponen filter standar untuk halaman billing
 * Menyediakan search, status filter, dan tombol refresh yang konsisten
 */
export const StandardFilters: React.FC<StandardFiltersProps> = ({
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Cari data...",
  statusFilter,
  onStatusFilterChange,
  statusOptions = [],
  additionalFilters,
  onRefresh,
  refreshLoading = false,
  rightAligned = false,
  showRefreshButton = true
}) => {
  return (
    <div 
      className={rightAligned ? STANDARD_CLASSES.filtersContainerRightAligned : STANDARD_CLASSES.filtersContainer}
    >
      {/* Search Input */}
      <div className={rightAligned ? 'w-64' : 'flex-1'}>
        <Input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          leftIcon={<Search className="text-gray-400 h-4 w-4" />}
        />
      </div>

      {/* Status Filter */}
      {statusOptions.length > 0 && onStatusFilterChange && (
        <div className={`relative ${rightAligned ? 'w-48' : 'w-full md:w-64'}`}>
          <SearchableSelect
            value={statusFilter || ''}
            onValueChange={onStatusFilterChange}
            options={[
              { value: '', label: 'Semua Status' },
              ...statusOptions
            ]}
            placeholder="Semua Status"
            searchPlaceholder="Cari status..."
            triggerClassName="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
          />
        </div>
      )}

      {/* Additional Filters */}
      {additionalFilters}

      {/* Refresh Button */}
      {showRefreshButton && onRefresh && (
        <button
          onClick={onRefresh}
          disabled={refreshLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${refreshLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      )}
    </div>
  );
};

export default StandardFilters;
