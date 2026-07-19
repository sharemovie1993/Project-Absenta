import React, { useCallback } from 'react';
import { FileText, Image as ImageIcon, Trash2, User } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { formatBytes, KATEGORI_LABELS } from '../../api/memberDocs.api';
import type { MemberDoc, MemberDocKategori } from '../../api/memberDocs.api';

// ─── Props ────────────────────────────────────────────────────────────────────

interface MemberDocsListProps {
  docs: MemberDoc[];
  loading: boolean;
  selectedDocId: string | null;
  onSelect: (doc: MemberDoc) => void;
  onDelete: (doc: MemberDoc) => void;
  canDelete: boolean;
  entityNameMap?: Record<string, string>; // entity_id → nama
}

// ─── File icon helper ─────────────────────────────────────────────────────────

const FileIcon: React.FC<{ mimeType: string; className?: string }> = ({ mimeType, className }) => {
  if (mimeType.startsWith('image/')) return <ImageIcon className={className} />;
  return <FileText className={className} />;
};

// ─── Kategori badge color ─────────────────────────────────────────────────────

function kategoriColor(kategori: string): string {
  switch (kategori) {
    case 'KK':         return 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400';
    case 'IJAZAH_SMP':
    case 'IJAZAH_SD':  return 'bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:text-violet-400';
    case 'AKTA':       return 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400';
    case 'SKHUN':      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400';
    case 'FOTO':       return 'bg-pink-50 text-pink-700 dark:bg-pink-950/20 dark:text-pink-400';
    case 'SERTIFIKAT':
    case 'SK':         return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400';
    default:           return 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  }
}

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
    <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
      <FileText size={24} className="text-slate-200 dark:text-slate-700" />
    </div>
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Belum ada berkas</p>
    <p className="text-xs text-gray-400 max-w-[200px]">Upload berkas pertama dengan tombol "+ Upload Berkas" di atas.</p>
  </div>
);

// ─── Skeleton rows ────────────────────────────────────────────────────────────

const SkeletonRows: React.FC = () => (
  <>
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="flex items-center gap-3 p-3 border-b border-slate-50 dark:border-slate-800/50">
        <Skeleton className="w-9 h-9 rounded-xl" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-3/4 rounded" />
          <Skeleton className="h-2.5 w-1/2 rounded" />
        </div>
        <Skeleton className="h-5 w-16 rounded-lg" />
      </div>
    ))}
  </>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const MemberDocsList: React.FC<MemberDocsListProps> = ({
  docs, loading, selectedDocId, onSelect, onDelete, canDelete, entityNameMap = {},
}) => {
  const handleDeleteClick = useCallback((e: React.MouseEvent, doc: MemberDoc) => {
    e.stopPropagation();
    onDelete(doc);
  }, [onDelete]);

  if (loading) return <SkeletonRows />;
  if (docs.length === 0) return <EmptyState />;

  return (
    <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
      {docs?.map(doc => {
        const isSelected = selectedDocId === doc.id;
        const kategoriLabel = KATEGORI_LABELS[doc.kategori as MemberDocKategori] ?? doc.kategori;
        const entityName = entityNameMap[doc.siswa_id ?? doc.guru_id ?? ''];

        return (
          <div
            key={doc.id}
            onClick={() => onSelect(doc)}
            className={cn(
              'flex items-center gap-3 p-3 cursor-pointer transition-all duration-150 group',
              isSelected
                ? 'bg-indigo-50/50 dark:bg-indigo-950/20'
                : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/30',
            )}
          >
            {/* File icon */}
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
              isSelected
                ? 'bg-indigo-100 dark:bg-indigo-950/40'
                : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/20',
            )}>
              <FileIcon
                mimeType={doc.mime_type}
                className={cn('w-4 h-4', isSelected ? 'text-indigo-600' : 'text-slate-500 group-hover:text-indigo-500')}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-xs font-bold truncate',
                isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200',
              )}>
                {doc.judul}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {entityName && (
                  <span className="flex items-center gap-0.5 text-[9px] text-gray-400 font-bold uppercase">
                    <User size={8} /> {entityName}
                  </span>
                )}
                <span className="text-[9px] text-gray-400 font-bold uppercase">
                  {formatBytes(doc.size_bytes)}
                </span>
                <span className="text-[9px] text-gray-400">
                  {new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>

            {/* Right: kategori badge + delete */}
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={cn('text-[9px] font-black border-none px-1.5 py-0.5 rounded-lg uppercase hidden sm:block', kategoriColor(doc.kategori))}>
                {kategoriLabel.split(' ')[0]}
              </Badge>
              {canDelete && (
                <button
                  onClick={(e) => handleDeleteClick(e, doc)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all opacity-0 group-hover:opacity-100"
                  title="Hapus berkas"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MemberDocsList;
