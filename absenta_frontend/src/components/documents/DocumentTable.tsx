import React, { useMemo } from 'react';
import { Download, History, Pencil, Plus, Trash2 } from 'lucide-react';
import { 
  Badge, 
  Button, 
  Table, 
  TableActions, 
  Checkbox 
} from '@/components/ui';
import { formatDateTime } from '@/utils/layoutUtils';
import { type DocumentItem, type DocumentCategory } from '@/api/documents.api';

const BASE_CATEGORY_OPTIONS = [
  { value: 'ALL', label: 'Semua Dokumen' },
  { value: 'ADMINISTRATIVE', label: 'Administrasi' },
  { value: 'LEGAL', label: 'Legal' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'OTHER', label: 'Lainnya' },
];

function formatBytes(bytes: number): string {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return '-';
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = n / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}

interface DocumentTableProps {
  documents: DocumentItem[];
  selectedIds: Set<string>;
  allVisibleSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onDownload: (doc: DocumentItem) => void;
  onVersionHistory: (doc: DocumentItem) => void;
  onEditMetadata: (doc: DocumentItem) => void;
  onVersionUpload: (doc: DocumentItem) => void;
  onDelete: (doc: DocumentItem) => void;
  canUpload: boolean;
  canDelete: boolean;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  selectedIds,
  allVisibleSelected,
  onSelectAll,
  onSelectOne,
  onDownload,
  onVersionHistory,
  onEditMetadata,
  onVersionUpload,
  onDelete,
  canUpload,
  canDelete
}) => {
  const columns = useMemo(
    () => [
      {
        key: 'select',
        label: (
          <Checkbox
            checked={allVisibleSelected}
            onCheckedChange={(checked) => onSelectAll(!!checked)}
            aria-label="Select all"
          />
        ),
        className: 'w-10',
        render: (_: unknown, row: DocumentItem) => (
          <Checkbox
            checked={selectedIds.has(row.id)}
            onCheckedChange={(checked) => onSelectOne(row.id, !!checked)}
            aria-label={`Select ${row.title}`}
          />
        ),
      },
      {
        key: 'title',
        label: 'Dokumen',
        render: (_: unknown, row: DocumentItem) => (
          <div className="min-w-0">
            <div className="font-medium truncate text-slate-900 dark:text-slate-100">{row.title}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono">
              {row.file_original_name} (v{row.current_version || 1})
            </div>
            {row.description ? (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{row.description}</div>
            ) : null}
          </div>
        ),
      },
      {
        key: 'category',
        label: 'Kategori',
        className: 'w-40',
        render: (value: DocumentCategory) => {
          const label = BASE_CATEGORY_OPTIONS.find((o) => o.value === value)?.label || value;
          return <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">{label}</Badge>;
        },
      },
      {
        key: 'size_bytes',
        label: 'Ukuran',
        className: 'w-28',
        render: (value: number) => <span className="text-xs font-mono">{formatBytes(value)}</span>,
      },
      {
        key: 'created_at',
        label: 'Dibuat',
        className: 'w-48',
        render: (value: string) => <span className="text-xs">{formatDateTime(value)}</span>,
      },
      {
        key: 'actions',
        label: 'Aksi',
        className: 'w-44',
        render: (_: unknown, row: DocumentItem) => (
          <TableActions>
            <Button size="sm" variant="outline" onClick={() => onDownload(row)} title="Unduh" className="h-8 w-8 p-0">
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => onVersionHistory(row)} title="Version history" className="h-8 w-8 p-0">
              <History className="w-3.5 h-3.5" />
            </Button>
            {canUpload ? (
              <>
                <Button size="sm" variant="outline" onClick={() => onEditMetadata(row)} title="Edit metadata" className="h-8 w-8 p-0">
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => onVersionUpload(row)} title="Upload versi" className="h-8 w-8 p-0">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </>
            ) : null}
            {canDelete ? (
              <Button size="sm" variant="danger" onClick={() => onDelete(row)} title="Hapus" className="h-8 w-8 p-0">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            ) : null}
          </TableActions>
        ),
      },
    ],
    [
      canDelete,
      canUpload,
      onDelete,
      onDownload,
      onEditMetadata,
      onVersionHistory,
      onVersionUpload,
      allVisibleSelected,
      onSelectAll,
      onSelectOne,
      selectedIds,
    ]
  );

  return <Table columns={columns} data={documents} emptyMessage="Tidak ada dokumen" />;
};
