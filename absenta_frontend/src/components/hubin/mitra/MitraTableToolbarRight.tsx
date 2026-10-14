import React from 'react';
import { Plus, RefreshCw, FileSpreadsheet, Trash2, X } from 'lucide-react';
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
  if (selectedCount > 0) {
    return (
      <div className="flex flex-wrap items-center gap-2 animate-in fade-in duration-200">
        <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 shrink-0">
          {selectedCount} Terpilih
        </span>
        <Button
          type="button"
          onClick={onBulkExport}
          variant="toolbarOutline"
          size="toolbar"
          className="h-9 px-3 rounded-xl flex items-center gap-1.5 font-bold text-xs text-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 hover:bg-emerald-100"
          title="Ekspor Mitra Terpilih ke Excel"
        >
          <FileSpreadsheet size={15} />
          <span>Ekspor</span>
        </Button>
        {isHubin && (
          <Button
            type="button"
            onClick={onBulkDelete}
            variant="toolbarDanger"
            size="toolbar"
            disabled={isDeleting}
            className="h-9 px-3.5 rounded-xl flex items-center gap-1.5 font-bold text-xs shadow-xs"
            title="Hapus Mitra Terpilih"
          >
            <Trash2 size={15} />
            <span>Hapus ({selectedCount})</span>
          </Button>
        )}
        <Button
          type="button"
          onClick={onClearSelection}
          variant="ghost"
          size="toolbarIcon"
          className="h-9 w-9 text-slate-400 hover:text-slate-600 rounded-xl"
          title="Batal Pilihan"
        >
          <X size={15} />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
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
    </div>
  );
};
