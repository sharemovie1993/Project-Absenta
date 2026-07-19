import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, Loader2 } from 'lucide-react';

export interface TabularColumn<T> {
  key: string;
  label: string;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: T, index: number) => React.ReactNode;
}

interface TabularProps<T> {
  columns: TabularColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  rowKey?: (row: T, index: number) => string | number;
  className?: string;
}

export function TabularInner<T>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Tidak ada data ditemukan',
  rowKey,
  className,
}: TabularProps<T>) {
  const getRowKey = (row: T, index: number): string | number => {
    if (rowKey) return rowKey(row, index);
    const r = row as Record<string, any>;
    return r.id || r.key || index;
  };

  const getAlignClass = (align?: 'left' | 'right' | 'center') => {
    if (align === 'right') return 'text-right';
    if (align === 'center') return 'text-center';
    return 'text-left';
  };

  const getAlignHeaderClass = (align?: 'left' | 'right' | 'center') => {
    if (align === 'right') return 'justify-end text-right';
    if (align === 'center') return 'justify-center text-center';
    return 'justify-start text-left';
  };

  return (
    <div className={cn('overflow-x-auto w-full relative', className)}>
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-sm gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span>Memuat data...</span>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-sm gap-2">
          <AlertCircle className="w-8 h-8 text-slate-300" />
          <span>{emptyMessage}</span>
        </div>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-6 py-3.5 font-semibold text-slate-600 dark:text-slate-400',
                    getAlignClass(col.align),
                    col.headerClassName
                  )}
                >
                  <div className={cn('flex items-center gap-1.5', getAlignHeaderClass(col.align))}>
                    <span>{col.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.map((row, index) => (
              <tr
                key={getRowKey(row, index)}
                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-6 py-4 text-slate-700 dark:text-slate-300',
                      getAlignClass(col.align),
                      col.className
                    )}
                  >
                    {col.render
                      ? col.render(row, index)
                      : String((row as Record<string, any>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export const Tabular = React.memo(TabularInner) as <T>(props: TabularProps<T>) => React.ReactElement;
export default Tabular;
