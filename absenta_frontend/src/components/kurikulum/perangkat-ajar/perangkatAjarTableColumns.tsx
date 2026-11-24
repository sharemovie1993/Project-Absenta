import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Check, XCircle, Clock, Sparkles, BookOpen, Edit3, Trash2, Layers } from 'lucide-react';
import type { Column } from '@/components/ui/Table';
import type { PerangkatAjar } from '@/api/kurikulum.api';

export const JENIS_COLOR_MAP: Record<string, { row: string; badge: string }> = {
  MODUL_AJAR: {
    row: 'bg-indigo-50/30 hover:bg-indigo-50/70 dark:bg-indigo-950/10 dark:hover:bg-indigo-950/25',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800',
  },
  RPP: {
    row: 'bg-blue-50/30 hover:bg-blue-50/70 dark:bg-blue-950/10 dark:hover:bg-blue-950/25',
    badge: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800',
  },
  ATP: {
    row: 'bg-sky-50/40 hover:bg-sky-50/80 dark:bg-sky-950/15 dark:hover:bg-sky-950/30',
    badge: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800',
  },
  SILABUS: {
    row: 'bg-violet-50/30 hover:bg-violet-50/70 dark:bg-violet-950/10 dark:hover:bg-violet-950/25',
    badge: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/70 dark:text-violet-300 dark:border-violet-800',
  },
  PROTA: {
    row: 'bg-emerald-50/30 hover:bg-emerald-50/70 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/25',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800',
  },
  PROMES: {
    row: 'bg-teal-50/30 hover:bg-teal-50/70 dark:bg-teal-950/10 dark:hover:bg-teal-950/25',
    badge: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800',
  },
  MODUL_PROJEK: {
    row: 'bg-amber-50/35 hover:bg-amber-50/75 dark:bg-amber-950/15 dark:hover:bg-amber-950/30',
    badge: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800',
  },
  KKTP: {
    row: 'bg-rose-50/30 hover:bg-rose-50/70 dark:bg-rose-950/10 dark:hover:bg-rose-950/25',
    badge: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800',
  },
};

interface GetPerangkatAjarColumnsParams {
  page: number;
  limit: number;
  JENIS_LABELS: Record<string, string>;
  currentGuru: any;
  isKurikulumOrAdmin: boolean;
  isGuruContext?: boolean;
  handleOpenStudio: (item: PerangkatAjar) => void;
  handleOpenReader: (item: PerangkatAjar) => void;
  handleOpenWordEditor: (item: PerangkatAjar) => void;
  setSelectedPerangkatId: (id: string) => void;
  setIsReviewModalOpen: (v: boolean) => void;
  handleDelete: (id: string) => void;
}

export const getPerangkatAjarTableColumns = (params: GetPerangkatAjarColumnsParams): Column[] => {
  const {
    page, limit, JENIS_LABELS, currentGuru, isKurikulumOrAdmin, isGuruContext = false,
    handleOpenStudio, handleOpenReader, handleOpenWordEditor,
    setSelectedPerangkatId, setIsReviewModalOpen, handleDelete
  } = params;

  const columns: Column[] = [
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
      render: (_: unknown, item: PerangkatAjar) => {
        const badgeStyle = JENIS_COLOR_MAP[item.jenis]?.badge || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/60';
        return (
          <div className="space-y-1 py-1">
            <div className="flex items-center gap-2">
              <Badge className={`font-bold border text-[10px] ${badgeStyle}`}>
                {JENIS_LABELS[item.jenis] || item.jenis}
              </Badge>
              <span className="font-bold text-slate-800 dark:text-slate-100 text-xs line-clamp-1">{item.judul}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Mapel: <span className="font-bold text-slate-700 dark:text-slate-300">{item.Mapel?.nama_mapel || '-'}</span> ({item.Mapel?.kode_mapel || '-'})
            </div>
          </div>
        );
      }
    },
  ];

  // Kolom GURU PENGAJAR hanya relevan pada konteks pengawasan Kurikulum / Admin
  if (!isGuruContext) {
    columns.push({
      key: 'guru',
      label: 'GURU PENGAJAR',
      render: (_: unknown, item: PerangkatAjar) => (
        <div className="text-xs">
          <div className="font-bold text-slate-800 dark:text-slate-200">{item.Guru?.nama_guru || '-'}</div>
          <div className="text-[10px] text-slate-400 font-medium">NIP. {item.Guru?.nip || '-'}</div>
        </div>
      )
    });
  }

  columns.push(
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
          {item.status === 'APPROVED' && (
            <Badge className="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 border-emerald-200 text-[10px] font-black">
              <Check size={11} className="mr-1" /> {isGuruContext ? 'DISETUJUI' : 'APPROVED'}
            </Badge>
          )}
          {item.status === 'REJECTED' && (
            <Badge className="bg-rose-50 text-rose-600 dark:bg-rose-950/20 border-rose-200 text-[10px] font-black">
              <XCircle size={11} className="mr-1" /> {isGuruContext ? 'PERLU REVISI' : 'REJECTED'}
            </Badge>
          )}
          {item.status === 'PENDING' && (
            <Badge className="bg-amber-50 text-amber-600 dark:bg-amber-950/20 border-amber-200 text-[10px] font-black">
              <Clock size={11} className="mr-1" /> {isGuruContext ? 'MENUNGGU VERIFIKASI' : 'PENDING'}
            </Badge>
          )}
          {item.catatan_reviewer && (
            <div className="text-[10px] text-rose-600 dark:text-rose-400 italic line-clamp-1 bg-rose-50/50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded">
              Catatan: "{item.catatan_reviewer}"
            </div>
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
        const canUserDelete = isKurikulumOrAdmin || isOwner || isGuruContext;

        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              type="button"
              onClick={() => handleOpenStudio(item)}
              size="sm"
              className={
                item.jenis === 'ATP'
                  ? 'text-xs font-black bg-sky-600 hover:bg-sky-500 text-white rounded-xl px-2.5 py-1 h-8 flex items-center gap-1 shadow-sm shadow-sky-500/20 cursor-pointer'
                  : 'text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-2.5 py-1 h-8 flex items-center gap-1 shadow-sm shadow-indigo-500/20 cursor-pointer'
              }
              title={
                item.jenis === 'ATP'
                  ? 'Buka Penyusun ATP & Tujuan Pembelajaran (TP)'
                  : 'Buka Studio Penyusunan Modul Ajar (Per-Pertemuan)'
              }
            >
              {item.jenis === 'ATP' ? <Layers size={13} /> : <Sparkles size={13} />}
              <span>{item.jenis === 'ATP' ? 'Susun ATP' : 'Susun'}</span>
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

            {!isGuruContext && isKurikulumOrAdmin && (
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
  );

  return columns;
};
