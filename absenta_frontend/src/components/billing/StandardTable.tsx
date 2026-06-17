import React from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { Table, Input, SearchableSelect } from '../ui';
import type { Column } from '../ui/Table';
import { STANDARD_CLASSES } from './billingStyles';

interface FilterOption {
  value: string;
  label: string;
}

interface StandardTableProps {
  title: string;
  columns: Column[];
  data: unknown[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  // Filter props
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  statusFilter?: string;
  onStatusFilterChange?: (value: string) => void;
  statusOptions?: FilterOption[];
  onRefresh?: () => void;
  refreshLoading?: boolean;
  additionalFilters?: React.ReactNode;
  // Layout
  stackFilters?: boolean; // When true, render filters below title (2-row header)
}

/**
 * Komponen tabel standar untuk halaman billing
 * Menyediakan struktur tabel yang konsisten dengan loading dan empty state
 * Termasuk filter terintegrasi di header tabel
 */
const StandardTable: React.FC<StandardTableProps> = ({
  title,
  columns,
  data,
  loading = false,
  emptyMessage = "Tidak ada data tersedia",
  emptyIcon,
  // Filter props
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Cari data...",
  statusFilter,
  onStatusFilterChange,
  statusOptions = [],
  onRefresh,
  refreshLoading = false,
  additionalFilters,
  stackFilters = false
}) => {
  const hasFilters = onSearchChange || onStatusFilterChange || onRefresh || additionalFilters;

  return (
    <div 
      className={STANDARD_CLASSES.cardContainer}
    >
      {/* Table Header with Integrated Filters */}
      <div className={STANDARD_CLASSES.cardHeader}>
        {stackFilters ? (
          <div className="flex flex-col gap-2">
            {/* Title */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
            </div>

            {/* Filters on second row */}
            {hasFilters && (
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Input */}
                {onSearchChange && (
                  <div className="w-48 sm:w-64">
                    <Input
                      type="text"
                      value={searchTerm || ''}
                      onChange={(e) => onSearchChange(e.target.value)}
                      placeholder={searchPlaceholder}
                      leftIcon={<Search className="text-gray-400 h-4 w-4" />}
                    />
                  </div>
                )}

                {/* Status Filter */}
                {onStatusFilterChange && statusOptions.length > 0 && (
                  <div className="w-40 sm:w-48">
                    <SearchableSelect
                      value={statusFilter || ''}
                      onValueChange={onStatusFilterChange}
                      options={[
                        ...(!statusOptions.some(o => o.value === 'ALL' || o.value === '') 
                          ? [{ value: "", label: "Semua Status" }] 
                          : []),
                        ...statusOptions
                      ]}
                      placeholder="Semua Status"
                      searchPlaceholder="Cari status..."
                      triggerClassName="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>
                )}

                {/* Additional Filters */}
                {additionalFilters}

                {/* Refresh Button */}
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    disabled={refreshLoading}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                    title="Refresh Data"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshLoading ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>

            {/* Filters */}
            {hasFilters && (
              <div className="flex items-center gap-3">
                {/* Search Input */}
                {onSearchChange && (
                  <div className="w-64">
                    <Input
                      type="text"
                      value={searchTerm || ''}
                      onChange={(e) => onSearchChange(e.target.value)}
                      placeholder={searchPlaceholder}
                      leftIcon={<Search className="text-gray-400 h-4 w-4" />}
                    />
                  </div>
                )}

                {/* Status Filter */}
                {onStatusFilterChange && statusOptions.length > 0 && (
                  <div className="w-48">
                    <SearchableSelect
                      value={statusFilter || ''}
                      onValueChange={onStatusFilterChange}
                      options={[
                        ...(!statusOptions.some(o => o.value === 'ALL' || o.value === '') 
                          ? [{ value: "", label: "Semua Status" }] 
                          : []),
                        ...statusOptions
                      ]}
                      placeholder="Semua Status"
                      searchPlaceholder="Cari status..."
                      triggerClassName="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>
                )}

                {/* Additional Filters */}
                {additionalFilters}

                {/* Refresh Button */}
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    disabled={refreshLoading}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                    title="Refresh Data"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshLoading ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table Content */}
      <div className={STANDARD_CLASSES.cardContent}>
        <div className={STANDARD_CLASSES.tableContainer}>
          <Table
            columns={columns}
            data={data}
            loading={loading}
            emptyMessage={emptyMessage}
          />
        </div>
      </div>
    </div>
  );
};

export default StandardTable;
