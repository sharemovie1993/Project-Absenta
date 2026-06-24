import React from 'react';
import { RefreshCw, Plus } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

interface MobileAcademicListProps<T> {
  title: string;
  data: T[];
  loading: boolean;
  onRefresh: () => void;
  onAdd?: () => void;
  canManage?: boolean;
  totalItems: number;
  renderCard: (item: T) => React.ReactNode;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  emptyMessage?: string;
  className?: string;
}

export const MobileAcademicList = React.memo(function MobileAcademicList<T>({
  title,
  data,
  loading,
  onRefresh,
  onAdd,
  canManage = false,
  totalItems,
  renderCard,
  pagination,
  emptyMessage = "Tidak ada data ditemukan",
  className
}: MobileAcademicListProps<T>) {
  // Progressive rendering to prevent main thread blocking (TBT optimization)
  const [visibleCount, setVisibleCount] = React.useState(10);

  React.useEffect(() => {
    setVisibleCount(10); // Reset when data changes
    if ((data || []).length > 10) {
      const timer = setTimeout(() => {
        setVisibleCount((data || []).length);
      }, 300); // Wait 300ms before rendering the rest to allow LCP/FCP to fire
      return () => clearTimeout(timer);
    }
  }, [data]);

  return (
    <div className={cn("md:hidden flex flex-col p-4 gap-4", className)}>
      {/* Mobile Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
          {title} ({totalItems})
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            aria-label={`Refresh Data ${title}`}
            className="h-11 w-11 p-0 rounded-full bg-slate-100 dark:bg-slate-800"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} aria-hidden="true" />
          </Button>
          {canManage && onAdd && (
            <Button
              size="sm"
              onClick={onAdd}
              aria-label={`Tambah ${title}`}
              className="h-11 px-5 rounded-full bg-blue-600 text-white font-bold text-[11px] uppercase tracking-wider shadow-md active:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
              Tambah
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4 rounded-lg" />
                  <Skeleton className="h-3 w-1/2 rounded-md" />
                </div>
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
              <div className="pt-3 border-t border-slate-50 dark:border-slate-800/50 flex justify-between items-center">
                <div className="flex gap-3">
                   <div className="space-y-1">
                     <Skeleton className="h-2 w-8 rounded" />
                     <Skeleton className="h-3 w-16 rounded" />
                   </div>
                   <div className="space-y-1">
                     <Skeleton className="h-2 w-8 rounded" />
                     <Skeleton className="h-3 w-24 rounded" />
                   </div>
                </div>
                <Skeleton className="h-9 w-24 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : (data || []).length === 0 ? (
        <div className="py-12 text-center text-slate-600 dark:text-slate-400 font-medium italic text-sm">
          {emptyMessage}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(data || []).slice(0, visibleCount).map((item, index) => (
            <React.Fragment key={index}>
              {renderCard(item)}
            </React.Fragment>
          ))}
          {(data || []).length > visibleCount && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-400" />
            </div>
          )}

          {/* Mobile Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pb-12">
              <Button
                variant="ghost"
                disabled={pagination.currentPage === 1}
                onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                aria-label="Halaman Sebelumnya"
                className="text-[11px] font-black uppercase tracking-widest h-11 px-5 rounded-xl disabled:opacity-30 bg-slate-50 dark:bg-slate-900"
              >
                Sebelumnya
              </Button>
              <span className="text-xs font-black text-slate-700 bg-white dark:bg-slate-950 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800">
                {pagination.currentPage} / {pagination.totalPages}
              </span>
              <Button
                variant="ghost"
                disabled={pagination.currentPage === pagination.totalPages}
                onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                aria-label="Halaman Berikutnya"
                className="text-[11px] font-black uppercase tracking-widest h-11 px-5 rounded-xl disabled:opacity-30 bg-slate-50 dark:bg-slate-900"
              >
                Berikutnya
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}) as <T>(props: MobileAcademicListProps<T>) => React.ReactElement;

(MobileAcademicList as any).displayName = 'MobileAcademicList';
