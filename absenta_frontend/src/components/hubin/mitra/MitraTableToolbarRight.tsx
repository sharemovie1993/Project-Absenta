import React from 'react';
import { Plus, RefreshCw, FileSpreadsheet, Trash2, Download, X } from 'lucide-react';
import { Button } from '@/components/ui';

export interface MitraTableToolbarRightProps {
  selectedCount: number;
  isHubin: boolean;
  isLoading: boolean;
  isExporting: boolean;
  isDeleting: boolean;
  onRefresh: () => void;
  onBulkExport: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  onOpenImport: () => void;
  onOpenCreate: () => void;
}

export const MitraTableToolbarRight: React.FC<MitraTableToolbarRightProps> = ({
  selectedCount,
  isHubin,
  isLoading,
  isExporting,
  isDeleting,
  onRefresh,
  onBulkExport,
  onBulkDelete,
  onClearSelection,
  onOpenImport,
  onOpenCreate,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="toolbarOutline"
        size="toolbarIcon"
        onClick={onRefresh}
        disabled={isLoading}
        className="rounded-xl h-9 w-9"
        title="Muat Ulang Data"
      >
        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
      </Button>

      {isHubin && (
        <>
          <Button
            type="button"
            onClick={onOpenImport}
            variant="toolbarOutline"
            size="toolbar"
            disabled={isExporting}
            className="h-9 px-3 rounded-xl flex items-center gap-1.5 font-bold text-xs text-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/40 hover:bg-emerald-100/80"
            title="Import Mitra Industri dari Excel"
          >
            <FileSpreadsheet size={15} className="text-emerald-600 dark:text-emerald-400" />
            <span>Import Excel</span>
          </Button>

          <Button
            type="button"
            onClick={onOpenCreate}
            variant="toolbarPrimary"
            size="toolbar"
            className="h-9 px-4 rounded-xl flex items-center gap-1.5"
            title="Tambah Mitra Baru"
          >
            <Plus size={16} />
            Tambah Mitra
          </Button>
        </>
      )}

      {/* Bulk actions — persis seperti di halaman SiswaList */}
      {selectedCount > 0 && (
        <>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

          {isHubin && (
            <Button
              type="button"
              variant="toolbarDanger"
              size="toolbar"
              onClick={onBulkDelete}
              disabled={isDeleting}
              className="h-9 px-3.5 rounded-xl flex items-center gap-1.5 font-bold text-xs shadow-xs"
              title="Hapus Mitra Terpilih"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Hapus ({selectedCount})
            </Button>
          )}

          <Button
            type="button"
            variant="toolbarOutline"
            size="toolbar"
            onClick={onBulkExport}
            className="h-9 px-3 rounded-xl flex items-center gap-1.5 font-bold text-xs text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/30 rounded-xl"
            title="Ekspor Mitra Terpilih ke Excel"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Ekspor ({selectedCount})
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="toolbarIcon"
            onClick={onClearSelection}
            className="h-9 w-9 text-slate-400 hover:text-slate-600 rounded-xl"
            title="Batal Pilihan"
          >
            <X size={15} />
          </Button>
        </>
      )}
    </div>
  );
};
