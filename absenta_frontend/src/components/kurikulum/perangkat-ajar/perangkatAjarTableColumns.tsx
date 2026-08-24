import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Check, XCircle, Clock, Sparkles, BookOpen, Edit3, Trash2 } from 'lucide-react';
import type { Column } from '@/components/ui/Table';
import type { PerangkatAjar } from '@/api/kurikulum.api';

interface GetPerangkatAjarColumnsParams {
  page: number;
  limit: number;
  JENIS_LABELS: Record<string, string>;
  currentGuru: any;
  isKurikulumOrAdmin: boolean;
  handleOpenStudio: (item: PerangkatAjar) => void;
  handleOpenReader: (item: PerangkatAjar) => void;
  handleOpenWordEditor: (item: PerangkatAjar) => void;
  setSelectedPerangkatId: (id: string) => void;
  setIsReviewModalOpen: (v: boolean) => void;
  handleDelete: (id: string) => void;
}

export const getPerangkatAjarTableColumns = (params: GetPerangkatAjarColumnsParams): Column[] => {
  const {
    page, limit, JENIS_LABELS, currentGuru, isKurikulumOrAdmin,
    handleOpenStudio, handleOpenReader, handleOpenWordEditor,
    setSelectedPerangkatId, setIsReviewModalOpen, handleDelete
  } = params;

  return [
    {
      key: 'no',
      label: 'NO',
      className: 'w-12 text-center text-xs font-bold text-slate-500',
      render: (_: unknown, __: unknown, index: number) => (
        <span className="text-xs font-bold text-slate-500">{(page - 1) * limit + index + 1}</span>
      )
    },
    {
      key: 'judul',
      label: 'DOKUMEN & MAPEL',
      render: (_: unknown, item: PerangkatAjar) => (
        <div className="space-y-1 py-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200/50 text-[10px]">
              {JENIS_LABELS[item.jenis] || item.jenis}
            </Badge>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-xs line-clamp-1">{item.judul}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Mapel: <span className="font-bold text-slate-700 dark:text-slate-300">{item.Mapel?.nama_mapel || '-'}</span> ({item.Mapel?.kode_mapel || '-'})
          </div>
        </div>
      )
    },
    {
      key: 'guru',
      label: 'GURU PENGAJAR',
      render: (_: unknown, item: PerangkatAjar) => (
        <div className="text-xs">
          <div className="font-bold text-slate-800 dark:text-slate-200">{item.Guru?.nama_guru || '-'}</div>
          <div className="text-[10px] text-slate-400 font-medium">NIP. {item.Guru?.nip || '-'}</div>
        </div>
      )
    },
    {
      key: 'periode',
      label: 'PERIODE',
      render: (_: unknown, item: PerangkatAjar) => (
        <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
          {item.TahunPelajaran?.tahun || '-'} ({item.Semester?.nama_semester || '-'})
        </div>
      )
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (_: unknown, item: PerangkatAjar) => (
        <div className="space-y-1">
          {item.status === 'APPROVED' && <Badge className="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 border-emerald-200 text-[10px] font-black"><Check size={11} className="mr-1" /> APPROVED</Badge>}
          {item.status === 'REJECTED' && <Badge className="bg-rose-50 text-rose-600 dark:bg-rose-950/20 border-rose-200 text-[10px] font-black"><XCircle size={11} className="mr-1" /> REJECTED</Badge>}
          {item.status === 'PENDING' && <Badge className="bg-amber-50 text-amber-600 dark:bg-amber-950/20 border-amber-200 text-[10px] font-black"><Clock size={11} className="mr-1" /> PENDING</Badge>}
          {item.catatan_reviewer && (
            <div className="text-[10px] text-slate-400 italic line-clamp-1">"{item.catatan_reviewer}"</div>
          )}
        </div>
      )
    },
    {
      key: 'aksi',
      label: 'AKSI',
      className: 'text-right',
      render: (_: unknown, item: PerangkatAjar) => {
        const isOwner = Boolean(currentGuru && item.Guru?.id === currentGuru.id);
        const canUserDelete = isKurikulumOrAdmin || isOwner;

        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              type="button"
              onClick={() => handleOpenStudio(item)}
              size="sm"
              className="text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-2.5 py-1 h-8 flex items-center gap-1 shadow-sm shadow-indigo-500/20 cursor-pointer"
              title="Buka Studio Penyusunan Modul Ajar (Per-Pertemuan)"
            >
              <Sparkles size={13} />
              <span>Susun</span>
            </Button>

            <Button
              type="button"
              onClick={() => handleOpenReader(item)}
              size="sm"
              variant="outline"
              className="text-xs font-black border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-800 dark:text-slate-200 rounded-xl px-2.5 py-1 h-8 flex items-center gap-1 cursor-pointer"
              title="Buka Mode Baca Digital & Panduan KBM"
            >
              <BookOpen size={13} />
              <span>Baca</span>
            </Button>

            <Button
              type="button"
              onClick={() => handleOpenWordEditor(item)}
              variant="outline"
              size="sm"
              className="text-xs font-bold text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 px-2.5 py-1 h-8 flex items-center gap-1 shadow-sm"
              title="Sunting Dokumen via Word Editor"
            >
              <Edit3 size={13} />
              Edit
            </Button>

            {isKurikulumOrAdmin && (
              <Button
                type="button"
                onClick={() => {
                  setSelectedPerangkatId(item.id);
                  setIsReviewModalOpen(true);
                }}
                variant="outline"
                size="sm"
                className="text-xs font-bold border-slate-200 dark:border-slate-800 px-2 py-1 h-8"
              >
                Verifikasi
              </Button>
            )}

            {canUserDelete && (
              <Button
                type="button"
                onClick={() => handleDelete(item.id)}
                variant="ghost"
                size="sm"
                className="text-xs font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 p-1.5 h-8 w-8"
                title="Hapus Dokumen"
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        );
      }
    }
  ];
};
