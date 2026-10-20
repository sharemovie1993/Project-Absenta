import React, { memo, useState, useMemo } from 'react';
import { Maximize2, Minimize2, Loader2, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SpreadsheetGridTableProps, SpreadsheetColumn } from './types';

export function SpreadsheetGridTable<T>({
  data,
  columns,
  columnGroups,
  rowKey,
  isLoading = false,
  emptyMessage = 'Tidak ada data untuk ditampilkan.',
  density = 'compact',
  enableFullscreen = true,
  autoHeight = true,
  maxContainerHeight,
  className,
  headerTitle,
  headerActions,
  footerActions,
}: SpreadsheetGridTableProps<T>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Deteksi indeks kolom freeze terakhir untuk memberikan bayangan pemisah (shadow border)
  const lastFreezeLeftIndex = useMemo(() => {
    let lastIdx = -1;
    columns.forEach((col, idx) => {
      if (col.freeze === 'left') {
        lastIdx = idx;
      }
    });
    return lastIdx;
  }, [columns]);

  // Petakan grup kolom jika didefinisikan
  const hasGroups = Boolean(columnGroups && columnGroups.length > 0);

  const paddingCell = density === 'compact' ? 'py-0.5 px-1' : 'py-2 px-2.5';

  // Support ESC key to exit fullscreen
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

  return (
    <div
      className={cn(
        'w-full flex flex-col transition-all duration-200',
        isFullscreen
          ? 'fixed inset-0 z-50 bg-white dark:bg-slate-950 p-4 sm:p-6 overflow-hidden flex flex-col shadow-2xl'
          : 'relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden',
        className
      )}
    >
      {/* Spreadsheet Control Header Bar */}
      {(headerTitle || headerActions || enableFullscreen) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            {headerTitle && (
              <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                {headerTitle}
              </div>
            )}
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {data.length} Baris
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {headerActions}

            {enableFullscreen && (
              <button
                type="button"
                onClick={() => setIsFullscreen((prev) => !prev)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                title={isFullscreen ? 'Keluar Mode Layar Penuh (Esc)' : 'Mode Layar Penuh Spreadsheet'}
                aria-label={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Spreadsheet Scrollable Table Body */}
      <div
        className={cn(
          'w-full overflow-x-auto max-w-full',
          isFullscreen
            ? 'flex-1 overflow-y-auto min-h-0'
            : autoHeight
            ? 'overflow-y-visible'
            : 'flex-1 overflow-y-auto'
        )}
        style={{
          maxHeight: isFullscreen
            ? 'calc(100vh - 120px)'
            : !autoHeight && maxContainerHeight
            ? maxContainerHeight
            : undefined,
        }}
      >
        <table className="w-full text-left text-xs border-collapse">
          {/* Header Rows */}
          <thead className="sticky top-0 z-30 font-bold border-b border-slate-200 dark:border-slate-800">
            {/* Row 1: Groups (if any) */}
            {hasGroups && (
              <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                {columnGroups!.map((group) => (
                  <th
                    key={group.key}
                    colSpan={group.colSpan || 1}
                    className={cn(
                      'p-2 text-center text-[10px] font-extrabold uppercase tracking-wider border-r border-slate-200 dark:border-slate-700/80',
                      group.className
                    )}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{group.title}</span>
                      {group.badge && (
                        <span
                          className={cn(
                            'text-[9px] px-1.5 py-0.2 rounded font-mono',
                            group.badgeClassName || 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          )}
                        >
                          {group.badge}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            )}

            {/* Row 2: Individual Column Headers */}
            <tr className="bg-slate-50 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200">
              {columns.map((col, idx) => {
                const isFreezeLeft = col.freeze === 'left';
                const isLastFreeze = idx === lastFreezeLeftIndex;

                return (
                  <th
                    key={col.key}
                    style={{
                      width: col.width,
                      minWidth: col.minWidth,
                      maxWidth: col.maxWidth,
                      left: isFreezeLeft && col.freezeOffset !== undefined ? `${col.freezeOffset}px` : undefined,
                    }}
                    className={cn(
                      'py-2 px-2 text-[11px] font-bold border-b border-slate-200 dark:border-slate-700 select-none whitespace-nowrap',
                      col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left',
                      isFreezeLeft && 'sticky z-40 bg-slate-50 dark:bg-slate-850',
                      isLastFreeze &&
                        'border-r-2 border-slate-300 dark:border-slate-700 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)]',
                      col.headerClassName
                    )}
                  >
                    <div>{col.header}</div>
                    {col.subHeader && (
                      <div className="text-[9px] font-normal text-slate-400 dark:text-slate-500 uppercase tracking-tight">
                        {col.subHeader}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Data Rows */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-20 text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    <span className="text-xs">Memuat data lembar penilaian...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-20 text-slate-400 text-xs italic">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, rowIndex) => {
                const key = rowKey(item, rowIndex);
                return (
                  <tr
                    key={key}
                    className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors group"
                  >
                    {columns.map((col, colIndex) => {
                      const isFreezeLeft = col.freeze === 'left';
                      const isLastFreeze = colIndex === lastFreezeLeftIndex;

                      return (
                        <td
                          key={`${key}-${col.key}`}
                          style={{
                            width: col.width,
                            minWidth: col.minWidth,
                            maxWidth: col.maxWidth,
                            left: isFreezeLeft && col.freezeOffset !== undefined ? `${col.freezeOffset}px` : undefined,
                          }}
                          className={cn(
                            paddingCell,
                            'transition-colors align-middle',
                            col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left',
                            isFreezeLeft && 'sticky z-20 bg-white dark:bg-slate-900 group-hover:bg-indigo-50/50 dark:group-hover:bg-slate-850',
                            isLastFreeze &&
                              'border-r-2 border-slate-300 dark:border-slate-700 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)]',
                            col.className
                          )}
                        >
                          {col.renderCell(item, rowIndex, colIndex)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Spreadsheet Footer Actions */}
      {footerActions && (
        <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between">
          {footerActions}
        </div>
      )}
    </div>
  );
}

SpreadsheetGridTable.displayName = 'SpreadsheetGridTable';
