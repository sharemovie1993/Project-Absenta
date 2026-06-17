import React from 'react';
import { ArrowUpDown, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T, index: number) => React.ReactNode);
  className?: string;
  sortable?: boolean;
  sortKey?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  isLoading?: boolean;
  emptyMessage?: string;
  
  // Sorting
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  
  // Pagination
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  limit?: number;
  onLimitChange?: (limit: number) => void;
  
  // Toolbar slots
  toolbarLeft?: React.ReactNode;
  toolbarRight?: React.ReactNode;
}

export const Table = <T extends Record<string, any>>({ 
  data, 
  columns, 
  keyField,
  isLoading = false,
  emptyMessage = 'Tidak ada data.',
  sortKey,
  sortDirection,
  onSort,
  currentPage,
  totalPages,
  onPageChange,
  limit,
  onLimitChange,
  toolbarLeft,
  toolbarRight
}: TableProps<T>) => {
  const handleSortClick = (col: Column<T>) => {
    if (!col.sortable || !onSort) return;
    const key = col.sortKey || String(col.accessor);
    onSort(key);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden space-y-4">
      {/* Toolbar Slot Header */}
      {(toolbarLeft || toolbarRight) && (
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/50">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {toolbarLeft}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {toolbarRight}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="w-full py-12 text-center text-gray-500 flex flex-col items-center justify-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-sm font-medium">Memuat data...</span>
        </div>
      ) : data.length === 0 ? (
        <div className="w-full py-12 text-center text-gray-500 bg-white rounded-lg border border-dashed border-gray-300 mx-6 my-4">
          {emptyMessage}
        </div>
      ) : (
        <>
          <div className={`overflow-x-auto ${data.length > 0 && data.length <= 2 ? 'min-h-[260px]' : ''}`}>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((col, index) => {
                    const isSortable = col.sortable && onSort;
                    const colKey = col.sortKey || String(col.accessor);
                    const isSorted = sortKey === colKey;
                    
                    return (
                      <th
                        key={index}
                        scope="col"
                        onClick={() => isSortable && handleSortClick(col)}
                        className={`px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                          isSortable ? 'cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900 transition-colors' : ''
                        } ${col.className || ''}`}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{col.header}</span>
                          {isSortable && (
                            <span className="text-gray-400">
                              {isSorted ? (
                                sortDirection === 'asc' ? <ChevronUp size={14} className="text-blue-600 font-bold" /> : <ChevronDown size={14} className="text-blue-600 font-bold" />
                              ) : (
                                <ArrowUpDown size={12} className="opacity-60 hover:opacity-100" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row, rowIndex) => (
                  <tr key={String(row[keyField])} className="hover:bg-gray-50 transition-colors">
                    {columns.map((col, colIndex) => (
                      <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {typeof col.accessor === 'function' ? col.accessor(row, rowIndex) : row[col.accessor]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {currentPage !== undefined && totalPages !== undefined && onPageChange && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Tampilkan</span>
                {limit !== undefined && onLimitChange ? (
                  <select
                    value={limit}
                    aria-label="Jumlah item per halaman"
                    onChange={(e) => onLimitChange(Number(e.target.value))}
                    className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {[10, 20, 50, 100].map((val) => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                ) : (
                  <span className="font-semibold">{data.length}</span>
                )}
                <span>item</span>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4">
                <span className="text-sm text-gray-600">
                  Halaman <span className="font-semibold">{currentPage}</span> dari <span className="font-semibold">{totalPages}</span>
                </span>
                
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    aria-label="Halaman sebelumnya"
                    className="p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    aria-label="Halaman berikutnya"
                    className="p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

