import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { Checkbox } from './Checkbox';
import { Loader } from './Loader';
import { Button } from './Button';
import Badge from './Badge';
import { CleanDeckCard } from './CleanDeckCard';
import { useIsMobile } from '@/hooks/useIsMobile';

export interface Column {
  key: string;
  label: React.ReactNode;
  sortable?: boolean;
  render?: (value: any, row: any, index: number) => React.ReactNode;
  className?: string;
}

export interface TableProps {
  columns: Column[];
  data: unknown[];
  loading?: boolean;
  emptyMessage?: React.ReactNode;
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
  onRowClick?: (row: any, index: number) => void;
  onView?: (row: any) => void;
  renderMobileCard?: (row: any, index: number) => React.ReactNode;
  enableMobileDeck?: boolean;
  rowClassName?: (row: any, index: number) => string;
  headerTitle?: React.ReactNode;
  headerActions?: React.ReactNode;
  toolbarLeft?: React.ReactNode;
  toolbarRight?: React.ReactNode;
  compact?: boolean;
  divider?: boolean;
  rowKey?: string | ((row: any) => string);
  // Sorting props
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  // Pagination props
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onLimitChange?: (limit: number) => void;
  };
  // Bulk Selection props
  selectedRowKeys?: Set<string>;
  onSelectedRowKeysChange?: (keys: Set<string>) => void;
}

export function Table({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  className,
  striped = false,
  hoverable = true,
  onRowClick,
  onView,
  renderMobileCard,
  enableMobileDeck = true,
  rowClassName,
  headerTitle,
  headerActions,
  toolbarLeft,
  toolbarRight,
  rowKey,
  compact = false,
  divider = true,
  sortBy,
  sortOrder,
  onSort,
  pagination,
  selectedRowKeys,
  onSelectedRowKeysChange,
}: TableProps) {
  const isMobile = useIsMobile();
  // Sorting state
  const [internalSortBy, setInternalSortBy] = React.useState<string | undefined>(sortBy);
  const [internalSortOrder, setInternalSortOrder] = React.useState<'asc' | 'desc' | undefined>(sortOrder);

  // Sync props to state
  React.useEffect(() => {
    if (sortBy !== undefined) setInternalSortBy(sortBy);
    if (sortOrder !== undefined) setInternalSortOrder(sortOrder);
  }, [sortBy, sortOrder]);

  const handleSort = (key: string) => {
    let newOrder: 'asc' | 'desc' = 'asc';
    if (internalSortBy === key) {
      newOrder = internalSortOrder === 'asc' ? 'desc' : 'asc';
    }

    setInternalSortBy(key);
    setInternalSortOrder(newOrder);

    if (onSort) {
      onSort(key, newOrder);
    }
  };

  const sortedData = React.useMemo(() => {
    if (onSort) {
      // Server-side / parent handles sorting
      return data;
    }
    if (!internalSortBy) return data;

    const sorted = [...data];
    sorted.sort((a: any, b: any) => {
      let valA = a[internalSortBy];
      let valB = b[internalSortBy];

      // Handle null / undefined
      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';

      // If string, do localeCompare
      if (typeof valA === 'string' && typeof valB === 'string') {
        return internalSortOrder === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }

      // Numbers or others
      if (valA < valB) return internalSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return internalSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [data, internalSortBy, internalSortOrder, onSort]);

  const getRowId = (row: any, index: number): string => {
    if (typeof rowKey === 'function') return rowKey(row);
    return String(row[rowKey || 'id'] || index);
  };

  // Bulk Checkbox calculations
  const showCheckbox = selectedRowKeys !== undefined && onSelectedRowKeysChange !== undefined;
  const rowIds = sortedData.map((row, idx) => getRowId(row, idx));
  const allSelectedOnPage = rowIds.length > 0 && rowIds.every(id => selectedRowKeys?.has(id));
  const someSelectedOnPage = rowIds.some(id => selectedRowKeys?.has(id));
  const isIndeterminate = someSelectedOnPage && !allSelectedOnPage;

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectedRowKeysChange || !selectedRowKeys) return;
    const next = new Set<string>(selectedRowKeys);
    if (checked) {
      rowIds.forEach(id => next.add(id));
    } else {
      rowIds.forEach(id => next.delete(id));
    }
    onSelectedRowKeysChange(next);
  };

  if (isMobile && enableMobileDeck) {
    // Determine Title, Subtitle, Status columns for smart deck rendering
    const titleColumn = columns.find(c => /nama|title|judul|name|label/i.test(c.key)) || 
      columns.find(c => !['select', 'checkbox', 'actions', 'action', 'no', 'index'].includes(c.key.toLowerCase()));

    const subtitleColumn = columns.find(c => c !== titleColumn && /nis|nip|kode|tingkat|jurusan|kelas|category|kategori|email|role|phone|no_hp/i.test(c.key)) ||
      columns.find(c => c !== titleColumn && !['select', 'checkbox', 'actions', 'action', 'no', 'index', 'status', 'is_active'].includes(c.key.toLowerCase()));

    const statusColumn = columns.find(c => /status|is_active|aktif|state/i.test(c.key));

    return (
      <div className={cn("w-full flex flex-col gap-3", className)}>
        {/* Header & Toolbars */}
        {(headerTitle || headerActions || toolbarLeft || toolbarRight) && (
          <div className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
            {(headerTitle || headerActions) && (
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                {headerTitle && (
                  <div className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                    {headerTitle}
                  </div>
                )}
                {headerActions && <div>{headerActions}</div>}
              </div>
            )}
            {(toolbarLeft || toolbarRight) && (
              <div className="flex flex-col gap-2">
                {toolbarLeft}
                {toolbarRight}
              </div>
            )}
          </div>
        )}

        {/* Card Deck List */}
        {loading && data.length === 0 ? (
          <div className="flex flex-col gap-2.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-3 animate-pulse" />
            ))}
          </div>
        ) : sortedData.length === 0 ? (
          <div className="py-12 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
            <p className="font-bold text-sm text-slate-400">{emptyMessage}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {sortedData.map((row, rowIndex) => {
              const rowId = getRowId(row, rowIndex);
              const isRowSelected = selectedRowKeys?.has(rowId) || false;

              if (renderMobileCard) {
                return (
                  <React.Fragment key={rowId}>
                    {renderMobileCard(row, rowIndex)}
                  </React.Fragment>
                );
              }

              const rowObj = (row || {}) as Record<string, any>;
              
              const titleVal = titleColumn
                ? (titleColumn.render ? titleColumn.render(rowObj[titleColumn.key], row, rowIndex) : rowObj[titleColumn.key])
                : (rowObj.nama || rowObj.title || `Item #${rowIndex + 1}`);

              const subVal = subtitleColumn
                ? (subtitleColumn.render ? subtitleColumn.render(rowObj[subtitleColumn.key], row, rowIndex) : rowObj[subtitleColumn.key])
                : undefined;

              const badgeVal = statusColumn
                ? (statusColumn.render ? statusColumn.render(rowObj[statusColumn.key], row, rowIndex) : (rowObj[statusColumn.key] ? <Badge>{String(rowObj[statusColumn.key])}</Badge> : undefined))
                : undefined;

              const handleItemDetail = () => {
                if (onView) onView(row);
                else if (onRowClick) onRowClick(row, rowIndex);
              };

              return (
                <CleanDeckCard
                  key={rowId}
                  title={titleVal}
                  subtitle={subVal}
                  badge={badgeVal}
                  selected={isRowSelected}
                  onSelect={showCheckbox ? (checked) => {
                    if (!onSelectedRowKeysChange || !selectedRowKeys) return;
                    const next = new Set<string>(selectedRowKeys);
                    if (checked) next.add(rowId); else next.delete(rowId);
                    onSelectedRowKeysChange(next);
                  } : undefined}
                  onDetail={Boolean(onView || onRowClick) ? handleItemDetail : undefined}
                  onClick={Boolean(onView || onRowClick) ? handleItemDetail : undefined}
                />
              );
            })}
          </div>
        )}

        {/* Mobile Pagination with Limit Control */}
        {pagination && (
          <div className="flex flex-col gap-3 pt-3 pb-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400">
                Total: {pagination.totalItems || data.length} Data
              </span>

              {pagination.onLimitChange && (
                <div className="flex items-center gap-2">
                  <label htmlFor="table-mobile-limit" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Baris:
                  </label>
                  <select
                    id="table-mobile-limit"
                    value={pagination.itemsPerPage || 10}
                    onChange={(e) => pagination.onLimitChange?.(Number(e.target.value))}
                    className="h-8 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {[10, 25, 50, 100].map((opt) => (
                      <option key={opt} value={opt}>
                        {opt} / hal
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  disabled={pagination.currentPage <= 1 || loading}
                  onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                  className="text-[11px] font-black uppercase tracking-wider h-9 px-3.5 rounded-xl disabled:opacity-30 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Sebelumnya
                </Button>
                <span className="text-xs font-black text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-2xs font-mono">
                  {pagination.currentPage} / {pagination.totalPages}
                </span>
                <Button
                  variant="ghost"
                  disabled={pagination.currentPage >= pagination.totalPages || loading}
                  onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                  className="text-[11px] font-black uppercase tracking-wider h-9 px-3.5 rounded-xl disabled:opacity-30 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Berikutnya
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('w-full overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-slate-900 relative transition-all duration-300 flex flex-col', className)}>
      {/* Glassmorphic Loading Spinner Overlay */}
      {loading && data.length > 0 && (
        <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 z-20 flex items-center justify-center backdrop-blur-[1.5px] transition-all duration-300">
          <Loader size="lg" text="Memperbarui data..." className="text-indigo-600 dark:text-indigo-400 font-bold" />
        </div>
      )}
      
      {(headerTitle || headerActions) && (
        <div className={cn("table-header flex items-center justify-between border-b border-gray-50 dark:border-gray-800/50 bg-white dark:bg-slate-900", compact ? "px-4 py-3" : "px-8 py-5")}>
          <div className="flex items-center gap-2">
             <div className="w-1 h-4 rounded-full bg-indigo-500/50" />
             <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">{headerTitle}</div>
          </div>
          <div className="flex items-center gap-2">
            {headerActions}
          </div>
        </div>
      )}
      {(toolbarLeft || toolbarRight) && (
        <div className={cn("table-toolbar border-b border-gray-50 dark:border-gray-800/50 bg-gray-50/30 dark:bg-slate-950/30 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-3", compact ? "px-4 py-2" : "px-4 sm:px-8 py-3 sm:py-4")}>
          <div className="flex items-center gap-3 w-full sm:w-auto flex-1 min-w-0">
            {toolbarLeft}
          </div>
          <div className="flex items-center gap-2 justify-start sm:justify-end w-full sm:w-auto shrink-0">
            {toolbarRight}
          </div>
        </div>
      )}
      <div className={cn("overflow-x-auto", data.length > 0 && data.length <= 2 && "min-h-[260px]")}>
        {loading && data.length === 0 ? (
          <div className="p-8 space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800/60 rounded-lg"></div>
            ))}
          </div>
        ) : (
          <table className="min-w-full">
          {/* Table Header */}
          <thead className="bg-gray-50 dark:bg-slate-950/60 border-b border-gray-200 dark:border-gray-800">
            <tr>
              {showCheckbox && (
                <th scope="col" className="px-3 py-3 w-10 text-center select-none bg-gray-50 dark:bg-slate-950/60 border-b border-gray-200 dark:border-gray-800">
                  <Checkbox
                    checked={allSelectedOnPage ? true : (isIndeterminate ? 'indeterminate' : false)}
                    onCheckedChange={handleSelectAll}
                    aria-label="Pilih Semua Halaman"
                  />
                </th>
              )}
              {columns.map((column) => {
                const isSorted = internalSortBy === column.key;
                const isAsc = internalSortOrder === 'asc';
                return (
                  <th
                    key={column.key}
                    scope="col"
                    onClick={() => column.sortable && handleSort(column.key)}
                    aria-sort={isSorted ? (isAsc ? 'ascending' : 'descending') : undefined}
                    className={cn(
                      compact ? 'px-3 py-2.5 text-[11px]' : 'px-8 py-4 text-[12px]',
                      'text-left font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors duration-200',
                      column.sortable && 'cursor-pointer select-none hover:bg-gray-100/50 dark:hover:bg-slate-800/50',
                      column.className
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{column.label}</span>
                      {column.sortable && (
                        <span className="shrink-0" aria-hidden="true">
                          {isSorted ? (
                            isAsc ? (
                              <ArrowUp className="w-3 h-3 text-indigo-600 dark:text-indigo-400 animate-in fade-in zoom-in duration-200" strokeWidth={3} />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400 animate-in fade-in zoom-in duration-200" strokeWidth={3} />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300 dark:text-slate-600 hover:text-slate-400 transition-colors" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-100 dark:divide-gray-800/60">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (showCheckbox ? 1 : 0)}
                  className="px-8 py-16 text-center text-slate-500 dark:text-slate-400"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m8 0V4.5" />
                      </svg>
                    </div>
                    {typeof emptyMessage === 'string' ? (
                      <p className="font-bold text-base text-slate-400">{emptyMessage}</p>
                    ) : (
                      emptyMessage
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              sortedData.map((row, rowIndex) => {
                const rowId = getRowId(row, rowIndex);
                const isRowSelected = selectedRowKeys?.has(rowId) || false;

                const handleSelectRow = (checked: boolean) => {
                  if (!onSelectedRowKeysChange || !selectedRowKeys) return;
                  const next = new Set<string>(selectedRowKeys);
                  if (checked) next.add(rowId); else next.delete(rowId);
                  onSelectedRowKeysChange(next);
                };

                return (
                  <tr
                    key={rowId}
                    onClick={() => onRowClick?.(row, rowIndex)}
                    className={cn(
                      'transition-all duration-150 group relative',
                      onRowClick && 'cursor-pointer hover:bg-blue-50/40 dark:hover:bg-indigo-900/10',
                      isRowSelected && 'bg-indigo-50/10 dark:bg-indigo-950/10 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20',
                      striped && rowIndex % 2 === 1 && 'bg-gray-50/60 dark:bg-slate-950/30',
                      rowClassName?.(row, rowIndex)
                    )}
                  >
                    {showCheckbox && (
                      <td className="px-3 py-2 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isRowSelected}
                          onCheckedChange={handleSelectRow}
                          aria-label={`Pilih baris ${rowIndex + 1}`}
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          compact ? 'px-3 py-2 text-[13px]' : 'px-8 py-5 text-sm',
                          'font-medium text-gray-700 dark:text-gray-200 transition-colors',
                          column.className
                        )}
                      >
                        {column.render
                          ? column.render((row as Record<string, unknown>)[column.key], row, rowIndex)
                          : (row as Record<string, unknown>)[column.key] as React.ReactNode || '-'}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        )}
      </div>

      {/* Standardized, Centralized Premium Pagination Footer */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-2 border-t border-gray-100 dark:border-gray-800/60 bg-gray-50/20 dark:bg-slate-950/20">
          <div className="flex items-center gap-4">
            <div className="text-[11px] text-slate-600 dark:text-slate-400 hidden sm:block font-medium">
              Menampilkan <span className="font-bold text-slate-700 dark:text-slate-300">{((pagination.currentPage || 1) - 1) * (pagination.itemsPerPage || 10) + 1}</span> - <span className="font-bold text-slate-700 dark:text-slate-300">{Math.min((pagination.currentPage || 1) * (pagination.itemsPerPage || 10), pagination.totalItems || 0)}</span> dari <span className="font-bold text-slate-700 dark:text-slate-300">{pagination.totalItems || 0}</span>
            </div>

            {pagination.onLimitChange && (
              <div className="flex items-center gap-2">
                <label htmlFor="table-limit-select" className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Limit:</label>
                <select 
                  id="table-limit-select"
                  value={pagination.itemsPerPage}
                  onChange={(e) => pagination.onLimitChange?.(Number(e.target.value))}
                  className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded px-1 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  {[10, 25, 50, 100].map(limit => (
                    <option key={limit} value={limit}>{limit}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-1 border border-gray-200/60 dark:border-gray-800/80 rounded-lg p-0.5 bg-white dark:bg-slate-900 shadow-sm ml-auto">
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1 || loading}
              aria-label="Halaman Sebelumnya"
              className="h-6 px-2 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-md disabled:opacity-40 disabled:hover:bg-transparent transition-all duration-200"
            >
              Prev
            </button>
            <div className="px-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20 py-0.5 rounded-md border border-indigo-100/30" aria-current="page">
              {pagination.currentPage} / {pagination.totalPages}
            </div>
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages || loading}
              aria-label="Halaman Selanjutnya"
              className="h-6 px-2 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-md disabled:opacity-40 disabled:hover:bg-transparent transition-all duration-200"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Table Cell component for custom content
export function TableCell({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={cn('flex items-center', className)}>
      {children}
    </div>
  );
}

// Table Actions component for action buttons
export function TableActions({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {children}
    </div>
  );
}

export default Table;
