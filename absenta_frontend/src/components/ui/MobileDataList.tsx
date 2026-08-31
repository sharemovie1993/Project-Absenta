import React from 'react';
import { RefreshCw, Plus } from 'lucide-react';
import { Button } from './Button';
import { Skeleton } from './Skeleton';
import Badge from './Badge';
import { CleanDeckCard } from './CleanDeckCard';
import { cn } from '@/lib/utils';

export interface MobileDataListProps<T> {
  title?: string;
  data: T[];
  loading?: boolean;
  onRefresh?: () => void;
  onAdd?: () => void;
  canManage?: boolean;
  totalItems?: number;
  renderCard?: (item: T, index: number) => React.ReactNode;
  onView?: (item: T) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems?: number;
    itemsPerPage?: number;
    onLimitChange?: (limit: number) => void;
    onItemsPerPageChange?: (limit: number) => void;
    pageSizeOptions?: number[];
  };
  emptyMessage?: React.ReactNode;
  toolbar?: React.ReactNode;
  className?: string;
}

export function MobileDataList<T>({
  title,
  data = [],
  loading = false,
  onRefresh,
  onAdd,
  canManage = false,
  totalItems,
  renderCard,
  pagination,
  emptyMessage = "Tidak ada data ditemukan",
  toolbar,
  className
}: MobileDataListProps<T>) {
  // Progressive rendering to prevent mobile main-thread blocking (TBT 0ms optimization)
  const [visibleCount, setVisibleCount] = React.useState(15);

  React.useEffect(() => {
    setVisibleCount(15);
    if ((data || []).length > 15) {
      const timer = setTimeout(() => {
        setVisibleCount((data || []).length);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [data]);

  return (
    <div className={cn("flex flex-col gap-3.5 w-full", className)}>
      {/* Mobile Toolbar Header */}
      {(title || onRefresh || (canManage && onAdd)) && (
        <div className="flex items-center justify-between gap-2 px-1">
          {title && (
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
              {title} {typeof totalItems === 'number' ? `(${totalItems})` : ''}
            </h2>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                aria-label={`Refresh Data ${title || ''}`}
                className="h-9 w-9 p-0 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-95 transition-transform"
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} aria-hidden="true" />
              </Button>
            )}
            {canManage && onAdd && (
              <Button
                size="sm"
                onClick={onAdd}
                aria-label={`Tambah ${title || ''}`}
                className="h-9 px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shadow-sm active:scale-95 transition-transform"
              >
                <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
                Tambah
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Optional Top Search/Filters Toolbar Slot */}
      {toolbar && (
        <div className="w-full">
          {toolbar}
        </div>
      )}

      {/* Content Rendering: Loading / Empty / Cards List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div 
              key={i} 
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3.5 animate-pulse"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1 mr-4">
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <Skeleton className="h-3 w-1/2 rounded-md" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="flex gap-4">
                   <div className="space-y-1">
                     <Skeleton className="h-2 w-10 rounded" />
                     <Skeleton className="h-3.5 w-16 rounded" />
                   </div>
                   <div className="space-y-1">
                     <Skeleton className="h-2 w-10 rounded" />
                     <Skeleton className="h-3.5 w-20 rounded" />
                   </div>
                </div>
                <Skeleton className="h-8 w-20 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : (data || []).length === 0 ? (
        <div className="py-8 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
          {typeof emptyMessage === 'string' ? (
            <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">{emptyMessage}</p>
          ) : (
            emptyMessage
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {(data || []).slice(0, visibleCount).map((item, index) => {
            if (renderCard) {
              return (
                <React.Fragment key={index}>
                  {renderCard(item, index)}
                </React.Fragment>
              );
            }

            const itemObj = (item || {}) as Record<string, any>;
            const title = itemObj.nama || itemObj.nama_siswa || itemObj.nama_guru || itemObj.nama_kelas || itemObj.title || itemObj.judul || itemObj.name || `Item #${index + 1}`;
            const subtitle = itemObj.nis || itemObj.nip || itemObj.kode || itemObj.tingkat || itemObj.kelas || itemObj.keterangan || itemObj.description || itemObj.email || itemObj.category;
            const badge = itemObj.status ? <Badge>{String(itemObj.status)}</Badge> : undefined;

            return (
              <CleanDeckCard
                key={index}
                title={title}
                subtitle={subtitle}
                badge={badge}
                onClick={onView ? () => onView(item) : undefined}
                onDetail={onView ? () => onView(item) : undefined}
              />
            );
          })}
          
          {(data || []).length > visibleCount && (
            <div className="flex justify-center py-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
            </div>
          )}

          {/* Mobile Pagination Controls & Limit Selector */}
          {pagination && (
            <div className="flex flex-col gap-3 pt-4 pb-6 border-t border-slate-100 dark:border-slate-800">
              {/* Row 1: Total items & Page Size / Limit Selector */}
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="font-bold text-slate-500 dark:text-slate-400">
                  Total: {typeof (pagination.totalItems ?? totalItems) === 'number' ? `${pagination.totalItems ?? totalItems} Data` : `${data.length} Data`}
                </span>

                {(pagination.onLimitChange || pagination.onItemsPerPageChange) && (
                  <div className="flex items-center gap-2">
                    <label htmlFor="mobile-page-limit" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Baris:
                    </label>
                    <select
                      id="mobile-page-limit"
                      aria-label="Atur batas data per halaman"
                      value={pagination.itemsPerPage || 10}
                      onChange={(e) => {
                        const newLimit = Number(e.target.value);
                        pagination.onLimitChange?.(newLimit);
                        pagination.onItemsPerPageChange?.(newLimit);
                      }}
                      className="h-8 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {(pagination.pageSizeOptions || [10, 25, 50, 100]).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt} / hal
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Row 2: Prev / Page Indicator / Next */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    disabled={pagination.currentPage <= 1}
                    onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                    aria-label="Halaman Sebelumnya"
                    className="text-[11px] font-black uppercase tracking-wider h-9 px-3.5 rounded-xl disabled:opacity-30 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    Sebelumnya
                  </Button>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-2xs font-mono">
                    {pagination.currentPage} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    disabled={pagination.currentPage >= pagination.totalPages}
                    onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                    aria-label="Halaman Berikutnya"
                    className="text-[11px] font-black uppercase tracking-wider h-9 px-3.5 rounded-xl disabled:opacity-30 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    Berikutnya
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MobileDataList;
